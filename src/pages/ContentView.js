import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiHeart, FiArrowLeft, FiSend, FiLock } from 'react-icons/fi';
import { contentAPI, formatDate, formatFCFA } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PaymentModal from '../components/payment/PaymentModal';
import toast from 'react-hot-toast';
import './ContentView.css';

export default function ContentView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [comments, setComments] = useState([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['content', id],
    queryFn: () => contentAPI.getContent(id).then((r) => r.data),
    onSuccess: (data) => {
      setLiked(data.userLiked);
      setLikesCount(data.content.likes_count);
      setComments(data.content.comments || []);
    },
  });

  if (isLoading) {
    return <div className="loading-center" style={{ height: '80vh' }}><div className="spinner" /></div>;
  }

  if (!data?.content) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: 'center', paddingTop: 60 }}>
          <h2>Contenu introuvable</h2>
          <button className="btn btn--outline mt-4" onClick={() => navigate(-1)}>Retour</button>
        </div>
      </div>
    );
  }

  const { content, hasAccess } = data;
  const isLocked = !hasAccess && !content.is_free;

  async function handleLike() {
    if (!user) { navigate('/connexion'); return; }
    try {
      const res = await contentAPI.like(id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch { /* ignore */ }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!user) { navigate('/connexion'); return; }
    try {
      const res = await contentAPI.comment(id, comment.trim());
      setComments((prev) => [res.data.comment, ...prev]);
      setComment('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <>
      <div className="page content-view">
        {/* Header */}
        <div className="content-view__nav">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
            <FiArrowLeft size={20} /> Retour
          </button>
        </div>

        {/* Créateur */}
        {content.creator && (
          <div className="content-view__creator container">
            <Link to={`/profil/${content.creator.username}`} className="content-view__creator-link">
              {content.creator.avatar_url ? (
                <img src={content.creator.avatar_url} alt="" className="avatar avatar--md" />
              ) : (
                <div className="avatar avatar--md content-view__avatar-placeholder">
                  {content.creator.display_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="content-view__creator-name">
                  {content.creator.display_name}
                  {content.creator.is_verified && <span className="content-view__verified">✓</span>}
                </div>
                <div className="text-secondary text-xs">{formatDate(content.created_at)}</div>
              </div>
            </Link>
          </div>
        )}

        {/* Description */}
        {content.description && (
          <p className="content-view__description container">{content.description}</p>
        )}

        {/* Média */}
        {content.file_url && !isLocked && (
          <div className="content-view__media">
            {content.content_type === 'video' ? (
              <video src={content.file_url} controls className="content-view__video" playsInline />
            ) : (
              <img src={content.file_url} alt={content.title || ''} className="content-view__image" />
            )}
          </div>
        )}

        {/* Contenu verrouillé */}
        {isLocked && (
          <div className="content-view__locked">
            <div className="content-locked" style={{ minHeight: 200 }}>
              {content.thumbnail_url && (
                <img src={content.thumbnail_url} alt="" className="content-view__image" style={{ filter: 'blur(20px)' }} />
              )}
              <div className="lock-overlay" style={{ position: 'static', background: 'none', color: 'inherit' }}>
                <FiLock size={36} color="var(--primary)" />
                <h3 style={{ marginTop: 12 }}>Contenu exclusif</h3>
                <p className="text-secondary" style={{ margin: '8px 0 16px' }}>
                  {content.is_ppv
                    ? `Achetez ce contenu pour ${formatFCFA(content.ppv_price)}`
                    : `Abonnez-vous à ${content.creator?.display_name} pour voir ce contenu`}
                </p>
                <button
                  className="btn btn--primary"
                  onClick={() => user ? setShowPayment(true) : navigate('/connexion')}
                >
                  {content.is_ppv ? `Acheter — ${formatFCFA(content.ppv_price)}` : `S'abonner — ${formatFCFA(content.creator?.subscription_price)}/mois`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="content-view__actions container">
          <button
            className={`content-view__action ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <FiHeart size={22} fill={liked ? 'currentColor' : 'none'} />
            <span>{likesCount > 0 ? `${likesCount} J'aime` : 'J\'aimer'}</span>
          </button>
          <span className="text-secondary text-xs">
            {content.views_count} vue{content.views_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="divider" />

        {/* Commentaires */}
        <div className="content-view__comments container">
          <h3 className="content-view__comments-title">
            Commentaires {comments.length > 0 && `(${comments.length})`}
          </h3>

          {/* Ajouter un commentaire */}
          {user && hasAccess && (
            <form onSubmit={handleComment} className="content-view__comment-form">
              <img
                src={user.avatar_url}
                alt=""
                className="avatar avatar--sm"
                style={{ background: 'var(--primary)', display: user.avatar_url ? 'block' : 'none' }}
              />
              <input
                type="text"
                className="content-view__comment-input"
                placeholder="Ajouter un commentaire..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="content-view__comment-send" disabled={!comment.trim()}>
                <FiSend size={18} />
              </button>
            </form>
          )}

          {comments.length === 0 && (
            <p className="text-secondary text-sm" style={{ padding: '20px 0' }}>
              Pas encore de commentaires.
            </p>
          )}

          {comments.map((c) => (
            <div key={c.id} className="content-view__comment">
              <div className="content-view__comment-avatar">
                {c.user?.avatar_url ? (
                  <img src={c.user.avatar_url} alt="" className="avatar avatar--sm" />
                ) : (
                  <div className="avatar avatar--sm" style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                    {c.user?.display_name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="content-view__comment-body">
                <Link to={`/profil/${c.user?.username}`} className="content-view__comment-name">
                  {c.user?.display_name}
                </Link>
                <p className="content-view__comment-text">{c.text}</p>
                <span className="content-view__comment-time text-xs text-secondary">
                  {formatDate(c.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          type={content.is_ppv ? 'ppv' : 'subscription'}
          creator={content.creator}
          content={content.is_ppv ? content : null}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); refetch(); }}
        />
      )}
    </>
  );
}
