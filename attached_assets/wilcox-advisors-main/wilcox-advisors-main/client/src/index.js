import React, { useState, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header'; // Header component
import Footer from './components/Footer'; // Footer component
import ConsultationFormModal from './components/ConsultationFormModal'; // Consultation form modal component
import LoginModal from './components/LoginModal'; // Login modal component
import { UIProvider } from './contexts/UIContext'; // Import UIProvider
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import './index.css'; // Global styles (assumed to exist)

// Lazy load components
const Home = lazy(() => import('./pages/Home'));
const LearnMore = lazy(() => import('./pages/LearnMore'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ClientDashboard = lazy(() => import('./components/ClientDashboard'));
const AdminProtectedRoute = lazy(() => import('./components/ProtectedRoutes').then(module => ({ default: module.AdminProtectedRoute })));
const ClientProtectedRoute = lazy(() => import('./components/ProtectedRoutes').then(module => ({ default: module.ClientProtectedRoute })));

// Wrapper component to manage modal states
function App() {
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  return (
    <Router>
      {/* Pass both modal setters to Header for triggering the modals */}
      <Header 
        setShowConsultationForm={setShowConsultationForm} 
        setShowLoginModal={setShowLoginModal}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        handleLogout={handleLogout}
      />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Home page route with consultation form trigger */}
          <Route
            path="/"
            element={<Home setShowConsultationForm={setShowConsultationForm} />}
          />
          {/* Learn More page route */}
          <Route path="/learn-more" element={<LearnMore />} />
          {/* Protected Admin Dashboard route */}
          <Route
            path="/admin-dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />
          {/* Protected Client Dashboard route */}
          <Route
            path="/client-dashboard"
            element={
              <ClientProtectedRoute>
                <ClientDashboard />
              </ClientProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <Footer />
      {/* Render the modals conditionally */}
      {showConsultationForm && (
        <ConsultationFormModal setShowConsultationForm={setShowConsultationForm} />
      )}
      {showLoginModal && (
        <LoginModal 
          setShowLoginModal={setShowLoginModal} 
          setIsLoggedIn={setIsLoggedIn}
          setIsAdmin={setIsAdmin}
        />
      )}
    </Router>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById('root') // Renders the app into the DOM element with id="root" in index.html
);
