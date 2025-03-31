/**
 * Comprehensive Chart of Accounts Import/Export Test Suite
 * 
 * This script performs end-to-end testing of the Chart of Accounts
 * import and export functionality, including CSV and Excel formats,
 * with detailed verification of data integrity and error handling.
 */

// Required libraries
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
const TEST_CLIENT_PREFIX = 'COA_TEST_';
const API_BASE = '/api/admin/clients';

// Track created clients for cleanup
const createdClients = [];

// Test results
const testResults = {
  passed: [],
  failed: []
};

/**
 * Ensure temporary directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(chalk.blue(`Created temporary directory: ${TEMP_DIR}`));
  }
}

/**
 * Log test results in a consistent format
 */
function logResult(testName, success, message) {
  if (success) {
    console.log(chalk.green(`✓ PASS: ${testName} - ${message}`));
    testResults.passed.push({ name: testName, message });
    return true;
  } else {
    console.log(chalk.red(`✗ FAIL: ${testName} - ${message}`));
    testResults.failed.push({ name: testName, message });
    return false;
  }
}

/**
 * Login to get auth cookie
 */
async function login() {
  try {
    console.log(chalk.blue('Authenticating with admin credentials...'));
    
    // Check if cookies file already exists
    if (fs.existsSync(COOKIES_FILE)) {
      console.log(chalk.green('Using existing authentication cookies'));
      return fs.readFileSync(COOKIES_FILE, 'utf8');
    }
    
    // Authenticate to get cookies
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    
    // Extract and save cookies
    const cookies = response.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies received from authentication');
    }
    
    // Format and save cookies to file
    const cookieString = cookies.join('; ');
    fs.writeFileSync(COOKIES_FILE, cookieString);
    
    console.log(chalk.green('Successfully authenticated and saved cookies'));
    return cookieString;
  } catch (error) {
    console.error(chalk.red('Authentication failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
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
    
    // Use the correct admin API endpoint for client creation
    const ADMIN_API_URL = '/api/admin/clients';
    
    // Log the request details for debugging
    console.log(chalk.blue('Request details:'));
    console.log(chalk.blue('URL:', `${BASE_URL}${ADMIN_API_URL}`));
    console.log(chalk.blue('Payload:', JSON.stringify({
      name: testClientName,
      active: true,
      industry: 'ACCOUNTING'
    }, null, 2)));
    
    const response = await axios.post(`${BASE_URL}${ADMIN_API_URL}`, {
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
    
    // Handle the nested response format
    if (!response.data || !response.data.status || !response.data.data || !response.data.data.id) {
      throw new Error(`Failed to create test client. Response: ${JSON.stringify(response.data)}`);
    }
    
    const clientData = response.data.data;
    const clientId = clientData.id;
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
    
    // Standard accounts for testing
    const standardAccounts = [
      // Assets (1000-1999)
      { code: '1000', name: 'Assets', type: 'ASSET', subtype: 'Asset', isSubledger: false, active: true, description: 'Asset accounts', parentCode: null },
      { code: '1100', name: 'Current Assets', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Current assets', parentCode: '1000' },
      { code: '1200', name: 'Cash', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Cash accounts', parentCode: '1100' },
      { code: '1201', name: 'Checking Account', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Primary checking account', parentCode: '1200' },
      { code: '1202', name: 'Savings Account', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Savings account', parentCode: '1200' },
      { code: '1300', name: 'Accounts Receivable', type: 'ASSET', subtype: 'Current Asset', isSubledger: true, subledgerType: 'CUSTOMER', active: true, description: 'Amounts owed by customers', parentCode: '1100' },
      { code: '1400', name: 'Inventory', type: 'ASSET', subtype: 'Current Asset', isSubledger: false, active: true, description: 'Inventory assets', parentCode: '1100' },
      { code: '1500', name: 'Fixed Assets', type: 'ASSET', subtype: 'Non-Current Asset', isSubledger: false, active: true, description: 'Long-term assets', parentCode: '1000' },
      { code: '1600', name: 'Equipment', type: 'ASSET', subtype: 'Non-Current Asset', isSubledger: false, active: true, description: 'Equipment owned', parentCode: '1500' },
      { code: '1700', name: 'Buildings', type: 'ASSET', subtype: 'Non-Current Asset', isSubledger: false, active: true, description: 'Buildings owned', parentCode: '1500' },
      
      // Liabilities (2000-2999)
      { code: '2000', name: 'Liabilities', type: 'LIABILITY', subtype: 'Liability', isSubledger: false, active: true, description: 'Liability accounts', parentCode: null },
      { code: '2100', name: 'Current Liabilities', type: 'LIABILITY', subtype: 'Current Liability', isSubledger: false, active: true, description: 'Current liabilities', parentCode: '2000' },
      { code: '2200', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'Current Liability', isSubledger: true, subledgerType: 'VENDOR', active: true, description: 'Amounts owed to vendors', parentCode: '2100' },
      { code: '2300', name: 'Credit Cards', type: 'LIABILITY', subtype: 'Current Liability', isSubledger: false, active: true, description: 'Credit card balances', parentCode: '2100' },
      { code: '2400', name: 'Accrued Expenses', type: 'LIABILITY', subtype: 'Current Liability', isSubledger: false, active: true, description: 'Accrued expenses', parentCode: '2100' },
      { code: '2500', name: 'Long-term Liabilities', type: 'LIABILITY', subtype: 'Non-Current Liability', isSubledger: false, active: true, description: 'Long-term liabilities', parentCode: '2000' },
      { code: '2600', name: 'Loans Payable', type: 'LIABILITY', subtype: 'Non-Current Liability', isSubledger: false, active: true, description: 'Long-term loans', parentCode: '2500' },
      
      // Equity (3000-3999)
      { code: '3000', name: 'Equity', type: 'EQUITY', subtype: 'Equity', isSubledger: false, active: true, description: 'Equity accounts', parentCode: null },
      { code: '3100', name: 'Common Stock', type: 'EQUITY', subtype: 'Equity', isSubledger: false, active: true, description: 'Common stock issued', parentCode: '3000' },
      { code: '3200', name: 'Retained Earnings', type: 'EQUITY', subtype: 'Equity', isSubledger: false, active: true, description: 'Accumulated earnings', parentCode: '3000' },
      
      // Revenue (4000-4999)
      { code: '4000', name: 'Revenue', type: 'REVENUE', subtype: 'Revenue', isSubledger: false, active: true, description: 'Revenue accounts', parentCode: null },
      { code: '4100', name: 'Service Revenue', type: 'REVENUE', subtype: 'Operating Revenue', isSubledger: false, active: true, description: 'Revenue from services', parentCode: '4000' },
      { code: '4200', name: 'Product Sales', type: 'REVENUE', subtype: 'Operating Revenue', isSubledger: false, active: true, description: 'Revenue from product sales', parentCode: '4000' },
      { code: '4300', name: 'Other Revenue', type: 'REVENUE', subtype: 'Non-Operating Revenue', isSubledger: false, active: true, description: 'Other revenue sources', parentCode: '4000' },
      
      // Expenses (5000-5999)
      { code: '5000', name: 'Expenses', type: 'EXPENSE', subtype: 'Expense', isSubledger: false, active: true, description: 'Expense accounts', parentCode: null },
      { code: '5100', name: 'Operating Expenses', type: 'EXPENSE', subtype: 'Operating Expense', isSubledger: false, active: true, description: 'Operating expenses', parentCode: '5000' },
      { code: '5200', name: 'Payroll Expenses', type: 'EXPENSE', subtype: 'Operating Expense', isSubledger: false, active: true, description: 'Payroll-related expenses', parentCode: '5100' },
      { code: '5300', name: 'Rent Expense', type: 'EXPENSE', subtype: 'Operating Expense', isSubledger: false, active: true, description: 'Rent payments', parentCode: '5100' },
      { code: '5400', name: 'Utilities Expense', type: 'EXPENSE', subtype: 'Operating Expense', isSubledger: false, active: true, description: 'Utility payments', parentCode: '5100' },
      { code: '5500', name: 'Insurance Expense', type: 'EXPENSE', subtype: 'Operating Expense', isSubledger: false, active: true, description: 'Insurance payments', parentCode: '5100' }
    ];
    
    try {
      const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
      const API_ACCOUNTS_BASE = `/api/clients/${clientId}/accounts`;
      
      // First pass: Create all accounts without parent relationships
      const firstPassAccounts = standardAccounts.map(account => ({
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype || null,
        isSubledger: account.isSubledger || false,
        subledgerType: account.subledgerType || null,
        active: account.active !== undefined ? account.active : true,
        description: account.description || null
      }));
      
      console.log(chalk.blue('Batch creation request:'));
      console.log(chalk.blue('URL:', `${BASE_URL}${API_ACCOUNTS_BASE}/batch`));
      console.log(chalk.blue('Payload:', JSON.stringify({ accounts: firstPassAccounts }, null, 2)));
      
      const firstPassResponse = await axios.post(
        `${BASE_URL}${API_ACCOUNTS_BASE}/batch`,
        { accounts: firstPassAccounts },
        { headers: { Cookie: cookies } }
      );
      
      console.log(chalk.green('Batch creation response status:', firstPassResponse.status));
      
      // Handle nested response format
      let batchResponseData = firstPassResponse.data;
      if (firstPassResponse.data && firstPassResponse.data.status === 'success' && firstPassResponse.data.data) {
        batchResponseData = firstPassResponse.data.data;
      }
      
      console.log(chalk.green('Batch creation response data:', JSON.stringify(batchResponseData, null, 2)));
      
      // Second pass: Update parent relationships
      const accountsWithParents = standardAccounts.filter(acc => acc.parentCode);
      
      if (accountsWithParents.length > 0) {
        const updates = accountsWithParents.map(acc => ({
          code: acc.code,
          parentCode: acc.parentCode
        }));
        
        console.log(chalk.blue('Parent relationship update request:'));
        console.log(chalk.blue('URL:', `${BASE_URL}${API_ACCOUNTS_BASE}/update-parents`));
        console.log(chalk.blue('Payload:', JSON.stringify({ updates }, null, 2)));
        
        const secondPassResponse = await axios.post(
          `${BASE_URL}${API_ACCOUNTS_BASE}/update-parents`,
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
    
    const API_ACCOUNTS_BASE = `/api/clients/${clientId}/accounts`;
    const response = await axios.get(`${BASE_URL}${API_ACCOUNTS_BASE}`, {
      headers: { Cookie: cookies }
    });
    
    if (!response.data) {
      throw new Error(`No account data returned for client ID: ${clientId}`);
    }
    
    // Handle the nested response format
    let accounts = response.data;
    if (response.data.status === 'success' && response.data.data) {
      accounts = response.data.data;
    }
    
    const accountsLength = Array.isArray(accounts) ? 
                          accounts.length : 
                          (accounts.items ? accounts.items.length : 0);
                          
    console.log(chalk.green(`Retrieved ${accountsLength} accounts for client ID: ${clientId}`));
    return accounts;
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
    const API_ACCOUNTS_BASE = `/api/clients/${clientId}/accounts`;
    const response = await axios.get(
      `${BASE_URL}${API_ACCOUNTS_BASE}/export?format=${format}`, 
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
    
    const API_ACCOUNTS_BASE = `/api/clients/${clientId}/accounts`;
    const response = await axios.post(
      `${BASE_URL}${API_ACCOUNTS_BASE}/import`,
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
    
    // Handle the nested response format
    if (response.data && response.data.status === 'success' && response.data.data) {
      return response.data.data;
    }
    
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
        // Use the admin API endpoint for deleting clients
        const ADMIN_API_URL = `/api/admin/clients/${client.id}`;
        await axios.delete(`${BASE_URL}${ADMIN_API_URL}`, {
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
    
    // Test 2: Generate and import valid CSV
    console.log(chalk.blue('\nTest 2: Import valid CSV'));
    const validCsvFile = await generateValidImportFile('csv');
    const validImportResult = await importAccounts(clientId, validCsvFile.filePath, 'csv');
    
    // Verify import results
    const afterValidImport = await getAccounts(clientId);
    
    const validImportTestResult = logResult(
      'Valid CSV Import',
      afterValidImport.length >= initialAccounts.length + validCsvFile.accountCount,
      `Successfully imported ${validCsvFile.accountCount} new accounts`
    );
    
    // Test 3: Generate and attempt invalid CSV import
    console.log(chalk.blue('\nTest 3: Import invalid CSV'));
    const invalidCsvFile = await generateInvalidImportFile('csv');
    let invalidImportSucceeded = false;
    let errorMessage = '';
    
    try {
      await importAccounts(clientId, invalidCsvFile.filePath, 'csv');
      invalidImportSucceeded = true;
    } catch (error) {
      errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = JSON.stringify(error.response.data);
      }
    }
    
    const invalidImportTestResult = logResult(
      'Invalid CSV Import Rejection',
      !invalidImportSucceeded,
      invalidImportSucceeded
        ? 'Invalid import succeeded when it should have failed'
        : `Properly rejected invalid import: ${errorMessage}`
    );
    
    // Test 4: Export, modify and re-import CSV
    console.log(chalk.blue('\nTest 4: Modify and re-import CSV'));
    const reExport = await exportAccounts(clientId, 'csv');
    const modifiedCsvFile = await createModifiedImportFile(reExport.filePath, 'csv');
    
    const modifiedImportResult = await importAccounts(clientId, modifiedCsvFile.filePath, 'csv');
    const afterModifiedImport = await getAccounts(clientId);
    
    const modifiedImportTestResult = logResult(
      'Modified CSV Import',
      afterModifiedImport.length > afterValidImport.length,
      `Successfully imported modified CSV with ${modifiedCsvFile.modifications} modifications and ${modifiedCsvFile.additions} additions`
    );
    
    return csvExportTestResult && csvHeadersTestResult && 
           validImportTestResult && invalidImportTestResult && 
           modifiedImportTestResult;
  } catch (error) {
    console.error(chalk.red('CSV tests encountered an error:'), error.message);
    logResult('CSV Tests', false, `Error: ${error.message}`);
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
    
    // Verify Excel headers
    const firstRow = excelData[0];
    const requiredHeaders = ['Code', 'Name', 'Type', 'Subtype', 'IsSubledger', 'Active', 'Description'];
    const missingHeaders = requiredHeaders.filter(header => !Object.keys(firstRow).includes(header));
    
    const excelHeadersTestResult = logResult(
      'Excel Headers',
      missingHeaders.length === 0,
      missingHeaders.length === 0 
        ? 'All required headers present' 
        : `Missing headers: ${missingHeaders.join(', ')}`
    );
    
    // Test 2: Generate and import valid Excel
    console.log(chalk.blue('\nTest 2: Import valid Excel'));
    const validExcelFile = await generateValidImportFile('xlsx');
    const validImportResult = await importAccounts(clientId, validExcelFile.filePath, 'xlsx');
    
    // Verify import results
    const afterValidImport = await getAccounts(clientId);
    
    const validImportTestResult = logResult(
      'Valid Excel Import',
      afterValidImport.length >= initialAccounts.length + validExcelFile.accountCount,
      `Successfully imported ${validExcelFile.accountCount} new accounts`
    );
    
    // Test 3: Generate and attempt invalid Excel import
    console.log(chalk.blue('\nTest 3: Import invalid Excel'));
    const invalidExcelFile = await generateInvalidImportFile('xlsx');
    let invalidImportSucceeded = false;
    let errorMessage = '';
    
    try {
      await importAccounts(clientId, invalidExcelFile.filePath, 'xlsx');
      invalidImportSucceeded = true;
    } catch (error) {
      errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = JSON.stringify(error.response.data);
      }
    }
    
    const invalidImportTestResult = logResult(
      'Invalid Excel Import Rejection',
      !invalidImportSucceeded,
      invalidImportSucceeded
        ? 'Invalid import succeeded when it should have failed'
        : `Properly rejected invalid import: ${errorMessage}`
    );
    
    // Test 4: Export, modify and re-import Excel
    console.log(chalk.blue('\nTest 4: Modify and re-import Excel'));
    const reExport = await exportAccounts(clientId, 'xlsx');
    const modifiedExcelFile = await createModifiedImportFile(reExport.filePath, 'xlsx');
    
    const modifiedImportResult = await importAccounts(clientId, modifiedExcelFile.filePath, 'xlsx');
    const afterModifiedImport = await getAccounts(clientId);
    
    const modifiedImportTestResult = logResult(
      'Modified Excel Import',
      afterModifiedImport.length > afterValidImport.length,
      `Successfully imported modified Excel with ${modifiedExcelFile.modifications} modifications and ${modifiedExcelFile.additions} additions`
    );
    
    return excelExportTestResult && excelHeadersTestResult && 
           validImportTestResult && invalidImportTestResult && 
           modifiedImportTestResult;
  } catch (error) {
    console.error(chalk.red('Excel tests encountered an error:'), error.message);
    logResult('Excel Tests', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(chalk.bold.blue('\n===== TEST SUMMARY ====='));
  console.log(chalk.green(`Passed: ${testResults.passed.length} tests`));
  console.log(chalk.red(`Failed: ${testResults.failed.length} tests`));
  console.log(chalk.bold.blue('\nPassed Tests:'));
  testResults.passed.forEach((test, index) => {
    console.log(chalk.green(`  ${index+1}. ${test.name}: ${test.message}`));
  });
  
  if (testResults.failed.length > 0) {
    console.log(chalk.bold.red('\nFailed Tests:'));
    testResults.failed.forEach((test, index) => {
      console.log(chalk.red(`  ${index+1}. ${test.name}: ${test.message}`));
    });
  }
  
  return { passed: testResults.passed.length, failed: testResults.failed.length };
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log(chalk.bold.green('CHART OF ACCOUNTS IMPORT/EXPORT TEST SUITE'));
  console.log(chalk.yellow('Start Time:', new Date().toLocaleString()));
  
  try {
    // Ensure temp directory exists
    ensureTempDir();
    
    // Login to get auth cookies
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
    console.error(chalk.red('Test suite execution failed:'), error.message);
    console.error(error.stack);
    
    // Try cleanup anyway
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(chalk.red('Cleanup failed:'), cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run the test suite
runAllTests();