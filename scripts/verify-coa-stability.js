/**
 * Chart of Accounts Stability Verification Script
 * 
 * This script performs comprehensive verification of the Chart of Accounts functionality
 * at commit 64447303, focusing on:
 * 1. Account structure (proper tree hierarchy)
 * 2. Account counts (75 total accounts, 5 root accounts)
 * 3. Import/export functionality
 * 4. Proper handling of accountCode field
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Papa = require('papaparse');
const xlsx = require('xlsx');

// Config
const BASE_URL = 'http://localhost:5000';
const CLIENT_ID = 128; // Test client ID
const LOG_DIR = path.join(__dirname, '..', 'verification-logs');
const ACCOUNTS_COUNT = 75;
const ROOT_ACCOUNTS_COUNT = 5;
const ROOT_ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file
const logFile = path.join(LOG_DIR, `coa-verification-${new Date().toISOString().replace(/:/g, '-')}.log`);
const tempDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Helper: Log to console and file
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Helper: Log test results
function logResult(testName, success, message = '') {
  const status = success ? 'PASS' : 'FAIL';
  log(`[${status}] ${testName}${message ? ': ' + message : ''}`, status);
  return success;
}

// Helper: Read cookies from file
function getCookieHeader() {
  try {
    const cookieContent = fs.readFileSync(path.join(__dirname, '..', 'cookies.txt'), 'utf8');
    return cookieContent.trim();
  } catch (error) {
    log(`Failed to read cookies file: ${error.message}`, 'ERROR');
    return '';
  }
}

// Login and get auth cookie
async function login() {
  log('Performing login...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const cookies = response.headers['set-cookie'];
    
    if (cookies) {
      fs.writeFileSync(path.join(__dirname, '..', 'cookies.txt'), cookies.join('; '));
      log('Login successful, saved cookies');
      return cookies.join('; ');
    } else {
      log('Login successful but no cookies were set', 'WARN');
      return '';
    }
  } catch (error) {
    log(`Login failed: ${error.response?.data?.message || error.message}`, 'ERROR');
    return '';
  }
}

// Test 1: Verify account structure (tree format)
async function verifyAccountStructure(cookie) {
  log(`Verifying account structure for client ${CLIENT_ID}...`);
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/clients/${CLIENT_ID}/accounts/tree`,
      { headers: { Cookie: cookie } }
    );
    
    const accountTree = response.data;
    
    // Verify we have 5 root accounts
    const rootAccountsCount = accountTree.length;
    const rootAccountTypesVerification = accountTree.every(account => 
      ROOT_ACCOUNT_TYPES.includes(account.type)
    );
    
    // Verify all root accounts have correct types
    const rootAccountTypes = accountTree.map(account => account.type);
    const hasAllRootTypes = ROOT_ACCOUNT_TYPES.every(type => 
      rootAccountTypes.includes(type)
    );
    
    // Count total accounts (including children)
    const countAllAccounts = (accounts) => {
      return accounts.reduce((count, account) => {
        return count + 1 + (account.children ? countAllAccounts(account.children) : 0);
      }, 0);
    };
    
    const totalAccountsCount = countAllAccounts(accountTree);
    
    // Log detailed structure info
    log(`Root accounts found: ${rootAccountsCount} (expected: ${ROOT_ACCOUNTS_COUNT})`);
    log(`Root account types: ${rootAccountTypes.join(', ')}`);
    log(`Total accounts found: ${totalAccountsCount} (expected: ${ACCOUNTS_COUNT})`);
    
    // Check tree relationships (parents and children)
    const verifyTreeRelationships = (accounts, parentId = null) => {
      for (const account of accounts) {
        // Verify parent ID matches
        if (account.parentId !== parentId) {
          log(`Account ${account.id} (${account.accountCode} - ${account.name}) has parentId ${account.parentId} instead of ${parentId}`, 'ERROR');
          return false;
        }
        
        // Verify children have correct parentId
        if (account.children && account.children.length > 0) {
          if (!verifyTreeRelationships(account.children, account.id)) {
            return false;
          }
        }
      }
      return true;
    };
    
    const validTreeRelationships = verifyTreeRelationships(accountTree);
    
    // Overall result
    const success = 
      rootAccountsCount === ROOT_ACCOUNTS_COUNT &&
      rootAccountTypesVerification &&
      hasAllRootTypes &&
      totalAccountsCount === ACCOUNTS_COUNT &&
      validTreeRelationships;
    
    return logResult('Account structure verification', success, 
      `${rootAccountsCount}/${ROOT_ACCOUNTS_COUNT} root accounts, ${totalAccountsCount}/${ACCOUNTS_COUNT} total accounts`);
  } catch (error) {
    log(`Account structure verification failed: ${error.response?.data?.message || error.message}`, 'ERROR');
    return logResult('Account structure verification', false, error.message);
  }
}

// Test 2: Verify accounts list (flat format)
async function verifyAccountsList(cookie) {
  log(`Verifying accounts list for client ${CLIENT_ID}...`);
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/clients/${CLIENT_ID}/accounts`,
      { headers: { Cookie: cookie } }
    );
    
    const accounts = response.data;
    
    // Verify total count
    const totalCount = accounts.length;
    
    // Verify all accounts have accountCode field
    const allHaveAccountCode = accounts.every(account => 
      account.accountCode && account.accountCode.trim() !== ''
    );
    
    // Verify account types distribution
    const typeDistribution = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1;
      return acc;
    }, {});
    
    // Verify active/inactive status
    const activeAccounts = accounts.filter(account => account.active).length;
    const inactiveAccounts = accounts.filter(account => !account.active).length;
    
    // Log detailed info
    log(`Total accounts: ${totalCount} (expected: ${ACCOUNTS_COUNT})`);
    log(`Account type distribution: ${JSON.stringify(typeDistribution)}`);
    log(`Active accounts: ${activeAccounts}, inactive accounts: ${inactiveAccounts}`);
    log(`All accounts have accountCode: ${allHaveAccountCode ? 'Yes' : 'No'}`);
    
    // Overall result
    const success = totalCount === ACCOUNTS_COUNT && allHaveAccountCode;
    
    return logResult('Accounts list verification', success, 
      `${totalCount}/${ACCOUNTS_COUNT} accounts found, accountCode field present: ${allHaveAccountCode ? 'Yes' : 'No'}`);
  } catch (error) {
    log(`Accounts list verification failed: ${error.response?.data?.message || error.message}`, 'ERROR');
    return logResult('Accounts list verification', false, error.message);
  }
}

// Test 3: Verify account export functionality
async function verifyAccountExport(cookie) {
  log(`Verifying account export functionality for client ${CLIENT_ID}...`);
  const csvPath = path.join(tempDir, `client-${CLIENT_ID}-accounts-export.csv`);
  const excelPath = path.join(tempDir, `client-${CLIENT_ID}-accounts-export.xlsx`);
  
  try {
    // Test CSV export
    log('Testing CSV export...');
    const csvResponse = await axios.get(
      `${BASE_URL}/api/clients/${CLIENT_ID}/accounts/export?format=csv`,
      { 
        headers: { Cookie: cookie },
        responseType: 'stream'
      }
    );
    
    const csvWriter = fs.createWriteStream(csvPath);
    csvResponse.data.pipe(csvWriter);
    
    await new Promise((resolve, reject) => {
      csvWriter.on('finish', resolve);
      csvWriter.on('error', reject);
    });
    
    // Test Excel export
    log('Testing Excel export...');
    const excelResponse = await axios.get(
      `${BASE_URL}/api/clients/${CLIENT_ID}/accounts/export?format=excel`,
      { 
        headers: { Cookie: cookie },
        responseType: 'arraybuffer'
      }
    );
    
    fs.writeFileSync(excelPath, Buffer.from(excelResponse.data));
    
    // Verify CSV file has expected fields
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = Papa.parse(csvContent, { header: true });
    const csvHeaders = csvData.meta.fields;
    
    const csvHasAccountCode = csvHeaders.includes('accountCode');
    const csvAccountsCount = csvData.data.filter(row => row.accountCode && row.accountCode.trim() !== '').length;
    
    // Verify Excel file has expected fields
    const workbook = xlsx.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = xlsx.utils.sheet_to_json(worksheet);
    
    const excelHasAccountCode = excelData.length > 0 && excelData[0].hasOwnProperty('accountCode');
    const excelAccountsCount = excelData.length;
    
    // Log detailed info
    log(`CSV file created at: ${csvPath}`);
    log(`CSV headers: ${csvHeaders.join(', ')}`);
    log(`CSV contains accountCode field: ${csvHasAccountCode ? 'Yes' : 'No'}`);
    log(`CSV accounts count: ${csvAccountsCount}`);
    
    log(`Excel file created at: ${excelPath}`);
    log(`Excel contains accountCode field: ${excelHasAccountCode ? 'Yes' : 'No'}`);
    log(`Excel accounts count: ${excelAccountsCount}`);
    
    // Overall result
    const success = 
      csvHasAccountCode && 
      excelHasAccountCode && 
      csvAccountsCount === ACCOUNTS_COUNT && 
      excelAccountsCount === ACCOUNTS_COUNT;
    
    return logResult('Account export verification', success, 
      `CSV: ${csvAccountsCount}/${ACCOUNTS_COUNT} accounts with accountCode: ${csvHasAccountCode ? 'Yes' : 'No'}, ` +
      `Excel: ${excelAccountsCount}/${ACCOUNTS_COUNT} accounts with accountCode: ${excelHasAccountCode ? 'Yes' : 'No'}`);
  } catch (error) {
    log(`Account export verification failed: ${error.response?.data?.message || error.message}`, 'ERROR');
    return logResult('Account export verification', false, error.message);
  }
}

// Test 4: Verify account import preview functionality
async function verifyAccountImportPreview(cookie) {
  log(`Verifying account import preview functionality for client ${CLIENT_ID}...`);
  const csvPath = path.join(tempDir, `client-${CLIENT_ID}-accounts-export.csv`);
  
  try {
    // Ensure we have a CSV file to import
    if (!fs.existsSync(csvPath)) {
      log(`CSV file not found at ${csvPath}, skipping import preview test`, 'WARN');
      return logResult('Account import preview verification', false, 'CSV file not found');
    }
    
    // Modify one account to simulate an update
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = Papa.parse(csvContent, { header: true });
    const modifiedData = csvData.data.map((row, index) => {
      if (index === 1) { // Modify the second account
        return {
          ...row,
          name: `${row.name} (Modified)`,
          description: 'Updated for testing'
        };
      }
      return row;
    });
    
    // Add a new account
    modifiedData.push({
      accountCode: '999999',
      name: 'Test Import Account',
      type: 'ASSET',
      subtype: '',
      isSubledger: 'false',
      subledgerType: '',
      active: 'true',
      description: 'Created by verification script',
      parentId: ''
    });
    
    // Save modified CSV
    const modifiedCsvPath = path.join(tempDir, `client-${CLIENT_ID}-accounts-modified.csv`);
    const modifiedCsvContent = Papa.unparse(modifiedData);
    fs.writeFileSync(modifiedCsvPath, modifiedCsvContent);
    
    // Create form data for the import preview
    const formData = new FormData();
    formData.append('file', new Blob([modifiedCsvContent], { type: 'text/csv' }), 'modified-accounts.csv');
    
    // Test import preview
    log('Testing import preview...');
    const previewResponse = await axios.post(
      `${BASE_URL}/api/clients/${CLIENT_ID}/accounts/import-preview`,
      formData,
      { 
        headers: { 
          Cookie: cookie,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    const previewData = previewResponse.data;
    
    // Verify preview data structure
    const hasNewAccounts = previewData.newAccounts && previewData.newAccounts.length > 0;
    const hasModifiedAccounts = previewData.modifiedAccounts && previewData.modifiedAccounts.length > 0;
    const hasUnchangedAccounts = previewData.unchangedAccounts && previewData.unchangedAccounts.length > 0;
    
    // Log detailed preview info
    log(`Import preview response received with ${previewData.newAccounts.length} new accounts, ` +
        `${previewData.modifiedAccounts.length} modified accounts, and ` +
        `${previewData.unchangedAccounts.length} unchanged accounts`);
    
    if (hasNewAccounts) {
      log(`New accounts: ${previewData.newAccounts.map(a => a.accountCode).join(', ')}`);
    }
    
    if (hasModifiedAccounts) {
      log(`Modified accounts: ${previewData.modifiedAccounts.map(a => a.accountCode).join(', ')}`);
    }
    
    // Overall result
    const success = hasNewAccounts && hasModifiedAccounts && hasUnchangedAccounts;
    
    return logResult('Account import preview verification', success, 
      `New accounts: ${previewData.newAccounts.length}, Modified accounts: ${previewData.modifiedAccounts.length}, ` +
      `Unchanged accounts: ${previewData.unchangedAccounts.length}`);
  } catch (error) {
    log(`Account import preview verification failed: ${error.response?.data?.message || error.message}`, 'ERROR');
    return logResult('Account import preview verification', false, error.message);
  }
}

// Main verification function
async function runVerification() {
  log('Starting Chart of Accounts stability verification...');
  
  try {
    // Step 1: Login
    const cookie = await login();
    if (!cookie) {
      log('Verification aborted: Failed to login', 'ERROR');
      return false;
    }
    
    // Step 2: Verify account structure
    const structureResult = await verifyAccountStructure(cookie);
    
    // Step 3: Verify accounts list
    const listResult = await verifyAccountsList(cookie);
    
    // Step 4: Verify account export
    const exportResult = await verifyAccountExport(cookie);
    
    // Step 5: Verify import preview
    // Note: This test might be skipped if working with FormData in Node.js environment
    // is not properly set up. For complete testing, use the verify-api-endpoints.js script.
    const importPreviewResult = await verifyAccountImportPreview(cookie);
    
    // Overall result
    const allPassed = structureResult && listResult && exportResult && importPreviewResult;
    
    log(`Verification complete. Overall result: ${allPassed ? 'PASS' : 'FAIL'}`);
    log(`Detailed results can be found in: ${logFile}`);
    
    return allPassed;
  } catch (error) {
    log(`Verification failed with error: ${error.message}`, 'ERROR');
    log(`Stack trace: ${error.stack}`, 'ERROR');
    return false;
  }
}

// Run verification
runVerification()
  .then(success => {
    console.log(`\nVerification ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Verification script failed with error:', error);
    process.exit(1);
  });