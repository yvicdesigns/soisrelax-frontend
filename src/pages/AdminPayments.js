import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiDownload, FiRefreshCw, FiCheck, FiX, FiClock,
  FiAlertTriangle, FiEye, FiFilter,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { formatFCFA, formatDate } from '../services/api';
import './AdminPayments.css';

const STATUS_LABELS = {
  submitted: { label: 'À valider', color: 'warning' },
  approved:  { label: 'Approuvé',  color: 'success' },
  rejected:  { label: 'Rejeté',    color: 'danger'  },
  expired:   { label: 'Expiré',    color: 'neutral' },
  pending:   { label: 'En attente',color: 'neutral' },
};

const METHOD_LABELS = {
  mtn_momo:    '🟡 MTN MoMo',
  airtel_money: '🔴 Airtel',
};

const TYPE_LABELS = {
  subscription: 'Abonnement',
  ppv:          'Achat PPV',
  tip:          'Pourboire',
};

const REJECT_PRESETS = [
  'Montant incorrect',
  'Numéro destinataire erroné',
  'Capture illisible / invalide',
  'Code de référence absent',
  'Transaction non trouvée dans le réseau',
  'Fraude / doublon suspect',
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="adm-kpi" style={{ '--kpi-color': color }}>
      <div className="adm-kpi__value">{value}</div>
      <div className="adm-kpi__label">{label}</div>
      {sub && <div className="adm-kpi__sub">{sub}</div>}
    </div>
  );
}

// ─── Ligne tableau paiement ───────────────────────────────────────────────────
function PaymentRow({ payment, onApprove, onReject, isActing }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const ageMin = payment.waiting_minutes ?? Math.floor(
    (Date.now() - new Date(payment.created_at)) / 60000
  );
  const isUrgent = ageMin >= 15;
  const isCritical = ageMin >= 25;

  function handleRejectSubmit() {
    if (!rejectionReason.trim()) { toast.error('Raison requise'); return; }
    onReject(payment.id, rejectionReason);
    setShowRejectModal(false);
  }

  return (
    <>
      <tr className={`adm-tr ${isCritical ? 'adm-tr--critical' : isUrgent ? 'adm-tr--urgent' : ''}`}>
        <td className="adm-td adm-td--ref">
          <code className="adm-ref">{payment.reference_code}</code>
          <div className="adm-td__date">{formatDate(payment.created_at)}</div>
        </td>
        <td className="adm-td">
          <div className="adm-user">
            <img
              src={payment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(payment.user?.display_name || '?')}&background=FF6B35&color=fff&size=32`}
              alt=""
              className="adm-user__avatar"
            />
            <div>
              <div className="adm-user__name">{payment.user?.display_name}</div>
              <div className="adm-user__meta">{payment.creator?.display_name}</div>
            </div>
          </div>
        </td>
        <td className="adm-td adm-td--type">
          <span>{TYPE_LABELS[payment.payment_type]}</span>
          <span className="adm-td__method">{METHOD_LABELS[payment.payment_method]}</span>
        </td>
        <td className="adm-td adm-td--amount">{formatFCFA(payment.amount)}</td>
        <td className="adm-td">
          <span className={`adm-status adm-status--${STATUS_LABELS[payment.status]?.color}`}>
            {STATUS_LABELS[payment.status]?.label}
          </span>
        </td>
        <td className="adm-td adm-td--age">
          {payment.status === 'submitted' && (
            <span className={`adm-age ${isCritical ? 'adm-age--critical' : isUrgent ? 'adm-age--urgent' : ''}`}>
              <FiClock size={11} /> {ageMin}m
            </span>
          )}
        </td>
        <td className="adm-td adm-td--actions">
          <button
            className="adm-action-btn adm-action-btn--eye"
            onClick={() => setShowDetail((v) => !v)}
            title="Voir détail"
          >
            <FiEye size={15} />
          </button>
          {payment.status === 'submitted' && (
            <>
              <button
                className="adm-action-btn adm-action-btn--approve"
                onClick={() => onApprove(payment.id)}
                disabled={isActing}
                title="Approuver"
              >
                <FiCheck size={15} />
              </button>
              <button
                className="adm-action-btn adm-action-btn--reject"
                onClick={() => setShowRejectModal(true)}
                disabled={isActing}
                title="Rejeter"
              >
                <FiX size={15} />
              </button>
            </>
          )}
        </td>
      </tr>

      {/* Panneau détail inline */}
      {showDetail && (
        <tr className="adm-tr-detail">
          <td colSpan={7}>
            <div className="adm-detail">
              <div className="adm-detail__cols">
                {/* Preuve */}
                <div className="adm-detail__col">
                  <div className="adm-detail__label">📸 Preuve</div>
                  {payment.proof_signed_url ? (
                    <a href={payment.proof_signed_url} target="_blank" rel="noreferrer">
                      <img src={payment.proof_signed_url} alt="Preuve" className="adm-detail__img" />
                    </a>
                  ) : payment.transaction_id ? (
                    <code className="adm-detail__txid">{payment.transaction_id}</code>
                  ) : (
                    <span className="adm-detail__empty">Aucune preuve</span>
                  )}
                </div>

                {/* Checklist */}
                <div className="adm-detail__col">
                  <div className="adm-detail__label">✅ Vérifications</div>
                  {(payment.checklist || [
                    { id: 1, label: `Montant: ${formatFCFA(payment.amount)}` },
                    { id: 2, label: 'Numéro destinataire correct' },
                    { id: 3, label: 'Date dans la fenêtre valide' },
                    { id: 4, label: `Réf visible: ${payment.reference_code}` },
                  ]).map((item) => (
                    <label key={item.id} className="adm-detail__check">
                      <input type="checkbox" />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                {/* Infos */}
                <div className="adm-detail__col">
                  <div className="adm-detail__label">ℹ️ Informations</div>
                  <div className="adm-detail__info-row">
                    <span>Utilisateur</span>
                    <span>{payment.user?.username}</span>
                  </div>
                  <div className="adm-detail__info-row">
                    <span>Créateur</span>
                    <span>{payment.creator?.username}</span>
                  </div>
                  <div className="adm-detail__info-row">
                    <span>Commission</span>
                    <span>{formatFCFA(payment.platform_fee)}</span>
                  </div>
                  <div className="adm-detail__info-row">
                    <span>Créateur reçoit</span>
                    <span>{formatFCFA(payment.creator_amount)}</span>
                  </div>
                  {payment.escalated_creator && (
                    <div className="adm-detail__flag">⚠️ Escalade créateur envoyée</div>
                  )}
                  {payment.escalated_admin && (
                    <div className="adm-detail__flag adm-detail__flag--critical">🚨 Escalade admin</div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Modal rejet */}
      {showRejectModal && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <div className="adm-reject-modal" onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}>
              <div className="adm-reject-modal__box">
                <h3>Raison du rejet — {payment.reference_code}</h3>
                <div className="adm-reject-presets">
                  {REJECT_PRESETS.map((p) => (
                    <button
                      key={p}
                      className={`adm-reject-preset ${rejectionReason === p ? 'active' : ''}`}
                      onClick={() => setRejectionReason(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Précisez (obligatoire)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="adm-reject-modal__actions">
                  <button className="btn btn--outline btn--sm" onClick={() => setShowRejectModal(false)}>Annuler</button>
                  <button className="btn btn--danger btn--sm" onClick={handleRejectSubmit} disabled={isActing}>
                    Confirmer le rejet
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── PAGE ADMIN ───────────────────────────────────────────────────────────────
export default function AdminPayments() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'list'
  const [filters, setFilters] = useState({ status: 'submitted', payment_method: '', date_from: '', date_to: '' });
  const [actingId, setActingId] = useState(null);

  // ── KPIs + paiements en attente ───────────────────────────
  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash, isFetching: dashFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/payments/admin/dashboard').then((r) => r.data),
    refetchInterval: 20000,
  });

  // ── Liste filtrée (vue liste) ──────────────────────────────
  const { data: listData, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ['admin-list', filters],
    queryFn: () => api.get('/payments/admin/list', { params: { ...filters, limit: 100 } }).then((r) => r.data),
    enabled: view === 'list',
  });

  // ── Mutations ─────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/payments/${id}/approve`),
    onSuccess: () => {
      toast.success('✅ Approuvé');
      setActingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-list'] });
    },
    onError: (err) => { toast.error(err.response?.data?.error || 'Erreur'); setActingId(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/payments/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      toast.success('Rejeté');
      setActingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-list'] });
    },
    onError: (err) => { toast.error(err.response?.data?.error || 'Erreur'); setActingId(null); },
  });

  function handleApprove(id) { setActingId(id); approveMutation.mutate(id); }
  function handleReject(id, reason) { setActingId(id); rejectMutation.mutate({ id, reason }); }

  // ── Export CSV ────────────────────────────────────────────
  function handleExport() {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);

    const token = localStorage.getItem('accessToken');
    const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/admin/export.csv?${params}`;

    // Téléchargement avec token dans l'en-tête via fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `soisrelax-paiements-${Date.now()}.csv`;
        link.click();
      })
      .catch(() => toast.error('Erreur lors de l\'export'));
  }

  const kpis = dashboard?.kpis;
  const pendingPayments = dashboard?.pending_payments || [];

  return (
    <div className="page adm-page">
      <div className="adm-container">

        {/* ── En-tête ─────────────────────────────────────── */}
        <div className="adm-header">
          <div>
            <h1 className="adm-header__title">
              Administration paiements
              {kpis?.pending_validation > 0 && (
                <span className="adm-header__badge">{kpis.pending_validation} en attente</span>
              )}
            </h1>
            <p className="adm-header__sub">Tableau de bord global SoisRelax</p>
          </div>
          <div className="adm-header__actions">
            <button
              className="btn btn--outline btn--sm"
              onClick={() => { view === 'dashboard' ? refetchDash() : refetchList(); }}
              disabled={dashFetching}
            >
              <FiRefreshCw size={15} className={dashFetching ? 'spin' : ''} />
            </button>
            <button className="btn btn--outline btn--sm" onClick={handleExport}>
              <FiDownload size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Onglets ──────────────────────────────────────── */}
        <div className="adm-tabs">
          <button
            className={`adm-tab ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            📊 Vue urgente
          </button>
          <button
            className={`adm-tab ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            📋 Liste complète
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════
            VUE DASHBOARD
        ═══════════════════════════════════════════════════ */}
        {view === 'dashboard' && (
          <>
            {/* KPIs */}
            {dashLoading ? (
              <div className="loading-center" style={{ minHeight: 120 }}><div className="spinner" /></div>
            ) : (
              <div className="adm-kpis">
                <KpiCard
                  label="En attente"
                  value={kpis?.pending_validation ?? '—'}
                  color="var(--warning)"
                />
                <KpiCard
                  label="Approuvés auj."
                  value={kpis?.approved_today ?? '—'}
                  color="var(--success)"
                />
                <KpiCard
                  label="Rejetés auj."
                  value={kpis?.rejected_today ?? '—'}
                  sub={kpis?.rejection_rate != null ? `${kpis.rejection_rate}% rejet` : null}
                  color="var(--danger)"
                />
                <KpiCard
                  label="Volume auj."
                  value={kpis?.amount_today != null ? formatFCFA(kpis.amount_today) : '—'}
                  sub={kpis?.amount_total != null ? `Total: ${formatFCFA(kpis.amount_total)}` : null}
                  color="var(--primary)"
                />
              </div>
            )}

            {/* Paiements urgents */}
            {!dashLoading && pendingPayments.length > 0 && (
              <div className="adm-section">
                <div className="adm-section__title">
                  <FiAlertTriangle size={16} color="var(--warning)" />
                  Paiements en attente de validation
                </div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Utilisateur / Créateur</th>
                        <th>Type</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Attente</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((p) => (
                        <PaymentRow
                          key={p.id}
                          payment={p}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          isActing={actingId === p.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!dashLoading && pendingPayments.length === 0 && (
              <div className="adm-empty">
                <FiCheck size={36} />
                <p>Aucun paiement en attente — tout est traité ✅</p>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            VUE LISTE COMPLÈTE
        ═══════════════════════════════════════════════════ */}
        {view === 'list' && (
          <>
            {/* Filtres */}
            <div className="adm-filters">
              <FiFilter size={14} />
              <select
                className="adm-filter-select"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="all">Tous statuts</option>
                <option value="submitted">À valider</option>
                <option value="approved">Approuvés</option>
                <option value="rejected">Rejetés</option>
                <option value="expired">Expirés</option>
              </select>

              <select
                className="adm-filter-select"
                value={filters.payment_method}
                onChange={(e) => setFilters((f) => ({ ...f, payment_method: e.target.value }))}
              >
                <option value="">Toutes méthodes</option>
                <option value="mtn_momo">MTN MoMo</option>
                <option value="airtel_money">Airtel Money</option>
              </select>

              <input
                type="date"
                className="adm-filter-date"
                value={filters.date_from}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                title="Date début"
              />
              <span className="adm-filter-sep">→</span>
              <input
                type="date"
                className="adm-filter-date"
                value={filters.date_to}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                title="Date fin"
              />

              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setFilters({ status: 'all', payment_method: '', date_from: '', date_to: '' })}
              >
                Réinitialiser
              </button>
            </div>

            {listLoading ? (
              <div className="loading-center" style={{ minHeight: 200 }}><div className="spinner" /></div>
            ) : (
              <>
                <div className="adm-list-meta">
                  {listData?.total ?? 0} résultat{(listData?.total ?? 0) !== 1 ? 's' : ''}
                </div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Utilisateur / Créateur</th>
                        <th>Type</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Attente</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(listData?.payments || []).map((p) => (
                        <PaymentRow
                          key={p.id}
                          payment={p}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          isActing={actingId === p.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {(listData?.payments || []).length === 0 && (
                  <div className="adm-empty">
                    <p>Aucun paiement ne correspond aux filtres.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
