import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiMessageCircle, FiUser, FiSettings, FiLogOut, FiGrid, FiBell, FiHeart } from 'react-icons/fi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { notificationAPI, formatDate } from '../../services/api';
import { io } from 'socket.io-client';
import './Header.css';

const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

export default function Header() {
  const { user, logout, isCreator, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef();
  const bellRef = useRef();

  // Fermer les menus si on clique ailleurs
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Socket: recevoir les nouvelles notifications en temps réel
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('notification', () => {
      queryClient.invalidateQueries(['notifications']);
    });
    return () => socket.disconnect();
  }, [user]);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll().then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications ?? [];
  const unreadCount = notifData?.unread_count ?? 0;

  async function handleMarkAllRead() {
    await notificationAPI.markAllRead();
    queryClient.invalidateQueries(['notifications']);
  }

  function getNotifIcon(type) {
    const icons = {
      new_message: '💬',
      new_subscriber: '👤',
      payment_approved: '✅',
      payment_rejected: '❌',
      payment_pending_validation: '⏳',
      payment_escalated: '🚨',
      payment_expired: '⌛',
    };
    return icons[type] || '🔔';
  }

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <header className="header">
      <div className="header__inner container">
        {/* Logo */}
        <Link to={user ? '/fil' : '/'} className="header__logo">
          <span className="header__logo-text">Sois<span>Relax</span></span>
        </Link>

        {/* Actions */}
        <div className="header__actions">
          <button
            className="header__icon-btn"
            onClick={() => navigate('/recherche')}
            aria-label="Rechercher"
          >
            <FiSearch size={22} />
          </button>

          {user && (
            <>
              <button
                className="header__icon-btn"
                onClick={() => navigate('/messages')}
                aria-label="Messages"
              >
                <FiMessageCircle size={22} />
              </button>

              {/* Cloche notifications */}
              <div className="header__avatar-wrap" ref={bellRef}>
                <button
                  className="header__icon-btn header__bell-btn"
                  onClick={() => { setBellOpen((v) => !v); setMenuOpen(false); }}
                  aria-label="Notifications"
                >
                  <FiBell size={22} />
                  {unreadCount > 0 && (
                    <span className="header__notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {bellOpen && (
                  <div className="header__notif-dropdown">
                    <div className="header__notif-header">
                      <span className="header__notif-title">Notifications</span>
                      {unreadCount > 0 && (
                        <button className="header__notif-read-all" onClick={handleMarkAllRead}>
                          Tout lire
                        </button>
                      )}
                    </div>

                    <div className="header__notif-list">
                      {notifications.length === 0 && (
                        <div className="header__notif-empty">Pas de notifications</div>
                      )}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`header__notif-item ${!n.is_read ? 'header__notif-item--unread' : ''}`}
                          onClick={async () => {
                            if (!n.is_read) {
                              await notificationAPI.markRead(n.id);
                              queryClient.invalidateQueries(['notifications']);
                            }
                            setBellOpen(false);
                            if (n.data?.screen === 'Conversation' && n.data?.userId) {
                              navigate(`/messages/${n.data.userId}`);
                            } else if (n.data?.screen === 'PublicProfile' && n.data?.username) {
                              navigate(`/profil/${n.data.username}`);
                            } else if (n.data?.screen === 'Payments') {
                              navigate('/paiements');
                            }
                          }}
                        >
                          <span className="header__notif-icon">{getNotifIcon(n.type)}</span>
                          <div className="header__notif-body">
                            <div className="header__notif-text">{n.title}</div>
                            <div className="header__notif-sub">{n.body}</div>
                            <div className="header__notif-time">{formatDate(n.created_at)}</div>
                          </div>
                          {!n.is_read && <span className="header__notif-dot" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar + menu déroulant */}
              <div className="header__avatar-wrap" ref={menuRef}>
                <button
                  className="header__avatar-btn"
                  onClick={() => { setMenuOpen((v) => !v); setBellOpen(false); }}
                  aria-label="Menu profil"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="avatar avatar--sm header__avatar"
                    />
                  ) : (
                    <div className="header__avatar-placeholder avatar avatar--sm">
                      {user.display_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="header__dropdown">
                    <div className="header__dropdown-user">
                      <div className="header__dropdown-name">{user.display_name}</div>
                      <div className="header__dropdown-role">@{user.username}</div>
                    </div>
                    <div className="header__dropdown-divider" />
                    <Link
                      to={`/profil/${user.username}`}
                      className="header__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <FiUser size={16} /> Mon profil
                    </Link>
                    {isCreator && (
                      <Link
                        to="/tableau-de-bord"
                        className="header__dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <FiGrid size={16} /> Tableau de bord
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin/paiements"
                        className="header__dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <FiGrid size={16} /> Admin
                      </Link>
                    )}
                    <Link
                      to="/mes-abonnements"
                      className="header__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <FiHeart size={16} /> Mes abonnements
                    </Link>
                    <Link
                      to="/parametres"
                      className="header__dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <FiSettings size={16} /> Paramètres
                    </Link>
                    <div className="header__dropdown-divider" />
                    <button
                      className="header__dropdown-item header__dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      <FiLogOut size={16} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <Link to="/connexion" className="btn btn--primary btn--sm">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
