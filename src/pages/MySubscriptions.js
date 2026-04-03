import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
import api, { formatFCFA } from '../services/api';
import './MySubscriptions.css';

function daysLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MySubscriptions() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => api.get('/payments/my-subscriptions').then((r) => r.data),
  });

  const subscriptions = data?.subscriptions || [];

  return (
    <div className="page mysubs-page">
      <div className="container">
        <h1 className="mysubs-title">Mes abonnements</h1>

        {isLoading && (
          <div className="loading-center" style={{ minHeight: 200 }}>
            <div className="spinner" />
          </div>
        )}

        {!isLoading && subscriptions.length === 0 && (
          <div className="mysubs-empty">
            <FiUser size={48} color="var(--text-secondary)" />
            <p>Vous n'êtes abonné à aucun créateur.</p>
            <Link to="/recherche" className="btn btn--primary">Découvrir des créateurs</Link>
          </div>
        )}

        <div className="mysubs-list">
          {subscriptions.map((sub) => {
            const days = daysLeft(sub.expires_at);
            const isExpiringSoon = days <= 5;

            return (
              <div key={sub.id} className="mysubs-card">
                <Link to={`/profil/${sub.creator?.username}`} className="mysubs-card__creator">
                  {sub.creator?.avatar_url ? (
                    <img src={sub.creator.avatar_url} alt="" className="avatar avatar--md" />
                  ) : (
                    <div className="avatar avatar--md mysubs-card__avatar-placeholder">
                      {sub.creator?.display_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="mysubs-card__info">
                    <div className="mysubs-card__name">
                      {sub.creator?.display_name}
                      {sub.creator?.is_verified && <span className="mysubs-card__verified">✓</span>}
                    </div>
                    <div className="mysubs-card__username">@{sub.creator?.username}</div>
                    {sub.creator?.bio && (
                      <div className="mysubs-card__bio">{sub.creator.bio}</div>
                    )}
                  </div>
                </Link>

                <div className="mysubs-card__footer">
                  <div className="mysubs-card__status">
                    <FiCheckCircle size={14} color="var(--success)" />
                    <span>Actif</span>
                  </div>

                  <div className={`mysubs-card__expiry ${isExpiringSoon ? 'mysubs-card__expiry--soon' : ''}`}>
                    <FiClock size={13} />
                    <span>{days === 0 ? 'Expire aujourd\'hui' : `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`}</span>
                  </div>

                  <div className="mysubs-card__price">
                    {formatFCFA(sub.creator?.subscription_price)}/mois
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
