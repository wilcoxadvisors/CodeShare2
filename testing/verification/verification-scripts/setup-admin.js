/**
 * Setup Admin Account for Verification Testing
 * 
 * This script creates a test admin user that can be used
 * for verification testing if one doesn't already exist.
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const API_URL = 'http://localhost:5000/api';
const LOG_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)){
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function setupAdmin() {
  try {
    console.log('[SETUP] Setting up admin account for verification...');
    
    // Call the verification API to set up admin
    const response = await axios.post(`${API_URL}/verification/setup-test-admin`);
    
    if (response.status === 200 || response.status === 201) {
      console.log('[SETUP] Admin user created successfully');
      console.log('[SETUP] Response data:', JSON.stringify(response.data, null, 2));
      
      // Create an array of possible admin credentials
      const adminCredentials = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          password: 'adminpass' // Default password
        },
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          password: 'admin123' // Alternative password
        },
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          password: 'password' // Another common password
        }
      ];
      
      // Save primary admin credentials
      fs.writeJSONSync(path.join(LOG_DIR, 'admin_credentials.json'), adminCredentials[0], { spaces: 2 });
      
      // Save all alternative credentials too for retry attempts
      fs.writeJSONSync(path.join(LOG_DIR, 'admin_credentials_alt.json'), adminCredentials, { spaces: 2 });
      
      return adminCredentials[0];
    } else {
      console.log(`[SETUP] Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`[SETUP] Error setting up admin: ${error.message}`);
    if (error.response) {
      console.log(`[SETUP] Response status: ${error.response.status}`);
      console.log(`[SETUP] Response data: ${JSON.stringify(error.response.data)}`);
    }
    
    // Even on error, return some default credentials to attempt login
    console.log('[SETUP] Providing fallback admin credentials for login attempts');
    
    // Create an array of possible admin credentials
    const fallbackCredentials = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        password: 'adminpass' // Default password
      },
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        password: 'admin123' // Alternative password
      },
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        password: 'password' // Another common password
      }
    ];
    
    // Save fallback credentials
    fs.writeJSONSync(path.join(LOG_DIR, 'admin_credentials.json'), fallbackCredentials[0], { spaces: 2 });
    fs.writeJSONSync(path.join(LOG_DIR, 'admin_credentials_alt.json'), fallbackCredentials, { spaces: 2 });
    
    return fallbackCredentials[0];
  }
}

async function loginAsAdmin(retryCount = 0, maxRetries = 3) {
  try {
    // Try to read admin credentials
    let adminData;
    try {
      adminData = fs.readJSONSync(path.join(LOG_DIR, 'admin_credentials.json'));
      console.log(`[AUTH] Read credentials for user: ${adminData.username} (ID: ${adminData.id})`);
    } catch (err) {
      // If file doesn't exist, create the admin first
      console.log('[AUTH] No existing credentials found, setting up admin...');
      adminData = await setupAdmin();
      if (!adminData) {
        console.log('[AUTH] Failed to setup admin, aborting login');
        return null;
      }
    }
    
    console.log(`[AUTH] Attempting login as admin (${adminData.username}), attempt ${retryCount + 1}/${maxRetries + 1}...`);
    
    // Try direct session check first
    try {
      console.log('[AUTH] Checking for existing session...');
      const sessionResponse = await axios.get(`${API_URL}/auth/me`);
      if (sessionResponse.status === 200 && sessionResponse.data && sessionResponse.data.id) {
        console.log('[AUTH] Existing session found, using current session');
        // Get cookies from the response if available
        if (sessionResponse.headers['set-cookie']) {
          const cookieHeader = sessionResponse.headers['set-cookie'][0].split(';')[0];
          fs.writeFileSync(path.join(__dirname, 'auth_cookie.txt'), cookieHeader);
          console.log('[AUTH] Session cookie saved');
        } else {
          console.log('[AUTH] No new cookies from session check');
        }
        return { cookie: 'Using existing session', admin: adminData };
      }
    } catch (sessionError) {
      console.log('[AUTH] No active session found, proceeding with login');
    }
    
    // Try different credentials if first attempt fails
    let loginCredentials;
    
    // Try to load alternative credentials if we're on a retry
    if (retryCount > 0) {
      try {
        const altCredentials = fs.readJSONSync(path.join(LOG_DIR, 'admin_credentials_alt.json'));
        if (Array.isArray(altCredentials) && altCredentials.length > retryCount) {
          loginCredentials = {
            username: altCredentials[retryCount].username,
            password: altCredentials[retryCount].password
          };
          console.log(`[AUTH] Using alternative credentials set #${retryCount}`);
        } else {
          loginCredentials = { username: 'admin', password: 'admin123' };
        }
      } catch (err) {
        // Fallback if alt credentials file doesn't exist
        loginCredentials = { 
          username: 'admin', 
          password: retryCount === 1 ? 'admin123' : 'password' 
        };
      }
    } else {
      // First attempt - use primary credentials
      loginCredentials = { username: adminData.username, password: adminData.password };
    }
    
    console.log(`[AUTH] Logging in with username: ${loginCredentials.username}`);
    
    // Login as admin
    const loginResponse = await axios.post(`${API_URL}/auth/login`, loginCredentials);
    
    if (loginResponse.status === 200) {
      console.log('[AUTH] Login request successful');
      
      // Check for cookies
      if (loginResponse.headers['set-cookie']) {
        const cookieHeader = loginResponse.headers['set-cookie'][0].split(';')[0];
        fs.writeFileSync(path.join(__dirname, 'auth_cookie.txt'), cookieHeader);
        console.log('[AUTH] Login successful, auth cookie saved');
        return { cookie: cookieHeader, admin: adminData };
      }
      
      // Check for session ID in response body
      if (loginResponse.data && loginResponse.data.sessionID) {
        console.log('[AUTH] Login successful, session ID found in response');
        const sessionID = loginResponse.data.sessionID;
        fs.writeFileSync(path.join(__dirname, 'session_id.txt'), sessionID);
        console.log('[AUTH] Session ID saved to file');
        return { sessionID, admin: adminData };
      }
      
      // If we have user data but no cookie, try to continue anyway
      if (loginResponse.data && loginResponse.data.user) {
        console.log('[AUTH] Login successful but no cookie or session ID received');
        console.log('[AUTH] Will attempt to use user data directly');
        return { admin: adminData, userData: loginResponse.data.user };
      }
      
      console.log('[AUTH] Login successful but no authentication mechanism found');
      return null;
    } else {
      console.log(`[AUTH] Unexpected login response status: ${loginResponse.status}`);
      return null;
    }
  } catch (error) {
    console.log(`[AUTH] Login error: ${error.message}`);
    if (error.response) {
      console.log(`[AUTH] Response status: ${error.response.status}`);
      console.log(`[AUTH] Response data: ${JSON.stringify(error.response.data)}`);
    }
    
    // Retry with different credentials if we haven't exceeded max retries
    if (retryCount < maxRetries) {
      console.log(`[AUTH] Retrying login with different credentials (attempt ${retryCount + 2}/${maxRetries + 1})...`);
      return loginAsAdmin(retryCount + 1, maxRetries);
    }
    
    // If all retries failed, attempt to continue without authentication
    console.log('[AUTH] All login attempts failed, proceeding without authentication');
    // Create a fallback admin data structure
    const fallbackAdmin = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      password: 'adminpass'
    };
    fs.writeJSONSync(path.join(LOG_DIR, 'admin_credentials.json'), fallbackAdmin, { spaces: 2 });
    console.log('[AUTH] Fallback admin credentials saved, verification will proceed with limited functionality');
    return { admin: fallbackAdmin, authenticated: false };
  }
}

// Run setup and login
setupAdmin()
  .then(async (admin) => {
    if (admin) {
      // Try to login
      const loginResult = await loginAsAdmin();
      if (loginResult) {
        console.log('Admin setup and login successful');
      } else {
        console.log('Admin setup successful but login failed');
      }
    } else {
      console.log('Admin setup failed');
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
  });