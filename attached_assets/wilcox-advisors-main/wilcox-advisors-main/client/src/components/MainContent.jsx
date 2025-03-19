// src/components/MainContent.jsx
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import Header from './Header';
import Footer from './Footer';
import Home from '../pages/Home';
import LearnMore from '../pages/LearnMore';
import AdminDashboard from './AdminDashboard';
import ClientDashboard from './ClientDashboard';
import { AdminProtectedRoute, ClientProtectedRoute } from './ProtectedRoutes';
import LoginModal from './LoginModal';
import ConsultationFormModal from './ConsultationFormModal';

function MainContent() {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const { showLogin, setShowLogin, showConsultationForm, setShowConsultationForm } = useUI();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        handleLogout={handleLogout}
        setShowLoginModal={setShowLogin}
      />
      <Routes>
        <Route path="/" element={<Home setShowConsultationForm={setShowConsultationForm} />} />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/admin-dashboard" element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        } />
        <Route path="/client-dashboard" element={
          <ClientProtectedRoute>
            <ClientDashboard />
          </ClientProtectedRoute>
        } />
      </Routes>
      <Footer />
      {showLogin && <LoginModal setShowLoginModal={setShowLogin} />}
      {showConsultationForm && <ConsultationFormModal setShowConsultationForm={setShowConsultationForm} />}
    </div>
  );
}

export default MainContent;
