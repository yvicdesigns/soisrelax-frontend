import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiSearch, FiCheckCircle, FiXCircle, FiShield, FiUser, FiUserCheck } from 'react-icons/fi';
import { userAPI, formatFCFA } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AdminUsers.css';

const ROLE_TABS = [
  { value: 'all', label: 'Tous' },
  { value: 'creator', label: 'Créateurs' },
  { value: 'subscriber', label: 'Abonnés' },
];

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  if (user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, search],
    queryFn: () => userAPI.adminListUsers({ role, search }).then((r) => r.data),
  });

  async function handleVerify(userId, currentValue) {
    try {
      await userAPI.adminVerify(userId);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(currentValue ? 'Vérification retirée' : 'Compte vérifié ✓');
    } catch {
      toast.error('Erreur');
    }
  }

  async function handleToggleActive(userId, currentValue) {
    if (!window.confirm(currentValue ? 'Suspendre ce compte ?' : 'Réactiver ce compte ?')) return;
    try {
      await userAPI.adminToggleActive(userId);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(currentValue ? 'Compte suspendu' : 'Compte réactivé');
    } catch {
      toast.error('Erreur');
    }
  }

  const users = data?.users || [];

  return (
    <div className="page admin-users">
      <div className="container">
        <h1 className="admin-users__title">Gestion des utilisateurs</h1>

        {/* Filtres */}
        <div className="admin-users__filters">
          <div className="admin-users__role-tabs">
            {ROLE_TABS.map((t) => (
              <button
                key={t.value}
                className={`admin-users__role-tab ${role === t.value ? 'active' : ''}`}
                onClick={() => setRole(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form
            className="admin-users__search"
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
          >
            <FiSearch size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom, @username ou email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}>
                <FiXCircle size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Compteur */}
        <p className="admin-users__count">
          {isLoading ? '...' : `${data?.total || 0} utilisateur${data?.total > 1 ? 's' : ''}`}
        </p>

        {/* Table */}
        <div className="admin-users__table-wrap">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Stats</th>
                <th>Revenus</th>
                <th>Inscrit le</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="admin-users__loading">Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="admin-users__empty">Aucun résultat</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className={!u.is_active ? 'admin-users__row--suspended' : ''}>
                    <td>
                      <div className="admin-users__user">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="admin-users__avatar" />
                        ) : (
                          <div className="admin-users__avatar admin-users__avatar--placeholder">
                            {u.display_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="admin-users__name">
                            {u.display_name}
                            {u.is_verified && <span className="admin-users__verified">✓</span>}
                          </div>
                          <div className="admin-users__username">@{u.username}</div>
                          <div className="admin-users__email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-users__role-badge admin-users__role-badge--${u.role}`}>
                        {u.role === 'creator' ? 'Créateur' : u.role === 'admin' ? 'Admin' : 'Abonné'}
                      </span>
                    </td>
                    <td className="admin-users__stats">
                      <span>{u.posts_count} posts</span>
                      <span>{u.followers_count} abonnés</span>
                    </td>
                    <td>
                      {u.role === 'creator' ? (
                        <div className="admin-users__earnings">
                          <div>{formatFCFA(u.total_earnings)}</div>
                          <small>Solde: {formatFCFA(u.balance)}</small>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="admin-users__date">
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      {!u.is_active ? (
                        <span className="admin-users__status admin-users__status--suspended">Suspendu</span>
                      ) : (
                        <span className="admin-users__status admin-users__status--active">Actif</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-users__actions">
                        {u.role !== 'admin' && (
                          <>
                            <button
                              className={`admin-users__btn ${u.is_verified ? 'admin-users__btn--verified' : 'admin-users__btn--verify'}`}
                              onClick={() => handleVerify(u.id, u.is_verified)}
                              title={u.is_verified ? 'Retirer la vérification' : 'Vérifier le compte'}
                            >
                              {u.is_verified ? <FiCheckCircle size={16} /> : <FiShield size={16} />}
                              {u.is_verified ? 'Vérifié' : 'Vérifier'}
                            </button>
                            <button
                              className={`admin-users__btn ${u.is_active ? 'admin-users__btn--suspend' : 'admin-users__btn--activate'}`}
                              onClick={() => handleToggleActive(u.id, u.is_active)}
                              title={u.is_active ? 'Suspendre' : 'Réactiver'}
                            >
                              {u.is_active ? <FiXCircle size={16} /> : <FiUserCheck size={16} />}
                              {u.is_active ? 'Suspendre' : 'Réactiver'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
