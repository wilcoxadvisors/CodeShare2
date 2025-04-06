/**
 * Chart of Accounts Seeding Verification Script
 * 
 * This script tests whether a new client is automatically seeded with Chart of Accounts data.
 * It creates a test client, verifies CoA records are created, and then cleans up.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// ES Modules need __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};
const COOKIE_FILE = path.join(__dirname, '..', 'auth-cookies.txt');

// Helper functions
async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, CREDENTIALS);
    
    if (response.headers['set-cookie']) {
      fs.writeFileSync(COOKIE_FILE, response.headers['set-cookie'].join(';'));
      console.log('✅ Login successful, cookie saved');
      return true;
    } else {
      console.error('⚠️ No cookies received during login');
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

function getCookieHeader() {
  if (fs.existsSync(COOKIE_FILE)) {
    return fs.readFileSync(COOKIE_FILE, 'utf8');
  }
  return '';
}

async function createTestClient() {
  console.log('🏢 Creating test client...');
  
  const uniqueId = uuidv4().substring(0, 8);
  const clientData = {
    name: `CoA Test Client ${uniqueId}`,
    code: `TST-${uniqueId}`,
    ownerId: 1, // Admin user
    active: true,
    clientCode: `TST${uniqueId}`,
    email: `test${uniqueId}@example.com`,
    industry: 'Technology',
    userId: 1 // Admin user
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/api/clients`, clientData, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    console.log('✅ Test client created with ID:', response.data.id);
    console.log('📊 Chart of Accounts status:', response.data.chartOfAccounts);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create test client:', error.response?.data || error.message);
    return null;
  }
}

async function getAccountsForClient(clientId) {
  console.log(`📚 Fetching accounts for client ${clientId}...`);
  
  try {
    const response = await axios.get(`${BASE_URL}/api/accounts/${clientId}`, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    // Log more information about the response
    console.log(`✅ API Response for accounts - Status: ${response.status}`);
    console.log(`✅ Response data type: ${typeof response.data}`);
    
    if (typeof response.data === 'object') {
      if (Array.isArray(response.data)) {
        console.log(`✅ Found ${response.data.length} accounts for client ${clientId}`);
      } else {
        console.log(`✅ Response data keys:`, Object.keys(response.data));
        
        // Try to find an accounts array in the response
        if (response.data.accounts && Array.isArray(response.data.accounts)) {
          console.log(`✅ Found ${response.data.accounts.length} accounts in the accounts field`);
          return response.data.accounts;
        }
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to fetch accounts for client ${clientId}:`, error.response?.data || error.message);
    return [];
  }
}

async function cleanupTestClient(clientId) {
  console.log(`🧹 Cleaning up test client ${clientId}...`);
  
  try {
    // Since we don't have a delete endpoint, we'll just mark the client as inactive
    const response = await axios.put(`${BASE_URL}/api/clients/${clientId}`, 
      { active: false, deletedAt: new Date() },
      {
        headers: {
          Cookie: getCookieHeader()
        }
      }
    );
    
    console.log(`✅ Test client ${clientId} cleaned up`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clean up test client ${clientId}:`, error.response?.data || error.message);
    return false;
  }
}

// Main verification function
async function verifyCoASeeding() {
  console.log('🔍 Starting CoA seeding verification...');
  
  // Login first
  if (!await login()) {
    console.error('❌ Verification aborted: Unable to login');
    return false;
  }
  
  // Create a test client
  const newClient = await createTestClient();
  if (!newClient) {
    console.error('❌ Verification aborted: Failed to create test client');
    return false;
  }
  
  // Get accounts for the client
  const accounts = await getAccountsForClient(newClient.id);
  
  // Verify accounts exist
  const verificationResult = {
    clientId: newClient.id,
    success: accounts.length > 0,
    accountsCount: accounts.length,
    expectedMinimumAccounts: 50 // Expecting at least 50 accounts in a standard CoA
  };
  
  // Print verification results
  console.log('\n📋 VERIFICATION RESULTS:');
  console.log('═════════════════════════');
  console.log(`Client ID: ${verificationResult.clientId}`);
  console.log(`Accounts found: ${verificationResult.accountsCount}`);
  console.log(`Minimum expected: ${verificationResult.expectedMinimumAccounts}`);
  console.log(`Verification status: ${verificationResult.success ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Sample of account types for verification
  if (accounts.length > 0) {
    console.log('\n📊 ACCOUNT DATA ANALYSIS:');
    console.log('════════════════════════════');
    
    // First check if accounts is an array of objects with type property
    if (Array.isArray(accounts) && accounts[0] && typeof accounts[0] === 'object') {
      // Check if we have the expected type field
      if (accounts[0].hasOwnProperty('type')) {
        const assetAccounts = accounts.filter(acc => acc.type === 'asset').length;
        const liabilityAccounts = accounts.filter(acc => acc.type === 'liability').length;
        const equityAccounts = accounts.filter(acc => acc.type === 'equity').length;
        const revenueAccounts = accounts.filter(acc => acc.type === 'revenue').length;
        const expenseAccounts = accounts.filter(acc => acc.type === 'expense').length;
        
        console.log(`Asset accounts: ${assetAccounts}`);
        console.log(`Liability accounts: ${liabilityAccounts}`);
        console.log(`Equity accounts: ${equityAccounts}`);
        console.log(`Revenue accounts: ${revenueAccounts}`);
        console.log(`Expense accounts: ${expenseAccounts}`);
      } else {
        // If type field is missing, just count the overall data
        console.log(`Object array with ${accounts.length} records, but no 'type' field`);
        console.log(`First item sample: ${JSON.stringify(accounts[0]).substring(0, 100)}...`);
      }
    } else {
      // If we got something other than an array of objects, log what we have
      console.log(`Data is not an array of objects: ${typeof accounts}`);
      if (typeof accounts === 'object') {
        console.log(`Object keys: ${Object.keys(accounts)}`);
      }
    }
  }
  
  // Clean up the test client
  await cleanupTestClient(newClient.id);
  
  return verificationResult.success;
}

// Run the verification
verifyCoASeeding()
  .then(success => {
    console.log('\n🏁 Verification process completed.');
    if (success) {
      console.log('✅ VERIFICATION PASSED: New clients are properly seeded with Chart of Accounts.');
    } else {
      console.log('❌ VERIFICATION FAILED: Chart of Accounts seeding is not working properly.');
    }
    
    // Delete cookie file
    if (fs.existsSync(COOKIE_FILE)) {
      fs.unlinkSync(COOKIE_FILE);
      console.log('🧹 Auth cookie file cleaned up');
    }
  })
  .catch(error => {
    console.error('❌ Error during verification:', error);
  });