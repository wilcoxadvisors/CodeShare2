// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import LearnMore from './pages/LearnMore';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';
import LoginModal from './components/LoginModal';
import ConsultationFormModal from './components/ConsultationFormModal';
import { AdminProtectedRoute, ClientProtectedRoute } from './components/ProtectedRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showConsultationForm, setShowConsultationForm] = useState(false);

  return (
    <AuthProvider>
      <UIProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header
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
            {showLogin && 
              <LoginModal 
                setShowLoginModal={setShowLogin} 
              />
            }
            {showConsultationForm && <ConsultationFormModal setShowConsultationForm={setShowConsultationForm} />}
          </div>
        </Router>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;
