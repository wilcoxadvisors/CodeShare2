/**
 * Login Script to Create Auth Cookie
 * 
 * This script logs in with the admin credentials and saves
 * the auth cookies for use by other scripts.
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
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

// Admin credentials
const adminCredentials = {
  username: 'admin',
  password: 'password123'
};

/**
 * Login and save cookie
 */
async function login() {
  try {
    console.log(chalk.blue('Logging in as admin...'));
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, adminCredentials, {
      withCredentials: true
    });
    
    if (response.headers['set-cookie']) {
      // Save cookies to file for other processes
      fs.writeFileSync(COOKIES_FILE, response.headers['set-cookie'].join(';'));
      console.log(chalk.green('Login successful. Auth cookie saved.'));
      return true;
    } else {
      console.error(chalk.red('No cookies received from login'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    
    if (error.response) {
      console.error(chalk.red('Server response:'), error.response.data);
    }
    
    return false;
  }
}

// Run the login process
login().then(success => {
  if (!success) {
    process.exit(1);
  }
});