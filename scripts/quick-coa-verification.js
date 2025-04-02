/**
 * Quick Chart of Accounts Verification Script
 * 
 * This script verifies that the Chart of Accounts functionality correctly
 * handles the 'accountCode' field and new reporting fields.
 */

import axios from 'axios';
import fs from 'fs';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const COOKIE_FILE = './cookies.txt';

// Test results
let passedTests = 0;
let failedTests = 0;

/**
 * Helper function to get auth cookie
 */
function getCookieHeader() {
  try {
    return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
  } catch (error) {
    console.error(chalk.red('Error reading cookie file:'), error.message);
    process.exit(1);
  }
}

/**
 * Log test result
 */
function logResult(testName, success, message) {
  const result = success ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`${result} - ${testName}: ${message}`);
  
  if (success) {
    passedTests++;
  } else {
    failedTests++;
  }
}

/**
 * Create a test client
 */
async function createTestClient(cookie) {
  try {
    const response = await axios.post(`${API_BASE_URL}/clients`, {
      name: `CoA Test Client ${Date.now()}`,
      description: 'Test client for CoA verification',
      industry: 'Technology',
      contactEmail: 'test@example.com'
    }, {
      headers: {
        'Cookie': cookie
      }
    });
    
    logResult('Create Test Client', true, `Created client ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    logResult('Create Test Client', false, getErrorMessage(error));
    throw error;
  }
}

/**
 * Get client accounts
 */
async function getClientAccounts(clientId, cookie) {
  try {
    const response = await axios.get(`${API_BASE_URL}/clients/${clientId}/accounts`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    logResult('Get Client Accounts', true, `Retrieved ${response.data.length} accounts`);
    return response.data;
  } catch (error) {
    logResult('Get Client Accounts', false, getErrorMessage(error));
    throw error;
  }
}

/**
 * Verify accounts have accountCode field
 */
function verifyAccountCodeField(accounts) {
  try {
    // Check if every account has accountCode field
    const allHaveAccountCode = accounts.every(account => account.accountCode !== undefined);
    
    if (allHaveAccountCode) {
      logResult('Verify AccountCode Field', true, 'All accounts have accountCode field');
      return true;
    } else {
      const missingAccounts = accounts.filter(account => account.accountCode === undefined)
        .map(a => a.id)
        .join(', ');
      throw new Error(`Accounts missing accountCode: ${missingAccounts}`);
    }
  } catch (error) {
    logResult('Verify AccountCode Field', false, error.message);
    return false;
  }
}

/**
 * Verify at least some accounts have reporting fields
 */
function verifyReportingFields(accounts) {
  try {
    // Check if any accounts have the new reporting fields
    const hasReportingFields = accounts.some(account => 
      account.fsliBucket !== undefined || 
      account.internalReportingBucket !== undefined || 
      account.item !== undefined
    );
    
    if (hasReportingFields) {
      logResult('Verify Reporting Fields', true, 'Some accounts have reporting fields');
      return true;
    } else {
      throw new Error('No accounts have any reporting fields');
    }
  } catch (error) {
    logResult('Verify Reporting Fields', false, error.message);
    return false;
  }
}

/**
 * Delete test client
 */
async function deleteTestClient(clientId, cookie) {
  try {
    await axios.delete(`${API_BASE_URL}/clients/${clientId}`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    logResult('Delete Test Client', true, `Deleted client ID: ${clientId}`);
  } catch (error) {
    logResult('Delete Test Client', false, getErrorMessage(error));
  }
}

/**
 * Get error message from axios error
 */
function getErrorMessage(error) {
  if (error.response) {
    return `${error.message} - ${JSON.stringify(error.response.data)}`;
  }
  return error.message;
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + chalk.yellow('='.repeat(50)));
  console.log(chalk.yellow(' Chart of Accounts Verification Summary'));
  console.log(chalk.yellow('='.repeat(50)));
  console.log(chalk.cyan(`Total Tests: ${passedTests + failedTests}`));
  console.log(chalk.green(`Passed Tests: ${passedTests}`));
  console.log(chalk.red(`Failed Tests: ${failedTests}`));
  
  const successRate = (passedTests / (passedTests + failedTests)) * 100;
  console.log(chalk.cyan(`Success Rate: ${successRate.toFixed(2)}%`));
  console.log(chalk.yellow('='.repeat(50)));
}

/**
 * Run verification
 */
async function runVerification() {
  console.log(chalk.cyan('\nStarting Chart of Accounts Quick Verification...'));
  
  const cookie = getCookieHeader();
  
  try {
    // Use existing client ID 1 for verification
    const existingClientId = 1;
    console.log(chalk.blue(`Using existing client ID: ${existingClientId}`));
    
    // Get client accounts
    const accounts = await getClientAccounts(existingClientId, cookie);
    
    // Verify accountCode field
    verifyAccountCodeField(accounts);
    
    // Verify reporting fields
    verifyReportingFields(accounts);
    
    // Try with another client
    const existingClientId2 = 100;
    console.log(chalk.blue(`\nUsing existing client ID: ${existingClientId2}`));
    
    // Get client accounts
    const accounts2 = await getClientAccounts(existingClientId2, cookie);
    
    // Verify accountCode field
    verifyAccountCodeField(accounts2);
    
    // Verify reporting fields
    verifyReportingFields(accounts2);
    
  } catch (error) {
    console.error(chalk.red('Verification Error:'), error.message);
  } finally {
    printSummary();
  }
}

// Run verification
runVerification().catch(error => {
  console.error(chalk.red('Fatal Error:'), error);
  process.exit(1);
});