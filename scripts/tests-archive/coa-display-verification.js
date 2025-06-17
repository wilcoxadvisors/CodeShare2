/**
 * Chart of Accounts Display Verification Script
 * 
 * This script verifies that:
 * 1. The Chart of Accounts data displays correctly for a test client (ID 100)
 * 2. The Chart of Accounts data displays correctly for an existing client (ID 1)
 * 
 * It performs both API checks and UI verification.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { chromium } from 'playwright';

// Configuration
const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};
const TEST_CLIENT_ID = 100; // UI Verification Test Client
const EXISTING_CLIENT_ID = 1;

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
  newClientUi: false,
  existingClientApi: false,
  existingClientUi: false
};

/**
 * Main verification function
 */
async function verifyCoaDisplay() {
  console.log(`${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}CoA Display Verification Starting...${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
  
  let browser;
  let cookies;
  
  try {
    // Step 1: Login via API to get cookies
    console.log(`\n${colors.blue}Step 1: Logging in via API...${colors.reset}`);
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, CREDENTIALS);
    
    if (loginResponse.status === 200) {
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      
      // Extract cookies from response
      cookies = loginResponse.headers['set-cookie'];
      if (!cookies || cookies.length === 0) {
        console.log(`${colors.yellow}⚠ No cookies received, will attempt browser login${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Login failed with status: ${loginResponse.status}${colors.reset}`);
      return;
    }
    
    // Step 2: Verify API response for test client (ID 100)
    console.log(`\n${colors.blue}Step 2: Verifying API response for test client (ID ${TEST_CLIENT_ID})...${colors.reset}`);
    const testClientApiResult = await verifyClientCoaApi(TEST_CLIENT_ID, cookies);
    results.newClientApi = testClientApiResult.success;
    
    // Step 3: Verify API response for existing client (ID 1)
    console.log(`\n${colors.blue}Step 3: Verifying API response for existing client (ID ${EXISTING_CLIENT_ID})...${colors.reset}`);
    const existingClientApiResult = await verifyClientCoaApi(EXISTING_CLIENT_ID, cookies);
    results.existingClientApi = existingClientApiResult.success;
    
    // Steps 4-5: Verify UI for both clients
    console.log(`\n${colors.blue}Step 4-5: Starting UI verification...${colors.reset}`);
    
    // Launch browser for UI tests
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // Verify UI for test client
    console.log(`\n${colors.blue}Verifying UI for test client (ID ${TEST_CLIENT_ID})...${colors.reset}`);
    results.newClientUi = await verifyClientCoaUi(browser, TEST_CLIENT_ID);
    
    // Verify UI for existing client
    console.log(`\n${colors.blue}Verifying UI for existing client (ID ${EXISTING_CLIENT_ID})...${colors.reset}`);
    results.existingClientUi = await verifyClientCoaUi(browser, EXISTING_CLIENT_ID);
    
  } catch (error) {
    console.error(`${colors.red}Error during verification:${colors.reset}`, error.message);
  } finally {
    // Close browser if it was opened
    if (browser) {
      await browser.close();
    }
    
    // Print final results
    printResults();
  }
}

/**
 * Verify client CoA via API
 */
async function verifyClientCoaApi(clientId, cookies) {
  try {
    // Make request to get CoA tree
    const config = cookies ? { headers: { Cookie: cookies } } : {};
    const response = await axios.get(`${BASE_URL}/api/clients/${clientId}/accounts/tree`, config);
    
    if (response.status === 200 && response.data) {
      const accountsData = response.data;
      
      // Check if accounts data exists and has content
      if (accountsData && accountsData.length > 0) {
        console.log(`${colors.green}✓ Client ${clientId} CoA API check PASSED${colors.reset}`);
        console.log(`  - Retrieved ${accountsData.length} top-level accounts`);
        
        // Count total accounts including children
        const totalAccounts = countTotalAccounts(accountsData);
        console.log(`  - Total accounts (including nested): ${totalAccounts}`);
        
        // Verify account structure (accountCode field)
        const hasAccountCode = verifyAccountCodeField(accountsData);
        if (hasAccountCode) {
          console.log(`${colors.green}✓ Accounts have correct accountCode field structure${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Some accounts do not have accountCode field${colors.reset}`);
        }
        
        return { 
          success: true, 
          count: totalAccounts,
          data: accountsData 
        };
      } else {
        console.log(`${colors.red}✗ Client ${clientId} CoA API check FAILED - No accounts returned${colors.reset}`);
        return { success: false };
      }
    } else {
      console.log(`${colors.red}✗ Client ${clientId} CoA API check FAILED - Status: ${response.status}${colors.reset}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`${colors.red}✗ Client ${clientId} CoA API check FAILED - Error: ${error.message}${colors.reset}`);
    return { success: false };
  }
}

/**
 * Verify client CoA via UI
 */
async function verifyClientCoaUi(browser, clientId) {
  const screenshotsDir = path.join(__dirname, 'verification-screenshots');
  
  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  try {
    // Create a fresh page and context for each test
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the login page
    await page.goto(`${BASE_URL}/login`);
    console.log('  - Navigated to login page');
    
    // Fill in login credentials and submit
    await page.fill('input[name="username"]', CREDENTIALS.username);
    await page.fill('input[name="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    console.log('  - Submitted login form');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    console.log('  - Successfully logged in, dashboard loaded');
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'dashboard.png'),
      fullPage: true 
    });
    
    // Navigate to the client's chart of accounts page
    await page.goto(`${BASE_URL}/chart-of-accounts?clientId=${clientId}`);
    console.log(`  - Navigated to Chart of Accounts for client ${clientId}`);
    
    // Wait for account data to load
    try {
      // First wait for the page to stabilize
      await page.waitForLoadState('networkidle');
      
      // Look for table with accounts or account tree
      const tableSelector = 'table';
      const treeSelector = '.account-tree, .data-table';
      
      // Use race to see which one appears first
      await Promise.race([
        page.waitForSelector(tableSelector, { timeout: 5000 }),
        page.waitForSelector(treeSelector, { timeout: 5000 })
      ]);
      
      console.log('  - Account data loaded successfully');
      
      // Take screenshot of the CoA page
      const screenshotPath = path.join(screenshotsDir, `client-${clientId}-coa.png`);
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      console.log(`  - Screenshot saved to ${screenshotPath}`);
      
      // Check if accounts are displayed
      const accountRows = await page.$$('table tr, .account-item, .data-table-row');
      const rowCount = accountRows.length;
      
      // Check for empty state indicators
      const emptyState = await page.$('text="No accounts found" >> visible=true');
      
      if (rowCount > 1 && !emptyState) { // More than header row
        console.log(`${colors.green}✓ Client ${clientId} CoA UI check PASSED${colors.reset}`);
        console.log(`  - Found ${rowCount} account elements in the UI`);
        
        // Verify account code is displayed
        const accountCodeCells = await page.$$('text=/^\\d{1,4}(\\.\\d{1,4})?$/');
        if (accountCodeCells.length > 0) {
          console.log(`  - Account codes are displayed properly (found ${accountCodeCells.length} code cells)`);
        } else {
          console.log(`${colors.yellow}⚠ Account codes may not be displayed correctly${colors.reset}`);
        }
        
        return true;
      } else {
        console.log(`${colors.red}✗ Client ${clientId} CoA UI check FAILED - No account rows found${colors.reset}`);
        console.log(`  - Row count: ${rowCount}, Empty state detected: ${!!emptyState}`);
        return false;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Client ${clientId} CoA UI check FAILED - Error waiting for account data: ${error.message}${colors.reset}`);
      
      // Take screenshot of failed state
      const errorScreenshotPath = path.join(screenshotsDir, `client-${clientId}-coa-error.png`);
      await page.screenshot({ 
        path: errorScreenshotPath,
        fullPage: true 
      });
      console.log(`  - Error screenshot saved to ${errorScreenshotPath}`);
      
      return false;
    } finally {
      await context.close();
    }
  } catch (error) {
    console.log(`${colors.red}✗ Client ${clientId} CoA UI check FAILED - Error: ${error.message}${colors.reset}`);
    return false;
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
 * Verify accounts have accountCode field
 */
function verifyAccountCodeField(accounts) {
  let allValid = true;
  
  function checkRecursive(accts) {
    if (!accts) return;
    for (const acct of accts) {
      if (!acct.accountCode && !acct.code) {
        allValid = false;
        return;
      }
      if (acct.children && acct.children.length > 0) {
        checkRecursive(acct.children);
      }
    }
  }
  
  checkRecursive(accounts);
  return allValid;
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
  
  // Print UI verification results
  console.log(`\n${colors.magenta}UI Verification:${colors.reset}`);
  console.log(` - New Client (ID ${TEST_CLIENT_ID}): ${results.newClientUi ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(` - Existing Client (ID ${EXISTING_CLIENT_ID}): ${results.existingClientUi ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  
  // Print final summary
  console.log(`\n${colors.magenta}Final Summary:${colors.reset}`);
  
  const allPassed = results.newClientApi && results.newClientUi && 
                    results.existingClientApi && results.existingClientUi;
  
  if (allPassed) {
    console.log(`${colors.green}✓ VERIFICATION PASSED: Chart of Accounts display is working correctly${colors.reset}`);
    console.log(`${colors.green}✓ The original "CoA data not displaying" bug IS RESOLVED${colors.reset}`);
    console.log(`${colors.green}✓ Task B.1 (Chart of Accounts) is functionally complete and verified${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ VERIFICATION FAILED: Chart of Accounts display has issues${colors.reset}`);
    
    // Provide details on what failed
    if (!results.newClientApi || !results.existingClientApi) {
      console.log(`${colors.red}  - API checks failed: The backend may not be returning data correctly${colors.reset}`);
    }
    
    if (!results.newClientUi || !results.existingClientUi) {
      console.log(`${colors.red}  - UI checks failed: The frontend may not be displaying data correctly${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.cyan}Note:${colors.reset} The tsc --noEmit check still has unresolved issues/timeouts/JSX errors.`);
  console.log(`These TypeScript issues will be addressed separately as agreed.`);
  
  console.log(`\n${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}Verification Complete${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
}

// Execute verification
verifyCoaDisplay();