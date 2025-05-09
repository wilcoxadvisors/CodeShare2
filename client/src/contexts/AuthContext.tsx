import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

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
  isGuestUser: boolean; // Added flag to easily identify guest users
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Create context with default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isGuestUser: false,
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
        console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Checking authentication status...');
        
        // Check if we have a debug session ID stored
        const debugSessionID = localStorage.getItem('debug_sessionID');
        if (debugSessionID) {
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Debug session ID found:', debugSessionID);
        }
        
        try {
          // Use standard fetch for consistency with login method
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Making fetch request to /api/auth/me with credentials');
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Auth check response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Auth check failed with status ${response.status}`);
          }
          
          const data = await response.json();
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: User authenticated:', data);
          
          // Set user state with fetched data
          setUser(data.user);
          
          // Important: When authenticated on initial load, we need to invalidate and refresh entity/client data
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Authentication successful, triggering query invalidation to ensure fresh data');
          
          // Invalidate entity and client queries to ensure fresh data with auth context
          await queryClient.resetQueries({ queryKey: ['/api/entities'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
          await queryClient.refetchQueries({ queryKey: ['/api/entities'] });
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Invalidated and refetched entity queries');
          
          // If we're on the login page and already authenticated, SPA navigation to dashboard
          if (window.location.pathname === '/login') {
            console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Already authenticated on login page, navigating to dashboard...');
            // Using SPA navigation instead of full page refresh
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } catch (error) {
          // Handle authentication failure
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Auth check failed:', error);
          
          // Check if we're on the home page, which allows guest access
          const isHomePage = window.location.pathname === '/';
          const isLoginPage = window.location.pathname === '/login';
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Current path:', window.location.pathname, 'Is home page:', isHomePage);
          
          if (isHomePage) {
            // Create a guest user for home page
            console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Setting guest user for home page');
            setUser({
              id: 0,
              username: 'guest',
              name: 'Guest User',
              email: 'guest@example.com',
              role: 'guest'
            });
            
            // IMPORTANT: Since we're setting a guest user without real backend authentication,
            // make sure to reset entity-related queries to avoid 401 errors in the logs
            console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Reset entity queries for guest user to avoid 401 errors');
            queryClient.resetQueries({ queryKey: ['/api/entities'] });
            queryClient.resetQueries({ queryKey: ['/api/clients'] });
          } else if (!isLoginPage) {
            // For other pages (except login), SPA navigate to login
            console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Not authenticated, navigating to login...');
            setUser(null);
            // Reset queries before navigation
            queryClient.resetQueries({ queryKey: ['/api/entities'] });
            queryClient.resetQueries({ queryKey: ['/api/clients'] });
            // Using SPA navigation instead of full page refresh
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            // On login page, just set user to null
            setUser(null);
            console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Not authenticated on login page');
            queryClient.resetQueries({ queryKey: ['/api/entities'] });
            queryClient.resetQueries({ queryKey: ['/api/clients'] });
          }
        }
      } catch (error) {
        console.error('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Failed to check authentication status:', error);
        setUser(null);
        
        // Also reset queries on error
        queryClient.resetQueries({ queryKey: ['/api/entities'] });
        queryClient.resetQueries({ queryKey: ['/api/clients'] });
        
        // On error, navigate to login page if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Auth check error, navigating to login...');
          // Using SPA navigation instead of full page refresh
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } finally {
        console.log('ARCHITECT_DEBUG_AUTH_CTX_CHECK: Auth check completed, setting isLoading to false');
        setIsLoading(false);
      }
    }
    
    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login attempt with:', username);
      
      // Use standard fetch here to avoid double JSON parsing issues
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Making login request with credentials');
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login response status:', loginResponse.status);
      
      if (!loginResponse.ok) {
        console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login response was not OK:', loginResponse.status);
        return false;
      }
      
      // Try to parse the login response, but don't require it for success
      try {
        const loginData = await loginResponse.json();
        console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login response data:', loginData);
      } catch (parseError) {
        console.warn('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Could not parse login response JSON, but continuing:', parseError);
        // Continue even if parsing fails, as long as status was 200 OK
      }
      
      // Immediately fetch user data to confirm login worked
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Verifying session with /api/auth/me');
      const meResponse = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Session verification status:', meResponse.status);
      
      if (!meResponse.ok) {
        console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Session verification failed:', meResponse.status);
        return false;
      }
      
      const userData = await meResponse.json();
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Session verification data:', userData);
      
      if (userData && userData.user) {
        // Set user from the authenticated session
        console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Setting authenticated user:', userData.user);
        setUser(userData.user);
        
        // CRITICAL: When login is successful, we MUST ensure React Query knows to refetch
        // data that depends on authentication.
        console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login successful. User set:', userData.user);
        console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Starting critical query invalidation sequence...');
        
        try {
          // First reset to clear any stale data
          console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Step 1 - Resetting [/api/entities] and [/api/clients] queries to clear stale data');
          await queryClient.resetQueries({ queryKey: ['/api/entities'] });
          await queryClient.resetQueries({ queryKey: ['/api/clients'] });
          
          // Then invalidate to trigger fresh fetch with auth credentials
          console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Step 2 - Invalidating [/api/entities] and [/api/clients] queries NOW to force refetch');
          await queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          
          // Explicitly trigger a refetch to ensure the data is loaded immediately
          console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Step 3 - Explicitly triggering refetch for [/api/entities] and [/api/clients]');
          const entityRefetchPromise = queryClient.refetchQueries({ queryKey: ['/api/entities'] });
          const clientRefetchPromise = queryClient.refetchQueries({ queryKey: ['/api/clients'] });
          
          // Wait for both refetch operations to complete
          console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Waiting for refetch operations to complete...');
          await Promise.all([entityRefetchPromise, clientRefetchPromise]);
          
          console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Query invalidation sequence completed. Entities should load without page reload.');
        } catch (queryError) {
          console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Error during query invalidation sequence:', queryError);
          // Continue even if there's an error in the query invalidation process
          // The user is still authenticated
        }
        
        return true;
      } else {
        console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login succeeded but session verification failed');
        return false;
      }
    } catch (error) {
      console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGIN: Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Starting logout process');
      
      // Use standard fetch to be consistent with login method
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Making logout request with credentials');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Logout response status:', response.status);
      
      // Log the result but clear user state regardless of success
      if (!response.ok) {
        console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Logout response was not OK:', response.status);
      } else {
        console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Logout successful');
      }
      
      // Clear the user state
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Clearing user state');
      setUser(null);
      
      // Clear entity-related data from cache
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Clearing entity and client data caches');
      await queryClient.resetQueries({ queryKey: ['/api/entities'] });
      await queryClient.resetQueries({ queryKey: ['/api/clients'] });
      
      // Navigate to login page
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Redirecting to login page');
      // Use full page refresh to ensure complete state reset
      window.location.href = '/login';
    } catch (error) {
      console.error('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Logout failed:', error);
      // Clear the user state even if logout API call fails
      setUser(null);
    } finally {
      console.log('ARCHITECT_DEBUG_AUTH_CTX_LOGOUT: Logout process completed');
      setIsLoading(false);
    }
  };

  // Helper function to determine if the current user is a guest
  const isGuestUser = user?.id === 0 && user?.username === 'guest';

  const value = {
    user,
    isLoading,
    isGuestUser,
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
