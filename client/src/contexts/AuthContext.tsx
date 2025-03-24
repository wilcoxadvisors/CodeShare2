import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        console.log('Checking authentication status...');
        
        // Use fetch with credentials explicitly included
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include' // This is crucial for session cookies
        });
        
        console.log('Auth check response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('User authenticated:', data);
          setUser(data.user);
        } else {
          // Check response body for error details
          try {
            const errorData = await response.text();
            console.log('Auth check error response:', errorData);
          } catch (e) {
            console.log('Could not read error response');
          }
          
          // Check if we're on the home page, which allows guest access
          const isHomePage = window.location.pathname === '/';
          console.log('Current path:', window.location.pathname, 'Is home page:', isHomePage);
          
          if (isHomePage) {
            // Create a guest user for home page
            console.log('Setting guest user for home page');
            setUser({
              id: 0,
              username: 'guest',
              name: 'Guest User',
              email: 'guest@example.com',
              role: 'guest'
            });
          } else {
            // For other pages, require login
            setUser(null);
            console.log('Not authenticated:', response.status);
          }
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Login attempt with:', username);
      
      // Use fetch directly with credentials included to properly handle session cookies
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include' // This is crucial for session cookies
      });
      
      // Log response status
      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login response error:', errorText);
        throw new Error(`Login failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Login successful, user data:', data);
      setUser(data.user);
      
      // Verify session after login
      setTimeout(async () => {
        try {
          const sessionCheck = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          const sessionData = await sessionCheck.json();
          console.log('Session check after login:', sessionData);
        } catch (err) {
          console.error('Session check error:', err);
        }
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      // Use fetch directly with credentials included to properly handle session cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // This is crucial for session cookies
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
