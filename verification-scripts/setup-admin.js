/**
 * Setup Admin Account for Verification Testing
 * 
 * This script creates a test admin user that can be used
 * for verification testing if one doesn't already exist.
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const LOG_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)){
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function setupAdmin() {
  try {
    console.log('Setting up admin account for verification...');
    
    // Call the verification API to set up admin
    const response = await axios.post(`${API_URL}/verification/setup-test-admin`);
    
    if (response.status === 200 || response.status === 201) {
      console.log('Admin user created successfully');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Save admin details for reference
      const adminData = {
        id: 1, // Admin user typically has ID 1
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        password: 'adminpass' // Default password
      };
      
      fs.writeJSONSync(path.join(LOG_DIR, 'admin_credentials.json'), adminData, { spaces: 2 });
      return adminData;
    } else {
      console.log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`Error setting up admin: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function loginAsAdmin() {
  try {
    // Try to read admin credentials
    let adminData;
    try {
      adminData = fs.readJSONSync(path.join(LOG_DIR, 'admin_credentials.json'));
    } catch (err) {
      // If file doesn't exist, create the admin first
      adminData = await setupAdmin();
      if (!adminData) return null;
    }
    
    console.log(`Logging in as admin (${adminData.username})...`);
    
    // Login as admin
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: adminData.username,
      password: adminData.password
    });
    
    if (loginResponse.status === 200 && loginResponse.headers['set-cookie']) {
      const cookieHeader = loginResponse.headers['set-cookie'][0].split(';')[0];
      fs.writeFileSync(path.join(__dirname, 'auth_cookie.txt'), cookieHeader);
      console.log('Login successful, auth cookie saved');
      return { cookie: cookieHeader, admin: adminData };
    } else {
      console.log('Login successful but no cookie received');
      return null;
    }
  } catch (error) {
    console.log(`Login error: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
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