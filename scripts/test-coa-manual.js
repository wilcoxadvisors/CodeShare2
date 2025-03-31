/**
 * Manual Test Procedure for Chart of Accounts Import/Export Functionality
 * 
 * This script documents the steps for manually testing the Chart of Accounts
 * import/export functionality. The testing can be performed through both the UI
 * and direct API calls.
 */

// Required libraries for API testing approach
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const Papa = require('papaparse');
const chalk = require('chalk');
const XLSX = require('xlsx');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Change as needed
const COOKIES_FILE = path.join(__dirname, '../curl_cookies.txt');
const TEMP_DIR = path.join(__dirname, '../tmp/coa-test');
const TEST_CLIENT_PREFIX = 'COA_TEST_MANUAL_';

// Global variables to track created clients for cleanup
const createdClients = [];

// Function to format console output
function printHeading(text) {
  console.log('\n' + chalk.bgBlue.white(' ' + text + ' ') + '\n');
}

function printStep(number, text) {
  console.log(chalk.cyan(`Step ${number}: ${text}`));
}

/**
 * Manual Testing Procedure via UI
 */
function manualUiTestingSteps() {
  printHeading('MANUAL TESTING VIA UI');

  printStep(1, 'Login to the application as an admin user');
  console.log('   - Navigate to the login page');
  console.log('   - Enter admin credentials (username: admin, password: password123)');
  console.log('   - Click "Login"');

  printStep(2, 'Create a new test client');
  console.log('   - Navigate to the Clients dashboard');
  console.log('   - Click "Add Client"');
  console.log('   - Enter test client details (name: "COA_TEST_MANUAL_UI")');
  console.log('   - Complete the setup process and save the client');

  printStep(3, 'Navigate to the Chart of Accounts page for the test client');
  console.log('   - Select the test client from the client dropdown');
  console.log('   - Navigate to "Chart of Accounts" from the main menu');

  printStep(4, 'Verify initial Chart of Accounts state');
  console.log('   - Note the number of accounts currently shown');
  console.log('   - Check that account hierarchy is displayed correctly');
  console.log('   - Verify account types (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)');

  printStep(5, 'Export Chart of Accounts to CSV');
  console.log('   - Click "Export" button');
  console.log('   - Select "CSV" format');
  console.log('   - Save the file to a known location');
  console.log('   - Verify the CSV file contains all accounts with correct data');

  printStep(6, 'Export Chart of Accounts to Excel');
  console.log('   - Click "Export" button');
  console.log('   - Select "Excel" format');
  console.log('   - Save the file to a known location');
  console.log('   - Open the Excel file and verify it contains all accounts with correct data');

  printStep(7, 'Modify the exported CSV file');
  console.log('   - Open the CSV file in a text editor or spreadsheet application');
  console.log('   - Modify description of one existing account');
  console.log('   - Add a new account with appropriate data (ensuring valid account type and parent code)');
  console.log('   - Save the modified CSV file');

  printStep(8, 'Import the modified CSV file');
  console.log('   - Click "Import" button');
  console.log('   - Select the modified CSV file');
  console.log('   - Submit the import');
  console.log('   - Verify successful import message');
  console.log('   - Check that the modified account shows updated description');
  console.log('   - Verify the new account appears in the correct location in the hierarchy');

  printStep(9, 'Create an invalid CSV file');
  console.log('   - Create a CSV file with invalid data (e.g., invalid account type, missing required field)');
  console.log('   - Try importing the invalid file');
  console.log('   - Verify appropriate error message is shown');
  console.log('   - Confirm accounts were not modified by the failed import');

  printStep(10, 'Repeat Excel import/export tests');
  console.log('   - Perform similar modification and import tests with Excel format');
  console.log('   - Verify results match the CSV testing experience');

  printStep(11, 'Clean up');
  console.log('   - Optional: Delete test accounts added during testing');
  console.log('   - Optional: Delete test client if no longer needed');
}

/**
 * Manual Testing Procedure via API
 */
async function manualApiTestingSteps() {
  printHeading('MANUAL TESTING VIA API');

  printStep(1, 'Authenticate and get cookies');
  console.log('   - Use curl to authenticate and save cookies:');
  console.log('   - curl -c curl_cookies.txt -X POST -H "Content-Type: application/json" ' +
              '-d \'{"username":"admin","password":"password123"}\' ' +
              `${BASE_URL}/api/auth/login`);

  printStep(2, 'Create a test client');
  console.log('   - Use curl to create a new client:');
  console.log('   - curl -b curl_cookies.txt -X POST -H "Content-Type: application/json" ' +
              '-d \'{"name":"COA_TEST_MANUAL_API","active":true,"industry":"ACCOUNTING"}\' ' +
              `${BASE_URL}/api/admin/clients`);
  console.log('   - Note the client ID in the response');

  printStep(3, 'Seed initial accounts for the client');
  console.log('   - Use curl to create standard accounts:');
  console.log('   - curl -b curl_cookies.txt -X POST -H "Content-Type: application/json" ' +
              '-d \'{"accounts":[...standard accounts...]}\' ' +
              `${BASE_URL}/api/clients/{clientId}/accounts/batch`);

  printStep(4, 'Export accounts to CSV');
  console.log('   - Use curl to export accounts:');
  console.log('   - curl -b curl_cookies.txt -o accounts.csv ' +
              `${BASE_URL}/api/clients/{clientId}/accounts/export?format=csv`);
  console.log('   - Verify the CSV file content');

  printStep(5, 'Export accounts to Excel');
  console.log('   - Use curl to export accounts:');
  console.log('   - curl -b curl_cookies.txt -o accounts.xlsx ' +
              `${BASE_URL}/api/clients/{clientId}/accounts/export?format=xlsx`);
  console.log('   - Verify the Excel file content');

  printStep(6, 'Modify exported file and import');
  console.log('   - Edit the CSV or Excel file to modify existing accounts and add new ones');
  console.log('   - Use curl to import the modified file:');
  console.log('   - curl -b curl_cookies.txt -X POST -F "file=@modified_accounts.csv" ' +
              `${BASE_URL}/api/clients/{clientId}/accounts/import`);
  console.log('   - Verify the import results in the response');

  printStep(7, 'Test invalid import');
  console.log('   - Create an invalid file with format or data errors');
  console.log('   - Use curl to attempt import:');
  console.log('   - curl -b curl_cookies.txt -X POST -F "file=@invalid_accounts.csv" ' +
              `${BASE_URL}/api/clients/{clientId}/accounts/import`);
  console.log('   - Verify error response');

  printStep(8, 'Clean up');
  console.log('   - Optional: Use curl to delete the test client:');
  console.log('   - curl -b curl_cookies.txt -X DELETE ' +
              `${BASE_URL}/api/admin/clients/{clientId}`);
}

/**
 * Main function to show all test procedures
 */
async function showTestingProcedures() {
  console.log(chalk.bold.green('CHART OF ACCOUNTS IMPORT/EXPORT MANUAL TESTING PROCEDURES'));
  console.log(chalk.yellow('\nThis script documents the steps for manual testing of the Chart of Accounts'));
  console.log(chalk.yellow('import/export functionality. It provides instructions for both UI and API testing.'));
  
  console.log(chalk.bold.yellow('\nUsage:'));
  console.log('1. Read through the test steps to understand the testing procedures');
  console.log('2. Follow the UI testing steps to test through the user interface');
  console.log('3. Follow the API testing steps to test through direct API calls');
  console.log('4. Document any issues or inconsistencies encountered');
  
  manualUiTestingSteps();
  await manualApiTestingSteps();
  
  console.log(chalk.bold.green('\nTEST ACCEPTANCE CRITERIA:'));
  console.log('✓ Export functionality works for both CSV and Excel formats');
  console.log('✓ Exported files contain all account data in the correct format');
  console.log('✓ Import functionality correctly processes valid CSV and Excel files');
  console.log('✓ Changes to existing accounts are correctly applied during import');
  console.log('✓ New accounts are correctly added during import');
  console.log('✓ Parent-child relationships are correctly maintained in the hierarchy');
  console.log('✓ Invalid imports are rejected with appropriate error messages');
  console.log('✓ Application security is maintained (authentication required for all operations)');
}

// Run the test procedures documentation
showTestingProcedures();