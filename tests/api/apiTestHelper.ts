import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { tough } from 'tough-cookie';

// Global authentication state
let authCookie: string | null = null;
let isAuthenticated = false;

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

// Cookie jar for session management
const cookieJar = new tough.CookieJar();

// Configure axios instance with cookie support
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add authentication cookie
apiClient.interceptors.request.use((config) => {
  if (authCookie) {
    config.headers.Cookie = authCookie;
  }
  return config;
});

// Response interceptor to capture and store session cookies
apiClient.interceptors.response.use((response) => {
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    // Extract connect.sid cookie
    const sessionCookie = setCookieHeader.find(cookie => 
      cookie.startsWith('connect.sid=')
    );
    if (sessionCookie) {
      authCookie = sessionCookie.split(';')[0];
      isAuthenticated = true;
    }
  }
  return response;
});

/**
 * Authenticate with the API using test credentials
 */
export async function authenticateTestUser(): Promise<void> {
  try {
    const response = await apiClient.post('/api/auth/login', {
      username: 'admin',
      password: 'password'
    });

    if (response.status === 200) {
      console.log('✅ Test user authenticated successfully');
      isAuthenticated = true;
    } else {
      throw new Error(`Authentication failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Failed to authenticate test user:', error);
    throw error;
  }
}

/**
 * Make authenticated API request
 */
export async function makeAuthenticatedRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  if (!isAuthenticated) {
    await authenticateTestUser();
  }

  const requestConfig: AxiosRequestConfig = {
    method,
    url,
    data,
    ...config
  };

  try {
    const response = await apiClient.request<T>(requestConfig);
    return response;
  } catch (error) {
    // If we get a 401, try to re-authenticate once
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log('🔄 Re-authenticating due to 401 error');
      isAuthenticated = false;
      authCookie = null;
      await authenticateTestUser();
      return await apiClient.request<T>(requestConfig);
    }
    throw error;
  }
}

/**
 * Helper methods for common HTTP operations
 */
export const apiHelper = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    makeAuthenticatedRequest<T>('GET', url, undefined, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    makeAuthenticatedRequest<T>('POST', url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    makeAuthenticatedRequest<T>('PUT', url, data, config),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    makeAuthenticatedRequest<T>('PATCH', url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    makeAuthenticatedRequest<T>('DELETE', url, undefined, config),
};

/**
 * Reset authentication state (useful for test cleanup)
 */
export function resetAuthentication(): void {
  authCookie = null;
  isAuthenticated = false;
  console.log('🔄 Authentication state reset');
}

/**
 * Check if currently authenticated
 */
export function isAuthenticatedUser(): boolean {
  return isAuthenticated;
}