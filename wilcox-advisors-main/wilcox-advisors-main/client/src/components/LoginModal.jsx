// src/components/LoginModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginModal({ setShowLoginModal }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    if (!loginData.email.trim() || !loginData.password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com';
      
      console.log("Attempting login with:", loginData.email);
      const response = await axios.post(
        `${API_URL}/api/auth/login`, 
        loginData
      );
      
      console.log("Login response:", response.data);
      
      // Store authentication state
      auth.login(response.data.token, response.data.isAdmin);
      setShowLoginModal(false);
      
      // Use React Router's navigate instead of window.location.href
      setTimeout(() => {
        if (response.data.isAdmin) {
          console.log("Redirecting to admin dashboard");
          navigate('/admin-dashboard');
        } else {
          console.log("Redirecting to client dashboard");
          navigate('/client-dashboard');
        }
      }, 100);
    } catch (error) {
      console.error('Login Error:', error);
      
      if (error.response) {
        switch (error.response.status) {
          case 401:
            setError('Invalid email or password. Please try again.');
            break;
          case 403:
            setError('Access forbidden. Please contact administrator.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(error.response.data?.message || 'Login failed. Please try again.');
        }
      } else if (error.request) {
        setError('No response from server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-800">Client Login</h2>
          <button onClick={() => setShowLoginModal(false)} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleLoginSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                required
              />
            </div>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <div className="mt-6 flex justify-between items-center">
            <button 
              type="submit" 
              className="bg-blue-800 text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              className="text-blue-800 hover:underline"
              onClick={() => alert('Please contact support to reset your password.')}
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
