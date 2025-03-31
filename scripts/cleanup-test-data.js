/**
 * Test Data Cleanup Utility
 * 
 * This script safely removes test clients and their associated
 * Chart of Accounts data to keep the database clean after testing.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import readline from 'readline';

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

// If no URL was found, use the default
if (!baseUrl) {
  baseUrl = 'https://80550fad-9a85-4035-aa54-a26530837091-00-3hx3dcszn47es.janeway.replit.dev';
}

const BASE_URL = baseUrl;
console.log(chalk.blue(`Using base URL: ${BASE_URL}`));
const COOKIES_FILE = path.join(__dirname, '../curl_cookies.txt');
const TEST_CLIENT_PREFIX = 'COA_TEST_';

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
    
    // Create an instance of axios that handles cookies
    const axiosInstance = axios.create({
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    
    // Login request
    console.log(chalk.blue(`Sending login request to ${BASE_URL}/api/auth/login`));
    const response = await axiosInstance.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    console.log(chalk.green('Authentication response status:', response.status));
    
    // Extract and save cookies
    const cookies = response.headers['set-cookie'];
    if (!cookies) {
      console.error(chalk.red('No cookies in response headers:', JSON.stringify(response.headers)));
      throw new Error('No cookies received from authentication');
    }
    
    console.log(chalk.blue('Received cookies:', cookies));
    
    // Extract the session cookie value
    const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid='));
    if (!sessionCookie) {
      console.error(chalk.red('Available cookies:', cookies));
      throw new Error('Session cookie not found in authentication response');
    }
    
    // Extract cookie name and value using more robust regex
    // This handles domains with or without path specified
    const cookieMatch = sessionCookie.match(/(connect\.sid)=([^;]*)/);
    if (!cookieMatch) {
      throw new Error('Failed to parse cookie value');
    }
    
    const cookieName = cookieMatch[1];
    const cookieValue = cookieMatch[2];
    
    // Save raw cookie in text file for simpler handling
    fs.writeFileSync(COOKIES_FILE, sessionCookie);
    console.log(chalk.green(`Successfully saved cookie: ${cookieName}=${cookieValue}`));
    
    // Verify session works by getting current user
    console.log(chalk.blue('Verifying authentication with /api/users/me endpoint...'));
    try {
      const verifyResponse = await axiosInstance.get(`${BASE_URL}/api/users/me`, {
        headers: { 'Cookie': sessionCookie }
      });
      
      console.log(chalk.green('Verification response status:', verifyResponse.status));
      console.log(chalk.green('User data:', JSON.stringify(verifyResponse.data, null, 2)));
      console.log(chalk.green('Authentication verified successfully'));
    } catch (verifyError) {
      console.warn(chalk.yellow('Could not verify authentication:', verifyError.message));
      // Continue anyway, might still work
    }
    
    return sessionCookie;
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
async function listAllClients() {
  try {
    console.log(chalk.blue('Listing all clients...'));
    
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
      return clients;
    } else {
      console.log(chalk.yellow('Unexpected response format:'), clients);
      return [];
    }
  } catch (error) {
    console.error(chalk.red('Failed to list clients:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}

/**
 * Identify test clients
 */
function identifyTestClients(clients) {
  const testClients = clients.filter(client => 
    client.name && client.name.startsWith(TEST_CLIENT_PREFIX)
  );
  
  console.log(chalk.blue(`Found ${testClients.length} test clients out of ${clients.length} total clients`));
  
  return testClients;
}

/**
 * Delete a client
 */
async function deleteClient(clientId, clientName) {
  try {
    console.log(chalk.blue(`Deleting client ID: ${clientId} (${clientName})`));
    
    const cookies = getCookieHeader();
    const response = await axios.delete(`${BASE_URL}/api/admin/clients/${clientId}`, {
      headers: { Cookie: cookies }
    });
    
    console.log(chalk.green(`Successfully deleted client ID: ${clientId} (${clientName})`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to delete client ${clientId} (${clientName}):`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles() {
  console.log(chalk.blue('Cleaning up temporary files...'));
  
  const tmpDir = path.join(__dirname, '../tmp');
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.startsWith('client_') || file.includes('accounts')) {
        try {
          fs.unlinkSync(path.join(tmpDir, file));
          deletedCount++;
        } catch (error) {
          console.error(chalk.yellow(`Warning: Failed to delete file ${file}: ${error.message}`));
        }
      }
    }
    
    console.log(chalk.green(`Deleted ${deletedCount} temporary files`));
  } else {
    console.log(chalk.yellow('No temporary directory found'));
  }
}

/**
 * Prompt for user confirmation
 */
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

/**
 * Main cleanup function
 */
async function cleanupTestData() {
  try {
    console.log(chalk.cyan('\nTEST DATA CLEANUP UTILITY'));
    console.log(chalk.cyan('======================='));
    
    // Step 1: Login to get auth cookie
    await login();
    
    // Step 2: List all clients
    const allClients = await listAllClients();
    
    // Step 3: Identify test clients
    const testClients = identifyTestClients(allClients);
    
    if (testClients.length === 0) {
      console.log(chalk.green('No test clients found. Nothing to clean up.'));
      return;
    }
    
    // Step 4: Display test clients for confirmation
    console.log(chalk.yellow('\nThe following test clients will be deleted:'));
    testClients.forEach((client, index) => {
      console.log(chalk.yellow(`${index + 1}. ID: ${client.id}, Name: ${client.name}`));
    });
    
    // Step 5: Ask for confirmation
    const confirmDelete = await promptUser(chalk.red('\nAre you sure you want to delete these clients? (y/n): '));
    
    if (!confirmDelete) {
      console.log(chalk.blue('Cleanup cancelled by user.'));
      return;
    }
    
    // Step 6: Delete test clients
    console.log(chalk.blue('\nStarting cleanup process...'));
    
    let successCount = 0;
    for (const client of testClients) {
      const success = await deleteClient(client.id, client.name);
      if (success) successCount++;
    }
    
    console.log(chalk.green(`\nSuccessfully deleted ${successCount} of ${testClients.length} test clients`));
    
    // Step 7: Clean up temporary files
    cleanupTempFiles();
    
    console.log(chalk.green('\nCleanup process completed.'));
    
  } catch (error) {
    console.error(chalk.red('\nError during cleanup:'), error.message);
    process.exit(1);
  }
}

// Run the cleanup function
cleanupTestData();