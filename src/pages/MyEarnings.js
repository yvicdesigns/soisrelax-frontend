import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiDollarSign, FiUsers, FiShoppingBag, FiGift, FiDownload } from 'react-icons/fi';
import api, { formatFCFA, formatDate } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './MyEarnings.css';

const TYPE_LABELS = {
  subscription: { label: 'Abonnement', icon: <FiUsers size={14} />, color: '#FF6B35' },
  ppv: { label: 'Achat contenu', icon: <FiShoppingBag size={14} />, color: '#004E89' },
  tip: { label: 'Pourboire', icon: <FiGift size={14} />, color: '#4CAF50' },
};

export default function MyEarnings() {
  const { user, isCreator } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  if (!isCreator) { navigate('/'); return null; }

  const { data: statsData } = useQuery({
    queryKey: ['creator-stats'],
    queryFn: () => api.get('/users/me/stats').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['creator-earnings', page, typeFilter],
    queryFn: () => api.get('/payments/creator/pending', {
      params: { status: 'approved', page, limit: 20, payment_type: typeFilter !== 'all' ? typeFilter : undefined },
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const stats = statsData || {};
  const payments = data?.payments || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="page my-earnings">
      <div className="container">
        <h1 className="my-earnings__title">Mes revenus</h1>

        {/* KPIs */}
        <div className="my-earnings__kpis">
          <div className="my-earnings__kpi">
            <div className="my-earnings__kpi-icon" style={{ background: '#FFF0EB' }}>
              <FiDollarSign size={20} color="#FF6B35" />
            </div>
            <div>
              <div className="my-earnings__kpi-value">{formatFCFA(stats.balance || 0)}</div>
              <div className="my-earnings__kpi-label">Solde disponible</div>
            </div>
          </div>
          <div className="my-earnings__kpi">
            <div className="my-earnings__kpi-icon" style={{ background: '#E8F5E9' }}>
              <FiDollarSign size={20} color="#4CAF50" />
            </div>
            <div>
              <div className="my-earnings__kpi-value">{formatFCFA(stats.total_earnings || 0)}</div>
              <div className="my-earnings__kpi-label">Total gagné</div>
            </div>
          </div>
          <div className="my-earnings__kpi">
            <div className="my-earnings__kpi-icon" style={{ background: '#E8F5E9' }}>
              <FiDollarSign size={20} color="#4CAF50" />
            </div>
            <div>
              <div className="my-earnings__kpi-value">{formatFCFA(stats.this_month_earnings || 0)}</div>
              <div className="my-earnings__kpi-label">Ce mois</div>
            </div>
          </div>
          <div className="my-earnings__kpi">
            <div className="my-earnings__kpi-icon" style={{ background: '#E3F2FD' }}>
              <FiUsers size={20} color="#004E89" />
            </div>
            <div>
              <div className="my-earnings__kpi-value">{stats.active_subscribers || 0}</div>
              <div className="my-earnings__kpi-label">Abonnés actifs</div>
            </div>
          </div>
        </div>

        {/* Filtres type */}
        <div className="my-earnings__filters">
          {['all', 'subscription', 'ppv', 'tip'].map((t) => (
            <button
              key={t}
              className={`my-earnings__filter-btn ${typeFilter === t ? 'active' : ''}`}
              onClick={() => { setTypeFilter(t); setPage(1); }}
            >
              {t === 'all' ? 'Tous' : TYPE_LABELS[t]?.label}
            </button>
          ))}
        </div>

        {/* Tableau */}
        <div className="my-earnings__table-wrap">
          <table className="my-earnings__table">
            <thead>
              <tr>
                <th>Abonné</th>
                <th>Type</th>
                <th>Montant reçu</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="my-earnings__loading">Chargement...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={4} className="my-earnings__empty">Aucun revenu pour ce filtre.</td></tr>
              ) : (
                payments.map((p) => {
                  const typeInfo = TYPE_LABELS[p.payment_type] || { label: p.payment_type, color: '#6B7280' };
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="my-earnings__user">
                          {p.user?.avatar_url ? (
                            <img src={p.user.avatar_url} alt="" className="my-earnings__avatar" />
                          ) : (
                            <div className="my-earnings__avatar my-earnings__avatar--placeholder">
                              {p.user?.display_name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="my-earnings__user-name">{p.user?.display_name}</div>
                            <div className="my-earnings__user-sub">@{p.user?.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="my-earnings__type-badge" style={{ color: typeInfo.color, background: typeInfo.color + '18' }}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className="my-earnings__amount">
                        +{formatFCFA(p.creator_amount)}
                        <span className="my-earnings__total-amount">(total {formatFCFA(p.amount)})</span>
                      </td>
                      <td className="my-earnings__date">{formatDate(p.validated_at || p.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="my-earnings__pagination">
            <button
              className="btn btn--outline btn--sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Précédent
            </button>
            <span className="my-earnings__page-info">Page {page} / {totalPages}</span>
            <button
              className="btn btn--outline btn--sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
