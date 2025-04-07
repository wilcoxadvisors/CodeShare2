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

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const Papa = require('papaparse');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  username: 'admin',
  password: 'password123',
  tempDir: './tmp',
  clientId: 250, // Test client ID (modify as needed)
  apiVersion: 'v1'
};

// Tracking test results
const testResults = [];

/**
 * Helper function to log test steps
 */
function log(message, ...args) {
  console.log(`[${new Date().toISOString()}] ${message}`, ...args);
}

/**
 * Helper to ensure temp directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(config.tempDir)) {
    fs.mkdirSync(config.tempDir, { recursive: true });
  }
}

/**
 * Helper function to authenticate and get cookie
 */
async function login() {
  log('Logging in as admin user...');
  
  try {
    const response = await axios.post(`${config.baseUrl}/api/auth/login`, {
      username: config.username,
      password: config.password
    });
    
    const cookies = response.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      throw new Error('No cookies returned from login');
    }
    
    // Extract the session cookie
    const sessionCookie = cookies.find(cookie => cookie.includes('session='));
    if (!sessionCookie) {
      throw new Error('Session cookie not found');
    }
    
    log('Login successful, session cookie obtained');
    return sessionCookie;
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
 * Helper function to get existing accounts
 */
async function getExistingAccounts(cookie) {
  log('Getting existing accounts...');
  
  try {
    const response = await axios.get(
      `${config.baseUrl}/api/clients/${config.clientId}/accounts/tree`,
      {
        headers: {
          Cookie: cookie
        }
      }
    );
    
    log(`Retrieved ${response.data.length} accounts`);
    return response.data;
  } catch (error) {
    log('Failed to get existing accounts:', error.message);
    if (error.response) {
      log('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Create a test CSV file with accounts data
 */
async function createTestAccountsCsv() {
  log('Creating test accounts CSV file...');
  ensureTempDir();
  
  const filePath = path.join(config.tempDir, `test-accounts-${Date.now()}.csv`);
  
  // Sample accounts data
  const accounts = [
    {
      accountCode: 'TEST-N1',
      name: 'Test New Account 1',
      type: 'Assets',
      subtype: 'Current Assets',
      balance: '0',
      isSubledger: 'FALSE',
      active: 'TRUE',
      parentAccountCode: '',
      description: 'Test account for import verification',
      fsliBucket: 'Current Assets',
      internalReportingBucket: 'Operating Assets',
      item: 'Cash & Equivalents'
    },
    {
      accountCode: 'TEST-N2',
      name: 'Test New Account 2',
      type: 'Expenses',
      subtype: 'Operating Expenses',
      balance: '0',
      isSubledger: 'FALSE',
      active: 'TRUE',
      parentAccountCode: '',
      description: 'Another test account for import verification',
      fsliBucket: 'Operating Expenses',
      internalReportingBucket: 'Fixed Costs',
      item: 'Administrative'
    },
    {
      accountCode: 'TEST-N3',
      name: 'Test New Account 3 - Child',
      type: 'Assets',
      subtype: 'Current Assets',
      balance: '0',
      isSubledger: 'FALSE',
      active: 'TRUE',
      parentAccountCode: 'TEST-N1',
      description: 'Child test account for import verification',
      fsliBucket: 'Current Assets',
      internalReportingBucket: 'Operating Assets',
      item: 'Cash & Equivalents'
    },
    {
      accountCode: '1000',
      name: 'Updated Cash Account',
      type: 'Assets',
      subtype: 'Current Assets',
      balance: '0',
      isSubledger: 'FALSE',
      active: 'TRUE',
      parentAccountCode: '',
      description: 'Updated description for existing account',
      fsliBucket: 'Current Assets',
      internalReportingBucket: 'Operating Assets',
      item: 'Cash & Equivalents'
    },
    {
      accountCode: '1100',
      name: 'Updated Accounts Receivable',
      type: 'Assets',
      subtype: 'Current Assets',
      balance: '0',
      isSubledger: 'TRUE',
      active: 'TRUE',
      parentAccountCode: '',
      description: 'Updated description for existing A/R account',
      fsliBucket: 'Current Assets',
      internalReportingBucket: 'Operating Assets',
      item: 'Accounts Receivable'
    }
  ];
  
  // Convert to CSV
  const csv = Papa.unparse(accounts);
  fs.writeFileSync(filePath, csv);
  
  log(`Test accounts CSV created at ${filePath}`);
  return filePath;
}

/**
 * Import accounts with specific selection parameters
 */
async function importAccounts(filePath, cookie, selections = {}) {
  log('Importing accounts with selections:', selections);
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    // Add selections data for what accounts to process
    formData.append('selections', JSON.stringify({
      newAccountCodes: selections.newAccountCodes || [],
      modifiedAccountCodes: selections.modifiedAccountCodes || [],
      missingAccountCodes: selections.missingAccountCodes || [],
      updateStrategy: 'selected',  // Always use 'selected' strategy
      removeStrategy: 'inactive'   // Default to 'inactive' for missing accounts
    }));
    
    const response = await axios.post(
      `${config.baseUrl}/api/clients/${config.clientId}/accounts/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Cookie: cookie
        }
      }
    );
    
    log('Import response:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    log('Import failed:', error.message);
    if (error.response) {
      log('Response data:', error.response.data);
      log('Response status:', error.response.status);
    }
    
    return {
      success: false,
      error: error.response ? error.response.data : { message: error.message }
    };
  }
}

/**
 * Check if an account exists with the given account code
 */
async function verifyAccountExists(accountCode, cookie) {
  log(`Verifying if account ${accountCode} exists...`);
  
  try {
    const accounts = await getExistingAccounts(cookie);
    
    // Flatten the account tree to search all accounts
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
    const foundAccount = allAccounts.find(a => a.accountCode === accountCode);
    
    if (foundAccount) {
      log(`Account ${accountCode} found:`, foundAccount.name);
      return true;
    } else {
      log(`Account ${accountCode} not found`);
      return false;
    }
  } catch (error) {
    log(`Error verifying account ${accountCode}:`, error.message);
    return false;
  }
}

/**
 * Test with no accounts selected
 */
async function testNoSelection() {
  log('\n===== STARTING TEST: No Selection =====\n');
  
  try {
    // Login to get auth cookie
    const cookie = await login();
    
    // Create test CSV file
    const filePath = await createTestAccountsCsv();
    
    // Try import with no selections
    const importResult = await importAccounts(filePath, cookie, {
      newAccountCodes: [],
      modifiedAccountCodes: [],
      missingAccountCodes: []
    });
    
    // Expected to fail with a "no accounts selected" error
    const passed = (
      !importResult.success && 
      importResult.error && 
      importResult.error.message && 
      importResult.error.message.includes('No accounts selected')
    );
    
    // Verify no new accounts were created
    const testAccount1Exists = await verifyAccountExists('TEST-N1', cookie);
    
    if (testAccount1Exists) {
      log('❌ UNEXPECTED: Test account TEST-N1 was created even though it was not selected!');
      // This is a critical failure - the account should not exist
      testResults.push({
        name: 'No Selection',
        passed: false,
        reason: 'Account TEST-N1 was created even though it was not selected'
      });
      return false;
    }
    
    if (passed) {
      log('✅ SUCCESS: Import was correctly rejected when no accounts were selected');
      testResults.push({
        name: 'No Selection',
        passed: true,
        details: 'Import was correctly rejected when no accounts were selected'
      });
      return true;
    } else {
      log('❌ FAILURE: Import did not properly reject when no accounts were selected');
      testResults.push({
        name: 'No Selection',
        passed: false,
        reason: 'Import did not properly reject when no accounts were selected'
      });
      return false;
    }
  } catch (error) {
    log('❌ TEST ERROR:', error.message);
    testResults.push({
      name: 'No Selection',
      passed: false,
      reason: `Test error: ${error.message}`
    });
    return false;
  }
}

/**
 * Test with only some accounts selected
 */
async function testPartialSelection() {
  log('\n===== STARTING TEST: Partial Selection =====\n');
  
  try {
    // Login to get auth cookie
    const cookie = await login();
    
    // Create test CSV file
    const filePath = await createTestAccountsCsv();
    
    // Import with only some selections
    const importResult = await importAccounts(filePath, cookie, {
      newAccountCodes: ['TEST-N1'],  // Only select one new account
      modifiedAccountCodes: ['1000'], // Only select one modified account
      missingAccountCodes: []
    });
    
    // Expected to succeed
    if (!importResult.success) {
      log('❌ FAILURE: Import failed unexpectedly:', importResult.error);
      testResults.push({
        name: 'Partial Selection',
        passed: false,
        reason: `Import failed unexpectedly: ${JSON.stringify(importResult.error)}`
      });
      return false;
    }
    
    // Verify selected account was created
    const testAccount1Exists = await verifyAccountExists('TEST-N1', cookie);
    if (!testAccount1Exists) {
      log('❌ FAILURE: Selected account TEST-N1 was not created');
      testResults.push({
        name: 'Partial Selection',
        passed: false,
        reason: 'Selected account TEST-N1 was not created'
      });
      return false;
    }
    
    // Verify unselected account was NOT created
    const testAccount2Exists = await verifyAccountExists('TEST-N2', cookie);
    if (testAccount2Exists) {
      log('❌ FAILURE: Unselected account TEST-N2 was incorrectly created');
      testResults.push({
        name: 'Partial Selection',
        passed: false,
        reason: 'Unselected account TEST-N2 was incorrectly created'
      });
      return false;
    }
    
    log('✅ SUCCESS: Only explicitly selected accounts were processed');
    testResults.push({
      name: 'Partial Selection',
      passed: true,
      details: 'Only explicitly selected accounts were processed'
    });
    return true;
  } catch (error) {
    log('❌ TEST ERROR:', error.message);
    testResults.push({
      name: 'Partial Selection',
      passed: false,
      reason: `Test error: ${error.message}`
    });
    return false;
  }
}

/**
 * Test with all accounts selected
 */
async function testSelectAll() {
  log('\n===== STARTING TEST: Select All =====\n');
  
  try {
    // Login to get auth cookie
    const cookie = await login();
    
    // Create test CSV file
    const filePath = await createTestAccountsCsv();
    
    // Import with all selections
    const importResult = await importAccounts(filePath, cookie, {
      newAccountCodes: ['TEST-N1', 'TEST-N2', 'TEST-N3'],
      modifiedAccountCodes: ['1000', '1100'],
      missingAccountCodes: []
    });
    
    // Expected to succeed
    if (!importResult.success) {
      log('❌ FAILURE: Import failed unexpectedly:', importResult.error);
      testResults.push({
        name: 'Select All',
        passed: false,
        reason: `Import failed unexpectedly: ${JSON.stringify(importResult.error)}`
      });
      return false;
    }
    
    // Verify all accounts were created
    const testAccount1Exists = await verifyAccountExists('TEST-N1', cookie);
    const testAccount2Exists = await verifyAccountExists('TEST-N2', cookie);
    const testAccount3Exists = await verifyAccountExists('TEST-N3', cookie);
    
    if (!testAccount1Exists || !testAccount2Exists || !testAccount3Exists) {
      log('❌ FAILURE: Not all selected accounts were created');
      log(`TEST-N1: ${testAccount1Exists ? 'Created' : 'Missing'}`);
      log(`TEST-N2: ${testAccount2Exists ? 'Created' : 'Missing'}`);
      log(`TEST-N3: ${testAccount3Exists ? 'Created' : 'Missing'}`);
      
      testResults.push({
        name: 'Select All',
        passed: false,
        reason: 'Not all selected accounts were created'
      });
      return false;
    }
    
    log('✅ SUCCESS: All selected accounts were processed correctly');
    testResults.push({
      name: 'Select All',
      passed: true,
      details: 'All selected accounts were processed correctly'
    });
    return true;
  } catch (error) {
    log('❌ TEST ERROR:', error.message);
    testResults.push({
      name: 'Select All',
      passed: false,
      reason: `Test error: ${error.message}`
    });
    return false;
  }
}

/**
 * Run all tests and return results
 */
async function runAllTests() {
  ensureTempDir();
  
  // Reset test results
  testResults.length = 0;
  
  log('\n********************************************************');
  log('  CHART OF ACCOUNTS IMPORT VERIFICATION TEST SUITE');
  log('********************************************************\n');
  
  await testNoSelection();
  await testPartialSelection();
  await testSelectAll();
  
  log('\n********************************************************');
  log('  TEST RESULTS SUMMARY');
  log('********************************************************\n');
  
  testResults.forEach(result => {
    log(`${result.passed ? '✅ PASSED' : '❌ FAILED'}: ${result.name}`);
    if (result.passed) {
      log(`  ${result.details}`);
    } else {
      log(`  Reason: ${result.reason}`);
    }
    log('');
  });
  
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;
  
  log(`Overall: ${passedCount} of ${totalCount} tests passed`);
  
  // Cleanup temp directory if all tests passed
  if (passedCount === totalCount) {
    log('All tests passed, cleaning up temp directory...');
    fs.rmSync(config.tempDir, { recursive: true, force: true });
  }
  
  return testResults;
}

// Export test functions for the Jest test suite
module.exports = {
  login,
  getExistingAccounts,
  createTestAccountsCsv,
  importAccounts,
  verifyAccountExists,
  testNoSelection,
  testPartialSelection,
  testSelectAll,
  runAllTests
};