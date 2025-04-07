// Test script to verify the fixed CoA import functionality
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Test client ID for import
const TEST_CLIENT_ID = 1; // Replace with an actual client ID from your database
const API_BASE_URL = 'http://localhost:5000/api'; // Using port 5000 as seen in server logs

/**
 * Create a test CSV file for Chart of Accounts import testing with different data
 * @returns {Promise<string>} Path to the created CSV file
 */
async function createTestCSV() {
  console.log(chalk.blue('Creating test CSV file with alternative data...'));
  
  // Create a different sample for testing the parent-child relationships
  const csvContent = `
Code,Name,Type,Subtype,Description,PARENT CODE,Active
10000,Alternative Assets,ASSET,Current Assets,Top level assets for alternative test,,true
10100,Alt Current Assets,Asset,Cash & Equivalents,Current assets subcategory,10000,true
10101,Alt Cash On Hand,asset,Cash,Petty cash for alt test,10100,true
10102,Alt Checking,ASSET,Bank,Checking account for alt test,10100,true
20000,Alt Liabilities,LIABILITY,,Obligations for alt test,,yes
20100,alt_accounts_payable,Liability,Current Liabilities,AP for alt test,20000,TRUE
30000,Alt Equity,EQUITY,,Ownership for alt test,,true
30100,Alt Stock,equity,Owner's Equity,Stock for alt test,30000,Yes
40000,Alt Revenue,REVENUE,,Income for alt test,,true
40100,Alt Services,revenue,Operating Revenue,Service income for alt test,40000,true
50000,Alt Expenses,expense,,Costs for alt test,,true
50100,Alt Rent,Expense,Operating Expense,Rent for alt test,50000,true
50200,Alt Salaries,expense,Operating Expense,Salaries for alt test,50000,true
99999,Alt Inactive,EXPENSE,Test,This should be inactive for alt test,,false
`;

  const filePath = path.join(process.cwd(), 'test-coa-import-alt.csv');
  fs.writeFileSync(filePath, csvContent.trim());
  console.log(chalk.green(`Alternative test CSV created at ${filePath}`));
  return filePath;
}

/**
 * Get authentication credentials
 * @returns {Promise<{username: string, password: string}>} Credentials
 */
async function getAuthCredentials() {
  // Default credentials for testing
  return {
    username: 'admin',
    password: 'password123'
  };
}

/**
 * Authenticate with the API and get a session cookie
 * @param {Object} credentials - Authentication credentials
 * @returns {Promise<string>} Session cookie
 */
async function authenticate(credentials) {
  try {
    console.log(chalk.blue('Authenticating with the API...'));
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }
    
    // Extract cookies from response
    const cookies = response.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('No session cookie returned from authentication');
    }
    
    console.log(chalk.green('Authentication successful'));
    return cookies;
  } catch (error) {
    console.error(chalk.red(`Authentication error: ${error.message}`));
    throw error;
  }
}

/**
 * Test the CoA import API endpoint
 * @param {number} clientId - The client ID to test
 * @param {string} filePath - Path to the CSV file
 * @param {string} sessionCookie - Session cookie for authentication
 * @returns {Promise<Object>} Import result
 */
async function testImportCoAApi(clientId, filePath, sessionCookie) {
  try {
    console.log(chalk.blue(`Testing CoA Import API with alternative dataset for client ID ${clientId}...`));
    
    // Read the file and prepare form data
    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('file', fileStream, {
      filename: 'test-coa-import-alt.csv',
      contentType: 'text/csv',
    });
    
    // Make API request
    console.log(`Sending request to ${API_BASE_URL}/clients/${clientId}/accounts/import`);
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/import`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
      },
      body: form,
    });
    
    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(chalk.green('API request completed successfully'));
    
    return result.data || result;
  } catch (error) {
    console.error(chalk.red(`API error: ${error.message}`));
    throw error;
  }
}

/**
 * Validate the import result to check for expected fields and success
 * @param {Object} result - The import result from the API
 * @returns {Promise<boolean>} True if validation passes
 */
async function validateImportResult(result) {
  console.log(chalk.blue('Validating import result for alternative dataset...'));
  
  // Check for expected fields
  const expectedFields = ['count', 'added', 'updated', 'unchanged', 'skipped', 'inactive', 'errors', 'warnings'];
  const missingFields = expectedFields.filter(field => result[field] === undefined);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing expected fields in result: ${missingFields.join(', ')}`);
  }
  
  // Print summary of results
  console.log(chalk.green('Import result summary:'));
  console.log(`Total accounts processed: ${result.count}`);
  console.log(`New accounts added: ${result.added}`);
  console.log(`Existing accounts updated: ${result.updated}`);
  console.log(`Unchanged accounts: ${result.unchanged}`);
  console.log(`Skipped accounts: ${result.skipped}`);
  console.log(`Inactive accounts: ${result.inactive}`);
  
  // Display any errors
  if (result.errors && result.errors.length > 0) {
    console.log(chalk.red('\nErrors:'));
    result.errors.forEach(error => console.log(` - ${error}`));
  }
  
  // Display any warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    result.warnings.forEach(warning => console.log(` - ${warning}`));
  }
  
  // Basic success validation
  if (result.count > 0 && (result.errors?.length || 0) === 0) {
    console.log(chalk.green('\nImport test with alternative dataset PASSED!'));
    return true;
  } else {
    console.log(chalk.red('\nImport test with alternative dataset FAILED!'));
    return false;
  }
}

/**
 * Clean up test files
 * @param {string} filePath - Path to the file to clean up
 */
async function cleanupTestFiles(filePath) {
  try {
    fs.unlinkSync(filePath);
    console.log(chalk.blue(`Cleaned up test file: ${filePath}`));
  } catch (error) {
    console.error(chalk.yellow(`Warning: Could not delete test file ${filePath}: ${error.message}`));
  }
}

/**
 * Main function to run the test
 */
async function main() {
  console.log(chalk.blue.bold('Starting CoA Import API Test with Alternative Dataset'));
  
  let testFile = null;
  let sessionCookie = null;
  
  try {
    // Create test CSV file
    testFile = await createTestCSV();
    
    // Get auth credentials
    const credentials = await getAuthCredentials();
    
    // Authenticate
    sessionCookie = await authenticate(credentials);
    
    // Run API import test
    const importResult = await testImportCoAApi(TEST_CLIENT_ID, testFile, sessionCookie);
    
    // Validate results
    await validateImportResult(importResult);
    
  } catch (error) {
    console.error(chalk.red(`Test failed: ${error.message}`));
    if (error.message.includes('ECONNREFUSED')) {
      console.log(chalk.yellow('\nThe server appears to be down. Please ensure the application is running before running this test.'));
    }
    process.exit(1);
  } finally {
    // Cleanup test files
    if (testFile) {
      await cleanupTestFiles(testFile);
    }
  }
}

// Run the test
main();