import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiGrid, FiLock, FiMessageCircle, FiUserCheck, FiUserPlus, FiDollarSign, FiSettings } from 'react-icons/fi';
import { userAPI, contentAPI, formatFCFA } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ContentCard from '../components/content/ContentCard';
import PaymentModal from '../components/payment/PaymentModal';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, isCreator } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [following, setFollowing] = useState(false);

  const { data: profileData, isPending, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => userAPI.getProfile(username).then((r) => r.data),
    retry: 1,
  });

  React.useEffect(() => {
    if (profileData?.isFollowing !== undefined) {
      setFollowing(profileData.isFollowing);
    }
  }, [profileData?.isFollowing]);

  const { data: contentData } = useQuery({
    queryKey: ['creator-content', profileData?.user?.id],
    queryFn: () => contentAPI.getCreatorContent(profileData.user.id).then((r) => r.data),
    enabled: !!profileData?.user?.id,
  });

  if (isPending) {
    return (
      <div className="page">
        <div className="loading-center" style={{ height: '60vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !profileData?.user) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 40, textAlign: 'center' }}>
          <h2>Utilisateur introuvable</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            {error?.message || 'Ce profil n\'existe pas.'}
          </p>
        </div>
      </div>
    );
  }

  const { user, isSubscribed } = profileData;
  const isOwner = currentUser?.id === user.id;
  const isCreatorProfile = user.role === 'creator';

  async function handleFollow() {
    if (!currentUser) { navigate('/connexion'); return; }
    try {
      const res = await userAPI.follow(user.id);
      setFollowing(res.data.following);
      toast.success(res.data.message);
      queryClient.invalidateQueries(['profile', username]);
    } catch { toast.error('Erreur'); }
  }

  const contents = contentData?.contents ?? [];

  return (
    <>
      <div className="page profile">
        {/* Cover photo */}
        <div className="profile__cover">
          {user.cover_url ? (
            <img src={user.cover_url} alt="Couverture" className="profile__cover-img" />
          ) : (
            <div className="profile__cover-placeholder" />
          )}
        </div>

        {/* Info principale */}
        <div className="profile__info container">
          {/* Avatar */}
          <div className="profile__avatar-wrap">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name} className="avatar avatar--xxl profile__avatar" />
            ) : (
              <div className="avatar avatar--xxl profile__avatar profile__avatar-placeholder">
                {user.display_name?.[0]?.toUpperCase()}
              </div>
            )}
            {user.is_verified && (
              <div className="profile__verified-badge" title="Compte vérifié">✓</div>
            )}
          </div>

          {/* Nom & username */}
          <div className="profile__name-row">
            <div>
              <h2 className="profile__name">{user.display_name}</h2>
              <p className="profile__username text-secondary">@{user.username}</p>
            </div>

            {/* Actions */}
            <div className="profile__actions">
              {isOwner ? (
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => navigate('/parametres')}
                >
                  <FiSettings size={16} /> Modifier
                </button>
              ) : (
                <>
                  <button
                    className={`btn btn--sm ${following ? 'btn--outline' : 'btn--secondary'}`}
                    onClick={handleFollow}
                  >
                    {following ? <><FiUserCheck size={16} /> Suivi</> : <><FiUserPlus size={16} /> Suivre</>}
                  </button>
                  {currentUser && (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => navigate(`/messages/${user.id}`)}
                    >
                      <FiMessageCircle size={18} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && <p className="profile__bio">{user.bio}</p>}

          {/* Stats */}
          <div className="profile__stats">
            <div className="profile__stat">
              <span className="profile__stat-value">{user.posts_count || 0}</span>
              <span className="profile__stat-label">Publications</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value">{user.followers_count || 0}</span>
              <span className="profile__stat-label">Abonnés</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value">{user.following_count || 0}</span>
              <span className="profile__stat-label">Suivis</span>
            </div>
          </div>

          {/* Boutons créateur */}
          {isCreatorProfile && !isOwner && (
            <div className="profile__cta">
              {isSubscribed ? (
                <div className="profile__subscribed-badge">
                  <FiUserCheck size={16} /> Abonné(e) ✓
                </div>
              ) : (
                <button
                  className="btn btn--primary btn--full"
                  onClick={() => currentUser ? setShowSubscribeModal(true) : navigate('/connexion')}
                >
                  <FiLock size={16} />
                  S'abonner — {formatFCFA(user.subscription_price)}/mois
                </button>
              )}
              {currentUser && (
                <button
                  className="btn btn--outline btn--full"
                  onClick={() => setShowTipModal(true)}
                >
                  <FiDollarSign size={16} /> Envoyer un pourboire
                </button>
              )}
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="profile__tabs">
          <button
            className={`profile__tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FiGrid size={18} />
            <span>Publications</span>
          </button>
          {!isSubscribed && !isOwner && isCreatorProfile && (
            <button
              className={`profile__tab ${activeTab === 'locked' ? 'active' : ''}`}
              onClick={() => setActiveTab('locked')}
            >
              <FiLock size={18} />
              <span>Exclusif</span>
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className="profile__content">
          {contents.length === 0 && (
            <div className="profile__empty">
              {isOwner ? (
                <>
                  <p>Vous n'avez pas encore publié de contenu.</p>
                  <a href="/publier" className="btn btn--primary mt-3">Publier maintenant</a>
                </>
              ) : (
                <p>Aucun contenu publié pour le moment.</p>
              )}
            </div>
          )}

          {contents.map((content) => (
            <ContentCard
              key={content.id}
              content={{ ...content, creator: user }}
              onUpdate={() => queryClient.invalidateQueries(['creator-content', user.id])}
            />
          ))}
        </div>
      </div>

      {showSubscribeModal && (
        <PaymentModal
          type="subscription"
          creator={user}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            queryClient.invalidateQueries(['profile', username]);
            queryClient.invalidateQueries(['creator-content', user.id]);
            toast.success('Abonnement activé !');
          }}
        />
      )}

      {showTipModal && (
        <PaymentModal
          type="tip"
          creator={user}
          onClose={() => setShowTipModal(false)}
          onSuccess={() => {
            setShowTipModal(false);
            toast.success('Pourboire envoyé !');
          }}
        />
      )}
    </>
  );
}
