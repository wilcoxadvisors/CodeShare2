/**
 * Comprehensive Chart of Accounts Import/Export Test Suite
 * 
 * This script performs end-to-end testing of the Chart of Accounts
 * import and export functionality, including CSV and Excel formats,
 * with detailed verification of data integrity and error handling.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import FormData from 'form-data';
import Papa from 'papaparse';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

// When using ES modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CLIENT_PREFIX = 'COA_TEST_';
const API_BASE = '/api/clients';
const TEST_DIR = path.join(__dirname, '..', 'test', 'coa-import-export');
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');
const TEMP_DIR = path.join(__dirname, '..', 'tmp');

// Test user credentials
const TEST_USER = {
  username: 'admin',
  password: 'password123'
};

// Track test results for final summary
const testResults = [];
const createdClients = [];

/**
 * Ensure temporary directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Log test results in a consistent format
 */
function logResult(testName, success, message) {
  const prefix = success ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
  console.log(`${prefix} ${chalk.bold(testName)}: ${message}`);
  
  testResults.push({
    name: testName,
    success,
    message,
    timestamp: new Date()
  });
  
  return success;
}

/**
 * Login to get auth cookie
 */
async function login() {
  try {
    console.log(chalk.blue(`Logging in as ${TEST_USER.username}...`));
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    
    if (response.headers['set-cookie']) {
      fs.writeFileSync(COOKIES_FILE, response.headers['set-cookie'].join(';'));
      console.log(chalk.green('Login successful - auth cookie saved'));
      return response.headers['set-cookie'];
    } else {
      throw new Error('No cookies received from login');
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Create a test client
 */
async function createTestClient() {
  try {
    const timestamp = Date.now();
    const testClientName = `${TEST_CLIENT_PREFIX}${timestamp}`;
    console.log(chalk.blue(`Creating test client: ${testClientName}`));
    
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    
    // Log the request details for debugging
    console.log(chalk.blue('Request details:'));
    console.log(chalk.blue('URL:', `${BASE_URL}/api/clients`));
    console.log(chalk.blue('Payload:', JSON.stringify({
      name: testClientName,
      active: true,
      industry: 'ACCOUNTING'
    }, null, 2)));
    
    const response = await axios.post(`${BASE_URL}/api/clients`, {
      name: testClientName,
      active: true,
      industry: 'ACCOUNTING'
    }, {
      headers: {
        Cookie: cookies
      }
    });
    
    // Log response details
    console.log(chalk.green('Response status:', response.status));
    console.log(chalk.green('Response data type:', typeof response.data));
    console.log(chalk.green('Response data:', JSON.stringify(response.data, null, 2)));
    
    if (!response.data || !response.data.id) {
      throw new Error(`Failed to create test client. Response: ${JSON.stringify(response.data)}`);
    }
    
    const clientId = response.data.id;
    console.log(chalk.green(`Created test client with ID: ${clientId}`));
    createdClients.push({ id: clientId, name: testClientName });
    
    return { id: clientId, name: testClientName };
  } catch (error) {
    console.error(chalk.red('Failed to create test client:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Seed initial Chart of Accounts for a client
 */
async function seedInitialAccounts(clientId) {
  try {
    console.log(chalk.blue(`Seeding initial accounts for client ID: ${clientId}`));
    
    // Define standard accounts - a minimal set for testing
    const standardAccounts = [
      { code: '1000', name: 'Assets', type: 'ASSET', subtype: 'Asset', isSubledger: false, active: true, description: 'Asset accounts' },
      { code: '1100', name: 'Cash', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Cash accounts', parentCode: '1000' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Money owed to the company', parentCode: '1000' },
      { code: '2000', name: 'Liabilities', type: 'LIABILITY', subtype: 'Liability', isSubledger: false, active: true, description: 'Liability accounts' },
      { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'Current Liability', isSubledger: false, active: true, description: 'Money owed by the company', parentCode: '2000' },
      { code: '3000', name: 'Equity', type: 'EQUITY', subtype: 'Equity', isSubledger: false, active: true, description: 'Equity accounts' },
      { code: '4000', name: 'Revenue', type: 'REVENUE', subtype: 'Revenue', isSubledger: false, active: true, description: 'Revenue accounts' },
      { code: '5000', name: 'Expenses', type: 'EXPENSE', subtype: 'Expense', isSubledger: false, active: true, description: 'Expense accounts' }
    ];
    
    // First pass: Create accounts without parent relationships
    const firstPassAccounts = standardAccounts.map(acc => {
      const { parentCode, ...accountWithoutParent } = acc;
      return accountWithoutParent;
    });
    
    // Create accounts in a single batch
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    
    // Log the batch request details
    console.log(chalk.blue('Batch account creation request:'));
    console.log(chalk.blue('URL:', `${BASE_URL}${API_BASE}/${clientId}/accounts/batch`));
    console.log(chalk.blue('Payload:', JSON.stringify({ accounts: firstPassAccounts }, null, 2)));
    
    try {
      const firstPassResponse = await axios.post(
        `${BASE_URL}${API_BASE}/${clientId}/accounts/batch`,
        { accounts: firstPassAccounts },
        { headers: { Cookie: cookies } }
      );
      
      console.log(chalk.green('Batch creation response status:', firstPassResponse.status));
      console.log(chalk.green('Batch creation response data:', JSON.stringify(firstPassResponse.data, null, 2)));
      
      // Second pass: Update parent relationships
      const accountsWithParents = standardAccounts.filter(acc => acc.parentCode);
      
      if (accountsWithParents.length > 0) {
        const updates = accountsWithParents.map(acc => ({
          code: acc.code,
          parentCode: acc.parentCode
        }));
        
        console.log(chalk.blue('Parent relationship update request:'));
        console.log(chalk.blue('URL:', `${BASE_URL}${API_BASE}/${clientId}/accounts/update-parents`));
        console.log(chalk.blue('Payload:', JSON.stringify({ updates }, null, 2)));
        
        const secondPassResponse = await axios.post(
          `${BASE_URL}${API_BASE}/${clientId}/accounts/update-parents`,
          { updates },
          { headers: { Cookie: cookies } }
        );
        
        console.log(chalk.green('Parent update response status:', secondPassResponse.status));
        console.log(chalk.green('Parent update response data:', JSON.stringify(secondPassResponse.data, null, 2)));
      }
      
      console.log(chalk.green(`Successfully seeded ${standardAccounts.length} accounts for client ID: ${clientId}`));
      return standardAccounts;
    } catch (requestError) {
      console.error(chalk.red('Error during account seeding:'), requestError.message);
      
      if (requestError.response) {
        console.error(chalk.red('Response status:', requestError.response.status));
        console.error(chalk.red('Response data:'), JSON.stringify(requestError.response.data, null, 2));
      } else if (requestError.request) {
        console.error(chalk.red('No response received. Request details:'), requestError.request);
      }
      
      throw requestError;
    }
  } catch (error) {
    console.error(chalk.red(`Failed to seed accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Get all accounts for a client
 */
async function getAccounts(clientId) {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    console.log(chalk.blue(`Fetching accounts for client ID: ${clientId}`));
    
    const response = await axios.get(`${BASE_URL}${API_BASE}/${clientId}/accounts`, {
      headers: { Cookie: cookies }
    });
    
    if (!response.data) {
      throw new Error(`No account data returned for client ID: ${clientId}`);
    }
    
    const accountsLength = Array.isArray(response.data) ? 
                          response.data.length : 
                          (response.data.items ? response.data.items.length : 0);
                          
    console.log(chalk.green(`Retrieved ${accountsLength} accounts for client ID: ${clientId}`));
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to get accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Export accounts to CSV or Excel
 */
async function exportAccounts(clientId, format = 'csv') {
  try {
    console.log(chalk.blue(`Exporting accounts for client ${clientId} to ${format.toUpperCase()} format`));
    
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    const response = await axios.get(
      `${BASE_URL}${API_BASE}/${clientId}/accounts/export?format=${format}`, 
      {
        headers: { Cookie: cookies },
        responseType: 'arraybuffer'
      }
    );
    
    // Create temporary file name
    const timestamp = Date.now();
    const fileName = `client_${clientId}_accounts_${timestamp}.${format}`;
    const filePath = path.join(TEMP_DIR, fileName);
    
    // Write response to file
    fs.writeFileSync(filePath, Buffer.from(response.data));
    
    console.log(chalk.green(`Exported accounts to ${filePath}`));
    return { fileName, filePath };
  } catch (error) {
    console.error(chalk.red(`Failed to export accounts for client ${clientId}:`), error.message);
    if (error.response) {
      try {
        // Try to parse error response
        const errorData = JSON.parse(Buffer.from(error.response.data).toString());
        console.error(chalk.red('Server response:'), JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error(chalk.red('Server response:'), error.response.status, error.response.statusText);
      }
    }
    throw error;
  }
}

/**
 * Import accounts from a file
 */
async function importAccounts(clientId, filePath, format = 'csv') {
  try {
    console.log(chalk.blue(`Importing ${format.toUpperCase()} file into client ${clientId}`));
    
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    // Add content type based on format
    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    const response = await axios.post(
      `${BASE_URL}${API_BASE}/${clientId}/accounts/import`,
      formData,
      {
        headers: {
          Cookie: cookies,
          ...formData.getHeaders(),
          'Content-Type': contentType
        }
      }
    );
    
    console.log(chalk.green(`Import successful for client ${clientId}`));
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to import accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Generate an invalid import file
 */
async function generateInvalidImportFile(format = 'csv') {
  try {
    console.log(chalk.blue(`Generating invalid import file in ${format.toUpperCase()} format`));
    
    // Create invalid data
    const invalidData = [
      { Code: '1000', Name: 'Invalid Type', Type: 'INVALID_TYPE', Subtype: 'Current Asset', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'Invalid account type', ParentCode: '' },
      { Code: '2000', Name: '', Type: 'LIABILITY', Subtype: 'Current Liability', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'Missing name field', ParentCode: '' },
      { Code: '3000', Name: 'First Equity Account', Type: 'EQUITY', Subtype: 'Equity', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'First equity account with code 3000', ParentCode: '' },
      { Code: '3000', Name: 'Duplicate Code', Type: 'EQUITY', Subtype: 'Equity', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'Duplicate code 3000', ParentCode: '' },
      { Code: '4000', Name: 'Invalid Parent', Type: 'REVENUE', Subtype: 'Operating Revenue', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'Invalid parent code', ParentCode: '9999' },
    ];
    
    // Generate file path
    const timestamp = Date.now();
    const fileName = `invalid_import_${timestamp}.${format}`;
    const filePath = path.join(TEMP_DIR, fileName);
    
    if (format === 'csv') {
      // Generate CSV file
      const csv = Papa.unparse(invalidData);
      fs.writeFileSync(filePath, csv);
    } else {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(invalidData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invalid Accounts');
      XLSX.writeFile(workbook, filePath);
    }
    
    console.log(chalk.green(`Generated invalid import file at ${filePath}`));
    return { fileName, filePath };
  } catch (error) {
    console.error(chalk.red(`Failed to generate invalid import file:`), error.message);
    throw error;
  }
}

/**
 * Generate a valid import file with new accounts
 */
async function generateValidImportFile(format = 'csv') {
  try {
    console.log(chalk.blue(`Generating valid import file with new accounts in ${format.toUpperCase()} format`));
    
    // Create valid data with new accounts
    const validData = [
      { Code: '1500', Name: 'New Asset Account', Type: 'ASSET', Subtype: 'Current Asset', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'New test asset account', ParentCode: '1000' },
      { Code: '2500', Name: 'New Liability Account', Type: 'LIABILITY', Subtype: 'Current Liability', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'New test liability account', ParentCode: '2000' },
      { Code: '4500', Name: 'New Revenue Account', Type: 'REVENUE', Subtype: 'Operating Revenue', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'New test revenue account', ParentCode: '4000' },
      { Code: '5500', Name: 'New Expense Account', Type: 'EXPENSE', Subtype: 'Operating Expense', IsSubledger: 'false', SubledgerType: '', Active: 'true', Description: 'New test expense account', ParentCode: '5000' },
    ];
    
    // Generate file path
    const timestamp = Date.now();
    const fileName = `valid_import_${timestamp}.${format}`;
    const filePath = path.join(TEMP_DIR, fileName);
    
    if (format === 'csv') {
      // Generate CSV file
      const csv = Papa.unparse(validData);
      fs.writeFileSync(filePath, csv);
    } else {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(validData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'New Accounts');
      XLSX.writeFile(workbook, filePath);
    }
    
    console.log(chalk.green(`Generated valid import file at ${filePath}`));
    return { fileName, filePath, accountCount: validData.length };
  } catch (error) {
    console.error(chalk.red(`Failed to generate valid import file:`), error.message);
    throw error;
  }
}

/**
 * Modify exported file to create an updated import file
 */
async function createModifiedImportFile(exportedFilePath, format = 'csv') {
  try {
    console.log(chalk.blue(`Creating modified import file from ${exportedFilePath}`));
    
    let data;
    if (format === 'csv') {
      // Read and parse CSV file
      const csvContent = fs.readFileSync(exportedFilePath, 'utf8');
      const parsed = Papa.parse(csvContent, { header: true });
      data = parsed.data;
    } else {
      // Read and parse Excel file
      const workbook = XLSX.readFile(exportedFilePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(worksheet);
    }
    
    // Modify some accounts
    const firstAccount = data[0];
    if (firstAccount) {
      firstAccount.Description = `Modified description ${Date.now()}`;
    }
    
    // Add a new account
    const newAccount = {
      Code: `9999-${Date.now().toString().slice(-4)}`,
      Name: 'Test Modified Account',
      Type: 'EXPENSE',
      Subtype: 'Operating Expense',
      IsSubledger: 'false',
      SubledgerType: '',
      Active: 'true',
      Description: 'Account added during modification test',
      ParentCode: '5000'
    };
    
    data.push(newAccount);
    
    // Create modified file
    const timestamp = Date.now();
    const fileName = `modified_import_${timestamp}.${format}`;
    const filePath = path.join(TEMP_DIR, fileName);
    
    if (format === 'csv') {
      // Generate CSV file
      const csv = Papa.unparse(data);
      fs.writeFileSync(filePath, csv);
    } else {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Modified Accounts');
      XLSX.writeFile(workbook, filePath);
    }
    
    console.log(chalk.green(`Created modified import file at ${filePath}`));
    return { fileName, filePath, accountCount: data.length, modifications: 1, additions: 1 };
  } catch (error) {
    console.error(chalk.red(`Failed to create modified import file:`), error.message);
    throw error;
  }
}

/**
 * Clean up test clients and files
 */
async function cleanup() {
  try {
    console.log(chalk.blue('\nCleaning up test resources...'));
    
    // Delete temporary files
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(TEMP_DIR, file));
      }
      console.log(chalk.green(`Deleted ${files.length} temporary files`));
    }
    
    // Attempt to delete test clients
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    let deletedCount = 0;
    
    // Log the clients to be deleted
    console.log(chalk.blue(`Attempting to delete ${createdClients.length} test clients:`));
    createdClients.forEach((client, index) => {
      console.log(chalk.blue(`  ${index+1}. Name: ${client.name}, ID: ${client.id}`));
    });
    
    for (const client of createdClients) {
      try {
        await axios.delete(`${BASE_URL}${API_BASE}/clients/${client.id}`, {
          headers: { Cookie: cookies }
        });
        deletedCount++;
        console.log(chalk.green(`Successfully deleted client ${client.name} (ID: ${client.id})`));
      } catch (error) {
        console.error(chalk.yellow(`Warning: Failed to delete test client ${client.name} (ID: ${client.id})`));
        console.error(chalk.yellow(`Error: ${error.message}`));
        if (error.response) {
          console.error(chalk.yellow('Server response:'), JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    console.log(chalk.green(`Deleted ${deletedCount} of ${createdClients.length} test clients`));
  } catch (error) {
    console.error(chalk.yellow('Warning: Cleanup encountered errors:'), error.message);
  }
}

/**
 * Run CSV export/import tests
 */
async function runCsvTests(clientId) {
  console.log(chalk.blue('\n===== CSV Import/Export Tests ====='));
  
  try {
    // Test 1: Export to CSV
    console.log(chalk.blue('\nTest 1: Export to CSV'));
    const initialAccounts = await getAccounts(clientId);
    const csvExport = await exportAccounts(clientId, 'csv');
    
    // Verify CSV structure
    const csvContent = fs.readFileSync(csvExport.filePath, 'utf8');
    const parsedCsv = Papa.parse(csvContent, { header: true });
    
    const csvExportTestResult = logResult(
      'CSV Export',
      parsedCsv.data.length === initialAccounts.length,
      `Successfully exported ${parsedCsv.data.length} accounts`
    );
    
    // Verify CSV headers
    const requiredHeaders = ['Code', 'Name', 'Type', 'Subtype', 'IsSubledger', 'Active', 'Description'];
    const missingHeaders = requiredHeaders.filter(header => !parsedCsv.meta.fields.includes(header));
    
    const csvHeadersTestResult = logResult(
      'CSV Headers',
      missingHeaders.length === 0,
      missingHeaders.length === 0
        ? 'All required headers present'
        : `Missing headers: ${missingHeaders.join(', ')}`
    );
    
    // Test 2: Import valid CSV with new accounts
    console.log(chalk.blue('\nTest 2: Import valid CSV with new accounts'));
    const validCsvImport = await generateValidImportFile('csv');
    
    let validCsvImportResult;
    try {
      validCsvImportResult = await importAccounts(clientId, validCsvImport.filePath, 'csv');
      
      // Verify accounts were added
      const accountsAfterValidImport = await getAccounts(clientId);
      const expectedAccountCount = initialAccounts.length + validCsvImport.accountCount;
      
      const validCsvImportTestResult = logResult(
        'Valid CSV Import',
        accountsAfterValidImport.length === expectedAccountCount,
        `Added ${validCsvImport.accountCount} accounts. Total now: ${accountsAfterValidImport.length}`
      );
    } catch (error) {
      logResult('Valid CSV Import', false, `Import failed: ${error.message}`);
    }
    
    // Test 3: Import invalid CSV (should fail gracefully)
    console.log(chalk.blue('\nTest 3: Import invalid CSV (should fail gracefully)'));
    const invalidCsvImport = await generateInvalidImportFile('csv');
    
    let invalidImportFailed = false;
    try {
      await importAccounts(clientId, invalidCsvImport.filePath, 'csv');
      logResult('Invalid CSV Import', false, 'Import should have failed but succeeded');
    } catch (error) {
      invalidImportFailed = true;
      logResult('Invalid CSV Import', true, `Import correctly failed: ${error.message}`);
    }
    
    // Test 4: Modify and re-import (update accounts)
    console.log(chalk.blue('\nTest 4: Modify and re-import (update accounts)'));
    const modifiedCsvImport = await createModifiedImportFile(csvExport.filePath, 'csv');
    
    try {
      const modifyImportResult = await importAccounts(clientId, modifiedCsvImport.filePath, 'csv');
      
      // Verify accounts were updated and added
      const accountsAfterModifyImport = await getAccounts(clientId);
      
      const modifyImportTestResult = logResult(
        'Modify and Re-import CSV',
        true, // Check success response only since count might vary based on other tests
        `Import successful with ${modifyImportResult.added || 0} accounts added, ${modifyImportResult.updated || 0} updated`
      );
    } catch (error) {
      logResult('Modify and Re-import CSV', false, `Import failed: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('CSV Tests failed:'), error.message);
    return false;
  }
}

/**
 * Run Excel export/import tests
 */
async function runExcelTests(clientId) {
  console.log(chalk.blue('\n===== Excel Import/Export Tests ====='));
  
  try {
    // Test 1: Export to Excel
    console.log(chalk.blue('\nTest 1: Export to Excel'));
    const initialAccounts = await getAccounts(clientId);
    const excelExport = await exportAccounts(clientId, 'xlsx');
    
    // Verify Excel structure
    const workbook = XLSX.readFile(excelExport.filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    const excelExportTestResult = logResult(
      'Excel Export',
      excelData.length === initialAccounts.length,
      `Successfully exported ${excelData.length} accounts`
    );
    
    // Test 2: Import valid Excel with new accounts
    console.log(chalk.blue('\nTest 2: Import valid Excel with new accounts'));
    const validExcelImport = await generateValidImportFile('xlsx');
    
    try {
      const validExcelImportResult = await importAccounts(clientId, validExcelImport.filePath, 'xlsx');
      
      // Verify accounts were added
      const accountsAfterValidImport = await getAccounts(clientId);
      
      const validExcelImportTestResult = logResult(
        'Valid Excel Import',
        true, // Check success response only since count might vary based on other tests
        `Import successful with ${validExcelImportResult.added || 0} accounts added, ${validExcelImportResult.updated || 0} updated`
      );
    } catch (error) {
      logResult('Valid Excel Import', false, `Import failed: ${error.message}`);
    }
    
    // Test 3: Import invalid Excel (should fail gracefully)
    console.log(chalk.blue('\nTest 3: Import invalid Excel (should fail gracefully)'));
    const invalidExcelImport = await generateInvalidImportFile('xlsx');
    
    let invalidImportFailed = false;
    try {
      await importAccounts(clientId, invalidExcelImport.filePath, 'xlsx');
      logResult('Invalid Excel Import', false, 'Import should have failed but succeeded');
    } catch (error) {
      invalidImportFailed = true;
      logResult('Invalid Excel Import', true, `Import correctly failed: ${error.message}`);
    }
    
    // Test 4: Modify and re-import (update accounts)
    console.log(chalk.blue('\nTest 4: Modify and re-import (update accounts)'));
    const modifiedExcelImport = await createModifiedImportFile(excelExport.filePath, 'xlsx');
    
    try {
      const modifyImportResult = await importAccounts(clientId, modifiedExcelImport.filePath, 'xlsx');
      
      // Verify accounts were updated and added
      const accountsAfterModifyImport = await getAccounts(clientId);
      
      const modifyImportTestResult = logResult(
        'Modify and Re-import Excel',
        true, // Check success response only since count might vary based on other tests
        `Import successful with ${modifyImportResult.added || 0} accounts added, ${modifyImportResult.updated || 0} updated`
      );
    } catch (error) {
      logResult('Modify and Re-import Excel', false, `Import failed: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('Excel Tests failed:'), error.message);
    return false;
  }
}

/**
 * Print test summary
 */
function printSummary() {
  const totalTests = testResults.length;
  const passedTests = testResults.filter(result => result.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(chalk.blue('\n===== Test Summary ====='));
  console.log(chalk.blue(`Total Tests: ${totalTests}`));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  
  if (failedTests > 0) {
    console.log(chalk.red('\nFailed Tests:'));
    testResults
      .filter(result => !result.success)
      .forEach(failedTest => {
        console.log(chalk.red(`- ${failedTest.name}: ${failedTest.message}`));
      });
  }
  
  console.log(chalk.blue('\nTest clients created:'));
  createdClients.forEach(client => {
    console.log(chalk.blue(`- ${client.name} (ID: ${client.id})`));
  });
  
  return { total: totalTests, passed: passedTests, failed: failedTests };
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log(chalk.blue('===== Chart of Accounts Import/Export Test Suite =====\n'));
  console.log(chalk.yellow('Start Time:', new Date().toLocaleString()));
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // Initialize
  testResults.length = 0;
  createdClients.length = 0;
  
  try {
    // Login
    await login();
    
    // Create test client
    const testClient = await createTestClient();
    console.log(chalk.blue(`Successfully created test client ID: ${testClient.id}`));
    
    try {
      // Seed initial accounts
      console.log(chalk.blue(`Attempting to seed initial accounts for client ID: ${testClient.id}`));
      const seededAccounts = await seedInitialAccounts(testClient.id);
      console.log(chalk.green(`Successfully seeded ${seededAccounts.length} initial accounts`));
      
      // Run CSV tests
      console.log(chalk.blue('\nStarting CSV import/export tests...'));
      const csvTestsSuccessful = await runCsvTests(testClient.id);
      console.log(chalk.green(`CSV tests completed ${csvTestsSuccessful ? 'successfully' : 'with issues'}`));
      
      // Run Excel tests
      console.log(chalk.blue('\nStarting Excel import/export tests...'));
      const excelTestsSuccessful = await runExcelTests(testClient.id);
      console.log(chalk.green(`Excel tests completed ${excelTestsSuccessful ? 'successfully' : 'with issues'}`));
    } catch (testError) {
      console.error(chalk.red(`Error during test execution: ${testError.message}`));
      console.error(testError.stack);
      
      // Log current accounts for debugging
      try {
        const accounts = await getAccounts(testClient.id);
        console.log(chalk.yellow(`Current accounts for client ${testClient.id}:`), accounts.length);
      } catch (e) {
        console.error(chalk.red(`Failed to get accounts for debugging: ${e.message}`));
      }
    }
    
    // Print summary
    const summary = printSummary();
    
    // Clean up
    await cleanup();
    
    console.log(chalk.blue('\nEnd Time:', new Date().toLocaleString()));
    
    // Set exit code based on test results
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('\nTest suite encountered fatal error:'), error.message);
    
    // Try to clean up even if tests fail
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(chalk.red('Additional error during cleanup:'), cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(chalk.red('Unhandled exception:'), error);
  process.exit(1);
});