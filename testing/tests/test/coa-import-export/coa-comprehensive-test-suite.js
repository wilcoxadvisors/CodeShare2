// Comprehensive Chart of Accounts (CoA) Test Suite
// This script runs a series of tests to ensure the CoA functionality is working correctly
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Utility to get the current directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const TEST_CLIENT_ID = 1; // Use a specific client ID for testing
const API_BASE_URL = 'http://localhost:5000/api'; // Use the current server port
const AUTH_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Test summary 
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
};

// Define test files to create
const standardCSV = `
Code,Name,Type,Subtype,Description,PARENT CODE,Active
1000,Standard Assets,ASSET,Current Assets,Top level assets account,,true
1100,Standard Current Assets,Asset,Cash & Equivalents,Current assets category,1000,Yes
1101,Standard Cash On Hand,asset,Cash,Petty cash and physical cash,1100,true
2000,Standard Liabilities,LIABILITY,,"Obligations to pay debts",,yes
2100,standard_accounts_payable,Liability,Current Liabilities,Short-term obligations,2000,TRUE
3000,Standard Equity,EQUITY,,Ownership value,,true
4000,Standard Revenue,REVENUE,,Income from business activities,,true
4100,Standard Service Revenue,revenue,Operating Revenue,Income from services provided,4000,true
5000,Standard Expenses,expense,,Cost of operations,,true
5100,Standard Rent Expense,Expense,Operating Expense,Office space rent,5000,true
9999,Standard Inactive,EXPENSE,Test,This should be inactive,,false
`;

const alternativeCSV = `
Code,Name,Type,Subtype,Description,PARENT CODE,Active
10000,Alternative Assets,ASSET,Current Assets,Top level assets for alt test,,true
10100,Alt Current Assets,Asset,Cash & Equivalents,Current assets for alt test,10000,Yes
20000,Alt Liabilities,LIABILITY,,"Alt obligations to pay",,yes
30000,Alt Equity,EQUITY,,Alt ownership value,,true
40000,Alt Revenue,REVENUE,,Alt income sources,,true
50000,Alt Expenses,expense,,Alt cost of operations,,true
99999,Alt Inactive,EXPENSE,Test,Alt inactive account,,false
`;

// Function to create a test CSV file
async function createTestCSV(content, filename) {
  try {
    const filePath = path.join(process.cwd(), filename);
    fs.writeFileSync(filePath, content.trim());
    console.log(chalk.green(`Test CSV created at ${filePath}`));
    return filePath;
  } catch (error) {
    console.error(chalk.red(`Error creating test CSV: ${error.message}`));
    throw error;
  }
}

// Function to authenticate and get session cookie
async function authenticate() {
  try {
    console.log(chalk.blue('Authenticating with the API...'));
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(AUTH_CREDENTIALS),
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

// Function to test importing a CoA file
async function testImportCoA(clientId, filePath, sessionCookie, testName) {
  try {
    console.log(chalk.blue(`Running test: ${testName}`));
    testResults.total++;
    
    // Read the file and prepare form data
    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('file', fileStream, {
      filename: path.basename(filePath),
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
    console.log(chalk.green(`API request for ${testName} completed successfully`));
    
    // Validate result structure
    const expectedFields = ['count', 'added', 'updated', 'unchanged', 'skipped', 'inactive', 'errors', 'warnings'];
    const missingFields = expectedFields.filter(field => result.data && result.data[field] === undefined || !result.data && result[field] === undefined);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing expected fields in result: ${missingFields.join(', ')}`);
    }
    
    const data = result.data || result;
    
    // Print summary of results
    console.log(`Total accounts processed: ${data.count}`);
    console.log(`New accounts added: ${data.added}`);
    console.log(`Existing accounts updated: ${data.updated}`);
    console.log(`Unchanged accounts: ${data.unchanged}`);
    console.log(`Skipped accounts: ${data.skipped}`);
    console.log(`Inactive accounts: ${data.inactive}`);
    
    // Display any errors
    if (data.errors && data.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      data.errors.forEach(error => console.log(` - ${error}`));
    }
    
    // Display any warnings (these are expected for parent-child relationships)
    if (data.warnings && data.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      console.log(` - Showing ${Math.min(5, data.warnings.length)} of ${data.warnings.length} warnings...`);
      data.warnings.slice(0, 5).forEach(warning => console.log(` - ${warning}`));
    }
    
    // Test passes if no errors and at least some accounts were processed
    if (data.count > 0 && (data.errors?.length || 0) === 0) {
      console.log(chalk.green(`\n✅ Test ${testName} PASSED!\n`));
      testResults.passed++;
      return { ...data, success: true };
    } else {
      console.log(chalk.red(`\n❌ Test ${testName} FAILED!\n`));
      testResults.failed++;
      return { ...data, success: false };
    }
  } catch (error) {
    console.error(chalk.red(`Test ${testName} error: ${error.message}`));
    testResults.failed++;
    return { success: false, error: error.message };
  }
}

// Function to test exporting a CoA
async function testExportCoA(clientId, format, sessionCookie, testName) {
  try {
    console.log(chalk.blue(`Running test: ${testName}`));
    testResults.total++;
    
    // Make API request
    console.log(`Sending request to ${API_BASE_URL}/clients/${clientId}/accounts/export?format=${format}`);
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
      },
    });
    
    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (format === 'csv' && !contentType?.includes('text/csv')) {
      throw new Error(`Expected CSV content type but got: ${contentType}`);
    }
    if (format === 'excel' && !contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      throw new Error(`Expected Excel content type but got: ${contentType}`);
    }
    
    // Save file for inspection
    const fileExtension = format === 'csv' ? 'csv' : 'xlsx';
    const outputPath = path.join(process.cwd(), `coa-export-test.${fileExtension}`);
    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);
    
    console.log(chalk.green(`Export saved to ${outputPath}`));
    console.log(`File size: ${buffer.length} bytes`);
    
    if (buffer.length > 0) {
      console.log(chalk.green(`\n✅ Test ${testName} PASSED!\n`));
      testResults.passed++;
      return { success: true, filePath: outputPath };
    } else {
      console.log(chalk.red(`\n❌ Test ${testName} FAILED: Export file is empty\n`));
      testResults.failed++;
      return { success: false, error: 'Export file is empty' };
    }
  } catch (error) {
    console.error(chalk.red(`Test ${testName} error: ${error.message}`));
    testResults.failed++;
    return { success: false, error: error.message };
  }
}

// Clean up test files
async function cleanupTestFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(chalk.blue(`Cleaned up test file: ${filePath}`));
      }
    } catch (error) {
      console.error(chalk.yellow(`Warning: Could not delete test file ${filePath}: ${error.message}`));
    }
  }
}

// Main test suite function
async function runCoATestSuite() {
  console.log(chalk.blue.bold('Starting Comprehensive CoA Test Suite'));
  console.log(chalk.blue('------------------------------------------------'));
  
  const filesToCleanup = [];
  let sessionCookie = null;
  
  try {
    // Create test files
    const standardFilePath = await createTestCSV(standardCSV, 'coa-standard-test.csv');
    filesToCleanup.push(standardFilePath);
    
    const alternativeFilePath = await createTestCSV(alternativeCSV, 'coa-alternative-test.csv');
    filesToCleanup.push(alternativeFilePath);
    
    // Authenticate
    sessionCookie = await authenticate();
    
    // Test 1: Standard Import
    await testImportCoA(TEST_CLIENT_ID, standardFilePath, sessionCookie, "Standard CoA Import");
    
    // Test 2: Alternative Import
    await testImportCoA(TEST_CLIENT_ID, alternativeFilePath, sessionCookie, "Alternative CoA Import");
    
    // Test 3: CSV Export
    const csvExportResult = await testExportCoA(TEST_CLIENT_ID, 'csv', sessionCookie, "CSV Export");
    if (csvExportResult.filePath) {
      filesToCleanup.push(csvExportResult.filePath);
    }
    
    // Test 4: Excel Export
    const excelExportResult = await testExportCoA(TEST_CLIENT_ID, 'excel', sessionCookie, "Excel Export");
    if (excelExportResult.filePath) {
      filesToCleanup.push(excelExportResult.filePath);
    }
    
    // Print test summary
    console.log(chalk.blue('------------------------------------------------'));
    console.log(chalk.blue.bold('CoA Test Suite Summary:'));
    console.log(chalk.white(`Total tests: ${testResults.total}`));
    console.log(chalk.green(`Passed: ${testResults.passed}`));
    console.log(chalk.red(`Failed: ${testResults.failed}`));
    console.log(chalk.yellow(`Skipped: ${testResults.skipped}`));
    console.log(chalk.blue('------------------------------------------------'));
    
    if (testResults.failed === 0) {
      console.log(chalk.green.bold('✅ ALL TESTS PASSED'));
      return 0;
    } else {
      console.log(chalk.red.bold('❌ SOME TESTS FAILED'));
      return 1;
    }
  } catch (error) {
    console.error(chalk.red(`Test suite error: ${error.message}`));
    return 1;
  } finally {
    // Clean up test files
    await cleanupTestFiles(filesToCleanup);
  }
}

// Run the test suite
runCoATestSuite()
  .then(exitCode => {
    console.log(chalk.blue.bold('CoA Test Suite Completed'));
    process.exit(exitCode);
  })
  .catch(error => {
    console.error(chalk.red(`Fatal error in test suite: ${error.message}`));
    process.exit(1);
  });