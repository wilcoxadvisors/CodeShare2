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
const API_BASE_URL = 'http://localhost:5000';
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
    // Force fresh login every time
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, LOGIN_CREDENTIALS);
    
    if (response.headers && response.headers['set-cookie']) {
      // Extract the cookie value
      const cookie = response.headers['set-cookie'][0].split(';')[0];
      authCookie = cookie;
      saveCookieToFile(cookie);
      console.log('Login successful with cookie:', cookie);
      
      // Verify auth status
      try {
        const authCheckResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Cookie: authCookie }
        });
        console.log('Auth verification successful:', authCheckResponse.data.user.username);
      } catch (authError) {
        console.warn('Auth verification failed:', authError.message);
        if (authError.response) {
          console.warn('Auth verification status:', authError.response.status);
          console.warn('Auth verification data:', authError.response.data);
        }
        throw new Error('Authentication verification failed');
      }
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
    // Get more detailed error from schema validation
    const entityData = {
      name: `Test Entity - Update Validation ${Date.now()}`,
      entityCode: `TEST-UV-${Date.now()}`,
      legalName: 'Test Entity Legal Name',
      industry: 'Technology',
      description: 'Test entity for account update validation',
      active: true,
      clientId: testClientId,
      // Additional required fields
      type: 'corporation',
      status: 'active',
      address: '123 Test St',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345'
    };
    
    console.log(`Creating entity with data:`, JSON.stringify(entityData, null, 2));
    
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
    // We need to get a valid entity ID for the journal entry
    let entityId = testEntityId;
    
    // If we failed to create an entity, try to use an existing one
    if (!entityId) {
      console.log('No test entity was created, trying to find an existing entity...');
      try {
        const entitiesResponse = await axios.get(
          `${API_BASE_URL}/api/entities`,
          { headers: { Cookie: authCookie } }
        );
        
        if (entitiesResponse.data && entitiesResponse.data.length > 0) {
          entityId = entitiesResponse.data[0].id;
          console.log(`Using existing entity with ID: ${entityId}`);
        } else {
          console.error('No entities found, cannot create journal entry');
          return;
        }
      } catch (entitiesError) {
        console.error('Error finding existing entities:', entitiesError.message);
        return;
      }
    }
    
    // Use the test account with transactions for the journal entry
    const journalEntryData = {
      date: new Date().toISOString().split('T')[0],
      description: 'Test Journal Entry for Account Update Validation',
      entityId: entityId,
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
    
    console.log(`Creating journal entry with data:`, JSON.stringify(journalEntryData, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/api/clients/${testClientId}/journal-entries`,
      journalEntryData,
      { headers: { Cookie: authCookie } }
    );
    
    if (response.data && response.data.id) {
      console.log(`Test journal entry created with ID: ${response.data.id}`);
      
      // Verify the account now has transactions
      const verifyResponse = await axios.get(
        `${API_BASE_URL}/api/clients/${testClientId}/accounts/transactions-check/${testAccountWithTransactionsId}`,
        { headers: { Cookie: authCookie } }
      );
      
      if (verifyResponse.data && verifyResponse.data.hasTransactions) {
        console.log(`✅ Verified account ${testAccountWithTransactionsId} now has transactions`);
      } else {
        console.warn(`⚠️ Account ${testAccountWithTransactionsId} still shows NO transactions - validation may fail`);
      }
    } else {
      console.error('Journal entry creation failed - no ID returned');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
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
    // First check if the account has transactions
    let transactionCheckResponse;
    try {
      transactionCheckResponse = await axios.get(
        `${API_BASE_URL}/api/clients/${testClientId}/accounts/transactions-check/${testAccountWithTransactionsId}`,
        { headers: { Cookie: authCookie } }
      );
      
      if (!transactionCheckResponse.data.hasTransactions) {
        console.log('⚠️ WARNING: The test account does not have any transactions.');
        console.log('This test will create dummy transactions to test the restriction logic.');
        
        // Create a direct database entry to simulate transactions
        // Since our test is having issues creating journal entries, we'll directly create
        // a journal entry via SQL to ensure the account has transactions
        
        // This is used only for testing
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.post(
          `${API_BASE_URL}/api/sql`,
          { 
            sql_query: `
              INSERT INTO journal_entries (
                client_id, entity_id, date, reference_number, description, 
                status, created_by, created_at
              ) 
              VALUES (
                ${testClientId}, 
                (SELECT id FROM entities WHERE active = true LIMIT 1),
                '${today}', 
                'TEST-DIRECT-${Date.now()}', 
                'Directly inserted test entry', 
                'draft', 
                1, 
                NOW()
              ) RETURNING id;
            `
          },
          { headers: { Cookie: authCookie } }
        );
        
        const journalEntryId = response.data.rows[0]?.id;
        
        if (journalEntryId) {
          // Insert journal entry lines
          await axios.post(
            `${API_BASE_URL}/api/sql`,
            {
              sql_query: `
                INSERT INTO journal_entry_lines (
                  journal_entry_id, account_id, type, amount, description
                )
                VALUES 
                (${journalEntryId}, ${testAccountWithTransactionsId}, 'debit', 100.00, 'Test debit'),
                (${journalEntryId}, ${testAccountId}, 'credit', 100.00, 'Test credit');
              `
            },
            { headers: { Cookie: authCookie } }
          );
          
          console.log(`Created direct journal entry with ID: ${journalEntryId}`);
          
          // Verify the account now has transactions
          const verifyResponse = await axios.get(
            `${API_BASE_URL}/api/clients/${testClientId}/accounts/transactions-check/${testAccountWithTransactionsId}`,
            { headers: { Cookie: authCookie } }
          );
          
          if (verifyResponse.data && verifyResponse.data.hasTransactions) {
            console.log(`✅ Successfully added transactions to account ${testAccountWithTransactionsId}`);
          } else {
            console.warn(`⚠️ Failed to add transactions to account ${testAccountWithTransactionsId} - test may fail`);
          }
        } else {
          console.warn('⚠️ Could not create direct journal entry - test may fail');
        }
      } else {
        console.log(`✅ Verified account ${testAccountWithTransactionsId} has transactions`);
      }
    } catch (checkError) {
      console.error('Error checking transactions:', checkError.message);
    }
    
    // Now try to update restricted fields
    const updateData = {
      name: `Should Not Update ${Date.now()}`,
      accountCode: `SHOULD-NOT-UPDATE-${Date.now()}`,
      type: 'liability', // This should be blocked
      description: 'This update should be rejected'
    };
    
    const response = await axios.put(
      `${API_BASE_URL}/api/clients/${testClientId}/accounts/${testAccountWithTransactionsId}`,
      updateData,
      { headers: { Cookie: authCookie } }
    );
    
    console.log('❌ FAILED: Server allowed restricted fields to be updated');
    console.log('Response:', JSON.stringify(response.data, null, 2));
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
    // First check if the account has transactions
    let transactionCheckResponse;
    try {
      transactionCheckResponse = await axios.get(
        `${API_BASE_URL}/api/clients/${testClientId}/accounts/transactions-check/${testAccountWithTransactionsId}`,
        { headers: { Cookie: authCookie } }
      );
      
      if (!transactionCheckResponse.data.hasTransactions) {
        console.log('⚠️ WARNING: The test account does not have any transactions.');
        console.log('To properly test this, the account should have transactions. Using anyway...');
      } else {
        console.log(`✅ Verified account ${testAccountWithTransactionsId} has transactions`);
      }
    } catch (checkError) {
      console.error('Error checking transactions:', checkError.message);
    }
    
    // Now try to update allowed fields
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