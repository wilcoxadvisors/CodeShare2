/**
 * Chart of Accounts Test Data Cleanup Script
 * 
 * This script safely removes test clients and their associated data
 * created during CoA import/export testing.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Change as needed
const COOKIES_FILE = path.join(__dirname, '../curl_cookies.txt');
const TEST_CLIENT_PREFIX = 'COA_TEST_';
const API_ADMIN_BASE = '/api/admin/clients';

// Statistics for reporting
const stats = {
  foundClients: 0,
  deletedClients: 0,
  failedClients: 0,
  deletedFiles: 0
};

/**
 * Authenticate and get session cookies
 */
async function authenticate() {
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
 * Find all test clients
 */
async function findTestClients(cookies) {
  try {
    console.log(chalk.blue('Searching for test clients...'));
    
    const response = await axios.get(`${BASE_URL}${API_ADMIN_BASE}`, {
      headers: { Cookie: cookies }
    });
    
    // Handle nested response format
    let clients = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      clients = response.data.data;
    }
    
    // Filter clients with test prefix
    const testClients = clients.filter(client => 
      client.name && client.name.startsWith(TEST_CLIENT_PREFIX)
    );
    
    stats.foundClients = testClients.length;
    console.log(chalk.green(`Found ${testClients.length} test clients`));
    
    return testClients;
  } catch (error) {
    console.error(chalk.red('Failed to find test clients:'), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}

/**
 * Delete a test client and its data
 */
async function deleteTestClient(client, cookies) {
  try {
    console.log(chalk.blue(`Deleting test client: ${client.name} (ID: ${client.id})...`));
    
    // Use the admin API endpoint for deleting clients
    const response = await axios.delete(`${BASE_URL}${API_ADMIN_BASE}/${client.id}`, {
      headers: { Cookie: cookies }
    });
    
    // Handle nested response format
    let result = response.data;
    if (response.data && response.data.status === 'success' && response.data.data) {
      result = response.data.data;
    }
    
    console.log(chalk.green(`Successfully deleted client ${client.name} (ID: ${client.id})`));
    stats.deletedClients++;
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to delete test client ${client.name} (ID: ${client.id}):`), error.message);
    if (error.response) {
      console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
    }
    stats.failedClients++;
    return false;
  }
}

/**
 * Clean up temporary files in the tmp directory
 */
function cleanupTempFiles() {
  try {
    console.log(chalk.blue('Cleaning up temporary files...'));
    
    const tempDir = path.join(__dirname, '../tmp/coa-test');
    
    // Check if temp directory exists
    if (!fs.existsSync(tempDir)) {
      console.log(chalk.yellow('Temporary directory does not exist, nothing to clean up'));
      return;
    }
    
    // Read and delete each file
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
      stats.deletedFiles++;
    }
    
    console.log(chalk.green(`Deleted ${stats.deletedFiles} temporary files`));
  } catch (error) {
    console.error(chalk.red('Failed to clean up temporary files:'), error.message);
  }
}

/**
 * Main function to run the cleanup
 */
async function runCleanup() {
  console.log(chalk.bold.green('CHART OF ACCOUNTS TEST DATA CLEANUP'));
  console.log(chalk.yellow('This script will remove all test clients and associated data created during testing.'));
  console.log(chalk.yellow('Test clients are identified by names starting with:', TEST_CLIENT_PREFIX));
  
  try {
    // Authenticate
    const cookies = await authenticate();
    
    // Find test clients
    const testClients = await findTestClients(cookies);
    
    if (testClients.length === 0) {
      console.log(chalk.yellow('No test clients found, nothing to clean up'));
    } else {
      // Delete test clients
      console.log(chalk.blue(`Proceeding to delete ${testClients.length} test clients...`));
      
      for (const client of testClients) {
        await deleteTestClient(client, cookies);
      }
    }
    
    // Clean up temp files
    cleanupTempFiles();
    
    // Print summary
    console.log(chalk.bold.green('\nCLEANUP SUMMARY:'));
    console.log(chalk.green(`Found test clients: ${stats.foundClients}`));
    console.log(chalk.green(`Successfully deleted clients: ${stats.deletedClients}`));
    console.log(chalk.yellow(`Failed to delete clients: ${stats.failedClients}`));
    console.log(chalk.green(`Deleted temporary files: ${stats.deletedFiles}`));
    
    console.log(chalk.bold.green('\nCleanup completed!'));
  } catch (error) {
    console.error(chalk.red('Cleanup script failed:'), error.message);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();