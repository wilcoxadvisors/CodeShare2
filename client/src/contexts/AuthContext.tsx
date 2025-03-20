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
        // Use fetch with credentials explicitly included
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include' // This is crucial for session cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Check if we're on the home page, which allows guest access
          const isHomePage = window.location.pathname === '/';
          
          if (isHomePage) {
            // Create a guest user for home page
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
      // Use fetch directly with credentials included to properly handle session cookies
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include' // This is crucial for session cookies
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      setUser(data.user);
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
