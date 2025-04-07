/**
 * Account Update Validation Test
 * 
 * This test verifies the enhanced account update logic, specifically:
 * 1. Accounts without transactions can be fully updated
 * 2. Accounts with transactions have restrictions on which fields can be updated
 * 3. Error messaging is clear and helpful
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Global variables
let authCookie = '';
let testClientId = null;
let testEntityId = null;
let testAccountId = null;
let testAccountWithTransactionsId = null;

/**
 * Helper function to read cookies from file if available
 */
function getCookieFromFile() {
  try {
    const cookiePath = path.join(__dirname, '../.auth-cookies');
    if (fs.existsSync(cookiePath)) {
      return fs.readFileSync(cookiePath, 'utf8').trim();
    }
  } catch (error) {
    console.error('Error reading cookie file:', error);
  }
  return null;
}

/**
 * Helper function to save cookie to file
 */
function saveCookieToFile(cookie) {
  try {
    fs.writeFileSync(path.join(__dirname, '../.auth-cookies'), cookie);
  } catch (error) {
    console.error('Error saving cookie:', error);
  }
}

/**
 * Login to get auth cookie
 */
async function login() {
  console.log('Logging in...');
  
  try {
    const existingCookie = getCookieFromFile();
    if (existingCookie) {
      console.log('Using existing cookie from file');
      authCookie = existingCookie;
      return;
    }
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, LOGIN_CREDENTIALS);
    
    if (response.headers && response.headers['set-cookie']) {
      // Extract the cookie value
      const cookie = response.headers['set-cookie'][0].split(';')[0];
      authCookie = cookie;
      saveCookieToFile(cookie);
      console.log('Login successful');
    } else {
      throw new Error('No cookie received after login');
    }
  } catch (error) {
    console.error('Login failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

/**
 * Create a test client
 */
async function createTestClient() {
  console.log('Creating test client...');
  
  try {
    const clientData = {
      name: `Test Client - Update Validation ${Date.now()}`,
      industry: 'Technology',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      phone: '555-123-4567',
      email: 'test@example.com',
      website: 'https://test.example.com',
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/clients`,
      clientData,
      { headers: { Cookie: authCookie } }
    );
    
    testClientId = response.data.id;
    console.log(`Test client created with ID: ${testClientId}`);
    
    // Seed the Chart of Accounts
    await seedClientCoA(testClientId);
    
  } catch (error) {
    console.error('Error creating test client:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

/**
 * Seed Chart of Accounts for the test client
 */
async function seedClientCoA(clientId) {
  console.log(`Seeding Chart of Accounts for client ${clientId}...`);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/clients/${clientId}/seed-coa`,
      {},
      { headers: { Cookie: authCookie } }
    );
    
    console.log(`CoA seeding result: ${response.data.message}`);
    
    if (response.data.success) {
      console.log(`Successfully seeded ${response.data.accountCount} accounts.`);
    } else {
      console.warn('CoA seeding did not create new accounts.');
    }
  } catch (error) {
    console.error('Error seeding Chart of Accounts:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

/**
 * Create a test entity for the client
 */
async function createTestEntity() {
  console.log('Creating test entity...');
  
  try {
    const entityData = {
      name: `Test Entity - Update Validation ${Date.now()}`,
      entityCode: `TEST-UV-${Date.now()}`,
      legalName: 'Test Entity Legal Name',
      industry: 'Technology',
      description: 'Test entity for account update validation',
      active: true,
      clientId: testClientId
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/entities`,
      entityData,
      { headers: { Cookie: authCookie } }
    );
    
    testEntityId = response.data.id;
    console.log(`Test entity created with ID: ${testEntityId}`);
  } catch (error) {
    console.error('Error creating test entity:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

/**
 * Get list of accounts for test client
 */
async function getTestAccounts() {
  console.log('Getting test accounts...');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/clients/${testClientId}/accounts`,
      { headers: { Cookie: authCookie } }
    );
    
    if (response.data && response.data.length > 0) {
      // Get first account as test account
      testAccountId = response.data[0].id;
      console.log(`Using account ID ${testAccountId} for testing`);
      
      // Get second account for transaction testing
      if (response.data.length > 1) {
        testAccountWithTransactionsId = response.data[1].id;
        console.log(`Using account ID ${testAccountWithTransactionsId} for transaction testing`);
      }
    } else {
      throw new Error('No accounts found for test client');
    }
  } catch (error) {
    console.error('Error getting test accounts:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

/**
 * Create a test journal entry with the second account
 */
async function createTestJournalEntry() {
  console.log('Creating test journal entry...');
  
  try {
    // Use the test account with transactions for the journal entry
    const journalEntryData = {
      date: new Date().toISOString().split('T')[0],
      description: 'Test Journal Entry for Account Update Validation',
      entityId: testEntityId,
      referenceNumber: `TEST-JE-${Date.now()}`,
      status: 'draft',
      lines: [
        {
          type: 'debit',
          accountId: testAccountWithTransactionsId,
          amount: '100.00',
          description: 'Test debit'
        },
        {
          type: 'credit',
          accountId: testAccountId, // Using first account as offsetting entry
          amount: '100.00',
          description: 'Test credit'
        }
      ]
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/clients/${testClientId}/journal-entries`,
      journalEntryData,
      { headers: { Cookie: authCookie } }
    );
    
    console.log(`Test journal entry created with ID: ${response.data.id}`);
  } catch (error) {
    console.error('Error creating test journal entry:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

/**
 * Test updating account without transactions
 */
async function testUpdateAccountWithoutTransactions() {
  console.log('\nTEST: Updating account without transactions...');
  
  try {
    const updateData = {
      name: `Updated Account Name ${Date.now()}`,
      accountCode: `UPDATED-${Date.now()}`,
      type: 'asset',
      description: 'Updated description for testing'
    };
    
    const response = await axios.put(
      `${API_BASE_URL}/api/clients/${testClientId}/accounts/${testAccountId}`,
      updateData,
      { headers: { Cookie: authCookie } }
    );
    
    console.log('✅ SUCCESS: Account without transactions updated successfully');
    console.log(`Updated account: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    console.error('❌ FAILED: Error updating account without transactions:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

/**
 * Test updating restricted fields on account with transactions
 */
async function testUpdateRestrictedFieldsWithTransactions() {
  console.log('\nTEST: Updating restricted fields on account with transactions...');
  
  try {
    const updateData = {
      name: `Should Not Update ${Date.now()}`,
      accountCode: `SHOULD-NOT-UPDATE-${Date.now()}`,
      type: 'liability', // This should be blocked
      description: 'This update should be rejected'
    };
    
    await axios.put(
      `${API_BASE_URL}/api/clients/${testClientId}/accounts/${testAccountWithTransactionsId}`,
      updateData,
      { headers: { Cookie: authCookie } }
    );
    
    console.log('❌ FAILED: Server allowed restricted fields to be updated');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400 && 
        error.response.data && error.response.data.hasTransactions) {
      console.log('✅ SUCCESS: Server correctly rejected restricted field updates');
      console.log(`Error message: ${error.response.data.message}`);
      console.log(`Restricted fields: ${JSON.stringify(error.response.data.restrictedFields)}`);
      return true;
    } else {
      console.error('❌ FAILED: Unexpected error when updating restricted fields:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      return false;
    }
  }
}

/**
 * Test updating allowed fields on account with transactions
 */
async function testUpdateAllowedFieldsWithTransactions() {
  console.log('\nTEST: Updating allowed fields on account with transactions...');
  
  try {
    const updateData = {
      name: `Updated Name With Transactions ${Date.now()}`,
      description: 'This update should be allowed'
      // Note: not updating accountCode or type
    };
    
    const response = await axios.put(
      `${API_BASE_URL}/api/clients/${testClientId}/accounts/${testAccountWithTransactionsId}`,
      updateData,
      { headers: { Cookie: authCookie } }
    );
    
    console.log('✅ SUCCESS: Allowed fields updated successfully');
    console.log(`Updated account: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    console.error('❌ FAILED: Error updating allowed fields:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

/**
 * Display final test results
 */
function reportResults(results) {
  console.log('\n===== ACCOUNT UPDATE VALIDATION TEST RESULTS =====');
  console.log(`Tests passed: ${results.filter(r => r).length} / ${results.length}`);
  console.log('================================================\n');
  
  if (results.every(r => r)) {
    console.log('🎉 ALL TESTS PASSED! The account update validation is working correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED. Please check the logs above for details.');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Setup
    await login();
    await createTestClient();
    await createTestEntity();
    await getTestAccounts();
    await createTestJournalEntry();
    
    // Tests
    const results = [];
    
    // Test 1: Update account without transactions
    results.push(await testUpdateAccountWithoutTransactions());
    
    // Test 2: Update restricted fields on account with transactions (should fail)
    results.push(await testUpdateRestrictedFieldsWithTransactions());
    
    // Test 3: Update allowed fields on account with transactions (should succeed)
    results.push(await testUpdateAllowedFieldsWithTransactions());
    
    // Report results
    reportResults(results);
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run the tests
runTests();