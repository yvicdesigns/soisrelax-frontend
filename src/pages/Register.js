import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiPhone, FiCamera, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const STEPS = ['type', 'info', 'password'];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    role: 'subscriber',
    display_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validateStep() {
    const errs = {};
    if (step === 1) {
      if (!form.display_name.trim()) errs.display_name = 'Votre nom est requis';
      if (!form.username.trim()) errs.username = 'Le nom d\'utilisateur est requis';
      if (form.username.length < 3) errs.username = 'Minimum 3 caractères';
      if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Lettres, chiffres et _ seulement';
      if (!form.email.trim()) errs.email = 'L\'e-mail est requis';
      if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail invalide';
    }
    if (step === 2) {
      if (!form.password) errs.password = 'Le mot de passe est requis';
      if (form.password.length < 8) errs.password = 'Minimum 8 caractères';
      if (form.password !== form.confirm_password) errs.confirm_password = 'Les mots de passe ne correspondent pas';
    }
    return errs;
  }

  function nextStep() {
    const errs = validateStep();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep((s) => s + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateStep();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const user = await register({
        role: form.role,
        display_name: form.display_name,
        username: form.username.toLowerCase(),
        email: form.email.toLowerCase(),
        phone: form.phone || undefined,
        password: form.password,
      });
      toast.success('Bienvenue sur SoisRelax !');
      navigate('/fil');
    } catch (error) {
      const msg = error.response?.data?.error || 'Erreur lors de l\'inscription';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
      else if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('utilisateur')) setErrors({ username: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page--no-nav">
      <div className="auth-container">
        <div className="auth-logo">
          <h1 className="auth-logo__text">Sois<span>Relax</span></h1>
        </div>

        {/* Indicateur d'étapes */}
        <div className="auth-steps">
          {STEPS.map((_, i) => (
            <div key={i} className={`auth-step ${i <= step ? 'auth-step--active' : ''}`} />
          ))}
        </div>

        <div className="auth-card card">

          {/* Étape 0 - Choisir le type */}
          {step === 0 && (
            <>
              <h2 className="auth-card__title">Je suis...</h2>
              <p className="auth-card__subtitle">Choisissez votre profil</p>

              <div className="auth-role-cards">
                <button
                  className={`auth-role-card ${form.role === 'subscriber' ? 'active' : ''}`}
                  onClick={() => update('role', 'subscriber')}
                >
                  <span className="auth-role-card__emoji">👤</span>
                  <div>
                    <div className="auth-role-card__title">Abonné</div>
                    <div className="auth-role-card__desc">Je veux voir du contenu exclusif</div>
                  </div>
                </button>

                <button
                  className={`auth-role-card ${form.role === 'creator' ? 'active' : ''}`}
                  onClick={() => update('role', 'creator')}
                >
                  <span className="auth-role-card__emoji">🎥</span>
                  <div>
                    <div className="auth-role-card__title">Créateur</div>
                    <div className="auth-role-card__desc">Je veux publier et gagner de l'argent</div>
                  </div>
                </button>
              </div>

              {form.role === 'creator' && (
                <div className="auth-creator-info">
                  <FiDollarSign size={18} color="var(--success)" />
                  <span>Gagnez jusqu'à <strong>80% de vos revenus</strong> directement sur votre Mobile Money</span>
                </div>
              )}

              <button className="btn btn--primary btn--full btn--lg mt-4" onClick={nextStep}>
                Continuer
              </button>

              <p className="auth-divider" style={{ marginTop: 16 }}>
                <span>Déjà un compte ? </span>
                <Link to="/connexion" className="auth-legal__link">Se connecter</Link>
              </p>
            </>
          )}

          {/* Étape 1 - Informations */}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} noValidate>
              <h2 className="auth-card__title">Vos informations</h2>

              <div className="form-group">
                <label className="form-label"><FiUser size={15} /> Votre nom complet</label>
                <input
                  type="text"
                  className={`form-input ${errors.display_name ? 'form-input--error' : ''}`}
                  placeholder="Ex: Marie Nguesso"
                  value={form.display_name}
                  onChange={(e) => update('display_name', e.target.value)}
                  autoFocus
                />
                {errors.display_name && <p className="form-error">{errors.display_name}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">@ Nom d'utilisateur</label>
                <div className="auth-username-field">
                  <span className="auth-username-prefix">@</span>
                  <input
                    type="text"
                    className={`form-input auth-username-input ${errors.username ? 'form-input--error' : ''}`}
                    placeholder="marie_nguesso"
                    value={form.username}
                    onChange={(e) => update('username', e.target.value.toLowerCase())}
                  />
                </div>
                {errors.username && <p className="form-error">{errors.username}</p>}
              </div>

              <div className="form-group">
                <label className="form-label"><FiMail size={15} /> Adresse e-mail</label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label className="form-label"><FiPhone size={15} /> Téléphone (facultatif)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+242 06 xxx xxxx"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn--primary btn--full btn--lg">
                Continuer
              </button>
              <button type="button" className="btn btn--ghost btn--full mt-2" onClick={() => setStep(0)}>
                Retour
              </button>
            </form>
          )}

          {/* Étape 2 - Mot de passe */}
          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="auth-card__title">Créer un mot de passe</h2>
              <p className="auth-card__subtitle">Minimum 8 caractères</p>

              <div className="form-group">
                <label className="form-label"><FiLock size={15} /> Mot de passe</label>
                <input
                  type="password"
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="Minimum 8 caractères"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoFocus
                />
                {errors.password && <p className="form-error">{errors.password}</p>}

                {/* Force du mot de passe */}
                {form.password && (
                  <div className="auth-password-strength">
                    <div
                      className="auth-password-strength__bar"
                      style={{
                        width: `${Math.min(100, (form.password.length / 12) * 100)}%`,
                        background: form.password.length < 8 ? 'var(--danger)'
                          : form.password.length < 10 ? 'var(--warning)'
                          : 'var(--success)',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label"><FiLock size={15} /> Confirmer le mot de passe</label>
                <input
                  type="password"
                  className={`form-input ${errors.confirm_password ? 'form-input--error' : ''}`}
                  placeholder="Répéter le mot de passe"
                  value={form.confirm_password}
                  onChange={(e) => update('confirm_password', e.target.value)}
                />
                {errors.confirm_password && <p className="form-error">{errors.confirm_password}</p>}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full btn--lg"
                disabled={loading}
              >
                {loading ? 'Création du compte...' : 'Créer mon compte'}
              </button>
              <button type="button" className="btn btn--ghost btn--full mt-2" onClick={() => setStep(1)}>
                Retour
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
