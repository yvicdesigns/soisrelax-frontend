import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiCheck, FiX, FiClock, FiEye, FiAlertTriangle,
  FiRefreshCw, FiFilter, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { formatFCFA, formatDate } from '../services/api';
import './CreatorPayments.css';

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
  ppv:          'Achat contenu',
  tip:          'Pourboire',
};

const REJECT_PRESETS = [
  'Montant incorrect',
  'Numéro destinataire erroné',
  'Capture d\'écran illisible',
  'Code de référence absent',
  'Transaction non trouvée',
  'Doublon suspect',
];

// ─── Carte paiement ────────────────────────────────────────────────────────────
function PaymentCard({ payment, onApprove, onReject, isActing }) {
  const [expanded, setExpanded] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const ageMin = payment.waiting_minutes ?? Math.floor(
    (Date.now() - new Date(payment.created_at)) / 60000
  );
  const isUrgent = ageMin >= 15;
  const isCritical = ageMin >= 25;

  function handleRejectSubmit() {
    if (!rejectionReason.trim()) {
      toast.error('Indiquez la raison du rejet');
      return;
    }
    onReject(payment.id, rejectionReason);
    setShowRejectModal(false);
  }

  return (
    <div className={`cp-card ${isCritical ? 'cp-card--critical' : isUrgent ? 'cp-card--urgent' : ''}`}>
      {/* Header */}
      <div className="cp-card__header">
        <div className="cp-card__user">
          <img
            src={payment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(payment.user?.display_name || '?')}&background=FF6B35&color=fff&size=40`}
            alt={payment.user?.display_name}
            className="cp-card__avatar"
          />
          <div>
            <div className="cp-card__name">{payment.user?.display_name}</div>
            <div className="cp-card__meta">
              {METHOD_LABELS[payment.payment_method]} · {TYPE_LABELS[payment.payment_type]}
            </div>
          </div>
        </div>
        <div className="cp-card__right">
          <div className="cp-card__amount">{formatFCFA(payment.amount)}</div>
          <div className={`cp-card__age ${isCritical ? 'cp-card__age--critical' : isUrgent ? 'cp-card__age--urgent' : ''}`}>
            <FiClock size={12} />
            <span>{ageMin} min</span>
          </div>
        </div>
      </div>

      {/* Ref */}
      <div className="cp-card__ref">
        <span className="cp-card__ref-label">Réf :</span>
        <code className="cp-card__ref-code">{payment.reference_code}</code>
      </div>

      {/* Détails dépliables */}
      <button
        className="cp-card__toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        <FiEye size={14} />
        <span>{expanded ? 'Masquer les détails' : 'Voir les détails'}</span>
        {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="cp-card__details">
          {/* Checklist */}
          <div className="cp-card__checklist">
            <div className="cp-card__checklist-title">✅ Vérifications</div>
            {payment.checklist?.map((item) => (
              <label key={item.id} className="cp-card__check-item">
                <input type="checkbox" />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Preuve image */}
          {payment.proof_signed_url && (
            <div className="cp-card__proof">
              <div className="cp-card__proof-label">📸 Capture d'écran</div>
              <a href={payment.proof_signed_url} target="_blank" rel="noreferrer">
                <img
                  src={payment.proof_signed_url}
                  alt="Preuve de paiement"
                  className="cp-card__proof-img"
                />
              </a>
            </div>
          )}

          {/* ID de transaction */}
          {payment.transaction_id && (
            <div className="cp-card__txid">
              <span className="cp-card__txid-label">ID Transaction :</span>
              <code>{payment.transaction_id}</code>
            </div>
          )}

          {/* Historique logs */}
          {payment.logs?.length > 0 && (
            <div className="cp-card__logs">
              <div className="cp-card__logs-title">Historique</div>
              {payment.logs.map((log, i) => (
                <div key={i} className="cp-card__log">
                  <span className="cp-card__log-action">{log.action}</span>
                  <span className="cp-card__log-time">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions — seulement si statut submitted */}
      {payment.status === 'submitted' && (
        <div className="cp-card__actions">
          <button
            className="btn btn--danger btn--sm"
            onClick={() => setShowRejectModal(true)}
            disabled={isActing}
          >
            <FiX size={16} /> Rejeter
          </button>
          <button
            className="btn btn--success btn--sm"
            onClick={() => onApprove(payment.id)}
            disabled={isActing}
          >
            <FiCheck size={16} /> Approuver
          </button>
        </div>
      )}

      {/* Badge statut si pas submitted */}
      {payment.status !== 'submitted' && (
        <div className={`cp-card__status-badge cp-card__status-badge--${STATUS_LABELS[payment.status]?.color}`}>
          {STATUS_LABELS[payment.status]?.label}
        </div>
      )}

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="cp-reject-modal" onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="cp-reject-modal__box">
            <h3>Raison du rejet</h3>
            <div className="cp-reject-presets">
              {REJECT_PRESETS.map((p) => (
                <button
                  key={p}
                  className={`cp-reject-preset ${rejectionReason === p ? 'active' : ''}`}
                  onClick={() => setRejectionReason(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Précisez la raison (obligatoire)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="cp-reject-modal__actions">
              <button className="btn btn--outline btn--sm" onClick={() => setShowRejectModal(false)}>
                Annuler
              </button>
              <button className="btn btn--danger btn--sm" onClick={handleRejectSubmit} disabled={isActing}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE PRINCIPALE ────────────────────────────────────────────────────────────
export default function CreatorPayments() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [actingId, setActingId] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['creator-payments', statusFilter],
    queryFn: async () => {
      // On charge les détails de chaque paiement pour avoir la checklist
      const list = await api.get('/payments/creator/pending', {
        params: { status: statusFilter, limit: 50 },
      });
      return list.data;
    },
    refetchInterval: 30000, // Auto-refresh toutes les 30s
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/payments/${id}/approve`),
    onSuccess: (_, id) => {
      toast.success('✅ Paiement approuvé !');
      queryClient.invalidateQueries({ queryKey: ['creator-payments'] });
      setActingId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'approbation');
      setActingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/payments/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      toast.success('Paiement rejeté.');
      queryClient.invalidateQueries({ queryKey: ['creator-payments'] });
      setActingId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur lors du rejet');
      setActingId(null);
    },
  });

  const handleApprove = useCallback((id) => {
    setActingId(id);
    approveMutation.mutate(id);
  }, [approveMutation]);

  const handleReject = useCallback((id, reason) => {
    setActingId(id);
    rejectMutation.mutate({ id, reason });
  }, [rejectMutation]);

  const payments = data?.payments || [];
  const pendingCount = data?.pending_count || 0;

  return (
    <div className="page cp-page">
      <div className="container">
        {/* En-tête */}
        <div className="cp-header">
          <div>
            <h1 className="cp-header__title">
              Paiements à valider
              {pendingCount > 0 && (
                <span className="cp-badge">{pendingCount}</span>
              )}
            </h1>
            <p className="cp-header__sub">
              Vérifiez et validez les preuves de paiement de vos abonnés.
            </p>
          </div>
          <button
            className="btn btn--outline btn--sm cp-refresh"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <FiRefreshCw size={16} className={isFetching ? 'spin' : ''} />
          </button>
        </div>

        {/* Filtre statut */}
        <div className="cp-filters">
          <FiFilter size={14} />
          {['submitted', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              className={`cp-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'submitted' ? `À valider${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                : s === 'approved' ? 'Approuvés'
                : s === 'rejected' ? 'Rejetés'
                : 'Tous'}
            </button>
          ))}
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="loading-center" style={{ minHeight: 200 }}>
            <div className="spinner" />
          </div>
        ) : payments.length === 0 ? (
          <div className="cp-empty">
            <FiCheck size={40} className="cp-empty__icon" />
            <p>
              {statusFilter === 'submitted'
                ? 'Aucun paiement en attente. Bravo !'
                : 'Aucun paiement dans cette catégorie.'}
            </p>
          </div>
        ) : (
          <div className="cp-list">
            {payments.map((p) => (
              <PaymentCard
                key={p.id}
                payment={p}
                onApprove={handleApprove}
                onReject={handleReject}
                isActing={actingId === p.id}
              />
            ))}
          </div>
        )}

        {/* Avertissement si paiements urgents */}
        {statusFilter === 'submitted' && payments.some((p) => {
          const age = p.waiting_minutes ?? Math.floor((Date.now() - new Date(p.created_at)) / 60000);
          return age >= 15;
        }) && (
          <div className="cp-alert">
            <FiAlertTriangle size={16} />
            <span>Des paiements attendent depuis plus de 15 min — validez-les pour éviter l'escalade admin.</span>
          </div>
        )}
      </div>
    </div>
  );
}
