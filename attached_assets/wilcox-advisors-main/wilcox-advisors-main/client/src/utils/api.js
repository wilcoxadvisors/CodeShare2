import axios from 'axios';

// Use environment variables for API URL
const API_URL = process.env.REACT_APP_API_URL || '';

// Configure axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to set CSRF token
api.interceptors.request.use(
  async (config) => {
    // Only add the X-CSRF-Token header for mutating requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      const csrfToken = localStorage.getItem('csrfToken');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 403 CSRF errors by refreshing the token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is due to CSRF token and we haven't already retried
    if (error.response?.status === 403 && 
        error.response?.data?.message === 'Invalid CSRF token' && 
        !originalRequest._retry) {
      
      originalRequest._retry = true;
      
      try {
        // Fetch a new CSRF token
        const response = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true });
        const token = response.data.csrfToken;
        
        // Store the new token
        localStorage.setItem('csrfToken', token);
        
        // Update the header and retry
        originalRequest.headers['X-CSRF-Token'] = token;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
