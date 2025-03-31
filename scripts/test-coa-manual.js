/**
 * Simple Manual Test Utility for Chart of Accounts Import/Export
 * 
 * This script creates a test client and seeds it with standard accounts,
 * allowing for manual testing of the CoA functionality.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// When using ES modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CLIENT_PREFIX = 'COA_MANUAL_TEST_';
const API_BASE = '/api/clients';
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

// Test account - should be replaced with proper credentials for your environment
const TEST_USER = {
  username: 'admin',
  password: 'password123'
};

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
    const response = await axios.post(`${BASE_URL}/api/clients`, {
      name: testClientName,
      active: true,
      industry: 'ACCOUNTING'
    }, {
      headers: {
        Cookie: cookies
      }
    });
    
    if (!response.data || !response.data.id) {
      throw new Error(`Failed to create test client. Response: ${JSON.stringify(response.data)}`);
    }
    
    const clientId = response.data.id;
    console.log(chalk.green(`Created test client with ID: ${clientId}`));
    
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
    
    // Create accounts one by one to avoid potential batch issues
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    
    for (const account of firstPassAccounts) {
      try {
        const response = await axios.post(
          `${BASE_URL}${API_BASE}/${clientId}/accounts`,
          { ...account, clientId },
          { headers: { Cookie: cookies } }
        );
        console.log(chalk.green(`Created account: ${account.code} - ${account.name}`));
      } catch (error) {
        console.error(chalk.red(`Failed to create account ${account.code} - ${account.name}:`), error.message);
        if (error.response) {
          console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    console.log(chalk.green(`Created ${firstPassAccounts.length} accounts in first pass`));
    
    // Second pass: Update parent relationships one by one
    const accountsWithParents = standardAccounts.filter(acc => acc.parentCode);
    
    if (accountsWithParents.length > 0) {
      // Get current accounts to get their IDs
      const currentAccountsResponse = await getAccounts(clientId);
      const currentAccounts = Array.isArray(currentAccountsResponse) ? 
                             currentAccountsResponse : 
                             (currentAccountsResponse.items || []);
      
      console.log(chalk.blue(`Processing ${currentAccounts.length} accounts for parent relationships`));
      const accountMap = new Map(currentAccounts.map(acc => [acc.code, acc]));
      
      // For each account with a parent, update it individually
      for (const account of accountsWithParents) {
        try {
          // Find the account and its parent IDs
          const accountToUpdate = accountMap.get(account.code);
          const parentAccount = accountMap.get(account.parentCode);
          
          if (!accountToUpdate) {
            console.error(chalk.red(`Cannot find account with code ${account.code} to update its parent relationship`));
            continue;
          }
          
          if (!parentAccount) {
            console.error(chalk.red(`Cannot find parent account with code ${account.parentCode} for account ${account.code}`));
            continue;
          }
          
          // Update the parent relationship
          const response = await axios.patch(
            `${BASE_URL}${API_BASE}/${clientId}/accounts/${accountToUpdate.id}`,
            { 
              parentId: parentAccount.id
            },
            { headers: { Cookie: cookies } }
          );
          
          console.log(chalk.green(`Updated parent relationship for ${account.code} to parent ${account.parentCode}`));
        } catch (error) {
          console.error(chalk.red(`Failed to update parent relationship for account ${account.code}:`), error.message);
          if (error.response) {
            console.error(chalk.red('Server response:'), JSON.stringify(error.response.data, null, 2));
          }
        }
      }
      
      console.log(chalk.green(`Attempted to update ${accountsWithParents.length} account parent relationships`));
    }
    
    console.log(chalk.green(`Successfully seeded ${standardAccounts.length} accounts for client ID: ${clientId}`));
    return standardAccounts;
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
 * Main function
 */
async function main() {
  try {
    console.log(chalk.blue('===== Chart of Accounts Manual Test Setup =====\n'));
    
    // Login
    await login();
    
    // Create test client
    const testClient = await createTestClient();
    
    // Seed initial accounts
    await seedInitialAccounts(testClient.id);
    
    // Get accounts to verify
    const accountsResponse = await getAccounts(testClient.id);
    const accounts = Array.isArray(accountsResponse) ? 
                    accountsResponse : 
                    (accountsResponse.items || []);
    
    console.log(chalk.green(`\nSuccessfully created test client with ${accounts.length} accounts.`));
    console.log(chalk.blue(`\nTest Client Information:`));
    console.log(chalk.blue(`- Name: ${testClient.name}`));
    console.log(chalk.blue(`- ID: ${testClient.id}`));
    console.log(chalk.blue(`\nYou can now manually test the Chart of Accounts functionality for this client.`));
    console.log(chalk.blue(`1. Navigate to the Chart of Accounts page`));
    console.log(chalk.blue(`2. Select this client in the header or context selector`));
    console.log(chalk.blue(`3. Test export functionality (CSV and Excel)`));
    console.log(chalk.blue(`4. Test import functionality with valid and invalid data`));
    
  } catch (error) {
    console.error(chalk.red('\nSetup encountered an error:'), error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(chalk.red('Unhandled exception:'), error);
  process.exit(1);
});