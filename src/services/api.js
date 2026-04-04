import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automatique du token
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('Pas de refresh token');

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/connexion';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ===== Auth =====
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// ===== Users =====
export const userAPI = {
  getProfile: (username) => api.get(`/users/${username}`),
  search: (q, page = 1) => api.get('/users/search', { params: { q, page } }),
  discover: (page = 1) => api.get('/users/discover', { params: { page } }),
  updateProfile: (data) => api.put('/users/me', data),
  updateAvatar: (formData) => api.patch('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateCover: (formData) => api.patch('/users/me/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  getStats: () => api.get('/users/me/stats'),
  adminListUsers: (params) => api.get('/users/admin/list', { params }),
  adminVerify: (id) => api.patch(`/users/admin/${id}/verify`),
  adminToggleActive: (id) => api.patch(`/users/admin/${id}/toggle-active`),
  becomeCreator: (subscription_price) => api.post('/users/me/become-creator', { subscription_price }),
};

// ===== Content =====
export const contentAPI = {
  getFeed: (page = 1) => api.get('/content/feed', { params: { page } }),
  getContent: (id) => api.get(`/content/${id}`),
  getCreatorContent: (userId, page = 1) => api.get(`/content/creator/${userId}`, { params: { page } }),
  create: (formData, onUploadProgress) => api.post('/content', formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress }),
  like: (id) => api.post(`/content/${id}/like`),
  comment: (id, text) => api.post(`/content/${id}/comment`, { text }),
  update: (id, data) => api.patch(`/content/${id}`, data),
  delete: (id) => api.delete(`/content/${id}`),
};

// ===== Payments =====
export const paymentAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  status: (id) => api.get(`/payments/${id}/status`),
  approve: (id) => api.post(`/payments/${id}/approve`),
  reject: (id, reason) => api.post(`/payments/${id}/reject`, { rejection_reason: reason }),
  creatorPending: (params) => api.get('/payments/creator/pending', { params }),
  detail: (id) => api.get(`/payments/${id}/detail`),
  adminDashboard: () => api.get('/payments/admin/dashboard'),
  adminList: (params) => api.get('/payments/admin/list', { params }),
  notifications: () => api.get('/payments/notifications'),
  markRead: () => api.patch('/payments/notifications/read'),
  withdraw: (data) => api.post('/payments/withdraw', data),
  getMyWithdrawals: () => api.get('/payments/my-withdrawals'),
};

// ===== Messages =====
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId, page = 1) => api.get(`/messages/${userId}`, { params: { page } }),
  send: (userId, data) => api.post(`/messages/${userId}`, data),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
};

// Formater le prix en FCFA
export function formatFCFA(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.patch('/notifications/read-all'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
};

// Formater la date en français
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return d.toLocaleDateString('fr-FR');
}

export default api;
