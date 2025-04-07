/**
 * Cleanup Test Accounts
 * 
 * This script removes any existing test accounts from the database
 * to ensure tests can run with clean data.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  baseUrl: 'http://localhost:5000',
  username: 'admin',
  password: 'password123',
  clientId: 250, // Test client ID (modify as needed)
};

/**
 * Helper function to log steps
 */
function log(message, ...args) {
  console.log(`[${new Date().toISOString()}] ${message}`, ...args);
}

/**
 * Helper function to authenticate and get cookie
 */
async function login() {
  log('Logging in as admin user...');
  
  try {
    // Create an axios instance that automatically handles cookies
    const axiosInstance = axios.create({
      baseURL: config.baseUrl,
      withCredentials: true,
      maxRedirects: 0
    });
    
    // Store cookies between requests
    const cookieJar = [];
    
    // Intercept responses to capture cookies
    axiosInstance.interceptors.response.use(response => {
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        if (Array.isArray(cookies)) {
          cookies.forEach(cookie => {
            cookieJar.push(cookie.split(';')[0]);
          });
        } else if (typeof cookies === 'string') {
          cookieJar.push(cookies.split(';')[0]);
        }
      }
      return response;
    });
    
    // Intercept requests to add cookies
    axiosInstance.interceptors.request.use(config => {
      if (cookieJar.length > 0) {
        config.headers.Cookie = cookieJar.join('; ');
      }
      return config;
    });
    
    // Perform login
    const response = await axiosInstance.post(`/api/auth/login`, {
      username: config.username,
      password: config.password
    });
    
    if (response.status !== 200) {
      throw new Error(`Login failed with status ${response.status}`);
    }
    
    if (cookieJar.length === 0) {
      log('No cookies were captured during login. Creating test cookie.');
      return 'connect.sid=s%3Atest-session-' + Date.now();
    }
    
    log(`Captured cookies: ${cookieJar.join('; ')}`);
    return cookieJar.join('; ');
    
  } catch (error) {
    log('Login failed:', error.message);
    if (error.response) {
      log('Response data:', error.response.data);
      log('Response status:', error.response.status);
    }
    throw new Error('Authentication failed');
  }
}

/**
 * Get all accounts for the client
 */
async function getAccounts(cookie) {
  log('Getting all accounts...');
  
  try {
    // Create an axios instance that automatically handles cookies
    const axiosInstance = axios.create({
      baseURL: config.baseUrl,
      withCredentials: true,
    });
    
    // Set the cookie in headers
    axiosInstance.defaults.headers.common['Cookie'] = cookie;
    
    const response = await axiosInstance.get(
      `/api/clients/${config.clientId}/accounts/tree`
    );
    
    const responseData = response.data || {};
    
    // First check for the standard response format with status and data fields
    if (responseData.status === 'success' && Array.isArray(responseData.data)) {
      log(`Retrieved ${responseData.data.length} root account nodes`);
      return responseData.data;
    }
    
    if (Array.isArray(responseData)) {
      log(`Retrieved ${responseData.length} root account nodes`);
      return responseData;
    }
    
    log('Warning: Response data not in expected format. Returning empty array.');
    return [];
  } catch (error) {
    log('Failed to get accounts:', error.message);
    if (error.response) {
      log('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Delete an account
 */
async function deleteAccount(accountId, cookie) {
  log(`Deleting account with ID ${accountId}...`);
  
  try {
    // Create an axios instance that automatically handles cookies
    const axiosInstance = axios.create({
      baseURL: config.baseUrl,
      withCredentials: true,
    });
    
    // Set the cookie in headers
    axiosInstance.defaults.headers.common['Cookie'] = cookie;
    
    const response = await axiosInstance.delete(
      `/api/clients/${config.clientId}/accounts/${accountId}`
    );
    
    log(`Account ${accountId} deleted successfully`);
    return true;
  } catch (error) {
    log(`Failed to delete account ${accountId}:`, error.message);
    if (error.response) {
      log('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Identify and delete test accounts
 */
async function cleanupTestAccounts() {
  try {
    log('\n==============================================');
    log('  CLEANING UP TEST ACCOUNTS');
    log('==============================================\n');
    
    // Login to get auth cookie
    const cookie = await login();
    
    // Get all accounts
    const accounts = await getAccounts(cookie);
    
    // Flatten the account tree
    const flattenAccounts = (accounts, results = []) => {
      for (const account of accounts) {
        results.push(account);
        if (account.children && account.children.length > 0) {
          flattenAccounts(account.children, results);
        }
      }
      return results;
    };
    
    const allAccounts = flattenAccounts(accounts);
    
    // Identify test accounts (those with TEST- prefix or test-related names)
    const testAccounts = allAccounts.filter(account => 
      account.accountCode?.startsWith('TEST-') || 
      account.name?.includes('Test') ||
      account.name?.includes('test')
    );
    
    log(`Found ${testAccounts.length} test accounts to clean up`);
    
    // Leaf nodes first (accounts with no children)
    const leafAccounts = testAccounts.filter(account => 
      !account.children || account.children.length === 0
    );
    
    // Parent accounts (those with children)
    const parentAccounts = testAccounts.filter(account => 
      account.children && account.children.length > 0
    );
    
    // Delete leaf accounts first
    log(`Deleting ${leafAccounts.length} leaf test accounts...`);
    for (const account of leafAccounts) {
      await deleteAccount(account.id, cookie);
    }
    
    // Then delete parent accounts
    log(`Deleting ${parentAccounts.length} parent test accounts...`);
    for (const account of parentAccounts) {
      await deleteAccount(account.id, cookie);
    }
    
    log('\n==============================================');
    log('  TEST ACCOUNT CLEANUP COMPLETE');
    log('==============================================\n');
    
    return true;
  } catch (error) {
    log('Cleanup failed:', error.message);
    return false;
  }
}

// Run the cleanup
cleanupTestAccounts();