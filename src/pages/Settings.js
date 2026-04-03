import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiSmartphone, FiLogOut, FiCamera, FiStar } from 'react-icons/fi';
import { userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Settings.css';

function BecomeCreatorSection({ onSuccess }) {
  const [price, setPrice] = useState(2500);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.becomeCreator(price);
      onSuccess(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings__section settings__section--creator">
      <h3 className="settings__section-title"><FiStar size={16} /> Devenir créateur</h3>
      {!open ? (
        <>
          <p className="settings__creator-desc">
            Publiez du contenu exclusif et monétisez votre audience. Vous gagnez 80% de chaque abonnement.
          </p>
          <button className="btn btn--primary btn--full" onClick={() => setOpen(true)}>
            <FiStar size={16} /> Devenir créateur
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Prix d'abonnement mensuel (FCFA)</label>
            <input
              type="number"
              className="form-input"
              min={500}
              step={500}
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 2500)}
            />
            <p className="form-hint">Vous gagnerez {Math.round(price * 0.8).toLocaleString('fr-FR')} FCFA par abonné.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--outline" onClick={() => setOpen(false)}>Annuler</button>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'En cours...' : 'Confirmer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, updateUser, logout, isCreator } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    bio: user?.bio || '',
    subscription_price: user?.subscription_price || 2500,
    mobile_money_number: user?.mobile_money_number || '',
    mobile_money_provider: user?.mobile_money_provider || 'mtn',
  });
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile(form);
      updateUser(res.data.user);
      toast.success('Profil mis à jour !');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await userAPI.updateAvatar(formData);
      updateUser({ avatar_url: res.data.avatar_url });
      toast.success('Photo de profil mise à jour !');
    } catch {
      toast.error('Erreur lors du changement de photo');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
    toast.success('Déconnecté avec succès.');
  }

  return (
    <div className="page settings">
      <div className="container">
        <h2 className="settings__title">Paramètres</h2>

        {/* Avatar */}
        <div className="settings__avatar-section">
          <label className="settings__avatar-label">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="avatar avatar--xl" />
            ) : (
              <div className="avatar avatar--xl settings__avatar-placeholder">
                {user?.display_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="settings__avatar-overlay">
              <FiCamera size={20} color="#fff" />
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </label>
          <p className="settings__avatar-hint">Appuyer pour changer la photo</p>
        </div>

        <form onSubmit={handleSave}>
          {/* Infos générales */}
          <div className="settings__section">
            <h3 className="settings__section-title">
              <FiUser size={16} /> Informations
            </h3>

            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input
                type="text"
                className="form-input"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                style={{ minHeight: 80, resize: 'vertical' }}
                placeholder="Parlez de vous..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
              />
              <p className="form-hint">{form.bio.length}/300</p>
            </div>
          </div>

          {/* Prix abonnement (créateurs) */}
          {isCreator && (
            <div className="settings__section">
              <h3 className="settings__section-title">
                <FiLock size={16} /> Prix de l'abonnement
              </h3>
              <div className="form-group">
                <label className="form-label">Prix mensuel (FCFA)</label>
                <input
                  type="number"
                  className="form-input"
                  min={500}
                  step={500}
                  value={form.subscription_price}
                  onChange={(e) => setForm({ ...form, subscription_price: parseInt(e.target.value) || 2500 })}
                />
                <p className="form-hint">Minimum 500 FCFA. Vous gagnez 80%.</p>
              </div>
            </div>
          )}

          {/* Mobile Money */}
          <div className="settings__section">
            <h3 className="settings__section-title">
              <FiSmartphone size={16} /> Mobile Money
            </h3>

            <div className="form-group">
              <label className="form-label">Opérateur</label>
              <select
                className="form-input"
                value={form.mobile_money_provider}
                onChange={(e) => setForm({ ...form, mobile_money_provider: e.target.value })}
              >
                <option value="mtn">MTN Mobile Money</option>
                <option value="airtel">Airtel Money</option>
                <option value="orange">Orange Money</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Numéro</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+242 06 xxx xxxx"
                value={form.mobile_money_number}
                onChange={(e) => setForm({ ...form, mobile_money_number: e.target.value })}
              />
              <p className="form-hint">Numéro où vous recevrez vos paiements</p>
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </form>

        {/* Devenir créateur (abonnés seulement) */}
        {user?.role === 'subscriber' && <BecomeCreatorSection onSuccess={(updatedUser) => { updateUser(updatedUser); toast.success('Vous êtes maintenant créateur !'); navigate('/tableau-de-bord'); }} />}

        {/* Déconnexion */}
        <div className="settings__section settings__section--danger">
          <button className="btn btn--danger btn--full" onClick={handleLogout}>
            <FiLogOut size={16} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
