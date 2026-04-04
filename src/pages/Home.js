import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FiStar, FiDollarSign, FiShield, FiSmartphone } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div className="page"><div className="loading-center" style={{ minHeight: '100vh' }}><div className="spinner" /></div></div>;
  if (user) return <Navigate to="/fil" replace />;

  return (
    <div className="home page--no-nav">
      {/* Hero */}
      <section className="home__hero">
        <div className="container">
          <div className="home__badge badge badge--primary">
            🇨🇬 Fait pour Brazzaville
          </div>
          <h1 className="home__title">
            Monétise ton<br />
            <span className="home__title--highlight">contenu exclusif</span>
          </h1>
          <p className="home__subtitle">
            La plateforme congolaise pour les créateurs de contenu.
            Sois payé en FCFA directement sur ton MTN Money ou Airtel Money.
          </p>

          <div className="home__cta">
            <Link to="/inscription" className="btn btn--primary btn--lg">
              Commencer gratuitement
            </Link>
            <Link to="/recherche" className="btn btn--outline btn--lg">
              Voir les créateurs
            </Link>
          </div>

          {/* Stats */}
          <div className="home__stats">
            <div className="home__stat">
              <span className="home__stat-value">80%</span>
              <span className="home__stat-label">Pour le créateur</span>
            </div>
            <div className="home__stat-divider" />
            <div className="home__stat">
              <span className="home__stat-value">FCFA</span>
              <span className="home__stat-label">Paiement local</span>
            </div>
            <div className="home__stat-divider" />
            <div className="home__stat">
              <span className="home__stat-value">24h</span>
              <span className="home__stat-label">Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="home__features">
        <div className="container">
          <h2 className="home__section-title">Pourquoi SoisRelax ?</h2>

          <div className="home__feature-grid">
            <div className="home__feature card">
              <div className="home__feature-icon">
                <FiSmartphone size={28} color="var(--primary)" />
              </div>
              <h3>Mobile Money</h3>
              <p>Payez et recevez de l'argent avec MTN Money, Airtel Money ou Orange Money. Pas besoin de carte bancaire.</p>
            </div>

            <div className="home__feature card">
              <div className="home__feature-icon">
                <FiDollarSign size={28} color="var(--success)" />
              </div>
              <h3>Gros revenus</h3>
              <p>Gardez 80% de vos abonnements. Fixer vos propres prix en FCFA. Recevez des pourboires directement.</p>
            </div>

            <div className="home__feature card">
              <div className="home__feature-icon">
                <FiShield size={28} color="var(--secondary)" />
              </div>
              <h3>Contenu protégé</h3>
              <p>Votre contenu est protégé. Seuls vos abonnés payants peuvent y accéder. Sécurité maximale.</p>
            </div>

            <div className="home__feature card">
              <div className="home__feature-icon">
                <FiStar size={28} color="var(--accent)" />
              </div>
              <h3>Simple à utiliser</h3>
              <p>Interface en français, conçue pour Congo-Brazzaville. Facile même sans grande expérience internet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="home__how">
        <div className="container">
          <h2 className="home__section-title">Comment ça marche ?</h2>

          <div className="home__steps">
            {[
              { num: '1', title: 'Crée ton compte', desc: 'Inscription gratuite en 2 minutes avec ton email' },
              { num: '2', title: 'Publie ton contenu', desc: 'Photos, vidéos ou textes. Tu choisis le prix' },
              { num: '3', title: 'Tes fans s\'abonnent', desc: 'Ils paient via Mobile Money pour accéder à tes posts' },
              { num: '4', title: 'Tu reçois l\'argent', desc: 'Directement sur ton MTN Money ou Airtel Money' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="home__step">
                <div className="home__step-num">{num}</div>
                <div>
                  <h4 className="home__step-title">{title}</h4>
                  <p className="home__step-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="home__final-cta">
        <div className="container">
          <h2>Prêt(e) à commencer ?</h2>
          <p>Rejoins des centaines de créateurs congolais qui gagnent déjà de l'argent sur SoisRelax.</p>
          <Link to="/inscription" className="btn btn--primary btn--lg btn--full">
            Créer mon compte maintenant
          </Link>
          <p className="home__final-cta__sub">C'est gratuit. Aucune carte bancaire requise.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="home__footer">
        <div className="container">
          <p className="home__footer-logo">Sois<span>Relax</span></p>
          <p>© 2025 SoisRelax · Brazzaville, République du Congo</p>
          <div className="home__footer-links">
            <a href="#">Conditions</a>
            <a href="#">Confidentialité</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
