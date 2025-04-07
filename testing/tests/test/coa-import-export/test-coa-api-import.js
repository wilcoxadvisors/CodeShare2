import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Test client ID for import
const TEST_CLIENT_ID = 1; // Replace with an actual client ID from your database
const API_BASE_URL = 'http://localhost:5000/api'; // Using port 5000 as seen in server logs

/**
 * Create a test CSV file for Chart of Accounts import testing
 * @returns {Promise<string>} Path to the created CSV file
 */
async function createTestCSV() {
  console.log(chalk.blue('Creating test CSV file...'));
  
  // Create a sample CSV with various challenging cases
  // Including: mixed case headers, different naming conventions for parent codes,
  // mix of active/inactive accounts, and spaces in field values
  const csvContent = `
Code,Name,Type,Subtype,Description,PARENT CODE,Active
1000,Test Assets,ASSET,Current Assets,Top level assets account,,true
1100,Test Current Assets,Asset,Cash & Equivalents,Current assets category,1000,Yes
1101,Test Cash On Hand,asset,Cash,Petty cash and physical cash,1100,true
1102,Test Main Checking,ASSET,Bank,Primary checking account,1100,1
1103,Test Savings Account,ASSET,Bank,Savings account,1100,active
1200,Test Accounts Receivable,Asset,Receivables,Money owed to the company,1000,true
1300,Test Inventory,ASSET,Current Assets,Product inventory,1000,true
2000,Test Liabilities,LIABILITY,,"Obligations to pay debts or services",,yes
2100,test_accounts_payable,Liability,Current Liabilities,Short-term obligations to pay suppliers,2000,TRUE
2200,Test Loans Payable,liability,Long-term Liabilities,Bank loans and mortgages,2000,1
3000,Test Equity,EQUITY,,Ownership value,,true
3100,Test Common Stock,equity,Owner's Equity,Issued shares,3000,Yes
3200,test_retained_earnings,Equity,Retained Earnings,Accumulated profits,3000,true
4000,Test Revenue,REVENUE,,Income from business activities,,true
4100,Test Service Revenue,revenue,Operating Revenue,Income from services provided,4000,true
4200,Test Product Revenue,REVENUE,Sales,Income from product sales,4000,yes
5000,Test Expenses,expense,,Cost of operations,,true
5100,Test Rent Expense,Expense,Operating Expense,Office space rent,5000,true
5200,Test Salary Expense,expense,Operating Expense,Employee wages,5000,1
5300,test_utilities_expense,EXPENSE,Operating Expense,Electricity and water,5000,active
9999,Test Inactive,EXPENSE,Test,This should be inactive,,false
`;

  const filePath = path.join(process.cwd(), 'test-coa-import.csv');
  fs.writeFileSync(filePath, csvContent.trim());
  console.log(chalk.green(`Test CSV created at ${filePath}`));
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
    console.log(chalk.blue(`Testing CoA Import API for client ID ${clientId}...`));
    
    // Read the file and prepare form data
    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('file', fileStream, {
      filename: 'test-coa-import.csv',
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
  console.log(chalk.blue('Validating import result...'));
  
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
    console.log(chalk.green('\nImport test PASSED!'));
    return true;
  } else {
    console.log(chalk.red('\nImport test FAILED!'));
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
  console.log(chalk.blue.bold('Starting CoA Import API Test'));
  
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