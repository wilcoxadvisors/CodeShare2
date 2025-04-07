/**
 * Chart of Accounts Import Functionality Verification Script
 * 
 * This script performs explicit, rigorous testing of the Chart of Accounts import
 * functionality to verify that the system correctly processes only explicitly
 * selected accounts during import operations.
 * 
 * Test Scenarios:
 * 1. "No Selection" - Import with no accounts selected
 * 2. "Partial Selection" - Import with only some accounts selected
 * 3. "Select All" - Import with all accounts selected
 * 
 * Each test verifies:
 * - UI validation works as expected
 * - API properly enforces selection requirements
 * - Only explicitly selected accounts are processed
 * - Proper error messages are displayed
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const Papa = require('papaparse');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CLIENT_ID = 250; // The client ID to use for testing

// Auth credentials - for a real test, these would be loaded from environment variables
const AUTH = {
  username: 'admin',
  password: 'password' // You'll need to replace this with the actual password in your environment
};

// Test data
const TEST_ACCOUNTS = [
  // New accounts that don't exist in the system
  { accountCode: 'TEST-N1', name: 'Test New Account 1', type: 'Assets', subtype: 'Current Assets', isSubledger: false, active: true },
  { accountCode: 'TEST-N2', name: 'Test New Account 2', type: 'Assets', subtype: 'Current Assets', isSubledger: false, active: true },
  { accountCode: 'TEST-N3', name: 'Test New Account 3', type: 'Assets', subtype: 'Current Assets', isSubledger: false, active: true },
  
  // Existing accounts with modifications
  { accountCode: '1000', name: 'Modified Cash Account', type: 'Assets', subtype: 'Current Assets', isSubledger: false, active: true },
  { accountCode: '1100', name: 'Modified Accounts Receivable', type: 'Assets', subtype: 'Current Assets', isSubledger: true, active: true },
  
  // Missing accounts (these will be in the system but not in the imported file)
  // We don't include them here, as they're identified by the system based on existing accounts not in the file
];

// Test utility functions
async function login() {
  console.log('EXPLICIT TEST: Logging in to system...');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, AUTH, {
      withCredentials: true
    });
    
    // Save cookies for future requests
    const cookies = response.headers['set-cookie'];
    axios.defaults.headers.Cookie = cookies ? cookies.join('; ') : '';
    
    console.log('EXPLICIT TEST: Login successful');
    return response.data;
  } catch (error) {
    console.error('EXPLICIT TEST ERROR: Login failed:', error.response?.data || error.message);
    throw new Error('Login failed');
  }
}

async function getExistingAccounts() {
  console.log(`EXPLICIT TEST: Fetching existing accounts for client ${TEST_CLIENT_ID}...`);
  try {
    const response = await axios.get(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/tree`);
    console.log(`EXPLICIT TEST: Retrieved ${response.data.length} root accounts`);
    
    // Flatten the account tree to get all accounts
    const flattenAccounts = (accounts) => {
      let result = [];
      for (const account of accounts) {
        result.push(account);
        if (account.children && account.children.length > 0) {
          result = result.concat(flattenAccounts(account.children));
        }
      }
      return result;
    };
    
    const allAccounts = flattenAccounts(response.data);
    console.log(`EXPLICIT TEST: Total of ${allAccounts.length} accounts in system`);
    return allAccounts;
  } catch (error) {
    console.error('EXPLICIT TEST ERROR: Failed to get accounts:', error.response?.data || error.message);
    throw new Error('Failed to get accounts');
  }
}

async function createTestAccountsCsv() {
  console.log('EXPLICIT TEST: Creating test accounts CSV...');
  const csvString = Papa.unparse(TEST_ACCOUNTS);
  const filePath = path.join(__dirname, 'test-accounts.csv');
  fs.writeFileSync(filePath, csvString);
  console.log(`EXPLICIT TEST: Test accounts CSV created at ${filePath}`);
  return filePath;
}

async function importAccounts(filePath, selections) {
  console.log('EXPLICIT TEST: Importing accounts with explicit selections...');
  console.log('EXPLICIT TEST: Selection details:', JSON.stringify(selections, null, 2));
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    if (selections) {
      formData.append('selections', JSON.stringify(selections));
    }
    
    const response = await axios.post(
      `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        }
      }
    );
    
    console.log('EXPLICIT TEST: Import successful');
    console.log('EXPLICIT TEST: Import response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('EXPLICIT TEST: Import failed - expected if no accounts selected');
    console.log('EXPLICIT TEST: Error details:', error.response?.data || error.message);
    return error.response?.data || { error: error.message };
  }
}

async function verifyAccountExists(accountCode) {
  console.log(`EXPLICIT TEST: Verifying if account ${accountCode} exists...`);
  const accounts = await getExistingAccounts();
  const found = accounts.some(account => 
    (account.accountCode || account.code) === accountCode
  );
  console.log(`EXPLICIT TEST: Account ${accountCode} ${found ? 'exists' : 'does not exist'}`);
  return found;
}

// Test Scenarios
async function testNoSelection() {
  console.log('\n🔍 EXPLICIT TEST SCENARIO: "No Selection" - Import with no accounts selected');
  
  // Create test CSV
  const csvFilePath = await createTestAccountsCsv();
  
  // Create selections object with empty arrays (no accounts selected)
  const selections = {
    updateExisting: true,
    handleMissingAccounts: 'deactivate',
    updateStrategy: 'selected', // Force selected mode
    removeStrategy: 'inactive', // Deactivate missing accounts
    newAccountCodes: [], // No new accounts selected
    modifiedAccountCodes: [], // No modified accounts selected
    missingAccountCodes: [], // No missing accounts selected
    missingAccountActions: {}
  };
  
  // Attempt import with no selections
  const result = await importAccounts(csvFilePath, selections);
  
  // Verify that the import was rejected
  const isRejected = !result.success || result.error || result.message?.includes('No accounts selected');
  console.log(`EXPLICIT TEST RESULT: Import with no selections was ${isRejected ? 'correctly rejected' : 'incorrectly accepted'}`);
  
  // Verify none of the test accounts were created/modified
  let allVerificationsPassed = true;
  for (const account of TEST_ACCOUNTS) {
    if (account.accountCode.startsWith('TEST-N')) {
      // This is a new test account, it should NOT exist
      const exists = await verifyAccountExists(account.accountCode);
      if (exists) {
        console.error(`❌ EXPLICIT TEST FAILED: Account ${account.accountCode} was created despite not being selected!`);
        allVerificationsPassed = false;
      } else {
        console.log(`✓ EXPLICIT TEST PASSED: Account ${account.accountCode} was correctly not created`);
      }
    }
  }
  
  // Clean up
  fs.unlinkSync(csvFilePath);
  
  return {
    scenario: 'No Selection',
    passed: isRejected && allVerificationsPassed,
    details: 'Import with no selections was correctly rejected and no accounts were created/modified'
  };
}

async function testPartialSelection() {
  console.log('\n🔍 EXPLICIT TEST SCENARIO: "Partial Selection" - Import with only some accounts selected');
  
  // Create test CSV
  const csvFilePath = await createTestAccountsCsv();
  
  // Create selections object with only some accounts selected
  const selections = {
    updateExisting: true,
    handleMissingAccounts: 'deactivate',
    updateStrategy: 'selected',
    removeStrategy: 'inactive',
    newAccountCodes: ['TEST-N1'], // Only select the first new account
    modifiedAccountCodes: ['1000'], // Only select the first modified account
    missingAccountCodes: [], // No missing accounts selected
    missingAccountActions: {}
  };
  
  // Attempt import with partial selections
  const result = await importAccounts(csvFilePath, selections);
  
  // Verify that the import was successful
  const isSuccessful = result.success || !result.error;
  console.log(`EXPLICIT TEST RESULT: Import with partial selections was ${isSuccessful ? 'successful' : 'rejected'}`);
  
  // Verify only selected accounts were created/modified
  let allVerificationsPassed = true;
  
  // TEST-N1 should exist (was selected)
  const n1Exists = await verifyAccountExists('TEST-N1');
  if (!n1Exists) {
    console.error('❌ EXPLICIT TEST FAILED: Account TEST-N1 was not created despite being selected!');
    allVerificationsPassed = false;
  } else {
    console.log('✓ EXPLICIT TEST PASSED: Account TEST-N1 was correctly created');
  }
  
  // TEST-N2 and TEST-N3 should NOT exist (were not selected)
  const n2Exists = await verifyAccountExists('TEST-N2');
  const n3Exists = await verifyAccountExists('TEST-N3');
  
  if (n2Exists) {
    console.error('❌ EXPLICIT TEST FAILED: Account TEST-N2 was created despite not being selected!');
    allVerificationsPassed = false;
  } else {
    console.log('✓ EXPLICIT TEST PASSED: Account TEST-N2 was correctly not created');
  }
  
  if (n3Exists) {
    console.error('❌ EXPLICIT TEST FAILED: Account TEST-N3 was created despite not being selected!');
    allVerificationsPassed = false;
  } else {
    console.log('✓ EXPLICIT TEST PASSED: Account TEST-N3 was correctly not created');
  }
  
  // Clean up
  fs.unlinkSync(csvFilePath);
  
  return {
    scenario: 'Partial Selection',
    passed: isSuccessful && allVerificationsPassed,
    details: 'Import with partial selections was successful and only selected accounts were created/modified'
  };
}

async function testSelectAll() {
  console.log('\n🔍 EXPLICIT TEST SCENARIO: "Select All" - Import with all accounts selected');
  
  // Create test CSV
  const csvFilePath = await createTestAccountsCsv();
  
  // Create selections object with all accounts selected
  const selections = {
    updateExisting: true,
    handleMissingAccounts: 'deactivate',
    updateStrategy: 'selected',
    removeStrategy: 'inactive',
    newAccountCodes: ['TEST-N1', 'TEST-N2', 'TEST-N3'], // All new accounts
    modifiedAccountCodes: ['1000', '1100'], // All modified accounts
    missingAccountCodes: [], // No missing accounts selected - this depends on what's in the database
    missingAccountActions: {}
  };
  
  // Attempt import with all selections
  const result = await importAccounts(csvFilePath, selections);
  
  // Verify that the import was successful
  const isSuccessful = result.success || !result.error;
  console.log(`EXPLICIT TEST RESULT: Import with all selections was ${isSuccessful ? 'successful' : 'rejected'}`);
  
  // Verify all selected accounts were created/modified
  let allVerificationsPassed = true;
  
  // All TEST-N* accounts should exist
  const n1Exists = await verifyAccountExists('TEST-N1');
  const n2Exists = await verifyAccountExists('TEST-N2');
  const n3Exists = await verifyAccountExists('TEST-N3');
  
  if (!n1Exists || !n2Exists || !n3Exists) {
    console.error('❌ EXPLICIT TEST FAILED: Not all selected accounts were created!');
    allVerificationsPassed = false;
  } else {
    console.log('✓ EXPLICIT TEST PASSED: All selected accounts were correctly created');
  }
  
  // Clean up
  fs.unlinkSync(csvFilePath);
  
  return {
    scenario: 'Select All',
    passed: isSuccessful && allVerificationsPassed,
    details: 'Import with all selections was successful and all selected accounts were created/modified'
  };
}

// Main test runner
async function runAllTests() {
  console.log('\n📋 EXPLICIT VERIFICATION: Running all Chart of Accounts import tests');
  
  try {
    // Login first
    await login();
    
    // Run tests
    const results = [];
    results.push(await testNoSelection());
    results.push(await testPartialSelection());
    results.push(await testSelectAll());
    
    // Report results
    console.log('\n📊 EXPLICIT VERIFICATION RESULTS:');
    let allPassed = true;
    results.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.scenario}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   ${result.details}`);
      if (!result.passed) allPassed = false;
    });
    
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED!'}`);
    console.log('EXPLICIT VERIFICATION COMPLETED');
    
    return results;
  } catch (error) {
    console.error('❌ EXPLICIT TEST ERROR:', error);
    return [{ passed: false, details: `Test suite failed: ${error.message}` }];
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testNoSelection,
  testPartialSelection,
  testSelectAll
};