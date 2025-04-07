#!/usr/bin/env node

// Import required modules
import fetch from 'node-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Session cookie storage
let sessionCookie = '';

// Test accounts data
const testAccountData = {
  accountCode: `TESTCOA${Date.now().toString().substring(8)}`, // Unique code using timestamp
  name: 'Test Chart of Accounts',
  type: 'expense',
  subtype: 'operating_expense',
  description: 'This is a test account created by automation',
  isSubledger: false,
  active: true
};

// Store the created account ID
let createdAccountId = null;

// Client ID to test against
const clientId = 1;

// Helper function for API requests
async function makeRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (sessionCookie) {
    options.headers.Cookie = sessionCookie;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`Making ${method} request to ${url}`);
    const response = await fetch(`${BASE_URL}${url}`, options);
    
    // Extract and store cookies from login response
    if (url === '/api/auth/login') {
      const cookies = response.headers.raw()['set-cookie'];
      if (cookies) {
        sessionCookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('Session cookie stored successfully');
      }
    }

    // Parse JSON response if available
    let responseData = null;
    if (response.status !== 204) {
      try {
        responseData = await response.json();
      } catch (e) {
        console.log(`No JSON response or parsing error: ${e.message}`);
      }
    }

    return {
      status: response.status,
      data: responseData,
      ok: response.ok
    };
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error.message);
    return {
      status: 500,
      data: { error: error.message },
      ok: false
    };
  }
}

// Main test execution flow
async function runTests() {
  console.log('====== CHART OF ACCOUNTS API TEST ======');
  console.log(`Test Time: ${new Date().toISOString()}`);
  
  try {
    // Step 1: Authentication
    console.log('\n--- Step 1: Authentication ---');
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'password123'
    });
    
    console.log(`Authentication Status: ${loginResult.status}`);
    if (loginResult.status !== 200) {
      console.error('Authentication failed. Aborting tests.');
      return;
    }
    console.log('Authentication successful!');
    
    // Step 2: Fetch Initial Chart of Accounts
    console.log('\n--- Step 2: Fetch Initial Chart of Accounts ---');
    const initialFetchResult = await makeRequest(`/api/clients/${clientId}/accounts`);
    
    console.log(`Fetch Status: ${initialFetchResult.status}`);
    if (initialFetchResult.status !== 200) {
      console.error('Failed to fetch accounts. Aborting tests.');
      return;
    }
    
    console.log(`Successfully retrieved ${initialFetchResult.data.length} accounts for client ${clientId}`);
    
    // Step 3: Create New Account
    console.log('\n--- Step 3: Create New Account ---');
    const createResult = await makeRequest(`/api/clients/${clientId}/accounts`, 'POST', testAccountData);
    
    console.log(`Create Status: ${createResult.status}`);
    if (createResult.status !== 201 && createResult.status !== 200) {
      console.error('Failed to create account. Aborting tests.');
      console.error('Response:', JSON.stringify(createResult.data, null, 2));
      return;
    }
    
    createdAccountId = createResult.data.id;
    console.log(`Successfully created account with ID: ${createdAccountId}`);
    console.log('Created Account Data:', JSON.stringify(createResult.data, null, 2));
    
    // Step 4: Fetch Created Account
    console.log('\n--- Step 4: Fetch Created Account ---');
    const fetchCreatedResult = await makeRequest(`/api/clients/${clientId}/accounts/${createdAccountId}`);
    
    console.log(`Fetch Created Status: ${fetchCreatedResult.status}`);
    if (fetchCreatedResult.status !== 200) {
      console.error('Failed to fetch created account. Continuing with tests...');
    } else {
      console.log('Retrieved Account Data:', JSON.stringify(fetchCreatedResult.data, null, 2));
      
      // Verify account data
      const verifyFields = [
        { apiField: 'accountCode', testField: 'accountCode' },
        { apiField: 'name', testField: 'name' },
        { apiField: 'type', testField: 'type' },
        { apiField: 'description', testField: 'description' }
      ];
      let allFieldsMatch = true;
      
      for (const field of verifyFields) {
        if (fetchCreatedResult.data[field.apiField] !== testAccountData[field.testField]) {
          console.error(`❌ Field '${field.apiField}' doesn't match. Expected: ${testAccountData[field.testField]}, Actual: ${fetchCreatedResult.data[field.apiField]}`);
          allFieldsMatch = false;
        }
      }
      
      if (allFieldsMatch) {
        console.log('✅ All account fields match expected values');
      }
    }
    
    // Step 5: Update Account
    console.log('\n--- Step 5: Update Account ---');
    const updateData = {
      id: createdAccountId,
      accountCode: testAccountData.accountCode, // maintain the same account code 
      name: 'Updated Test CoA Account',
      description: 'This account has been updated',
      active: true,
      clientId
    };
    
    const updateResult = await makeRequest(`/api/clients/${clientId}/accounts/${createdAccountId}`, 'PUT', updateData);
    
    console.log(`Update Status: ${updateResult.status}`);
    if (updateResult.status >= 200 && updateResult.status < 300) {
      console.log('Successfully updated account');
      console.log('Updated Account Data:', JSON.stringify(updateResult.data, null, 2));
    } else {
      console.error('Failed to update account. Continuing with tests...');
      console.error('Response:', JSON.stringify(updateResult.data, null, 2));
    }
    
    // Step 6: Fetch Updated Account
    console.log('\n--- Step 6: Fetch Updated Account ---');
    const fetchUpdatedResult = await makeRequest(`/api/clients/${clientId}/accounts/${createdAccountId}`);
    
    console.log(`Fetch Updated Status: ${fetchUpdatedResult.status}`);
    if (fetchUpdatedResult.status !== 200) {
      console.error('Failed to fetch updated account. Continuing with tests...');
    } else {
      console.log('Retrieved Updated Account Data:', JSON.stringify(fetchUpdatedResult.data, null, 2));
      
      // Verify updated data
      if (fetchUpdatedResult.data.name === updateData.name && 
          fetchUpdatedResult.data.description === updateData.description) {
        console.log('✅ Account update verified successfully');
      } else {
        console.error('❌ Account update verification failed');
      }
    }
    
    // Step 7: Delete Account
    console.log('\n--- Step 7: Delete Account ---');
    const deleteResult = await makeRequest(`/api/clients/${clientId}/accounts/${createdAccountId}`, 'DELETE');
    
    console.log(`Delete Status: ${deleteResult.status}`);
    if (deleteResult.status >= 200 && deleteResult.status < 300) {
      console.log('Successfully deleted account');
    } else {
      console.error('Failed to delete account. Continuing with tests...');
      console.error('Response:', JSON.stringify(deleteResult.data, null, 2));
    }
    
    // Step 8: Verify Deletion
    console.log('\n--- Step 8: Verify Deletion ---');
    const verifyDeleteResult = await makeRequest(`/api/clients/${clientId}/accounts/${createdAccountId}`);
    
    console.log(`Verify Delete Status: ${verifyDeleteResult.status}`);
    if (verifyDeleteResult.status === 404) {
      console.log('✅ Account deletion verified successfully (404 Not Found response)');
    } else {
      console.error('❌ Account deletion verification failed');
      console.log('Response:', JSON.stringify(verifyDeleteResult.data, null, 2));
    }
    
    // Test Summary
    console.log('\n====== TEST SUMMARY ======');
    console.log(`Authentication: ${loginResult.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Fetch Initial CoA: ${initialFetchResult.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Create Account: ${(createResult.status === 201 || createResult.status === 200) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Fetch Created Account: ${fetchCreatedResult.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Update Account: ${(updateResult.status >= 200 && updateResult.status < 300) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Fetch Updated Account: ${fetchUpdatedResult.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Delete Account: ${(deleteResult.status >= 200 && deleteResult.status < 300) ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Verify Deletion: ${verifyDeleteResult.status === 404 ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('Test script error:', error);
  }
}

// Run the test script
runTests();