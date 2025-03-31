/**
 * Manual Test Script for Chart of Accounts Import/Export Functionality
 * 
 * This script provides a simpler interface for manually testing
 * the Chart of Accounts import and export functionality.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import chalk from 'chalk';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Check if the first argument is a URL or a command
let urlArgIndex = -1;
let baseUrl = '';

// Look for a URL in the arguments
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith('http://') || process.argv[i].startsWith('https://')) {
    baseUrl = process.argv[i];
    urlArgIndex = i;
    break;
  }
}

// If no URL was found, use the direct URL provided by the user
if (!baseUrl) {
  baseUrl = 'https://80550fad-9a85-4035-aa54-a26530837091-00-3hx3dcszn47es.janeway.replit.dev';
}

const BASE_URL = baseUrl;
console.log(chalk.blue(`Using base URL: ${BASE_URL}`));
const COOKIES_FILE = path.join(__dirname, '../curl_cookies.txt');
const TEMP_DIR = path.join(__dirname, '../tmp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log(chalk.blue(`Created temporary directory: ${TEMP_DIR}`));
}

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  if (!fs.existsSync(COOKIES_FILE)) {
    throw new Error('No cookie file found. Please login first.');
  }
  
  // Simply return the cookie string as is - we're now storing it in the correct format directly
  const cookieContent = fs.readFileSync(COOKIES_FILE, 'utf8');
  return cookieContent;
}

/**
 * Login to get auth cookie
 */
async function login() {
  try {
    console.log(chalk.blue('Authenticating with admin credentials...'));
    
    // Remove old cookie file if it exists
    if (fs.existsSync(COOKIES_FILE)) {
      fs.unlinkSync(COOKIES_FILE);
      console.log(chalk.blue('Removed old cookie file'));
    }
    
    // Login request with standard axios instance
    console.log(chalk.blue(`Sending login request to ${BASE_URL}/api/auth/login`));
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 400
    });
    
    console.log(chalk.green('Authentication response status:', response.status));
    
    // Extract and save cookies
    const cookies = response.headers['set-cookie'];
    if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
      console.error(chalk.red('No valid cookies in response headers:', response.headers));
      throw new Error('No valid cookies received from authentication');
    }
    
    // Save all cookies joined with semicolons
    const allCookiesStr = cookies.join('; ');
    fs.writeFileSync(COOKIES_FILE, allCookiesStr);
    console.log(chalk.green(`Saved all cookies to file: ${COOKIES_FILE}`));
    
    // For debugging, show the session cookie specifically
    const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid='));
    if (sessionCookie) {
      const cookieMatch = sessionCookie.match(/(connect\.sid)=([^;]*)/);
      if (cookieMatch) {
        const cookieName = cookieMatch[1];
        const cookieValue = cookieMatch[2];
        console.log(chalk.green(`Found session cookie: ${cookieName}=${cookieValue.substring(0, 15)}...`));
      }
    } else {
      console.warn(chalk.yellow('No session cookie found in the response. Authentication might fail.'));
    }
    
    // Verify session works by getting current user
    console.log(chalk.blue('Verifying authentication with /api/users/me endpoint...'));
    try {
      const verifyResponse = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { 'Cookie': allCookiesStr }
      });
      
      console.log(chalk.green('Verification response status:', verifyResponse.status));
      console.log(chalk.green('User data:', JSON.stringify(verifyResponse.data, null, 2)));
      console.log(chalk.green('Authentication verified successfully'));
    } catch (verifyError) {
      console.warn(chalk.yellow('Could not verify authentication:', verifyError.message));
      if (verifyError.response) {
        console.warn(chalk.yellow('Verification status:', verifyError.response.status));
      }
    }
    
    return allCookiesStr;
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
 * List all clients
 */
async function listClients() {
  try {
    console.log(chalk.blue('Listing all clients...'));
    
    // First, ensure we're logged in
    await login();
    
    const cookies = getCookieHeader();
    const response = await axios.get(`${BASE_URL}/api/admin/clients`, {
      headers: { Cookie: cookies }
    });
    
    // Handle nested response format
    let clients = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      clients = response.data.data;
    }
    
    if (Array.isArray(clients)) {
      console.log(chalk.green(`Found ${clients.length} clients:`));
      clients.forEach((client, index) => {
        console.log(chalk.cyan(`${index + 1}. ID: ${client.id}, Name: ${client.name}, Industry: ${client.industry || 'N/A'}`));
      });
    } else {
      console.log(chalk.yellow('Unexpected response format:'), clients);
    }
    
    return clients;
  } catch (error) {
    console.error(chalk.red('Failed to list clients:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Create a test client
 */
async function createClient(name) {
  try {
    console.log(chalk.blue(`Creating client: ${name}`));
    
    // First, ensure we're logged in
    await login();
    
    const cookies = getCookieHeader();
    const response = await axios.post(
      `${BASE_URL}/api/admin/clients`,
      {
        name: name,
        active: true,
        industry: 'ACCOUNTING'
      },
      {
        headers: { Cookie: cookies }
      }
    );
    
    // Handle nested response format
    let clientData = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      clientData = response.data.data;
    }
    
    console.log(chalk.green(`Created client with ID: ${clientData.id}`));
    
    // Display a success message with details
    console.log(chalk.green('Client created successfully:'));
    console.log(chalk.green(`- ID: ${clientData.id}`));
    console.log(chalk.green(`- Name: ${clientData.name}`));
    console.log(chalk.green(`- Industry: ${clientData.industry || 'N/A'}`));
    console.log(chalk.green(`- Active: ${clientData.active ? 'Yes' : 'No'}`));
    
    return clientData;
  } catch (error) {
    console.error(chalk.red('Failed to create client:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * List all accounts for a client
 */
async function listAccounts(clientId) {
  try {
    console.log(chalk.blue(`Listing accounts for client ID: ${clientId}`));
    
    // First, ensure we're logged in
    await login();
    
    const cookies = getCookieHeader();
    const response = await axios.get(`${BASE_URL}/api/clients/${clientId}/accounts`, {
      headers: { Cookie: cookies }
    });
    
    // Handle nested response format
    let accounts = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      accounts = response.data.data;
    }
    
    const accountsCount = Array.isArray(accounts) ? accounts.length : 
                          (accounts.items ? accounts.items.length : 0);
    
    console.log(chalk.green(`Found ${accountsCount} accounts`));
    
    // Print first 5 accounts as a sample
    const accountsArray = Array.isArray(accounts) ? accounts : 
                          (accounts.items ? accounts.items : []);
    
    if (accountsArray.length > 0) {
      console.log(chalk.cyan('Sample accounts:'));
      accountsArray.slice(0, 5).forEach((account, index) => {
        console.log(chalk.cyan(`${index + 1}. ${account.code}: ${account.name} (${account.type})`));
      });
      
      if (accountsArray.length > 5) {
        console.log(chalk.cyan(`... and ${accountsArray.length - 5} more accounts`));
      }
    }
    
    return accounts;
  } catch (error) {
    console.error(chalk.red(`Failed to list accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Export accounts to CSV
 */
async function exportAccountsCSV(clientId) {
  try {
    console.log(chalk.blue(`Exporting accounts for client ${clientId} to CSV`));
    
    // First, ensure we're logged in
    await login();
    
    // Get fresh cookies after login
    const cookies = getCookieHeader();
    console.log(chalk.blue('Making CSV export request...'));
    
    // Now make the export request
    const response = await axios.get(`${BASE_URL}/api/clients/${clientId}/accounts/export`, {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
      validateStatus: function (status) {
        return status === 200; // Only 200 is considered successful
      }
    });
    
    console.log(chalk.green('CSV export response received, status:'), response.status);
    console.log(chalk.green('Content type:'), response.headers['content-type']);
    
    // Check content type header
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error(chalk.red('Received HTML instead of CSV. Authentication may have failed.'));
      throw new Error('Authentication failed - received HTML instead of CSV');
    }
    
    const outputPath = path.join(TEMP_DIR, `client_${clientId}_accounts.csv`);
    fs.writeFileSync(outputPath, Buffer.from(response.data), 'binary');
    
    // Verify the file contains CSV data 
    let fileData;
    try {
      fileData = fs.readFileSync(outputPath, 'utf8').slice(0, 100);
    } catch (err) {
      console.error(chalk.red('Failed to read the output file:'), err.message);
      fileData = '';
    }
    
    // Show preview of the file
    console.log(chalk.green(`Exported accounts to ${outputPath}`));
    console.log(chalk.blue('First few characters of file:'));
    console.log(chalk.blue(fileData.slice(0, 50) + '...'));
    
    return outputPath;
  } catch (error) {
    console.error(chalk.red(`Failed to export accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Content type:'), error.response.headers['content-type']);
    }
    throw error;
  }
}

/**
 * Export accounts to Excel
 */
async function exportAccountsExcel(clientId) {
  try {
    console.log(chalk.blue(`Exporting accounts for client ${clientId} to Excel`));
    
    // First, ensure we're logged in
    await login();
    
    // Get fresh cookies after login
    const cookies = getCookieHeader();
    console.log(chalk.blue('Making Excel export request...'));
    
    // The API doesn't have a separate Excel endpoint, but we can set a format param
    const response = await axios.get(`${BASE_URL}/api/clients/${clientId}/accounts/export?format=excel`, {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
      validateStatus: function (status) {
        return status === 200; // Only 200 is considered successful
      }
    });
    
    console.log(chalk.green('Excel export response received, status:'), response.status);
    console.log(chalk.green('Content type:'), response.headers['content-type']);
    
    // Check content type header
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error(chalk.red('Received HTML instead of Excel file. Authentication may have failed.'));
      throw new Error('Authentication failed - received HTML instead of Excel file');
    }
    
    const outputPath = path.join(TEMP_DIR, `client_${clientId}_accounts.xlsx`);
    fs.writeFileSync(outputPath, Buffer.from(response.data), 'binary');
    
    console.log(chalk.green(`Exported accounts to ${outputPath}`));
    
    // We can't easily check Excel file content like CSV, but we can check file size
    const stats = fs.statSync(outputPath);
    if (stats.size < 100) { // If file is too small, it's probably not a valid Excel file
      console.error(chalk.red('Exported file is suspiciously small. It may not be a valid Excel file.'));
    } else {
      console.log(chalk.green(`Excel file size: ${stats.size} bytes`));
    }
    
    return outputPath;
  } catch (error) {
    console.error(chalk.red(`Failed to export accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Content type:'), error.response.headers['content-type']);
    }
    throw error;
  }
}

/**
 * Import accounts from file
 */
async function importAccounts(clientId, filePath) {
  try {
    console.log(chalk.blue(`Importing accounts for client ${clientId} from ${filePath}`));
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Import file not found: ${filePath}`);
    }
    
    // First, ensure we're logged in
    await login();
    
    const cookies = getCookieHeader();
    const formData = new FormData();
    
    // Create file stream and check file exists
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream);
    
    // Determine format from file extension
    const fileExt = path.extname(filePath).toLowerCase();
    const format = fileExt === '.csv' ? 'csv' : 'excel';
    formData.append('format', format);
    
    console.log(chalk.blue(`Detected file format: ${format} from extension: ${fileExt}`));
    console.log(chalk.blue(`Importing file: ${filePath} (${fs.statSync(filePath).size} bytes)`));
    
    console.log(chalk.blue(`Making import request to: ${BASE_URL}/api/clients/${clientId}/accounts/import`));
    // Make the import request with a longer timeout
    const response = await axios.post(
      `${BASE_URL}/api/clients/${clientId}/accounts/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Cookie: cookies
        },
        maxContentLength: 100000000, // 100MB max
        maxBodyLength: 100000000, // 100MB max
        timeout: 60000 // 60 second timeout
      }
    );
    
    console.log(chalk.green(`Import request completed with status: ${response.status}`));
    
    // Handle nested response format
    let importResults = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      importResults = response.data.data;
    }
    
    console.log(chalk.green('Import successful!'));
    console.log(chalk.green('Import results:'), JSON.stringify(importResults, null, 2));
    
    // Get updated account list to verify changes
    console.log(chalk.blue('\nVerifying account changes after import...'));
    const updatedAccounts = await listAccounts(clientId);
    
    return importResults;
  } catch (error) {
    console.error(chalk.red(`Failed to import accounts for client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response data:'), error.response.data ? JSON.stringify(error.response.data, null, 2) : 'No response data');
      if (error.response.status === 413) {
        console.error(chalk.red('File too large - server rejected the upload'));
      }
    }
    throw error;
  }
}

/**
 * Delete a client
 */
async function deleteClient(clientId) {
  try {
    console.log(chalk.blue(`Deleting client ID: ${clientId}`));
    
    // First, ensure we're logged in
    await login();
    
    const cookies = getCookieHeader();
    const response = await axios.delete(`${BASE_URL}/api/admin/clients/${clientId}`, {
      headers: { Cookie: cookies }
    });
    
    // Handle nested response format
    let result = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      result = response.data.data;
    }
    
    console.log(chalk.green(`Deleted client ID: ${clientId}`));
    console.log(chalk.green('Response:'), JSON.stringify(result, null, 2));
    
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to delete client ${clientId}:`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response status:'), error.response.status);
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Display command help
 */
function showHelp() {
  console.log(chalk.cyan('\nChart of Accounts Import/Export Test Tool'));
  console.log(chalk.cyan('==================================='));
  console.log(chalk.white('Available commands:'));
  console.log(chalk.green('  login                      - Authenticate with the server'));
  console.log(chalk.green('  list-clients               - List all clients'));
  console.log(chalk.green('  create-client <name>       - Create a new client'));
  console.log(chalk.green('  list-accounts <clientId>   - List accounts for a client'));
  console.log(chalk.green('  export-csv <clientId>      - Export accounts to CSV'));
  console.log(chalk.green('  export-excel <clientId>    - Export accounts to Excel'));
  console.log(chalk.green('  import <clientId> <file>   - Import accounts from file'));
  console.log(chalk.green('  delete-client <clientId>   - Delete a client'));
  console.log(chalk.green('  help                       - Show this help message'));
  console.log(chalk.cyan('\nExample usage:'));
  console.log(chalk.white('  node test-coa-manual.js login'));
  console.log(chalk.white('  node test-coa-manual.js create-client "Test Client"'));
  console.log(chalk.white('  node test-coa-manual.js export-csv 123'));
  console.log(chalk.white('  node test-coa-manual.js import 123 ./test_accounts.csv'));
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command-line arguments
    let args = process.argv.slice(2);
    let command = '';
    let commandArgs = [];
    
    // Filter out URL argument if present
    args = args.filter(arg => {
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        return false; // Remove URL arguments
      }
      return true;
    });
    
    // Get the command and its arguments
    if (args.length > 0) {
      command = args[0];
      commandArgs = args.slice(1);
    }
    
    if (!command) {
      showHelp();
      return;
    }
    
    console.log(chalk.blue(`Command: ${command}, Arguments:`, commandArgs));
    
    switch (command) {
      case 'login':
        await login();
        break;
        
      case 'list-clients':
        await listClients();
        break;
        
      case 'create-client':
        const clientName = commandArgs[0];
        if (!clientName) {
          console.error(chalk.red('Error: Client name is required'));
          showHelp();
          break;
        }
        await createClient(clientName);
        break;
        
      case 'list-accounts':
        const listClientId = commandArgs[0];
        if (!listClientId) {
          console.error(chalk.red('Error: Client ID is required'));
          showHelp();
          break;
        }
        await listAccounts(listClientId);
        break;
        
      case 'export-csv':
        const csvClientId = commandArgs[0];
        if (!csvClientId) {
          console.error(chalk.red('Error: Client ID is required'));
          showHelp();
          break;
        }
        await exportAccountsCSV(csvClientId);
        break;
        
      case 'export-excel':
        const excelClientId = commandArgs[0];
        if (!excelClientId) {
          console.error(chalk.red('Error: Client ID is required'));
          showHelp();
          break;
        }
        await exportAccountsExcel(excelClientId);
        break;
        
      case 'import':
        const importClientId = commandArgs[0];
        const importFile = commandArgs[1];
        if (!importClientId || !importFile) {
          console.error(chalk.red('Error: Client ID and file path are required'));
          showHelp();
          break;
        }
        await importAccounts(importClientId, importFile);
        break;
        
      case 'delete-client':
        const deleteClientId = commandArgs[0];
        if (!deleteClientId) {
          console.error(chalk.red('Error: Client ID is required'));
          showHelp();
          break;
        }
        await deleteClient(deleteClientId);
        break;
        
      case 'help':
        showHelp();
        break;
        
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        showHelp();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run the script
main();