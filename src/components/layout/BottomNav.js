import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiSearch, FiPlusSquare, FiMessageCircle, FiUser } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './BottomNav.css';

export default function BottomNav() {
  const { user, isCreator } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/fil', icon: FiHome, label: 'Accueil' },
    { to: '/recherche', icon: FiSearch, label: 'Chercher' },
    ...(isCreator ? [{ to: '/publier', icon: FiPlusSquare, label: 'Publier', isAction: true }] : []),
    { to: '/messages', icon: FiMessageCircle, label: 'Messages' },
    { to: `/profil/${user?.username}`, icon: FiUser, label: 'Profil' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label, isAction }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''} ${isAction ? 'bottom-nav__item--action' : ''}`
          }
        >
          <Icon size={isAction ? 26 : 24} />
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
