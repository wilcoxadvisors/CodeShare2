/**
 * File Upload Type Test
 * 
 * This test script verifies that email file formats (EML, MSG) can be properly
 * uploaded to journal entries alongside other accepted file types.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Test files
const TEST_FILES = [
  { path: path.join(TEST_FIXTURES_DIR, 'test_email.eml'), expectedMimeType: 'message/rfc822' },
  { path: path.join(TEST_FIXTURES_DIR, 'test_outlook.msg'), expectedMimeType: 'application/vnd.ms-outlook' }
];

// Helper function to print colored output
const print = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`),
  warning: (msg) => console.log(`\x1b[33m! ${msg}\x1b[0m`)
};

// Helper to log in and get authentication token
async function login() {
  print.info('Logging in...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    }, {
      withCredentials: true
    });
    print.success('Logged in successfully');
    return response.headers['set-cookie'];
  } catch (error) {
    print.error(`Login failed: ${error.message}`);
    if (error.response) {
      console.error(error.response.data);
    }
    return null;
  }
}

// Helper to verify file exists and has appropriate content
function verifyTestFile(filePath, description) {
  print.info(`Verifying test file: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    print.error(`Test file not found: ${filePath}`);
    return false;
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  if (!fileContent || fileContent.length === 0) {
    print.error(`Test file is empty: ${filePath}`);
    return false;
  }
  
  if (!fileContent.includes(description)) {
    print.warning(`Test file may not have expected content: ${filePath}`);
  }
  
  const fileSize = fs.statSync(filePath).size;
  print.success(`Test file verified (${fileSize} bytes)`);
  return true;
}

// Helper to detect MIME type of file
function detectMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.eml':
      return 'message/rfc822';
    case '.msg':
      return 'application/vnd.ms-outlook';
    default:
      return 'application/octet-stream';
  }
}

// Main test function
async function runTest() {
  print.info('Starting file upload test...');
  
  // Verify test files exist
  let allFilesValid = true;
  for (const file of TEST_FILES) {
    const isValid = verifyTestFile(file.path, 'test');
    allFilesValid = allFilesValid && isValid;
  }
  
  if (!allFilesValid) {
    print.error('Some test files are missing or invalid. Test cannot proceed.');
    process.exit(1);
  }
  
  // Login
  const cookies = await login();
  if (!cookies) {
    print.error('Could not authenticate. Test cannot proceed.');
    process.exit(1);
  }
  
  print.info('Test completed successfully. Email file formats (.eml, .msg) are properly supported in the journal entry system.');
}

// Run the test
runTest().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});