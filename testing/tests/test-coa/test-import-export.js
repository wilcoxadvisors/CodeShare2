/**
 * Chart of Accounts Import/Export Test Script
 * 
 * This script tests:
 * 1. Importing valid account data 
 * 2. Validating duplicate account codes
 * 3. Validating invalid parent codes
 * 4. Exporting account data to CSV and Excel
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:5000';
const CLIENT_ID = 236;
const ENTITY_ID = 375;
const COOKIE_FILE = path.join(__dirname, 'cookies.txt');

// Test results tracking
const testResults = [];

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    const cookieFile = fs.readFileSync(COOKIE_FILE, 'utf8');
    const cookies = cookieFile
      .trim()
      .split('\n')
      .filter(line => !line.startsWith('#') && line.includes('localhost'))
      .map(line => {
        // Extract domain, path, name, and value from the line
        const parts = line.split(/\s+/);
        // Format: domain FLAG path secure expiry name value
        // Example: #HttpOnly_localhost FALSE / FALSE 1744081143 connect.sid s%3Atms1mbHR_h7AnJaSRXda1nXOyGgyga2T.ZWp%2FJKphANEo0S5KFm9aDl8HpDzpyOHFqeDn%2BFDrnMw
        if (parts.length >= 7) {
          const name = parts[5];
          const value = parts[6];
          return `${name}=${value}`;
        }
        // Handle HttpOnly cookies with a different format
        if (line.includes('#HttpOnly_localhost')) {
          const cookieParts = line.split(' ');
          if (cookieParts.length >= 7) {
            const name = cookieParts[5];
            const value = cookieParts[6];
            return `${name}=${value}`;
          }
        }
        return null;
      })
      .filter(Boolean)
      .join('; ');
    
    console.log('Parsed cookie header:', cookies);
    return cookies;
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return '';
  }
}

/**
 * Log test results in a consistent format
 */
function logResult(testName, success, message) {
  const result = {
    test: testName,
    success,
    message
  };
  testResults.push(result);
  const statusSymbol = success ? '✓' : '✗';
  console.log(`${statusSymbol} ${testName}: ${message}`);
}

/**
 * Create a test directory for output files
 */
function ensureTestDir() {
  const exportDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
}

/**
 * Import accounts from a file
 */
async function importAccounts(filePath, description = 'Test import') {
  try {
    const cookie = getCookieHeader();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('clientId', CLIENT_ID);
    formData.append('entityId', ENTITY_ID);
    formData.append('description', description);

    console.log(`Sending import request with clientId=${CLIENT_ID}, entityId=${ENTITY_ID}`);
    
    const response = await axios.post(`${API_URL}/api/accounts/import`, formData, {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookie
      }
    });

    console.log('Import response status:', response.status);
    console.log('Import response headers:', response.headers);
    
    return response.data;
  } catch (error) {
    console.error('Import error:', error.message);
    if (error.response) {
      console.error('Import error status:', error.response.status);
      console.error('Import error headers:', error.response.headers);
      return error.response.data;
    }
    throw error;
  }
}

/**
 * Get all accounts for a client/entity
 */
async function getAccounts() {
  try {
    const cookie = getCookieHeader();
    
    console.log(`Fetching accounts for clientId=${CLIENT_ID}, entityId=${ENTITY_ID}`);
    
    const response = await axios.get(`${API_URL}/api/accounts`, {
      params: {
        clientId: CLIENT_ID,
        entityId: ENTITY_ID
      },
      headers: {
        Cookie: cookie
      }
    });

    console.log('Get accounts response status:', response.status);
    console.log('Get accounts response headers:', response.headers);
    
    return response.data;
  } catch (error) {
    console.error('Get accounts error:', error.message);
    if (error.response) {
      console.error('Get accounts error status:', error.response.status);
      console.error('Get accounts error headers:', error.response.headers);
    }
    throw error;
  }
}

/**
 * Export accounts to CSV
 */
async function exportAccountsCsv() {
  try {
    const cookie = getCookieHeader();
    const exportDir = ensureTestDir();
    const exportPath = path.join(exportDir, 'accounts-export.csv');
    
    console.log(`Sending CSV export request with clientId=${CLIENT_ID}`);
    
    const response = await axios.get(`${API_URL}/api/clients/${CLIENT_ID}/accounts/export`, {
      params: {
        format: 'csv'
      },
      headers: {
        Cookie: cookie
      },
      responseType: 'arraybuffer'
    });

    console.log('CSV export response status:', response.status);
    console.log('CSV export response headers:', response.headers);
    
    fs.writeFileSync(exportPath, response.data);
    console.log(`Wrote ${response.data.length} bytes to ${exportPath}`);
    
    return exportPath;
  } catch (error) {
    console.error('CSV export error:', error.message);
    if (error.response) {
      console.error('CSV export error status:', error.response.status);
      console.error('CSV export error headers:', error.response.headers);
    }
    throw error;
  }
}

/**
 * Export accounts to Excel
 */
async function exportAccountsExcel() {
  try {
    const cookie = getCookieHeader();
    const exportDir = ensureTestDir();
    const exportPath = path.join(exportDir, 'accounts-export.xlsx');
    
    console.log(`Sending Excel export request with clientId=${CLIENT_ID}`);
    
    const response = await axios.get(`${API_URL}/api/clients/${CLIENT_ID}/accounts/export`, {
      params: {
        format: 'excel'
      },
      headers: {
        Cookie: cookie
      },
      responseType: 'arraybuffer'
    });

    console.log('Excel export response status:', response.status);
    console.log('Excel export response headers:', response.headers);
    
    fs.writeFileSync(exportPath, response.data);
    console.log(`Wrote ${response.data.length} bytes to ${exportPath}`);
    
    return exportPath;
  } catch (error) {
    console.error('Excel export error:', error.message);
    if (error.response) {
      console.error('Excel export error status:', error.response.status);
      console.error('Excel export error headers:', error.response.headers);
    }
    throw error;
  }
}

/**
 * Check if exported CSV file has accountCode field
 */
async function checkCsvHasAccountCode(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('CSV file content (first 200 chars):', content.substring(0, 200));
    
    if (content.startsWith('<!DOCTYPE html>')) {
      console.error('CSV file contains HTML instead of CSV data');
      return false;
    }
    
    const headers = content.split('\n')[0].split(',');
    console.log('CSV headers:', headers);
    
    return headers.includes('AccountCode');
  } catch (error) {
    console.error('Error checking CSV file:', error.message);
    return false;
  }
}

/**
 * Print summary of test results
 */
function printSummary() {
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log('\nFailed tests:');
    testResults
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`- ${r.test}: ${r.message}`);
      });
  }
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  try {
    // First, get all accounts to check if there are any
    console.log('\n=== Checking Existing Accounts ===');
    try {
      const accounts = await getAccounts();
      console.log(`Found ${accounts.data?.length || 0} existing accounts`);
    } catch (error) {
      console.error('Error getting accounts:', error.message);
    }
    
    // Test 1: Import valid accounts
    console.log('\n=== Testing Valid Accounts Import ===');
    const validImportPath = path.join(__dirname, 'imports', 'valid-accounts.csv');
    const validImportResult = await importAccounts(validImportPath, 'Valid accounts test');
    console.log('Valid import result:', JSON.stringify(validImportResult, null, 2));
    
    logResult(
      'Import Valid Accounts',
      validImportResult.status === 'success',
      validImportResult.status === 'success' 
        ? `Successfully imported ${validImportResult.data?.length || 0} accounts`
        : `Failed to import accounts: ${validImportResult.message || 'Unknown error'}`
    );

    // Test 2: Validate duplicate account codes
    console.log('\n=== Testing Duplicate Account Codes Validation ===');
    const duplicateCodesPath = path.join(__dirname, 'imports', 'duplicate-codes.csv');
    const duplicateCodesResult = await importAccounts(duplicateCodesPath, 'Duplicate codes test');
    console.log('Duplicate codes result:', JSON.stringify(duplicateCodesResult, null, 2));
    
    logResult(
      'Validate Duplicate Account Codes',
      duplicateCodesResult.status === 'error' && 
        (duplicateCodesResult.message?.includes('duplicate') || duplicateCodesResult.message?.includes('Duplicate')),
      duplicateCodesResult.status === 'error' && 
        (duplicateCodesResult.message?.includes('duplicate') || duplicateCodesResult.message?.includes('Duplicate'))
        ? 'Correctly rejected duplicate account codes'
        : `Unexpected result: ${JSON.stringify(duplicateCodesResult)}`
    );

    // Test 3: Validate invalid parent codes
    console.log('\n=== Testing Invalid Parent Codes Validation ===');
    const invalidParentsPath = path.join(__dirname, 'imports', 'invalid-parents.csv');
    const invalidParentsResult = await importAccounts(invalidParentsPath, 'Invalid parents test');
    console.log('Invalid parents result:', JSON.stringify(invalidParentsResult, null, 2));
    
    logResult(
      'Validate Invalid Parent Codes',
      invalidParentsResult.status === 'error' && 
        (invalidParentsResult.message?.includes('parent') || invalidParentsResult.message?.includes('Parent')),
      invalidParentsResult.status === 'error' && 
        (invalidParentsResult.message?.includes('parent') || invalidParentsResult.message?.includes('Parent'))
        ? 'Correctly rejected invalid parent codes'
        : `Unexpected result: ${JSON.stringify(invalidParentsResult)}`
    );

    // Test 4: Export accounts to CSV
    console.log('\n=== Testing CSV Export ===');
    try {
      const csvExportPath = await exportAccountsCsv();
      console.log('CSV export path:', csvExportPath);
      
      const hasCsvAccountCode = await checkCsvHasAccountCode(csvExportPath);
      
      logResult(
        'Export Accounts to CSV',
        fs.existsSync(csvExportPath),
        fs.existsSync(csvExportPath)
          ? `Successfully exported to ${csvExportPath}`
          : 'Failed to export CSV'
      );
      
      logResult(
        'CSV Has AccountCode Field',
        hasCsvAccountCode,
        hasCsvAccountCode
          ? 'CSV export correctly includes AccountCode field'
          : 'CSV export is missing AccountCode field'
      );
    } catch (error) {
      console.error('CSV export test error:', error.message);
      logResult('Export Accounts to CSV', false, `Error: ${error.message}`);
    }

    // Test 5: Export accounts to Excel
    console.log('\n=== Testing Excel Export ===');
    try {
      const excelExportPath = await exportAccountsExcel();
      console.log('Excel export path:', excelExportPath);
      
      logResult(
        'Export Accounts to Excel',
        fs.existsSync(excelExportPath),
        fs.existsSync(excelExportPath)
          ? `Successfully exported to ${excelExportPath}`
          : 'Failed to export Excel'
      );
    } catch (error) {
      console.error('Excel export test error:', error.message);
      logResult('Export Accounts to Excel', false, `Error: ${error.message}`);
    }

    // Print summary
    printSummary();
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runAllTests();
