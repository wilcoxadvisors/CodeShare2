/**
 * Chart of Accounts Import/Export Verification Script
 * 
 * This script verifies that:
 * 1. The Chart of Accounts export functionality correctly exports with 'accountCode' field
 * 2. The Chart of Accounts import functionality correctly processes files with 'accountCode' field
 * 3. The new reporting fields (fsliBucket, internalReportingBucket, item) are properly handled
 * 
 * This is a verification script for post-migration testing.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import XLSX from 'xlsx';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Convert ESM file URL to path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const COOKIE_FILE = './cookies.txt';
const TEMP_DIR = './tmp/verification';
const TEST_CSV_PATH = './test/data/coa-import/test-accounts-import-with-accountcode.csv';
const TEST_EXCEL_PATH = './test/data/coa-import/test-accounts-import-with-accountcode.xlsx';
const LOG_FILE = './verification-logs/coa-import-export-verification.log';

// Verification counters
let totalTests = 0;
let passedTests = 0;
let skippedTests = 0;

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    const cookieContent = fs.readFileSync(COOKIE_FILE, 'utf8');
    return cookieContent.trim();
  } catch (error) {
    console.error(chalk.red('Error reading cookie file:'), error.message);
    process.exit(1);
  }
}

/**
 * Login to get auth cookie
 */
async function login() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      fs.writeFileSync(COOKIE_FILE, setCookieHeader);
      console.log(chalk.green('✓ Successfully logged in and updated cookie'));
      return setCookieHeader;
    } else {
      throw new Error('No cookie received from login');
    }
  } catch (error) {
    console.error(chalk.red('Login error:'), error.message);
    process.exit(1);
  }
}

/**
 * Ensure temporary directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // Also ensure logs directory exists
  const logsDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * Log verification results
 */
function logResult(testName, success, message) {
  const timestamp = new Date().toISOString();
  const result = success ? chalk.green('PASS') : chalk.red('FAIL');
  const consoleMessage = `[${timestamp}] ${result} - ${testName}: ${message}`;
  const fileMessage = `[${timestamp}] ${success ? 'PASS' : 'FAIL'} - ${testName}: ${message}\n`;
  
  console.log(consoleMessage);
  fs.appendFileSync(LOG_FILE, fileMessage);
  
  totalTests++;
  if (success) passedTests++;
}

/**
 * Create a test client
 */
async function createTestClient(cookie) {
  try {
    const clientName = `CoA Test Client ${Date.now()}`;
    const response = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ 
        name: clientName,
        description: 'Test client for CoA import/export verification',
        industry: 'Technology',
        contactEmail: 'test@example.com'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create test client: ${response.status} ${response.statusText}`);
    }
    
    const client = await response.json();
    logResult('Create Test Client', true, `Created test client: ${clientName} (ID: ${client.id})`);
    return client;
  } catch (error) {
    logResult('Create Test Client', false, error.message);
    throw error;
  }
}

/**
 * Export accounts to CSV for a client
 */
async function exportAccountsCSV(clientId, cookie) {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/export?format=csv`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export accounts: ${response.status} ${response.statusText}`);
    }
    
    const exportPath = path.join(TEMP_DIR, `client_${clientId}_accounts.csv`);
    const fileStream = fs.createWriteStream(exportPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });
    
    logResult('Export Accounts CSV', true, `Exported accounts to ${exportPath}`);
    return exportPath;
  } catch (error) {
    logResult('Export Accounts CSV', false, error.message);
    throw error;
  }
}

/**
 * Export accounts to Excel for a client
 */
async function exportAccountsExcel(clientId, cookie) {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/export?format=xlsx`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export accounts: ${response.status} ${response.statusText}`);
    }
    
    const exportPath = path.join(TEMP_DIR, `client_${clientId}_accounts.xlsx`);
    const fileStream = fs.createWriteStream(exportPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });
    
    logResult('Export Accounts Excel', true, `Exported accounts to ${exportPath}`);
    return exportPath;
  } catch (error) {
    logResult('Export Accounts Excel', false, error.message);
    throw error;
  }
}

/**
 * Import accounts from a file
 */
async function importAccounts(clientId, filePath, cookie) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/import`, {
      method: 'POST',
      headers: {
        'Cookie': cookie
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to import accounts: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    logResult('Import Accounts', true, `Imported ${result.importedCount} accounts`);
    return result;
  } catch (error) {
    logResult('Import Accounts', false, error.message);
    throw error;
  }
}

/**
 * Verify exported CSV file has 'accountCode' field
 */
async function verifyExportedCsvHasAccountCode(filePath) {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const firstLine = csvContent.split('\n')[0].toLowerCase();
    
    if (firstLine.includes('accountcode')) {
      logResult('Verify CSV Has AccountCode', true, 'Exported CSV has accountCode field');
      return true;
    } else {
      throw new Error('Exported CSV does not have accountCode field');
    }
  } catch (error) {
    logResult('Verify CSV Has AccountCode', false, error.message);
    return false;
  }
}

/**
 * Verify exported Excel file has 'accountCode' field
 */
async function verifyExportedExcelHasAccountCode(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0].map(h => h.toLowerCase());
    
    if (headers.includes('accountcode')) {
      logResult('Verify Excel Has AccountCode', true, 'Exported Excel has accountCode field');
      return true;
    } else {
      throw new Error('Exported Excel does not have accountCode field');
    }
  } catch (error) {
    logResult('Verify Excel Has AccountCode', false, error.message);
    return false;
  }
}

/**
 * Verify exported file has new reporting fields
 */
async function verifyExportedFileHasReportingFields(filePath, isExcel = false) {
  try {
    let headers;
    
    if (isExcel) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0].map(h => h.toLowerCase());
    } else {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      headers = csvContent.split('\n')[0].toLowerCase().split(',');
    }
    
    const format = isExcel ? 'Excel' : 'CSV';
    const missingFields = [];
    
    ['fslibucket', 'internalreportingbucket', 'item'].forEach(field => {
      if (!headers.includes(field)) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length === 0) {
      logResult(`Verify ${format} Has Reporting Fields`, true, `Exported ${format} has all reporting fields`);
      return true;
    } else {
      throw new Error(`Exported ${format} is missing fields: ${missingFields.join(', ')}`);
    }
  } catch (error) {
    logResult(`Verify ${isExcel ? 'Excel' : 'CSV'} Has Reporting Fields`, false, error.message);
    return false;
  }
}

/**
 * Get all accounts for a client and verify accountCode field
 */
async function getAccountsAndVerifyAccountCode(clientId, cookie) {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get accounts: ${response.status} ${response.statusText}`);
    }
    
    const accounts = await response.json();
    
    // Verify accountCode field exists on accounts
    const accountWithoutCode = accounts.find(account => !account.accountCode);
    
    if (accountWithoutCode) {
      throw new Error(`Account ID ${accountWithoutCode.id} is missing accountCode field`);
    }
    
    logResult('Verify Accounts Have AccountCode', true, `All ${accounts.length} accounts have accountCode field`);
    
    // Verify reporting fields exist on accounts
    const missingReportingFields = [];
    const fieldsToCheck = ['fsliBucket', 'internalReportingBucket', 'item'];
    
    for (const field of fieldsToCheck) {
      if (accounts.every(account => !account[field])) {
        missingReportingFields.push(field);
      }
    }
    
    if (missingReportingFields.length > 0) {
      logResult('Verify Accounts Have Reporting Fields', false, `Accounts are missing fields: ${missingReportingFields.join(', ')}`);
    } else {
      logResult('Verify Accounts Have Reporting Fields', true, 'Accounts have all reporting fields');
    }
    
    return accounts;
  } catch (error) {
    logResult('Verify Accounts Have AccountCode', false, error.message);
    throw error;
  }
}

/**
 * Clean up test client
 */
async function cleanupTestClient(clientId, cookie) {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookie
      }
    });
    
    if (response.ok) {
      logResult('Cleanup Test Client', true, `Deleted test client ID ${clientId}`);
    } else {
      throw new Error(`Failed to delete test client: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    logResult('Cleanup Test Client', false, error.message);
  }
}

/**
 * Print summary of verification results
 */
function printSummary() {
  console.log('\n' + chalk.yellow('='.repeat(50)));
  console.log(chalk.yellow(' Chart of Accounts Import/Export Verification Summary'));
  console.log(chalk.yellow('='.repeat(50)));
  console.log(chalk.cyan(`Total Tests: ${totalTests}`));
  console.log(chalk.green(`Passed Tests: ${passedTests}`));
  console.log(chalk.red(`Failed Tests: ${totalTests - passedTests - skippedTests}`));
  
  if (skippedTests > 0) {
    console.log(chalk.yellow(`Skipped Tests: ${skippedTests}`));
  }
  
  const successRate = (passedTests / totalTests) * 100;
  console.log(chalk.cyan(`Success Rate: ${successRate.toFixed(2)}%`));
  console.log(chalk.yellow('='.repeat(50)));
}

/**
 * Run all verification tests
 */
async function runVerification() {
  console.log(chalk.cyan('\nStarting Chart of Accounts Import/Export Verification...'));
  ensureTempDir();
  fs.writeFileSync(LOG_FILE, `Chart of Accounts Import/Export Verification - ${new Date().toISOString()}\n\n`);
  
  // Login to refresh cookie
  const cookie = await login();
  let testClientId = null;
  
  try {
    // Create test client
    const testClient = await createTestClient(cookie);
    testClientId = testClient.id;
    
    // Test CSV export
    const exportedCsvPath = await exportAccountsCSV(testClientId, cookie);
    await verifyExportedCsvHasAccountCode(exportedCsvPath);
    await verifyExportedFileHasReportingFields(exportedCsvPath);
    
    // Test Excel export
    const exportedExcelPath = await exportAccountsExcel(testClientId, cookie);
    await verifyExportedExcelHasAccountCode(exportedExcelPath);
    await verifyExportedFileHasReportingFields(exportedExcelPath, true);
    
    // Test CSV import
    await importAccounts(testClientId, TEST_CSV_PATH, cookie);
    
    // Test Excel import
    await importAccounts(testClientId, TEST_EXCEL_PATH, cookie);
    
    // Verify imported accounts have accountCode field
    await getAccountsAndVerifyAccountCode(testClientId, cookie);
    
  } catch (error) {
    console.error(chalk.red('Verification Error:'), error.message);
  } finally {
    // Clean up test client
    if (testClientId) {
      await cleanupTestClient(testClientId, cookie);
    }
    
    printSummary();
  }
}

// Run verification
runVerification().catch(error => {
  console.error(chalk.red('Fatal Error:'), error);
  process.exit(1);
});