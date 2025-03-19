// src/components/ProtectedRoutes.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminProtectedRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  console.log("AdminProtectedRoute check:", { isLoggedIn, isAdmin });
  
  if (!isLoggedIn) {
    console.log("Not logged in, redirecting to home");
    return <Navigate to="/" />;
  }
  
  if (!isAdmin) {
    console.log("Not admin, redirecting to client dashboard");
    return <Navigate to="/client-dashboard" />;
  }
  
  console.log("Admin access granted");
  return children;
}

export function ClientProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  console.log("ClientProtectedRoute check:", { isLoggedIn });
  
  if (!isLoggedIn) {
    console.log("Not logged in, redirecting to home");
    return <Navigate to="/" />;
  }
  
  console.log("Client access granted");
  return children;
}
