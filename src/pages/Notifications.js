import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationAPI, formatDate } from '../services/api';
import './Notifications.css';

function getIcon(type) {
  const icons = {
    new_message: '💬',
    new_subscriber: '👤',
    payment_approved: '✅',
    payment_rejected: '❌',
    payment_pending_validation: '⏳',
    payment_escalated: '🚨',
    payment_expired: '⌛',
    new_content: '📸',
  };
  return icons[type] || '🔔';
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll().then((r) => r.data),
    refetchInterval: 30000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  async function handleMarkAllRead() {
    await notificationAPI.markAllRead();
    queryClient.invalidateQueries(['notifications']);
  }

  async function handlePress(n) {
    if (!n.is_read) {
      await notificationAPI.markRead(n.id);
      queryClient.invalidateQueries(['notifications']);
    }
    const d = n.data;
    if (d?.screen === 'Conversation' && d?.userId) {
      navigate(`/messages/${d.userId}`);
    } else if (d?.screen === 'PublicProfile' && d?.username) {
      navigate(`/profil/${d.username}`);
    } else if (d?.screen === 'ContentView' && d?.contentId) {
      navigate(`/contenu/${d.contentId}`);
    } else if (d?.screen === 'Payments') {
      navigate('/paiements');
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-center" style={{ height: '60vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page notifs">
      <div className="container">
        <div className="notifs__header">
          <h2 className="notifs__title">Notifications</h2>
          {unreadCount > 0 && (
            <button className="notifs__read-all" onClick={handleMarkAllRead}>
              Tout marquer comme lu
            </button>
          )}
        </div>

        {notifications.length === 0 && (
          <div className="notifs__empty">
            <div className="notifs__empty-icon">🔔</div>
            <h3>Pas encore de notifications</h3>
            <p>Vous serez notifié des nouveaux messages, abonnés et paiements.</p>
          </div>
        )}

        <div className="notifs__list">
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`notifs__item ${!n.is_read ? 'notifs__item--unread' : ''}`}
              onClick={() => handlePress(n)}
            >
              <span className="notifs__icon">{getIcon(n.type)}</span>
              <div className="notifs__body">
                <div className="notifs__item-title">{n.title}</div>
                <div className="notifs__item-sub">{n.body}</div>
                <div className="notifs__item-time">{formatDate(n.created_at)}</div>
              </div>
              {!n.is_read && <span className="notifs__dot" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
