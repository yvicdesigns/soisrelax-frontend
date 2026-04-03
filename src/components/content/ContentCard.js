import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiLock, FiPlay, FiDollarSign } from 'react-icons/fi';
import { contentAPI, formatFCFA, formatDate } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PaymentModal from '../payment/PaymentModal';
import toast from 'react-hot-toast';
import './ContentCard.css';

export default function ContentCard({ content, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(content.userLiked || false);
  const [likesCount, setLikesCount] = useState(content.likes_count || 0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentType, setPaymentType] = useState('subscription');

  const isLocked = content.is_locked;
  const isVideo = content.content_type === 'video';

  const handleLike = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/connexion'); return; }
    try {
      const res = await contentAPI.like(content.id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch { /* ignore */ }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!user) { navigate('/connexion'); return; }
    setPaymentType(content.is_ppv ? 'ppv' : 'subscription');
    setShowPayment(true);
  };

  const avatarPlaceholder = content.creator?.display_name?.[0]?.toUpperCase();

  return (
    <>
      <article className="content-card fade-in">
        {/* En-tête créateur */}
        <div className="content-card__header">
          <Link to={`/profil/${content.creator?.username}`} className="content-card__creator">
            {content.creator?.avatar_url ? (
              <img src={content.creator.avatar_url} alt="" className="avatar avatar--sm" />
            ) : (
              <div className="avatar avatar--sm content-card__avatar-placeholder">
                {avatarPlaceholder}
              </div>
            )}
            <div>
              <div className="content-card__creator-name">
                {content.creator?.display_name}
                {content.creator?.is_verified && (
                  <span className="content-card__verified" title="Compte vérifié">✓</span>
                )}
              </div>
              <div className="content-card__time">{formatDate(content.created_at)}</div>
            </div>
          </Link>
        </div>

        {/* Description */}
        {content.description && (
          <p className="content-card__description line-clamp-2">{content.description}</p>
        )}

        {/* Média */}
        <Link to={`/contenu/${content.id}`} className="content-card__media-link">
          <div className={`content-card__media ${isLocked ? 'content-locked' : ''}`}>
            {content.file_url && (
              <>
                {isVideo ? (
                  <div className="content-card__video-thumb">
                    {content.thumbnail_url && (
                      <img src={content.thumbnail_url} alt="" className="content-card__img" loading="lazy" />
                    )}
                    <div className="content-card__play-btn">
                      <FiPlay size={32} fill="white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={isLocked ? content.preview_url || content.file_url : content.file_url}
                    alt={content.title || 'Publication'}
                    className={`content-card__img ${isLocked ? 'content-card__img--blur' : ''}`}
                    loading="lazy"
                  />
                )}
              </>
            )}

            {/* Overlay contenu verrouillé */}
            {isLocked && (
              <div className="lock-overlay">
                <FiLock size={28} color="#fff" />
                <p className="content-card__lock-text">
                  {content.is_ppv
                    ? `Contenu payant: ${formatFCFA(content.ppv_price)}`
                    : `Abonnez-vous pour voir ce contenu`}
                </p>
                <button
                  className="btn btn--primary btn--sm content-card__unlock-btn"
                  onClick={handleUnlock}
                >
                  {content.is_ppv ? (
                    <><FiDollarSign size={16} /> Acheter</>
                  ) : (
                    <><FiLock size={16} /> S'abonner</>
                  )}
                </button>
              </div>
            )}
          </div>
        </Link>

        {/* Actions */}
        <div className="content-card__actions">
          <button
            className={`content-card__action-btn ${liked ? 'content-card__action-btn--liked' : ''}`}
            onClick={handleLike}
          >
            <FiHeart size={20} fill={liked ? 'currentColor' : 'none'} />
            <span>{likesCount > 0 ? likesCount : ''}</span>
          </button>

          <Link to={`/contenu/${content.id}`} className="content-card__action-btn">
            <FiMessageCircle size={20} />
            <span>{content.comments_count > 0 ? content.comments_count : ''}</span>
          </Link>

          <span className="content-card__views">
            {content.views_count > 0 && `${content.views_count} vue${content.views_count > 1 ? 's' : ''}`}
          </span>
        </div>
      </article>

      {showPayment && (
        <PaymentModal
          type={paymentType}
          creator={content.creator}
          content={paymentType === 'ppv' ? content : null}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            onUpdate?.();
          }}
        />
      )}
    </>
  );
}
