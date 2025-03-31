/**
 * Chart of Accounts Import/Export Test Script
 * 
 * This script tests the CoA import and export functionality 
 * including the enhanced data integrity features.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const XLSX = require('xlsx');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CLIENT_ID = process.env.TEST_CLIENT_ID || 2; // Default to client ID 2 (OK)
const TEST_USERNAME = process.env.TEST_USERNAME || 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password';

// Test files
const TEST_FILES_DIR = path.join(__dirname, '..', 'test', 'coa-import-export');
const EXPORT_DIR = path.join(__dirname, '..', 'test', 'exports');
const VALID_CSV = path.join(TEST_FILES_DIR, 'valid_import.csv');
const VALID_XLSX = path.join(TEST_FILES_DIR, 'valid_import.xlsx');
const INVALID_CSV = path.join(TEST_FILES_DIR, 'invalid_import.csv');

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Track test results
const testResults = [];

/**
 * Log test results in a consistent format
 */
function logResult(testName, success, message) {
  const result = {
    name: testName,
    success,
    message
  };
  
  testResults.push(result);
  
  console.log(`Test: ${testName}`);
  console.log(`Result: ${success ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Message: ${message}`);
  console.log('----------------------------------------');
  
  return result;
}

/**
 * Log in to get auth cookie
 */
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    }, {
      withCredentials: true
    });
    
    // Save cookies for future requests
    const cookies = response.headers['set-cookie'];
    axios.defaults.headers.Cookie = cookies.join('; ');
    axios.defaults.withCredentials = true;
    
    return logResult('Authentication', true, 'Successfully logged in');
  } catch (error) {
    return logResult('Authentication', false, `Login failed: ${error.message}`);
  }
}

/**
 * Get all accounts for a client
 */
async function getAccounts(clientId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/clients/${clientId}/accounts`);
    return response.data;
  } catch (error) {
    logResult('Get Accounts', false, `Failed to get accounts: ${error.message}`);
    return null;
  }
}

/**
 * Export accounts to CSV or Excel
 */
async function exportAccounts(clientId, format = 'csv') {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/clients/${clientId}/accounts/export?format=${format}`,
      { responseType: 'arraybuffer' }
    );
    
    const contentType = response.headers['content-type'];
    const filename = `client_${clientId}_accounts_export.${format}`;
    const outputPath = path.join(EXPORT_DIR, filename);
    
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    
    logResult(`Export to ${format.toUpperCase()}`, true, `Successfully exported to ${outputPath}`);
    return outputPath;
  } catch (error) {
    logResult(`Export to ${format.toUpperCase()}`, false, `Export failed: ${error.message}`);
    return null;
  }
}

/**
 * Import accounts from file
 */
async function importAccounts(clientId, filePath) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(
      `${BASE_URL}/api/clients/${clientId}/accounts/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        }
      }
    );
    
    const extension = path.extname(filePath).toLowerCase();
    const format = extension === '.csv' ? 'CSV' : 'Excel';
    
    logResult(`Import from ${format}`, true, `Successfully imported from ${filePath}. Result: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    const extension = path.extname(filePath).toLowerCase();
    const format = extension === '.csv' ? 'CSV' : 'Excel';
    
    if (error.response && error.response.data) {
      logResult(`Import from ${format}`, false, `Import failed: ${JSON.stringify(error.response.data)}`);
    } else {
      logResult(`Import from ${format}`, false, `Import failed: ${error.message}`);
    }
    return null;
  }
}

/**
 * Verify account integrity after import
 */
async function verifyAccountIntegrity(clientId, beforeAccounts, importResult) {
  try {
    const afterAccounts = await getAccounts(clientId);
    
    if (!afterAccounts) {
      return logResult('Data Integrity', false, 'Could not retrieve accounts after import');
    }
    
    // Verify account count matches expected result
    const expectedCount = beforeAccounts.length + importResult.added - importResult.skipped;
    const actualCount = afterAccounts.length;
    
    if (actualCount !== expectedCount) {
      return logResult('Data Integrity', false, 
        `Account count mismatch. Expected ${expectedCount}, got ${actualCount}`);
    }
    
    // Verify no duplicate account codes
    const accountCodes = afterAccounts.map(acc => acc.code);
    const uniqueCodes = new Set(accountCodes);
    
    if (accountCodes.length !== uniqueCodes.size) {
      return logResult('Data Integrity', false, 'Duplicate account codes found after import');
    }
    
    // Verify parent-child relationships
    const accountMap = {};
    afterAccounts.forEach(acc => {
      accountMap[acc.code] = acc;
    });
    
    for (const account of afterAccounts) {
      if (account.parentId) {
        const parent = afterAccounts.find(acc => acc.id === account.parentId);
        
        if (!parent) {
          return logResult('Data Integrity', false, 
            `Account ${account.code} has parentId ${account.parentId} but parent account not found`);
        }
      }
    }
    
    return logResult('Data Integrity', true, 'Account data integrity verified successfully');
  } catch (error) {
    return logResult('Data Integrity', false, `Integrity verification failed: ${error.message}`);
  }
}

/**
 * Run the full test suite
 */
async function runTests() {
  console.log('Starting Chart of Accounts Import/Export Tests');
  console.log('============================================');
  
  // Login first
  const loginResult = await login();
  if (!loginResult.success) {
    console.log('Cannot proceed with tests due to authentication failure');
    return false;
  }
  
  // Get initial accounts state
  const beforeAccounts = await getAccounts(TEST_CLIENT_ID);
  if (!beforeAccounts) {
    console.log('Cannot proceed with tests due to failure to retrieve accounts');
    return false;
  }
  
  console.log(`Initial state: ${beforeAccounts.length} accounts found for client ID ${TEST_CLIENT_ID}`);
  
  // Test CSV export
  const csvExportPath = await exportAccounts(TEST_CLIENT_ID, 'csv');
  
  // Test Excel export
  const xlsxExportPath = await exportAccounts(TEST_CLIENT_ID, 'xlsx');
  
  // Test valid CSV import
  const csvImportResult = await importAccounts(TEST_CLIENT_ID, VALID_CSV);
  if (csvImportResult) {
    await verifyAccountIntegrity(TEST_CLIENT_ID, beforeAccounts, csvImportResult);
  }
  
  // Test valid Excel import
  const xlsxImportResult = await importAccounts(TEST_CLIENT_ID, VALID_XLSX);
  if (xlsxImportResult) {
    await verifyAccountIntegrity(TEST_CLIENT_ID, beforeAccounts, xlsxImportResult);
  }
  
  // Test invalid CSV import (should fail with validation errors)
  const invalidImportResult = await importAccounts(TEST_CLIENT_ID, INVALID_CSV);
  if (invalidImportResult && invalidImportResult.errors && invalidImportResult.errors.length > 0) {
    logResult('Invalid Import Validation', true, 
      `Correctly rejected invalid file with ${invalidImportResult.errors.length} errors`);
  } else {
    logResult('Invalid Import Validation', false, 
      'Invalid file was accepted without expected validation errors');
  }
  
  // Export our own test data to file for verification
  // This helps us manually inspect the exported data structure
  const exportedData = beforeAccounts.map(acc => ({
    code: acc.code,
    name: acc.name,
    type: acc.type,
    subtype: acc.subtype,
    isSubledger: acc.isSubledger ? 'Yes' : 'No',
    subledgerType: acc.subledgerType || '',
    parentCode: acc.parentId ? beforeAccounts.find(a => a.id === acc.parentId)?.code || '' : '',
    description: acc.description || '',
    active: acc.active ? 'Yes' : 'No'
  }));
  
  // Write CSV version
  const csvOutput = 'code,name,type,subtype,isSubledger,subledgerType,parentCode,description,active\n' + 
    exportedData.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
  
  fs.writeFileSync(path.join(EXPORT_DIR, 'verification_export.csv'), csvOutput);
  
  // Write Excel version
  const worksheet = XLSX.utils.json_to_sheet(exportedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');
  XLSX.writeFile(workbook, path.join(EXPORT_DIR, 'verification_export.xlsx'));
  
  // Print summary
  console.log('\nTest Summary:');
  console.log('============================================');
  
  const passes = testResults.filter(r => r.success).length;
  const failures = testResults.filter(r => !r.success).length;
  
  console.log(`Total tests: ${testResults.length}`);
  console.log(`Passed: ${passes}`);
  console.log(`Failed: ${failures}`);
  
  if (failures > 0) {
    console.log('\nFailed Tests:');
    testResults.filter(r => !r.success).forEach(failure => {
      console.log(`- ${failure.name}: ${failure.message}`);
    });
  }
  
  return failures === 0;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite failed with error:', error);
  process.exit(1);
});