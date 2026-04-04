import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiTrendingUp, FiDownload, FiCheckCircle, FiClock } from 'react-icons/fi';
import { userAPI, paymentAPI, formatFCFA, formatDate } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [showWithdraw, setShowWithdraw] = React.useState(false);
  const [withdrawForm, setWithdrawForm] = React.useState({ amount: '', phone_number: '', provider: 'mtn' });
  const [loading, setLoading] = React.useState(false);

  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['creator-stats'],
    queryFn: () => userAPI.getStats().then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: withdrawalsData } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => paymentAPI.getMyWithdrawals().then((r) => r.data),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['creator-pending-count'],
    queryFn: () => api.get('/payments/creator/pending', { params: { status: 'submitted', limit: 1 } }).then((r) => r.data),
    refetchInterval: 30000,
  });

  async function handleWithdraw(e) {
    e.preventDefault();
    if (!withdrawForm.amount || parseInt(withdrawForm.amount) < 1000) {
      toast.error('Montant minimum: 1 000 FCFA');
      return;
    }
    setLoading(true);
    try {
      await paymentAPI.withdraw({
        amount: parseInt(withdrawForm.amount),
        phone_number: withdrawForm.phone_number || user.mobile_money_number,
        provider: withdrawForm.provider || user.mobile_money_provider,
      });
      toast.success('Retrait en cours !');
      setShowWithdraw(false);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du retrait');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page loading-center">
        <div className="spinner" />
      </div>
    );
  }

  const stats = statsData || {};

  return (
    <div className="page dashboard">
      <div className="container">
        <h2 className="dashboard__title">Tableau de bord</h2>
        <p className="text-secondary dashboard__subtitle">Bonjour {user?.display_name} 👋</p>

        {/* Solde */}
        <div className="dashboard__balance card">
          <div className="dashboard__balance-label">Solde disponible</div>
          <div className="dashboard__balance-amount">{formatFCFA(stats.balance || 0)}</div>
          <button
            className="btn btn--primary"
            onClick={() => setShowWithdraw(true)}
            disabled={(stats.balance || 0) < 1000}
          >
            <FiDownload size={16} /> Retirer l'argent
          </button>
          {(stats.balance || 0) < 1000 && (
            <p className="dashboard__balance-hint">Minimum 1 000 FCFA pour retirer</p>
          )}
        </div>

        {/* Stats */}
        <div className="dashboard__stats">
          <div className="dashboard__stat card">
            <div className="dashboard__stat-icon" style={{ background: '#FFF0EB' }}>
              <FiUsers size={22} color="var(--primary)" />
            </div>
            <div className="dashboard__stat-value">{stats.active_subscribers || 0}</div>
            <div className="dashboard__stat-label">Abonnés actifs</div>
          </div>

          <div className="dashboard__stat card">
            <div className="dashboard__stat-icon" style={{ background: '#E8F5E9' }}>
              <FiDollarSign size={22} color="var(--success)" />
            </div>
            <div className="dashboard__stat-value">{formatFCFA(stats.this_month_earnings || 0)}</div>
            <div className="dashboard__stat-label">Ce mois</div>
          </div>

          <div className="dashboard__stat card">
            <div className="dashboard__stat-icon" style={{ background: '#E3F2FD' }}>
              <FiTrendingUp size={22} color="var(--secondary)" />
            </div>
            <div className="dashboard__stat-value">{formatFCFA(stats.total_earnings || 0)}</div>
            <div className="dashboard__stat-label">Total gagné</div>
          </div>

          <div className="dashboard__stat card">
            <div className="dashboard__stat-icon" style={{ background: '#FFF8E1' }}>
              <span style={{ fontSize: '1.3rem' }}>📸</span>
            </div>
            <div className="dashboard__stat-value">{stats.posts_count || 0}</div>
            <div className="dashboard__stat-label">Publications</div>
          </div>
        </div>

        {/* Lien validation paiements */}
        <Link to="/paiements" className="dashboard__payments-link card">
          <div className="dashboard__payments-link-left">
            <FiCheckCircle size={22} color="var(--success)" />
            <div>
              <div className="dashboard__payments-link-title">Valider les paiements</div>
              <div className="dashboard__payments-link-sub">
                {(pendingData?.pending_count || 0) > 0
                  ? `${pendingData.pending_count} paiement(s) en attente`
                  : 'Aucun paiement en attente'}
              </div>
            </div>
          </div>
          {(pendingData?.pending_count || 0) > 0 && (
            <span className="dashboard__payments-badge">{pendingData.pending_count}</span>
          )}
        </Link>

        {/* Historique retraits */}
        {(withdrawalsData?.withdrawals?.length ?? 0) > 0 && (
          <div className="dashboard__withdrawals card">
            <h3 className="dashboard__tips-title"><FiClock size={16} /> Historique des retraits</h3>
            <div className="dashboard__withdraw-list">
              {withdrawalsData.withdrawals.slice(0, 5).map((w) => (
                <div key={w.id} className="dashboard__withdraw-item">
                  <div>
                    <div className="dashboard__withdraw-amount">{formatFCFA(w.amount)}</div>
                    <div className="dashboard__withdraw-date text-secondary">{formatDate(w.created_at)}</div>
                  </div>
                  <span className={`dashboard__withdraw-status dashboard__withdraw-status--${w.status}`}>
                    {w.status === 'completed' ? '✓ Effectué' : w.status === 'rejected' ? '✗ Rejeté' : '⏳ En attente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conseils */}
        <div className="dashboard__tips card">
          <h3 className="dashboard__tips-title">💡 Conseils pour gagner plus</h3>
          <ul className="dashboard__tips-list">
            <li>Publiez au moins 3 fois par semaine pour garder vos abonnés</li>
            <li>Les vidéos courtes (30-60s) génèrent plus d'engagement</li>
            <li>Répondez aux messages de vos abonnés rapidement</li>
            <li>Proposez du contenu exclusif non disponible ailleurs</li>
          </ul>
        </div>
      </div>

      {/* Modal retrait */}
      {showWithdraw && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowWithdraw(false)}>
          <div className="modal-content">
            <h2 style={{ marginBottom: 4 }}>Retirer de l'argent</h2>
            <p className="text-secondary" style={{ marginBottom: 20, fontSize: '0.9rem' }}>
              Solde disponible: {formatFCFA(stats.balance || 0)}
            </p>

            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label className="form-label">Montant (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Ex: 5000"
                  min={1000}
                  max={stats.balance || 0}
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                />
                <p className="form-hint">Minimum: 1 000 FCFA</p>
              </div>

              <div className="form-group">
                <label className="form-label">Opérateur</label>
                <select
                  className="form-input"
                  value={withdrawForm.provider}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, provider: e.target.value })}
                >
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="airtel">Airtel Money</option>
                  <option value="orange">Orange Money</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Numéro de téléphone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+242 06 xxx xxxx"
                  value={withdrawForm.phone_number}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, phone_number: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? 'Traitement...' : 'Confirmer le retrait'}
              </button>
              <button type="button" className="btn btn--ghost btn--full mt-2" onClick={() => setShowWithdraw(false)}>
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
