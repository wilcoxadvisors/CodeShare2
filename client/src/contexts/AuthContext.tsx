import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Create context with default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {}
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // Use useState hooks at the top level of the component
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        console.log('🔒 Checking authentication status...');
        
        // Check if we have a debug session ID stored
        const debugSessionID = localStorage.getItem('debug_sessionID');
        if (debugSessionID) {
          console.log('🔒 Debug session ID found:', debugSessionID);
        }
        
        try {
          // Use standard fetch for consistency with login method
          const response = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`Auth check failed with status ${response.status}`);
          }
          
          const data = await response.json();
          console.log('🔒 User authenticated:', data);
          setUser(data.user);
          
          // If we're on the login page and already authenticated, SPA navigation to dashboard
          if (window.location.pathname === '/login') {
            console.log('🔒 Already authenticated, navigating to dashboard...');
            // Using SPA navigation instead of full page refresh
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } catch (error) {
          // Handle authentication failure
          console.log('🔒 Auth check failed:', error);
          
          // Check if we're on the home page, which allows guest access
          const isHomePage = window.location.pathname === '/';
          const isLoginPage = window.location.pathname === '/login';
          console.log('🔒 Current path:', window.location.pathname, 'Is home page:', isHomePage);
          
          if (isHomePage) {
            // Create a guest user for home page
            console.log('🔒 Setting guest user for home page');
            setUser({
              id: 0,
              username: 'guest',
              name: 'Guest User',
              email: 'guest@example.com',
              role: 'guest'
            });
          } else if (!isLoginPage) {
            // For other pages (except login), SPA navigate to login
            console.log('🔒 Not authenticated, navigating to login...');
            setUser(null);
            // Using SPA navigation instead of full page refresh
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            // On login page, just set user to null
            setUser(null);
            console.log('🔒 Not authenticated on login page');
          }
        }
      } catch (error) {
        console.error('🔒 Failed to check authentication status:', error);
        setUser(null);
        
        // On error, navigate to login page if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          console.log('🔒 Auth check error, navigating to login...');
          // Using SPA navigation instead of full page refresh
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔐 Login attempt with:', username);
      
      // Use standard fetch here to avoid double JSON parsing issues
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      if (!loginResponse.ok) {
        console.error('🔐 Login response was not OK:', loginResponse.status);
        return false;
      }
      
      // Try to parse the login response, but don't require it for success
      try {
        const loginData = await loginResponse.json();
        console.log('🔐 Login response:', loginData);
      } catch (parseError) {
        console.warn('🔐 Could not parse login response JSON, but continuing:', parseError);
        // Continue even if parsing fails, as long as status was 200 OK
      }
      
      // Immediately fetch user data to confirm login worked
      const meResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!meResponse.ok) {
        console.error('🔐 Session verification failed:', meResponse.status);
        return false;
      }
      
      const userData = await meResponse.json();
      console.log('🔐 Auth check after login:', userData);
      
      if (userData && userData.user) {
        // Set user from the authenticated session
        setUser(userData.user);
        console.log('🔐 Login successful, user:', userData.user);
        return true;
      } else {
        console.error('🔐 Login succeeded but session verification failed');
        return false;
      }
    } catch (error) {
      console.error('🔐 Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      // Use standard fetch to be consistent with login method
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Log the result but clear user state regardless of success
      if (!response.ok) {
        console.error('Logout response was not OK:', response.status);
      }
      
      // Clear the user state
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// This hook must be used within an AuthProvider component
export function useAuth() {
  // Use the context with our default values
  return useContext(AuthContext);
}
