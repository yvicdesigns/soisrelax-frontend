import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiSearch, FiPlusSquare, FiMessageCircle, FiBell, FiUser } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { messageAPI, notificationAPI } from '../../services/api';
import './BottomNav.css';

export default function BottomNav() {
  const { user, isCreator } = useAuth();

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageAPI.getConversations().then((r) => r.data),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll().then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadMessages = convData?.conversations?.reduce(
    (sum, c) => sum + (parseInt(c.unread_count) || 0), 0
  ) || 0;

  const unreadNotifs = notifData?.unread_count || 0;

  const navItems = [
    { to: '/fil', icon: FiHome, label: 'Accueil' },
    { to: '/recherche', icon: FiSearch, label: 'Chercher' },
    ...(isCreator ? [{ to: '/publier', icon: FiPlusSquare, label: 'Publier', isAction: true }] : []),
    { to: '/messages', icon: FiMessageCircle, label: 'Messages', badge: unreadMessages },
    { to: '/notifications', icon: FiBell, label: 'Notifs', badge: unreadNotifs },
    { to: `/profil/${user?.username}`, icon: FiUser, label: 'Profil' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label, isAction, badge }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''} ${isAction ? 'bottom-nav__item--action' : ''}`
          }
        >
          <div className="bottom-nav__icon-wrap">
            <Icon size={isAction ? 26 : 24} />
            {badge > 0 && (
              <span className="bottom-nav__badge">{badge > 9 ? '9+' : badge}</span>
            )}
          </div>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
