/**
 * Test Data Cleanup Script
 * 
 * This script safely removes test clients and their data created during testing.
 * It cleans up after the CoA import/export tests to prevent database clutter.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';

// When using ES modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CLIENT_PREFIX = 'IMPORT_TEST_';
const API_BASE = '/api/clients';
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

// Parse command line arguments
const args = parseArgs({
  options: {
    'client-id': {
      type: 'string',
    },
    'all-test': {
      type: 'boolean',
      default: false,
    }
  }
});

/**
 * Log in to get auth cookie
 */
async function login() {
  try {
    const cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    if (cookies) {
      return cookies;
    }

    // If no cookie file exists, attempt to login
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    if (response.headers['set-cookie']) {
      // Save cookies to file for other processes
      fs.writeFileSync(COOKIES_FILE, response.headers['set-cookie'].join(';'));
      return response.headers['set-cookie'].join(';');
    } else {
      throw new Error('No cookies received from login');
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    throw error;
  }
}

/**
 * Get all clients
 */
async function getAllClients() {
  try {
    const cookies = await login();
    const response = await axios.get(`${BASE_URL}${API_BASE}`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(chalk.red('Failed to get clients:'), error.message);
    throw error;
  }
}

/**
 * Delete a client
 */
async function deleteClient(clientId) {
  try {
    const cookies = await login();
    
    // First, delete all accounts for the client to avoid foreign key constraints
    await axios.delete(`${BASE_URL}${API_BASE}/${clientId}/accounts`, {
      headers: {
        Cookie: cookies
      }
    });
    
    // Then delete the client
    await axios.delete(`${BASE_URL}${API_BASE}/${clientId}`, {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log(chalk.green(`Successfully deleted client with ID: ${clientId}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to delete client ${clientId}:`), error.message);
    return false;
  }
}

/**
 * Main cleanup function
 */
async function cleanup() {
  try {
    const clientId = args.values['client-id'];
    const allTest = args.values['all-test'];
    
    if (clientId) {
      // Delete specific client
      console.log(chalk.blue(`Cleaning up test client with ID: ${clientId}`));
      const success = await deleteClient(clientId);
      
      if (success) {
        console.log(chalk.green('Cleanup completed successfully'));
      } else {
        console.log(chalk.yellow('Cleanup completed with errors'));
      }
    } else if (allTest) {
      // Delete all test clients
      console.log(chalk.blue('Cleaning up all test clients...'));
      
      const clients = await getAllClients();
      const testClients = clients.filter(client => client.name.startsWith(TEST_CLIENT_PREFIX));
      
      console.log(chalk.blue(`Found ${testClients.length} test clients to clean up`));
      
      let successCount = 0;
      for (const client of testClients) {
        console.log(chalk.blue(`Cleaning up test client: ${client.name} (ID: ${client.id})`));
        const success = await deleteClient(client.id);
        if (success) successCount++;
      }
      
      console.log(chalk.green(`Cleanup completed: ${successCount}/${testClients.length} clients deleted`));
    } else {
      console.log(chalk.yellow('Please specify --client-id=<id> or --all-test to clean up test data'));
    }
  } catch (error) {
    console.error(chalk.red('Cleanup failed:'), error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanup();