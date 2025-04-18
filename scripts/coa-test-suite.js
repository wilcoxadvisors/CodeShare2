/**
 * Comprehensive Chart of Accounts Import/Export Test Suite
 * 
 * This script performs end-to-end testing of the Chart of Accounts
 * import and export functionality, including CSV and Excel formats,
 * with detailed verification of data integrity and error handling.
 */

// Required libraries
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import Papa from 'papaparse';
import chalk from 'chalk';
import XLSX from 'xlsx';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Use the direct URL provided by the user
const BASE_URL = process.argv[2] || 'https://80550fad-9a85-4035-aa54-a26530837091-00-3hx3dcszn47es.janeway.replit.dev';
console.log(chalk.blue(`Using base URL: ${BASE_URL}`));
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
 * Helper function to read cookies from file and format for HTTP headers
 */
function getCookieHeader() {
  if (!fs.existsSync(COOKIES_FILE)) {
    throw new Error('No cookie file found. Please login first.');
  }
  
  // Simply return the cookie string as is - assuming we stored the raw cookie
  const cookieContent = fs.readFileSync(COOKIES_FILE, 'utf8');
  return cookieContent;
}

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
    
    // Always attempt to get a fresh cookie for a more reliable test
    // Remove old cookie file if it exists
    if (fs.existsSync(COOKIES_FILE)) {
      fs.unlinkSync(COOKIES_FILE);
      console.log(chalk.blue('Removed old cookie file'));
    }
    
    // Authenticate to get fresh cookies
    console.log(chalk.blue('Authenticating with server...'));
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    
    console.log(chalk.green('Authentication response status:', response.status));
    
    // Extract and save cookies
    const cookies = response.headers['set-cookie'];
    if (!cookies) {
      console.error(chalk.red('No cookies in response headers:', JSON.stringify(response.headers)));
      throw new Error('No cookies received from authentication');
    }
    
    // Extract the session cookie value
    const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid='));
    if (!sessionCookie) {
      console.error(chalk.red('Available cookies:', cookies));
      throw new Error('Session cookie not found in authentication response');
    }
    
    // Format the cookie in Netscape format for curl
    const domain = new URL(BASE_URL).hostname;
    const path = '/';
    const secure = 'TRUE';
    const expiry = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    
    // Extract cookie name and value
    const cookieMatch = sessionCookie.match(/^(connect\.sid)=([^;]*)/);
    if (!cookieMatch) {
      throw new Error('Failed to parse cookie value');
    }
    
    const cookieName = cookieMatch[1];
    const cookieValue = cookieMatch[2];
    
    // Save the raw session cookie directly
    fs.writeFileSync(COOKIES_FILE, sessionCookie);
    console.log(chalk.green('Successfully authenticated and saved cookies'));
    
    // Verify user session by making a request to a protected endpoint
    const verifyResponse = await axios.get(`${BASE_URL}/api/users/me`, {
      headers: { Cookie: getCookieHeader() }
    });
    
    if (verifyResponse.data && verifyResponse.data.id) {
      console.log(chalk.green('Successfully verified authentication with user ID:', verifyResponse.data.id));
    } else {
      console.warn(chalk.yellow('Authentication succeeded but user data is incomplete:', JSON.stringify(verifyResponse.data)));
    }
    
    return getCookieHeader();
  } catch (error) {
    console.error(chalk.red('Authentication failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response data:'), JSON.stringify(error.response.data, null, 2));
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
    
    const cookies = getCookieHeader();
    
    // First, get the current user's ID to use in client creation
    console.log(chalk.blue('Getting current user ID...'));
    let userId;
    try {
      const userResponse = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { Cookie: cookies }
      });
      
      console.log(chalk.blue('User response status:', userResponse.status));
      console.log(chalk.blue('Full user response data:', JSON.stringify(userResponse.data, null, 2)));
      
      // Check the nested response format
      let userData = userResponse.data;
      if (userResponse.data && userResponse.data.status === 'success' && userResponse.data.data) {
        userData = userResponse.data.data;
        console.log(chalk.blue('Detected nested response format, extracted data:', JSON.stringify(userData, null, 2)));
      }
      
      if (userData && userData.id) {
        userId = userData.id;
        console.log(chalk.green(`Found user ID: ${userId}`));
      } else {
        console.warn(chalk.yellow('Could not retrieve user ID from response, trying to find alternates'));
        
        // Try alternative approach - maybe it's in a different format
        if (typeof userResponse.data === 'object') {
          // Try to find any key that might be an ID
          const possibleIdKeys = Object.keys(userResponse.data).filter(key => 
            (key === 'id' || key === 'userId' || key === 'user_id' || key === '_id' || key === 'uid') && 
            userResponse.data[key] !== undefined
          );
          
          // Log all keys for debugging
          console.log(chalk.blue('All keys in response:', Object.keys(userResponse.data).join(', ')));
          
          if (possibleIdKeys.length > 0) {
            userId = userResponse.data[possibleIdKeys[0]];
            console.log(chalk.green(`Found user ID via alternative key '${possibleIdKeys[0]}': ${userId}`));
          } else {
            // Fallback to admin user ID 1 for testing
            userId = 1;
            console.warn(chalk.yellow('No ID found in response. Using default admin ID (1) for testing purposes.'));
          }
        } else {
          // Fallback to admin user ID 1 for testing
          userId = 1;
          console.warn(chalk.yellow('Response is not an object. Using default admin ID (1) for testing purposes.'));
        }
      }
    } catch (userError) {
      console.error(chalk.red('Failed to get user profile:'), userError.message);
      if (userError.response) {
        console.error(chalk.red('Server response status:'), userError.response.status);
        console.error(chalk.red('Server response data:'), JSON.stringify(userError.response.data, null, 2));
      }
      
      // Fallback to admin user ID 1 for testing
      userId = 1;
      console.warn(chalk.yellow('Exception during user ID retrieval. Using default admin ID (1) for testing purposes.'));
    }
    
    // Use the correct admin API endpoint for client creation
    const ADMIN_API_URL = '/api/admin/clients';
    
    // Create payload with userId
    const clientPayload = {
      name: testClientName,
      active: true,
      industry: 'ACCOUNTING',
      userId: userId  // Include the userId in the payload
    };
    
    // Log the request details for debugging
    console.log(chalk.blue('Request details:'));
    console.log(chalk.blue('URL:', `${BASE_URL}${ADMIN_API_URL}`));
    console.log(chalk.blue('Payload:', JSON.stringify(clientPayload, null, 2)));
    
    const response = await axios.post(
      `${BASE_URL}${ADMIN_API_URL}`, 
      clientPayload,
      {
        headers: {
          Cookie: cookies
        }
      }
    );
    
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
      console.error(chalk.red('Response status:'), error.response.status);
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
      const cookies = getCookieHeader();
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
    const cookies = getCookieHeader();
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
    
    const cookies = getCookieHeader();
    const API_ACCOUNTS_BASE = `/api/clients/${clientId}/accounts`;
    const exportEndpoint = format.toLowerCase() === 'csv' 
      ? `${API_ACCOUNTS_BASE}/export/csv` 
      : `${API_ACCOUNTS_BASE}/export/excel`;
    
    console.log(chalk.blue('Export request URL:', `${BASE_URL}${exportEndpoint}`));
    
    const response = await axios.get(`${BASE_URL}${exportEndpoint}`, {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer' // Important for binary responses
    });
    
    console.log(chalk.green('Export response status:', response.status));
    
    if (!response.data) {
      throw new Error(`No data returned from ${format} export for client ${clientId}`);
    }
    
    // Determine file extension
    const fileExt = format.toLowerCase() === 'csv' ? 'csv' : 'xlsx';
    
    // Create output file path
    const outputPath = path.join(TEMP_DIR, `client_${clientId}_accounts_export.${fileExt}`);
    
    // Save the file
    fs.writeFileSync(outputPath, Buffer.from(response.data), 'binary');
    console.log(chalk.green(`Successfully exported accounts to ${outputPath}`));
    
    // Return the file path for later use
    return outputPath;
  } catch (error) {
    console.error(chalk.red(`Failed to export ${format} for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
    }
    throw error;
  }
}

/**
 * Import accounts from a file
 */
async function importAccounts(clientId, filePath, format = 'csv') {
  try {
    console.log(chalk.blue(`Importing accounts for client ${clientId} from ${format.toUpperCase()} file: ${filePath}`));
    
    // Make sure the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Import file not found: ${filePath}`);
    }
    
    const cookies = getCookieHeader();
    const API_ACCOUNTS_BASE = `/api/clients/${clientId}/accounts`;
    const importEndpoint = `${API_ACCOUNTS_BASE}/import`;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('format', format.toLowerCase());
    
    console.log(chalk.blue('Import request URL:', `${BASE_URL}${importEndpoint}`));
    
    // Use axios to make a multipart form POST request
    const response = await axios.post(
      `${BASE_URL}${importEndpoint}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Cookie: cookies
        }
      }
    );
    
    console.log(chalk.green('Import response status:', response.status));
    console.log(chalk.green('Import response data:', JSON.stringify(response.data, null, 2)));
    
    // Handle nested response format
    let importResults = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      importResults = response.data.data;
    }
    
    console.log(chalk.green(`Successfully imported accounts from ${filePath}`));
    return importResults;
  } catch (error) {
    console.error(chalk.red(`Failed to import accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response data:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Generate an invalid import file
 */
async function generateInvalidImportFile(format = 'csv') {
  try {
    console.log(chalk.blue(`Generating invalid ${format.toUpperCase()} file for testing error handling`));
    
    // Create an invalid file with missing required fields
    const invalidData = [
      { name: 'Invalid Account 1' }, // Missing code and type
      { code: '9999', name: 'Invalid Account 2' }, // Missing type
      { code: '9998', type: 'INVALID_TYPE', name: 'Invalid Account 3' } // Invalid type
    ];
    
    const outputPath = path.join(TEMP_DIR, `invalid_import.${format.toLowerCase()}`);
    
    if (format.toLowerCase() === 'csv') {
      // Generate CSV
      const csv = Papa.unparse(invalidData);
      fs.writeFileSync(outputPath, csv);
    } else {
      // Generate Excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(invalidData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');
      XLSX.writeFile(workbook, outputPath);
    }
    
    console.log(chalk.green(`Generated invalid ${format.toUpperCase()} file: ${outputPath}`));
    return outputPath;
  } catch (error) {
    console.error(chalk.red(`Failed to generate invalid ${format} file:`), error.message);
    throw error;
  }
}

/**
 * Generate a valid import file with new accounts
 */
async function generateValidImportFile(format = 'csv') {
  try {
    console.log(chalk.blue(`Generating valid ${format.toUpperCase()} file with new accounts`));
    
    // Create valid accounts for import testing
    const validData = [
      { 
        code: '6100', 
        name: 'Test Marketing Expenses', 
        type: 'EXPENSE',
        subtype: 'Operating Expense',
        parentCode: '5100',
        description: 'Marketing and advertising expenses',
        isSubledger: false,
        active: true
      },
      { 
        code: '6200', 
        name: 'Test Travel Expenses', 
        type: 'EXPENSE',
        subtype: 'Operating Expense',
        parentCode: '5100',
        description: 'Business travel expenses',
        isSubledger: false,
        active: true
      },
      { 
        code: '6300', 
        name: 'Test Office Supplies', 
        type: 'EXPENSE',
        subtype: 'Operating Expense',
        parentCode: '5100',
        description: 'Office supplies and stationery',
        isSubledger: false,
        active: true
      }
    ];
    
    const outputPath = path.join(TEMP_DIR, `valid_import.${format.toLowerCase()}`);
    
    if (format.toLowerCase() === 'csv') {
      // Generate CSV
      const csv = Papa.unparse(validData);
      fs.writeFileSync(outputPath, csv);
    } else {
      // Generate Excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(validData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');
      XLSX.writeFile(workbook, outputPath);
    }
    
    console.log(chalk.green(`Generated valid ${format.toUpperCase()} file: ${outputPath}`));
    return outputPath;
  } catch (error) {
    console.error(chalk.red(`Failed to generate valid ${format} file:`), error.message);
    throw error;
  }
}

/**
 * Modify exported file to create an updated import file
 */
async function createModifiedImportFile(exportedFilePath, format = 'csv') {
  try {
    console.log(chalk.blue(`Creating modified ${format.toUpperCase()} file from ${exportedFilePath}`));
    
    let accounts = [];
    
    if (format.toLowerCase() === 'csv') {
      // Parse CSV file
      const csvContent = fs.readFileSync(exportedFilePath, 'utf8');
      accounts = Papa.parse(csvContent, { header: true }).data;
    } else {
      // Parse Excel file
      const workbook = XLSX.readFile(exportedFilePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      accounts = XLSX.utils.sheet_to_json(worksheet);
    }
    
    // Make sure we have accounts to modify
    if (!accounts || accounts.length === 0) {
      throw new Error(`No accounts found in ${exportedFilePath}`);
    }
    
    console.log(chalk.blue(`Found ${accounts.length} accounts to modify`));
    
    // Modify a subset of accounts (first 3 for testing)
    const modifiedAccounts = accounts.slice(0, 3).map((account, index) => {
      return {
        ...account,
        name: `${account.name} (Modified ${index + 1})`,
        description: account.description ? `${account.description} - Updated by import test` : 'Updated by import test'
      };
    });
    
    // Add a few new accounts
    const newAccounts = [
      { 
        code: '8100', 
        name: 'Test Special Expense', 
        type: 'EXPENSE',
        subtype: 'Operating Expense',
        parentCode: '5000',
        description: 'Special expense for testing',
        isSubledger: false,
        active: true
      },
      { 
        code: '8200', 
        name: 'Test Special Revenue', 
        type: 'REVENUE',
        subtype: 'Operating Revenue',
        parentCode: '4000',
        description: 'Special revenue for testing',
        isSubledger: false,
        active: true
      }
    ];
    
    // Combine modified accounts with new accounts
    const combinedAccounts = [...modifiedAccounts, ...newAccounts];
    
    // Create a new file path
    const outputPath = path.join(TEMP_DIR, `modified_import.${format.toLowerCase()}`);
    
    if (format.toLowerCase() === 'csv') {
      // Generate CSV
      const csv = Papa.unparse(combinedAccounts);
      fs.writeFileSync(outputPath, csv);
    } else {
      // Generate Excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(combinedAccounts);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts');
      XLSX.writeFile(workbook, outputPath);
    }
    
    console.log(chalk.green(`Created modified ${format.toUpperCase()} file: ${outputPath}`));
    return { 
      filePath: outputPath, 
      accountCount: combinedAccounts.length,
      modifiedCount: modifiedAccounts.length,
      newCount: newAccounts.length
    };
  } catch (error) {
    console.error(chalk.red(`Failed to create modified ${format} file:`), error.message);
    throw error;
  }
}

/**
 * Clean up test clients and files
 */
async function cleanup() {
  console.log(chalk.blue(`Cleaning up test resources...`));
  
  // Delete temporary files
  const tempDir = TEMP_DIR;
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.startsWith('client_') || file.includes('import') || file.includes('export')) {
        try {
          fs.unlinkSync(path.join(tempDir, file));
          deletedCount++;
        } catch (error) {
          console.error(chalk.yellow(`Warning: Failed to delete file ${file}: ${error.message}`));
        }
      }
    }
    
    console.log(chalk.green(`Deleted ${deletedCount} temporary files`));
  }
  
  // Delete test clients
  if (createdClients.length > 0) {
    console.log(chalk.blue(`Attempting to delete ${createdClients.length} test clients:`));
    
    const cookies = getCookieHeader();
    let deletedCount = 0;
    
    for (const client of createdClients) {
      try {
        const response = await axios.delete(
          `${BASE_URL}/api/admin/clients/${client.id}`,
          { headers: { Cookie: cookies } }
        );
        
        console.log(chalk.green(`Deleted client ID ${client.id}: ${client.name}`));
        deletedCount++;
      } catch (error) {
        console.error(chalk.yellow(`Warning: Failed to delete client ${client.id}: ${error.message}`));
      }
    }
    
    console.log(chalk.green(`Deleted ${deletedCount} of ${createdClients.length} test clients`));
  } else {
    console.log(chalk.blue(`No test clients to delete`));
  }
}

/**
 * Run CSV export/import tests
 */
async function runCsvTests(clientId) {
  console.log(chalk.blue('=== Starting CSV Import/Export Tests ==='));
  try {
    // Test 1: Export accounts to CSV
    console.log(chalk.blue('Test 1: Export accounts to CSV'));
    const exportPath = await exportAccounts(clientId, 'csv');
    logResult('CSV Export', true, `Successfully exported accounts to ${exportPath}`);
    
    // Verify the exported file exists and contains data
    const exportedData = fs.readFileSync(exportPath, 'utf8');
    const parsedExport = Papa.parse(exportedData, { header: true });
    const exportedAccounts = parsedExport.data;
    
    logResult('CSV Export Data Validation', exportedAccounts.length > 0, 
      `Exported CSV contains ${exportedAccounts.length} accounts`);
    
    // Test 2: Import new accounts from CSV
    console.log(chalk.blue('Test 2: Import new accounts from CSV'));
    const validImportPath = await generateValidImportFile('csv');
    const importResults = await importAccounts(clientId, validImportPath, 'csv');
    
    logResult('CSV Import - New Accounts', true, 
      `Successfully imported accounts from ${validImportPath}`);
    
    // Test 3: Verify imported accounts are visible in retrieved accounts
    console.log(chalk.blue('Test 3: Verify imported accounts are visible'));
    const accountsAfterImport = await getAccounts(clientId);
    let accountsFound = 0;
    
    // Parse the valid import file to check if all accounts were imported
    const validImportData = fs.readFileSync(validImportPath, 'utf8');
    const parsedImport = Papa.parse(validImportData, { header: true });
    const importedAccounts = parsedImport.data;
    
    for (const importedAccount of importedAccounts) {
      // Find the account in the retrieved accounts
      let found = false;
      if (Array.isArray(accountsAfterImport)) {
        found = accountsAfterImport.some(acc => acc.code === importedAccount.code);
      } else if (accountsAfterImport.items) {
        found = accountsAfterImport.items.some(acc => acc.code === importedAccount.code);
      }
      
      if (found) accountsFound++;
    }
    
    logResult('CSV Import Verification', accountsFound === importedAccounts.length,
      `Found ${accountsFound} of ${importedAccounts.length} imported accounts`);
    
    // Test 4: Test importing invalid file (error handling)
    console.log(chalk.blue('Test 4: Test error handling with invalid import'));
    const invalidImportPath = await generateInvalidImportFile('csv');
    
    try {
      const result = await importAccounts(clientId, invalidImportPath, 'csv');
      
      // Check if the result contains errors
      if (result && result.errors && result.errors.length > 0) {
        console.log(chalk.green('Server detected errors in invalid import as expected:'), result.errors);
        logResult('CSV Import Error Handling', true, 
          'Server correctly detected errors in invalid CSV import');
      } else {
        logResult('CSV Import Error Handling', false, 
          'Import of invalid CSV succeeded without reporting errors');
      }
    } catch (error) {
      // This is also a valid success case - server rejected import with an error
      logResult('CSV Import Error Handling', true,
        'Server correctly rejected invalid CSV import');
    }
    
    // Test 5: Create and import modified file
    console.log(chalk.blue('Test 5: Create and import modified export'));
    const modifiedImport = await createModifiedImportFile(exportPath, 'csv');
    
    try {
      const modifiedImportResults = await importAccounts(clientId, modifiedImport.filePath, 'csv');
      logResult('CSV Modified Import', true,
        `Successfully imported ${modifiedImport.accountCount} accounts (${modifiedImport.modifiedCount} modified, ${modifiedImport.newCount} new)`);
    } catch (error) {
      logResult('CSV Modified Import', false,
        `Failed to import modified accounts: ${error.message}`);
    }
    
    console.log(chalk.green('=== CSV Import/Export Tests Completed ==='));
    return true;
  } catch (error) {
    console.error(chalk.red('CSV Import/Export Tests failed:'), error.message);
    return false;
  }
}

/**
 * Run Excel export/import tests
 */
async function runExcelTests(clientId) {
  console.log(chalk.blue('=== Starting Excel Import/Export Tests ==='));
  try {
    // Test 1: Export accounts to Excel
    console.log(chalk.blue('Test 1: Export accounts to Excel'));
    const exportPath = await exportAccounts(clientId, 'excel');
    logResult('Excel Export', true, `Successfully exported accounts to ${exportPath}`);
    
    // Verify the exported file exists and contains data
    const workbook = XLSX.readFile(exportPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const exportedAccounts = XLSX.utils.sheet_to_json(worksheet);
    
    logResult('Excel Export Data Validation', exportedAccounts.length > 0, 
      `Exported Excel contains ${exportedAccounts.length} accounts`);
    
    // Test 2: Import new accounts from Excel
    console.log(chalk.blue('Test 2: Import new accounts from Excel'));
    const validImportPath = await generateValidImportFile('excel');
    const importResults = await importAccounts(clientId, validImportPath, 'excel');
    
    logResult('Excel Import - New Accounts', true, 
      `Successfully imported accounts from ${validImportPath}`);
    
    // Test 3: Verify imported accounts are visible in retrieved accounts
    console.log(chalk.blue('Test 3: Verify imported accounts are visible'));
    const accountsAfterImport = await getAccounts(clientId);
    
    // Parse the valid import file to check if all accounts were imported
    const importWorkbook = XLSX.readFile(validImportPath);
    const importWorksheet = importWorkbook.Sheets[importWorkbook.SheetNames[0]];
    const importedAccounts = XLSX.utils.sheet_to_json(importWorksheet);
    
    let accountsFound = 0;
    for (const importedAccount of importedAccounts) {
      // Find the account in the retrieved accounts
      let found = false;
      if (Array.isArray(accountsAfterImport)) {
        found = accountsAfterImport.some(acc => acc.code === importedAccount.code);
      } else if (accountsAfterImport.items) {
        found = accountsAfterImport.items.some(acc => acc.code === importedAccount.code);
      }
      
      if (found) accountsFound++;
    }
    
    logResult('Excel Import Verification', accountsFound === importedAccounts.length,
      `Found ${accountsFound} of ${importedAccounts.length} imported accounts`);
    
    // Test 4: Test importing invalid file (error handling)
    console.log(chalk.blue('Test 4: Test error handling with invalid import'));
    const invalidImportPath = await generateInvalidImportFile('excel');
    
    try {
      const result = await importAccounts(clientId, invalidImportPath, 'excel');
      
      // Check if the result contains errors
      if (result && result.errors && result.errors.length > 0) {
        console.log(chalk.green('Server detected errors in invalid import as expected:'), result.errors);
        logResult('Excel Import Error Handling', true, 
          'Server correctly detected errors in invalid Excel import');
      } else {
        logResult('Excel Import Error Handling', false, 
          'Import of invalid Excel succeeded without reporting errors');
      }
    } catch (error) {
      // This is also a valid success case - server rejected import with an error
      logResult('Excel Import Error Handling', true,
        'Server correctly rejected invalid Excel import');
    }
    
    // Test 5: Create and import modified file
    console.log(chalk.blue('Test 5: Create and import modified export'));
    const modifiedImport = await createModifiedImportFile(exportPath, 'excel');
    
    try {
      const modifiedImportResults = await importAccounts(clientId, modifiedImport.filePath, 'excel');
      logResult('Excel Modified Import', true,
        `Successfully imported ${modifiedImport.accountCount} accounts (${modifiedImport.modifiedCount} modified, ${modifiedImport.newCount} new)`);
    } catch (error) {
      logResult('Excel Modified Import', false,
        `Failed to import modified accounts: ${error.message}`);
    }
    
    console.log(chalk.green('=== Excel Import/Export Tests Completed ==='));
    return true;
  } catch (error) {
    console.error(chalk.red('Excel Import/Export Tests failed:'), error.message);
    return false;
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(chalk.blue('\n=== TEST SUMMARY ==='));
  console.log(chalk.green(`Passed: ${testResults.passed.length} tests`));
  console.log(chalk.red(`Failed: ${testResults.failed.length} tests`));
  
  if (testResults.passed.length > 0) {
    console.log(chalk.green('\nPassed Tests:'));
    testResults.passed.forEach((test, index) => {
      console.log(chalk.green(`${index + 1}. ${test.name}: ${test.message}`));
    });
  }
  
  if (testResults.failed.length > 0) {
    console.log(chalk.red('\nFailed Tests:'));
    testResults.failed.forEach((test, index) => {
      console.log(chalk.red(`${index + 1}. ${test.name}: ${test.message}`));
    });
  }
  
  // Calculate success percentage
  const totalTests = testResults.passed.length + testResults.failed.length;
  const successRate = totalTests > 0
    ? Math.round((testResults.passed.length / totalTests) * 100)
    : 0;
  
  console.log(chalk.blue(`\nOverall Success Rate: ${successRate}%`));
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log(chalk.blue('\nCHART OF ACCOUNTS IMPORT/EXPORT TEST SUITE'));
  console.log(chalk.blue(`Start Time: ${new Date().toLocaleString()}`));
  
  try {
    // Ensure temp directory exists
    ensureTempDir();
    
    // Step 1: Login to get cookies
    await login();
    
    // Step 2: Create a test client
    const testClient = await createTestClient();
    console.log(chalk.green(`Created test client with ID: ${testClient.id}`));
    
    // Note: We're not manually seeding accounts here because client creation
    // should automatically seed the standard chart of accounts
    
    // Step 3: Verify accounts exist for this client
    const initialAccounts = await getAccounts(testClient.id);
    
    // Determine account count based on response structure
    let accountCount = 0;
    if (Array.isArray(initialAccounts)) {
      accountCount = initialAccounts.length;
    } else if (initialAccounts.items && Array.isArray(initialAccounts.items)) {
      accountCount = initialAccounts.items.length;
    }
    
    if (accountCount > 0) {
      console.log(chalk.green(`Found ${accountCount} initial accounts for client ID: ${testClient.id}`));
    } else {
      console.log(chalk.yellow(`No initial accounts found. Will seed accounts now.`));
      await seedInitialAccounts(testClient.id);
    }
    
    // Step 4: Run CSV tests
    await runCsvTests(testClient.id);
    
    // Step 5: Run Excel tests
    await runExcelTests(testClient.id);
    
    // Print test summary
    printSummary();
    
  } catch (error) {
    console.error(chalk.red('Test suite execution failed:'), error.message);
    throw error;
  } finally {
    // Clean up resources
    await cleanup();
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(chalk.red('Error in test suite execution:'), error);
  process.exit(1);
});