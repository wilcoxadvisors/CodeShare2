/**
 * Client Chart of Accounts Seeding Verification Script
 * 
 * This script verifies that:
 * 1. Both client creation endpoints in routes.ts and adminRoutes.ts seed the Chart of Accounts
 * 2. Created clients have the expected standard accounts
 * 
 * Usage: node verification-scripts/verify-client-coa-seeding.js
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const API_BASE_URL = 'http://localhost:5000';
const LOG_FILE = path.join(__dirname, '..', 'verification-logs', 'client-coa-seeding-verification.log');

// Setup logging directory
const logsDir = path.join(__dirname, '..', 'verification-logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize log file
fs.writeFileSync(LOG_FILE, `Client Chart of Accounts Seeding Verification - ${new Date().toISOString()}\n\n`);

// Log both to console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    return ''; // Skip cookie lookup for standalone test
  } catch (error) {
    log(`Error reading auth cookies: ${error.message}`);
    return '';
  }
}

/**
 * Helper function to get auth credentials
 */
function getAuthCredentials() {
  try {
    const credContent = fs.readFileSync('.auth-credentials', 'utf8');
    const [username, password] = credContent.trim().split(':');
    return { username, password };
  } catch (error) {
    log(`Error reading auth credentials: ${error.message}`);
    return { username: 'admin', password: 'password' }; // Default fallback
  }
}

/**
 * Login to get auth cookie
 */
async function login() {
  try {
    // Try to use existing cookie first
    const cookie = getCookieHeader();
    if (cookie) {
      log('Using existing authentication cookie');
      return cookie;
    }
    
    // Otherwise, perform login
    const { username, password } = getAuthCredentials();
    log(`Logging in as ${username}...`);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username,
      password
    });
    
    const cookies = response.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      throw new Error('No cookies returned from login');
    }
    
    // Extract and save the session cookie
    const sessionCookie = cookies.find(c => c.startsWith('connect.sid='));
    if (!sessionCookie) {
      throw new Error('Session cookie not found in response');
    }
    
    // Write cookie to file for future use
    fs.writeFileSync('.auth-cookies', sessionCookie);
    log('Login successful, saved session cookie for future requests');
    return sessionCookie;
  } catch (error) {
    log(`Login error: ${error.message}`);
    if (error.response) {
      log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Create a test client using /api/clients endpoint
 */
async function createRegularClient(cookie) {
  try {
    log('Creating test client via /api/clients endpoint...');
    
    const timestamp = Date.now();
    const clientData = {
      name: `Test Client (Regular) ${timestamp}`,
      userId: 1, // Admin user ID
      active: true
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/clients`, clientData, {
      headers: {
        'Cookie': cookie
      }
    });
    
    log(`Client created successfully with ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    log(`Error creating regular client: ${error.message}`);
    if (error.response) {
      log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Create a test client using /api/admin/clients endpoint
 */
async function createAdminClient(cookie) {
  try {
    log('Creating test client via /api/admin/clients endpoint...');
    
    const timestamp = Date.now();
    const clientData = {
      name: `Test Client (Admin) ${timestamp}`,
      userId: 1, // Admin user ID
      active: true
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/admin/clients`, clientData, {
      headers: {
        'Cookie': cookie
      }
    });
    
    log(`Admin client created successfully with ID: ${response.data.data.id}`);
    return response.data.data;
  } catch (error) {
    log(`Error creating admin client: ${error.message}`);
    if (error.response) {
      log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Get accounts for a client
 */
async function getClientAccounts(clientId, cookie) {
  try {
    log(`Fetching accounts for client ID: ${clientId}...`);
    
    const response = await axios.get(`${API_BASE_URL}/api/accounts/${clientId}`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    const accounts = response.data;
    log(`Retrieved ${accounts.length} accounts for client ID: ${clientId}`);
    return accounts;
  } catch (error) {
    log(`Error fetching client accounts: ${error.message}`);
    if (error.response) {
      log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Verify that accounts were properly seeded
 */
function verifyAccountsSeeded(accounts, clientType) {
  // Check if we have a sufficient number of accounts
  if (!accounts || accounts.length < 10) {
    log(`❌ ${clientType} client verification FAILED: Insufficient accounts (${accounts?.length || 0})`);
    return false;
  }
  
  // Check for essential account types
  const accountTypes = new Set(accounts.map(account => account.type));
  const expectedTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  const missingTypes = expectedTypes.filter(type => !accountTypes.has(type));
  
  if (missingTypes.length > 0) {
    log(`❌ ${clientType} client verification FAILED: Missing account types: ${missingTypes.join(', ')}`);
    return false;
  }
  
  // Check for parent-child relationships
  const hasParentChildRelationships = accounts.some(account => account.parentId !== null);
  if (!hasParentChildRelationships) {
    log(`❌ ${clientType} client verification FAILED: No parent-child relationships found`);
    return false;
  }
  
  // Verify essential accounts existence
  const accountCodes = new Set(accounts.map(account => account.accountCode));
  const essentialCodes = ['1000', '2000', '3000', '4000', '5000']; // Basic codes for main categories
  const missingCodes = essentialCodes.filter(code => !accountCodes.has(code));
  
  if (missingCodes.length > 0) {
    log(`❌ ${clientType} client verification FAILED: Missing essential account codes: ${missingCodes.join(', ')}`);
    return false;
  }
  
  log(`✅ ${clientType} client verification PASSED: Accounts properly seeded`);
  return true;
}

/**
 * Main verification function
 */
async function verifyClientCoASeeding() {
  try {
    // Get auth cookie
    const cookie = await login();
    let success = true;
    
    // Verify regular client endpoint
    try {
      log('\n--- Testing /api/clients endpoint ---');
      const regularClient = await createRegularClient(cookie);
      const regularAccounts = await getClientAccounts(regularClient.id, cookie);
      const regularSuccess = verifyAccountsSeeded(regularAccounts, 'Regular');
      success = success && regularSuccess;
    } catch (error) {
      log(`❌ Regular client test failed: ${error.message}`);
      success = false;
    }
    
    // Verify admin client endpoint
    try {
      log('\n--- Testing /api/admin/clients endpoint ---');
      const adminClient = await createAdminClient(cookie);
      const adminAccounts = await getClientAccounts(adminClient.id, cookie);
      const adminSuccess = verifyAccountsSeeded(adminAccounts, 'Admin');
      success = success && adminSuccess;
    } catch (error) {
      log(`❌ Admin client test failed: ${error.message}`);
      success = false;
    }
    
    // Report overall result
    if (success) {
      log('\n✅ VERIFICATION PASSED: Chart of Accounts is properly seeded for both client creation endpoints');
    } else {
      log('\n❌ VERIFICATION FAILED: One or more tests did not pass');
    }
    
    return success;
  } catch (error) {
    log(`Error in verification process: ${error.message}`);
    return false;
  }
}

// Run the verification
verifyClientCoASeeding()
  .then(success => {
    log(`\nVerification ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`Verification process error: ${error.message}`);
    process.exit(1);
  });