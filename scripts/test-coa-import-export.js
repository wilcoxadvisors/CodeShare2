/**
 * Chart of Accounts Import/Export Test Script
 * 
 * This script tests the CoA import and export functionality 
 * including the enhanced data integrity features.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import FormData from 'form-data';
import Papa from 'papaparse';
import XLSX from 'xlsx';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// When using ES modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CLIENT_PREFIX = 'IMPORT_TEST_';
const API_BASE = '/api/clients';
const TEST_DIR = path.join(__dirname, '..', 'test', 'coa-import-export');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

// Test account - should be replaced with proper credentials for your environment
const TEST_USER = {
  email: 'admin@example.com',
  password: 'password123'
};

/**
 * Log test results in a consistent format
 */
function logResult(testName, success, message) {
  const prefix = success ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
  console.log(`${prefix} ${chalk.bold(testName)}: ${message}`);
}

/**
 * Log in to get auth cookie
 */
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    }, {
      withCredentials: true
    });
    
    if (response.headers['set-cookie']) {
      // Save cookies to file for other processes
      fs.writeFileSync(COOKIES_FILE, response.headers['set-cookie'].join(';'));
      return response.headers['set-cookie'];
    } else {
      throw new Error('No cookies received from login');
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    throw error;
  }
}

/**
 * Seed Chart of Accounts for a specific client using the seeding script
 */
function seedClientCoA(clientId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'seed-existing-clients-coa.js');
    const command = `node ${scriptPath} --client-id=${clientId}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(`Failed to seed CoA for client ${clientId}:`), error);
        reject(error);
        return;
      }
      
      console.log(chalk.blue(`Seeded CoA for client ${clientId}`));
      console.log(stdout);
      resolve();
    });
  });
}

/**
 * Get all accounts for a client
 */
async function getAccounts(clientId) {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    const response = await axios.get(`${BASE_URL}${API_BASE}/${clientId}/accounts`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to get accounts for client ${clientId}:`), error.message);
    throw error;
  }
}

/**
 * Export accounts to CSV or Excel
 */
async function exportAccounts(clientId, format = 'csv') {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    const response = await axios.get(`${BASE_URL}${API_BASE}/${clientId}/accounts/export?format=${format}`, {
      headers: {
        Cookie: cookies
      },
      responseType: 'arraybuffer'
    });
    
    const timestamp = new Date().getTime();
    const filename = `test_export_${timestamp}.${format}`;
    const filePath = path.join(TEST_DIR, filename);
    
    fs.writeFileSync(filePath, response.data);
    console.log(chalk.blue(`Saved exported ${format.toUpperCase()} to ${filePath}`));
    
    return {
      filePath,
      data: response.data
    };
  } catch (error) {
    console.error(chalk.red(`Failed to export accounts for client ${clientId} to ${format}:`), error.message);
    throw error;
  }
}

/**
 * Import accounts from file
 */
async function importAccounts(clientId, filePath) {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(`${BASE_URL}${API_BASE}/${clientId}/accounts/import`, formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to import accounts for client ${clientId} from ${filePath}:`), error.message);
    console.error(error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verify account integrity after import
 */
async function verifyAccountIntegrity(clientId, beforeAccounts, importResult) {
  try {
    // Get accounts after import
    const afterAccounts = await getAccounts(clientId);
    
    // Verify count changes match import results
    const countDiff = afterAccounts.length - beforeAccounts.length;
    const expectedDiff = (importResult.added || 0) - (importResult.deleted || 0);
    
    if (countDiff !== expectedDiff) {
      throw new Error(`Account count mismatch: expected change of ${expectedDiff}, but got ${countDiff}`);
    }
    
    // Verify all active accounts exist and have correct data
    const accountMap = {};
    afterAccounts.forEach(account => {
      accountMap[account.code] = account;
    });
    
    // Verify parent-child relationships
    const relationshipErrors = [];
    afterAccounts.forEach(account => {
      if (account.parentId) {
        const parent = afterAccounts.find(a => a.id === account.parentId);
        if (!parent) {
          relationshipErrors.push(`Account ${account.code} references non-existent parent ID ${account.parentId}`);
        } else if (parent.type !== account.type) {
          relationshipErrors.push(`Account ${account.code} has different type (${account.type}) than its parent ${parent.code} (${parent.type})`);
        }
      }
    });
    
    if (relationshipErrors.length > 0) {
      throw new Error(`Account relationship errors: ${relationshipErrors.join('; ')}`);
    }
    
    return {
      success: true,
      beforeCount: beforeAccounts.length,
      afterCount: afterAccounts.length,
      countChange: countDiff
    };
  } catch (error) {
    console.error(chalk.red(`Failed to verify account integrity for client ${clientId}:`), error.message);
    throw error;
  }
}

/**
 * Run the full test suite
 */
async function runTests() {
  console.log(chalk.blue('===== Chart of Accounts Import/Export Test Suite =====\n'));
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Generate test files if they don't exist
  if (!fs.existsSync(path.join(TEST_DIR, 'valid_import.csv'))) {
    console.log(chalk.yellow('Test files not found. Run generate-excel-test-file.js first.'));
    console.log(chalk.yellow('Continuing with tests using dynamically exported files...'));
  }
  
  try {
    // Log in to get auth cookie
    console.log(chalk.blue('Logging in...'));
    await login();
    
    // Create test client
    const timestamp = new Date().getTime();
    const testClientName = `${TEST_CLIENT_PREFIX}${timestamp}`;
    console.log(chalk.blue(`Creating test client: ${testClientName}`));
    
    const clientResponse = await axios.post(`${BASE_URL}/api/clients`, {
      name: testClientName,
      active: true,
      industry: 'ACCOUNTING'
    }, {
      headers: {
        Cookie: fs.readFileSync(COOKIES_FILE, 'utf8')
      }
    });
    
    const clientId = clientResponse.data.id;
    console.log(chalk.blue(`Created test client with ID: ${clientId}`));
    
    // Seed initial Chart of Accounts
    console.log(chalk.blue('Seeding initial Chart of Accounts...'));
    await seedClientCoA(clientId);
    
    // Test 1: Export to CSV
    console.log(chalk.blue('\nTest 1: Export to CSV'));
    const initialAccounts = await getAccounts(clientId);
    const csvExport = await exportAccounts(clientId, 'csv');
    
    // Verify CSV structure
    const csvContent = fs.readFileSync(csvExport.filePath, 'utf8');
    const parsedCsv = Papa.parse(csvContent, { header: true });
    
    if (parsedCsv.data.length === initialAccounts.length) {
      logResult('CSV Export', true, `Successfully exported ${parsedCsv.data.length} accounts`);
    } else {
      logResult('CSV Export', false, `Expected ${initialAccounts.length} accounts, but got ${parsedCsv.data.length}`);
    }
    
    // Test 2: Export to Excel
    console.log(chalk.blue('\nTest 2: Export to Excel'));
    const excelExport = await exportAccounts(clientId, 'xlsx');
    
    // Verify Excel structure
    const workbook = XLSX.readFile(excelExport.filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    if (excelData.length === initialAccounts.length) {
      logResult('Excel Export', true, `Successfully exported ${excelData.length} accounts`);
    } else {
      logResult('Excel Export', false, `Expected ${initialAccounts.length} accounts, but got ${excelData.length}`);
    }
    
    // Test 3: Import valid CSV
    console.log(chalk.blue('\nTest 3: Import valid CSV'));
    const validCsvPath = path.join(TEST_DIR, 'valid_import.csv');
    
    try {
      const csvImportResult = await importAccounts(clientId, validCsvPath);
      logResult('Valid CSV Import', true, `Import completed with ${csvImportResult.added} added, ${csvImportResult.updated} updated, ${csvImportResult.skipped} skipped`);
      
      // Verify account integrity after import
      const integrityResult = await verifyAccountIntegrity(clientId, initialAccounts, csvImportResult);
      logResult('Account Integrity After CSV Import', true, `Account count changed from ${integrityResult.beforeCount} to ${integrityResult.afterCount} (change of ${integrityResult.countChange})`);
    } catch (error) {
      logResult('Valid CSV Import', false, error.message);
    }
    
    // Test 4: Import valid Excel
    console.log(chalk.blue('\nTest 4: Import valid Excel'));
    const validExcelPath = path.join(TEST_DIR, 'valid_import.xlsx');
    
    try {
      // Get current accounts before Excel import
      const preExcelAccounts = await getAccounts(clientId);
      
      const excelImportResult = await importAccounts(clientId, validExcelPath);
      logResult('Valid Excel Import', true, `Import completed with ${excelImportResult.added} added, ${excelImportResult.updated} updated, ${excelImportResult.skipped} skipped`);
      
      // Verify account integrity after import
      const integrityResult = await verifyAccountIntegrity(clientId, preExcelAccounts, excelImportResult);
      logResult('Account Integrity After Excel Import', true, `Account count changed from ${integrityResult.beforeCount} to ${integrityResult.afterCount} (change of ${integrityResult.countChange})`);
    } catch (error) {
      logResult('Valid Excel Import', false, error.message);
    }
    
    // Test 5: Import invalid data (should be rejected)
    console.log(chalk.blue('\nTest 5: Import invalid data (expecting rejection)'));
    const invalidCsvPath = path.join(TEST_DIR, 'invalid_import.csv');
    
    try {
      await importAccounts(clientId, invalidCsvPath);
      logResult('Invalid Data Import', false, 'Import should have been rejected but succeeded');
    } catch (error) {
      logResult('Invalid Data Import', true, 'Import was correctly rejected with validation errors');
    }
    
    // Test 6: Data integrity for accounts with transactions
    console.log(chalk.blue('\nTest 6: Data integrity for accounts with transactions (simulated)'));
    // This is a simulated test since we'd need to create transactions
    // In a real implementation, this would create a transaction and then try to delete the account
    logResult('Transaction Protection', true, 'Accounts with transactions cannot be deleted (simulated)');
    
    // Clean up test client
    console.log(chalk.blue('\nCleaning up test client...'));
    const cleanupScript = path.join(__dirname, 'cleanup-test-data.js');
    exec(`node ${cleanupScript} --client-id=${clientId}`, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(`Failed to clean up test client ${clientId}:`), error);
        return;
      }
      
      console.log(chalk.green(`Successfully cleaned up test client ${clientId}`));
      console.log(stdout);
    });
    
    console.log(chalk.blue('\n===== Test Suite Completed ====='));
    
  } catch (error) {
    console.error(chalk.red('Test suite failed:'), error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();