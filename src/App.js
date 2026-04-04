import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';

// Lazy loading pour économiser la bande passante
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Feed = lazy(() => import('./pages/Feed'));
const Profile = lazy(() => import('./pages/Profile'));
const ContentView = lazy(() => import('./pages/ContentView'));
const Upload = lazy(() => import('./pages/Upload'));
const Messages = lazy(() => import('./pages/Messages'));
const Search = lazy(() => import('./pages/Search'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const CreatorPayments = lazy(() => import('./pages/CreatorPayments'));
const AdminPayments = lazy(() => import('./pages/AdminPayments'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const MySubscriptions = lazy(() => import('./pages/MySubscriptions'));
const MyEarnings = lazy(() => import('./pages/MyEarnings'));
const Notifications = lazy(() => import('./pages/Notifications'));

function LoadingPage() {
  return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/connexion" replace />;
  return children;
}

function CreatorRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role !== 'creator') return <Navigate to="/fil" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role !== 'admin') return <Navigate to="/fil" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (user) return <Navigate to="/fil" replace />;
  return children;
}

function AppLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<LoadingPage />}>
          {children}
        </Suspense>
      </main>
      {user && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/connexion" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/inscription" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/recherche" element={<Search />} />

        {/* Profils publics */}
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/@:username" element={<Profile />} />
        <Route path="/profil/:username" element={<Profile />} />
        <Route path="/contenu/:id" element={<ContentView />} />

        {/* Authentifié */}
        <Route path="/fil" element={<PrivateRoute><Feed /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/messages/:userId" element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/parametres" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/mes-abonnements" element={<PrivateRoute><MySubscriptions /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

        {/* Créateur seulement */}
        <Route path="/publier" element={<CreatorRoute><Upload /></CreatorRoute>} />
        <Route path="/tableau-de-bord" element={<CreatorRoute><Dashboard /></CreatorRoute>} />
        <Route path="/paiements" element={<CreatorRoute><CreatorPayments /></CreatorRoute>} />
        <Route path="/mes-revenus" element={<CreatorRoute><MyEarnings /></CreatorRoute>} />

        {/* Admin seulement */}
        <Route path="/admin/paiements" element={<AdminRoute><AdminPayments /></AdminRoute>} />
        <Route path="/admin/utilisateurs" element={<AdminRoute><AdminUsers /></AdminRoute>} />

        {/* Redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
