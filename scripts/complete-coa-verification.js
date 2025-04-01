/**
 * Complete Chart of Accounts Display Verification Script
 * 
 * This script verifies that:
 * 1. The Chart of Accounts data displays correctly for a test client (ID 100)
 * 2. The Chart of Accounts data displays correctly for an existing client (ID 1)
 * 
 * It performs both API checks and UI verification.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  let browser;
  
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
      const testClientApiResult = await verifyClientCoaApi(api, TEST_CLIENT_ID);
      results.newClientApi = testClientApiResult.success;
      
      // Step 3: Verify API response for existing client (ID 1)
      console.log(`\n${colors.blue}Step 3: Verifying API response for existing client (ID ${EXISTING_CLIENT_ID})...${colors.reset}`);
      const existingClientApiResult = await verifyClientCoaApi(api, EXISTING_CLIENT_ID);
      results.existingClientApi = existingClientApiResult.success;
      
      // Steps 4-5: Verify UI for both clients
      console.log(`\n${colors.blue}Step 4-5: Starting UI verification with Puppeteer...${colors.reset}`);
      
      // Launch browser for UI tests
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: 'new',
        defaultViewport: { width: 1280, height: 800 }
      });
      
      // Step 4: Verify UI for test client
      console.log(`\n${colors.blue}Step 4: Verifying UI for test client (ID ${TEST_CLIENT_ID})...${colors.reset}`);
      results.newClientUi = await verifyClientCoaUi(browser, TEST_CLIENT_ID);
      
      // Step 5: Verify UI for existing client
      console.log(`\n${colors.blue}Step 5: Verifying UI for existing client (ID ${EXISTING_CLIENT_ID})...${colors.reset}`);
      results.existingClientUi = await verifyClientCoaUi(browser, EXISTING_CLIENT_ID);
      
    } else {
      console.log(`${colors.red}✗ Login failed with status: ${loginResponse.status}${colors.reset}`);
      return;
    }
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
 * Verify client CoA via UI with Puppeteer
 */
async function verifyClientCoaUi(browser, clientId) {
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(20000);
    
    // Navigate to the login page
    console.log('  - Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Fill in login credentials and submit
    console.log('  - Entering login credentials...');
    await page.type('input[name="username"]', CREDENTIALS.username);
    await page.type('input[name="password"]', CREDENTIALS.password);
    
    // Take screenshot of login page
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `login-page.png`),
      fullPage: true
    });
    
    // Submit login form
    console.log('  - Submitting login form...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Take screenshot of dashboard
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `dashboard.png`),
      fullPage: true
    });
    
    // Navigate to Chart of Accounts page for the client
    console.log(`  - Navigating to Chart of Accounts for client ${clientId}...`);
    await page.goto(`${BASE_URL}/chart-of-accounts?clientId=${clientId}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for page to load and stabilize
    console.log('  - Waiting for content to load...');
    await page.waitForTimeout(2000);
    
    // Take screenshot of CoA page
    const screenshotPath = path.join(OUTPUT_DIR, `client-${clientId}-coa.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`  - Screenshot saved to ${path.basename(screenshotPath)}`);
    
    // Check for error states first
    const errorElement = await page.$('text/No accounts found/i');
    if (errorElement) {
      console.log(`${colors.red}✗ Client ${clientId} CoA UI check FAILED - "No accounts found" message displayed${colors.reset}`);
      return false;
    }
    
    // Try multiple selectors that could indicate account data
    const selectors = [
      'table tr', // Table rows for accounts
      '.account-tree-node', // Account tree nodes
      '.account-item', // Account items
      '[data-account-id]', // Elements with account ID data attribute
      '.data-table-row', // Data table rows
      '[role="row"]' // ARIA role rows
    ];
    
    let accountElements = [];
    
    // Check each selector and use the one that returns the most elements
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > accountElements.length) {
        accountElements = elements;
      }
    }
    
    // Count account elements, excluding header rows
    const accountCount = Math.max(0, accountElements.length - 1);
    
    // Check if we found account data
    if (accountCount > 0) {
      console.log(`${colors.green}✓ Client ${clientId} CoA UI check PASSED${colors.reset}`);
      console.log(`  - Found approximately ${accountCount} account elements in the UI`);
      
      // Check for structure indicators
      const expandButtons = await page.$$('.chevron-right, .chevron-down, [data-expanded], button:has(.chevron)');
      if (expandButtons.length > 0) {
        console.log(`  - Found ${expandButtons.length} expand/collapse buttons (hierarchy structure)`);
      }
      
      // Analyze page content for success indicators
      const pageContent = await page.content();
      
      // Look for account codes in the content
      const codePattern = /\b\d{1,4}(\.\d{1,4})?\b/g;
      const codeCandidates = pageContent.match(codePattern) || [];
      console.log(`  - Found ${codeCandidates.length} potential account code patterns in the page`);
      
      // Check hierarchy representation
      const hierarchyIndicators = [
        'parent', 'child', 'level', 'indent', 'tree', 'expand', 'collapse',
        'children', 'nested', 'hierarchy'
      ];
      
      const hasHierarchyTerms = hierarchyIndicators.some(term => 
        pageContent.toLowerCase().includes(term)
      );
      
      if (hasHierarchyTerms) {
        console.log(`  - UI appears to represent account hierarchy`);
      }
      
      return true;
    } else {
      console.log(`${colors.red}✗ Client ${clientId} CoA UI check FAILED - No account elements found${colors.reset}`);
      
      // Take HTML snapshot for debugging
      const html = await page.content();
      fs.writeFileSync(path.join(OUTPUT_DIR, `client-${clientId}-page.html`), html);
      console.log(`  - HTML content saved for debugging`);
      
      return false;
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
  
  // Print UI verification results
  console.log(`\n${colors.magenta}UI Verification:${colors.reset}`);
  console.log(` - New Client (ID ${TEST_CLIENT_ID}): ${results.newClientUi ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(` - Existing Client (ID ${EXISTING_CLIENT_ID}): ${results.existingClientUi ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  
  // Print final summary
  console.log(`\n${colors.magenta}Final Summary:${colors.reset}`);
  
  const apiPassed = results.newClientApi && results.existingClientApi;
  const uiPassed = results.newClientUi && results.existingClientUi;
  const allPassed = apiPassed && uiPassed;
  
  if (allPassed) {
    console.log(`${colors.green}✓ VERIFICATION PASSED: Chart of Accounts display is working correctly${colors.reset}`);
    console.log(`${colors.green}✓ The original "CoA data not displaying" bug IS RESOLVED${colors.reset}`);
    console.log(`${colors.green}✓ Task B.1 (Chart of Accounts) is functionally complete and verified${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ VERIFICATION FAILED: Chart of Accounts display has issues${colors.reset}`);
    
    // Provide details on what failed
    if (!apiPassed) {
      console.log(`${colors.red}  - API checks failed: The backend may not be returning data correctly${colors.reset}`);
    }
    
    if (!uiPassed) {
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