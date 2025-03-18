// src/utils/csrf.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com';

export const getCsrfToken = async () => {
  try {
    // Add timestamp to prevent caching
    const response = await axios.get(`${API_URL}/api/csrf-token?t=${new Date().getTime()}`, {
      withCredentials: true
    });
    
    // Store the token
    if (response.data && response.data.csrfToken) {
      localStorage.setItem('csrfToken', response.data.csrfToken);
      return response.data.csrfToken;
    } else {
      throw new Error('No CSRF token received from server');
    }
  } catch (error) {
    console.error('CSRF Token Fetch Error:', error);
    throw error;
  }
};

export const setCsrfToken = (token) => {
  localStorage.setItem('csrfToken', token);
};

export const getStoredCsrfToken = () => {
  return localStorage.getItem('csrfToken');
};
