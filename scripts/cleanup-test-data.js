/**
 * Chart of Accounts Test Data Cleanup Script
 * 
 * This script safely removes test clients and their data created during CoA import/export testing.
 * It identifies test clients by their name prefix and deletes them, ensuring a clean testing environment.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Configuration
const COOKIES_FILE = path.join(process.cwd(), '..', 'cookies.txt');
const BASE_URL = 'http://localhost:5000';
const API_BASE = '/api';
const TEST_CLIENT_PREFIXES = ['COA_TEST_', 'COA_MANUAL_TEST_'];
const TMP_DIR = path.join(process.cwd(), '..', 'tmp');

/**
 * Ensure cookies file exists
 */
function ensureCookiesFile() {
  if (!fs.existsSync(COOKIES_FILE)) {
    console.error(chalk.red(`Cookies file not found at ${COOKIES_FILE}. Please run login first.`));
    process.exit(1);
  }
}

/**
 * Login to get auth cookie
 */
async function login() {
  try {
    console.log(chalk.blue('Logging in as admin...'));
    
    const response = await axios.post(`${BASE_URL}${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    if (response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'].join('; ');
      fs.writeFileSync(COOKIES_FILE, cookies);
      console.log(chalk.green('Login successful - auth cookie saved'));
      return cookies;
    } else {
      throw new Error('No cookies received from login');
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

/**
 * Get all clients
 */
async function getAllClients() {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    console.log(chalk.blue('Fetching all clients...'));
    
    const response = await axios.get(`${BASE_URL}${API_BASE}/clients`, {
      headers: { Cookie: cookies }
    });
    
    console.log(chalk.green(`Retrieved ${response.data.length} clients`));
    return response.data;
  } catch (error) {
    console.error(chalk.red('Failed to get clients:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Delete a client
 */
async function deleteClient(clientId) {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    console.log(chalk.blue(`Deleting client with ID: ${clientId}...`));
    
    const response = await axios.delete(`${BASE_URL}${API_BASE}/clients/${clientId}`, {
      headers: { Cookie: cookies }
    });
    
    console.log(chalk.green(`Successfully deleted client ID: ${clientId}`));
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to delete client ${clientId}:`), error.message);
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
  try {
    console.log(chalk.blue('Cleaning up temporary files...'));
    
    // Create tmp directory if it doesn't exist
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
      console.log(chalk.green(`Created temporary directory at ${TMP_DIR}`));
      return;
    }
    
    // Read all files in the tmp directory
    const files = fs.readdirSync(TMP_DIR);
    let deletedCount = 0;
    
    // Delete all files
    for (const file of files) {
      try {
        const filePath = path.join(TMP_DIR, file);
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        console.error(chalk.red(`Failed to delete file ${file}:`), err.message);
      }
    }
    
    console.log(chalk.green(`Deleted ${deletedCount} temporary files`));
  } catch (error) {
    console.error(chalk.red('Failed to clean up temporary files:'), error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(chalk.blue('===== Chart of Accounts Test Data Cleanup =====\n'));
    
    // Login
    await login();
    
    // Get all clients
    const clientsResponse = await getAllClients();
    const clients = Array.isArray(clientsResponse) ? clientsResponse : (clientsResponse.items || []);
    
    console.log(chalk.blue(`Processing ${clients.length} clients`));
    
    // Filter test clients
    const testClients = clients.filter(client => 
      client && client.name && TEST_CLIENT_PREFIXES.some(prefix => client.name.startsWith(prefix))
    );
    
    console.log(chalk.blue(`Found ${testClients.length} test clients to delete`));
    
    // Delete test clients
    let deletedCount = 0;
    for (const client of testClients) {
      const success = await deleteClient(client.id);
      if (success) deletedCount++;
    }
    
    console.log(chalk.green(`\nSuccessfully deleted ${deletedCount} of ${testClients.length} test clients`));
    
    // Clean up temporary files
    cleanupTempFiles();
    
    console.log(chalk.green('\nCleanup completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('\nCleanup encountered an error:'), error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(chalk.red('Unhandled exception:'), error);
  process.exit(1);
});