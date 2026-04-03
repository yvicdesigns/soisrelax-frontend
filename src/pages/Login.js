import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!form.email) errs.email = 'L\'e-mail est requis';
    if (!form.password) errs.password = 'Le mot de passe est requis';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Bienvenue, ${user.display_name} !`);
      navigate('/fil');
    } catch (error) {
      const msg = error.response?.data?.error || 'Erreur de connexion';
      toast.error(msg);
      if (msg.toLowerCase().includes('mot de passe')) {
        setErrors({ password: msg });
      } else {
        setErrors({ email: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page--no-nav">
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <h1 className="auth-logo__text">Sois<span>Relax</span></h1>
          <p className="auth-logo__tagline">Contenu exclusif. Vrai argent.</p>
        </div>

        <div className="auth-card card">
          <h2 className="auth-card__title">Se connecter</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">
                <FiMail size={15} /> Adresse e-mail
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiLock size={15} /> Mot de passe
              </label>
              <div className="auth-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="Votre mot de passe"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Cacher' : 'Afficher'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full btn--lg"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="auth-divider">
            <span>Nouveau sur SoisRelax ?</span>
          </div>

          <Link to="/inscription" className="btn btn--outline btn--full">
            Créer un compte
          </Link>
        </div>

        <p className="auth-legal">
          En continuant, vous acceptez nos{' '}
          <a href="#" className="auth-legal__link">Conditions d'utilisation</a>{' '}
          et notre{' '}
          <a href="#" className="auth-legal__link">Politique de confidentialité</a>.
        </p>
      </div>
    </div>
  );
}
