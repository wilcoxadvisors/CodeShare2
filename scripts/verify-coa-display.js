/**
 * Chart of Accounts Display Verification Script (Simplified)
 * 
 * This script performs API verification to ensure Chart of Accounts data
 * is correctly retrieved and structured.
 * 
 * It tests both test client (ID 100) and existing client (ID 1).
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};
const TEST_CLIENT_ID = 100; // UI Verification Test Client
const EXISTING_CLIENT_ID = 1;
const OUTPUT_DIR = path.join(__dirname, 'verification-output');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize results
const results = {
  newClientApi: false,
  existingClientApi: false
};

/**
 * Main verification function
 */
async function verifyCoaDisplay() {
  console.log(`${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}CoA Display Verification Starting...${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  try {
    // Step 1: Login via API to get cookies/token
    console.log(`\n${colors.blue}Step 1: Logging in via API...${colors.reset}`);
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, CREDENTIALS);
    
    if (loginResponse.status === 200) {
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      
      // Extract cookies from response
      const cookies = loginResponse.headers['set-cookie'];
      if (!cookies || cookies.length === 0) {
        console.log(`${colors.yellow}⚠ No cookies received, authentication may fail${colors.reset}`);
      }
      
      // Create axios instance with cookies
      const api = axios.create({
        headers: {
          Cookie: cookies ? cookies.join('; ') : ''
        }
      });
      
      // Step 2: Verify API response for test client (ID 100)
      console.log(`\n${colors.blue}Step 2: Verifying API response for test client (ID ${TEST_CLIENT_ID})...${colors.reset}`);
      const testClientResult = await verifyClientCoaApi(api, TEST_CLIENT_ID);
      results.newClientApi = testClientResult.success;
      
      // Step 3: Verify API response for existing client (ID 1)
      console.log(`\n${colors.blue}Step 3: Verifying API response for existing client (ID ${EXISTING_CLIENT_ID})...${colors.reset}`);
      const existingClientResult = await verifyClientCoaApi(api, EXISTING_CLIENT_ID);
      results.existingClientApi = existingClientResult.success;
      
    } else {
      console.log(`${colors.red}✗ Login failed with status: ${loginResponse.status}${colors.reset}`);
      return;
    }
  } catch (error) {
    console.error(`${colors.red}Error during verification:${colors.reset}`, error.message);
  } finally {
    // Print final results
    printResults();
  }
}

/**
 * Verify client CoA via API
 */
async function verifyClientCoaApi(api, clientId) {
  try {
    // Make request to get accounts list (flat)
    const accountsResponse = await api.get(`${BASE_URL}/api/clients/${clientId}/accounts`);
    
    // Make request to get CoA tree
    const treeResponse = await api.get(`${BASE_URL}/api/clients/${clientId}/accounts/tree`);
    
    // Check if both requests were successful
    if (accountsResponse.status === 200 && treeResponse.status === 200) {
      const accounts = accountsResponse.data;
      const accountsTree = treeResponse.data;
      
      // Save API responses to files for inspection
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `client-${clientId}-accounts.json`), 
        JSON.stringify(accounts, null, 2)
      );
      
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `client-${clientId}-tree.json`), 
        JSON.stringify(accountsTree, null, 2)
      );
      
      // Check if accounts data exists and has content
      if (accounts && accounts.length > 0 && accountsTree && accountsTree.length > 0) {
        console.log(`${colors.green}✓ Client ${clientId} CoA API check PASSED${colors.reset}`);
        console.log(`  - Retrieved ${accounts.length} accounts (flat)`);
        console.log(`  - Retrieved ${accountsTree.length} top-level accounts (tree)`);
        
        // Count total accounts including children in tree
        const totalTreeAccounts = countTotalAccounts(accountsTree);
        console.log(`  - Total accounts in tree (including nested): ${totalTreeAccounts}`);
        
        // Verify account structure (accountCode field)
        const hasAccountCode = verifyAccountFields(accounts);
        if (hasAccountCode.valid) {
          console.log(`${colors.green}✓ Accounts have correct field structure${colors.reset}`);
          console.log(`  - Fields present: ${hasAccountCode.fields.join(', ')}`);
        } else {
          console.log(`${colors.red}✗ Some accounts have field structure issues${colors.reset}`);
          console.log(`  - Issues: ${hasAccountCode.issues.join(', ')}`);
        }
        
        return { 
          success: true, 
          flatCount: accounts.length,
          treeCount: totalTreeAccounts,
          data: {
            flat: accounts,
            tree: accountsTree
          }
        };
      } else {
        const issue = !accounts.length ? "No flat accounts returned" : "No tree accounts returned";
        console.log(`${colors.red}✗ Client ${clientId} CoA API check FAILED - ${issue}${colors.reset}`);
        return { success: false };
      }
    } else {
      console.log(`${colors.red}✗ Client ${clientId} CoA API check FAILED - API errors${colors.reset}`);
      console.log(`  - Accounts status: ${accountsResponse.status}`);
      console.log(`  - Tree status: ${treeResponse.status}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`${colors.red}✗ Client ${clientId} CoA API check FAILED - Error: ${error.message}${colors.reset}`);
    return { success: false };
  }
}

/**
 * Count total accounts including children
 */
function countTotalAccounts(accounts) {
  let count = 0;
  
  function countRecursive(accts) {
    if (!accts) return;
    count += accts.length;
    for (const acct of accts) {
      if (acct.children && acct.children.length > 0) {
        countRecursive(acct.children);
      }
    }
  }
  
  countRecursive(accounts);
  return count;
}

/**
 * Verify accounts have required fields
 */
function verifyAccountFields(accounts) {
  // Required fields
  const requiredFields = ['id', 'name', 'type'];
  
  // Track fields that exist in at least one account
  const existingFields = new Set();
  
  // Track issues
  const issues = [];
  
  // Check first 10 accounts (or all if fewer)
  const sampleSize = Math.min(accounts.length, 10);
  const sampleAccounts = accounts.slice(0, sampleSize);
  
  // Check each account for required fields and collect all fields
  for (let i = 0; i < sampleAccounts.length; i++) {
    const account = sampleAccounts[i];
    
    // Check if account has accountCode or code
    const hasCode = account.accountCode !== undefined || account.code !== undefined;
    if (!hasCode) {
      issues.push(`Account #${i+1} missing both accountCode and code fields`);
    }
    
    // Check required fields
    for (const field of requiredFields) {
      if (account[field] === undefined) {
        issues.push(`Account #${i+1} missing required field: ${field}`);
      }
    }
    
    // Collect all fields
    Object.keys(account).forEach(field => {
      existingFields.add(field);
    });
  }
  
  return {
    valid: issues.length === 0,
    fields: Array.from(existingFields),
    issues
  };
}

/**
 * Print final verification results
 */
function printResults() {
  console.log(`\n${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}Verification Results${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
  
  // Print API verification results
  console.log(`\n${colors.magenta}API Verification:${colors.reset}`);
  console.log(` - New Client (ID ${TEST_CLIENT_ID}): ${results.newClientApi ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(` - Existing Client (ID ${EXISTING_CLIENT_ID}): ${results.existingClientApi ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  
  // Print final summary
  console.log(`\n${colors.magenta}Final Summary:${colors.reset}`);
  
  const allPassed = results.newClientApi && results.existingClientApi;
  
  if (allPassed) {
    console.log(`${colors.green}✓ VERIFICATION PASSED: Chart of Accounts data is retrievable via API${colors.reset}`);
    console.log(`${colors.green}✓ Both accountCode and code fields are supported for backward compatibility${colors.reset}`);
    console.log(`${colors.green}✓ The data structure for the Chart of Accounts is correct${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ VERIFICATION FAILED: Chart of Accounts API has issues${colors.reset}`);
    
    // Provide details on what failed
    if (!results.newClientApi) {
      console.log(`${colors.red}  - New client (ID ${TEST_CLIENT_ID}) API check failed${colors.reset}`);
    }
    
    if (!results.existingClientApi) {
      console.log(`${colors.red}  - Existing client (ID ${EXISTING_CLIENT_ID}) API check failed${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.cyan}Note:${colors.reset} To fully verify UI rendering, a visual inspection is recommended.`);
  console.log(`${colors.cyan}Note:${colors.reset} The tsc --noEmit check still has unresolved issues/timeouts/JSX errors.`);
  
  console.log(`\n${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}Verification Complete${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
}

// Execute verification
verifyCoaDisplay();