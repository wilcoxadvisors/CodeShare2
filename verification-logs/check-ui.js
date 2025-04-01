/**
 * Chart of Accounts UI Verification Script
 * 
 * This script verifies the Chart of Accounts UI for both a test client (ID 100)
 * and an existing client (ID 1) to confirm the data displays correctly.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Log file
const logFile = path.join(outputDir, 'ui-verification.log');
fs.writeFileSync(logFile, '===== UI VERIFICATION: CHART OF ACCOUNTS =====\n');
fs.appendFileSync(logFile, `Start time: ${new Date().toUTCString()}\n\n`);

// Configuration
const baseUrl = 'http://localhost:5000';
const credentials = {
  username: 'admin',
  password: 'password123'
};
const testClientId = 100; // UI Verification Test Client
const existingClientId = 1;

// Test results
const results = {
  testClientUi: false,
  existingClientUi: false
};

/**
 * Main verification function
 */
async function verifyCoaDisplay() {
  let browser;
  
  try {
    // Launch browser
    fs.appendFileSync(logFile, 'Step 1: Launching browser...\n');
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 }
    });
    fs.appendFileSync(logFile, 'Browser launched successfully\n\n');
    
    // Login
    fs.appendFileSync(logFile, 'Step 2: Logging in...\n');
    const loginPage = await browser.newPage();
    await loginPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    
    // Take screenshot of login page
    await loginPage.screenshot({ path: path.join(outputDir, 'login-page.png') });
    fs.appendFileSync(logFile, 'Login page screenshot saved\n');
    
    // Fill credentials and submit
    await loginPage.type('input[name="username"]', credentials.username);
    await loginPage.type('input[name="password"]', credentials.password);
    
    // Submit and wait for navigation
    fs.appendFileSync(logFile, 'Submitting login credentials...\n');
    await Promise.all([
      loginPage.click('button[type="submit"]'),
      loginPage.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Take screenshot of dashboard
    await loginPage.screenshot({ path: path.join(outputDir, 'dashboard.png') });
    fs.appendFileSync(logFile, 'Dashboard screenshot saved\n\n');
    
    // Test Client (ID 100) verification
    fs.appendFileSync(logFile, `Step 3: Verifying Test Client (ID ${testClientId}) Chart of Accounts UI...\n`);
    results.testClientUi = await verifyClientCoaUi(browser, testClientId);
    
    // Existing Client (ID 1) verification
    fs.appendFileSync(logFile, `\nStep 4: Verifying Existing Client (ID ${existingClientId}) Chart of Accounts UI...\n`);
    results.existingClientUi = await verifyClientCoaUi(browser, existingClientId);
    
  } catch (error) {
    fs.appendFileSync(logFile, `ERROR: ${error.message}\n`);
    console.error('Verification error:', error);
  } finally {
    // Print summary
    printSummary();
    
    // Close browser
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Verify client CoA UI
 */
async function verifyClientCoaUi(browser, clientId) {
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(20000);
    
    // Navigate to CoA page for client
    fs.appendFileSync(logFile, `Navigating to Chart of Accounts for client ${clientId}...\n`);
    await page.goto(`${baseUrl}/chart-of-accounts?clientId=${clientId}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for any client selection UI to stabilize
    await page.waitForTimeout(3000);
    
    // Take screenshot of the CoA page
    const screenshotPath = path.join(outputDir, `client-${clientId}-coa-ui.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.appendFileSync(logFile, `Chart of Accounts page screenshot saved to ${path.basename(screenshotPath)}\n`);
    
    // Check for content elements
    fs.appendFileSync(logFile, 'Checking for account data in the UI...\n');
    
    // Check for table or tree elements
    const tableExists = await page.evaluate(() => {
      return !!document.querySelector('table') || !!document.querySelector('[role="table"]');
    });
    
    // Check for account rows
    const accountRowsCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr, [role="row"], .account-item, .account-tree-node, [data-account-id]');
      return rows.length;
    });
    
    // Check for account code display
    const accountCodesExist = await page.evaluate(() => {
      // Look for elements containing account codes (numbers with possible decimal points)
      const codePattern = /^\d{1,4}(\.\d{1,4})?$/;
      const textNodes = Array.from(document.querySelectorAll('td, th, div, span'))
        .filter(el => el.textContent.trim().match(codePattern));
      return textNodes.length > 0;
    });
    
    // Check for hierarchy elements (expand/collapse buttons)
    const hierarchyElementsExist = await page.evaluate(() => {
      return !!document.querySelector('.chevron-right, .chevron-down, [data-expanded], button:has(svg)');
    });
    
    // Check if page contains "No accounts found" message
    const noAccountsMessage = await page.evaluate(() => {
      return document.body.textContent.includes('No accounts found');
    });
    
    // Log results
    fs.appendFileSync(logFile, `Table/tree UI exists: ${tableExists}\n`);
    fs.appendFileSync(logFile, `Account elements found: ${accountRowsCount}\n`);
    fs.appendFileSync(logFile, `Account codes displayed: ${accountCodesExist}\n`);
    fs.appendFileSync(logFile, `Hierarchy elements exist: ${hierarchyElementsExist}\n`);
    fs.appendFileSync(logFile, `"No accounts found" message: ${noAccountsMessage}\n`);
    
    // Determine overall result
    const passed = tableExists && accountRowsCount > 1 && accountCodesExist && !noAccountsMessage;
    
    if (passed) {
      fs.appendFileSync(logFile, `Client ${clientId} UI verification: PASS\n`);
    } else {
      fs.appendFileSync(logFile, `Client ${clientId} UI verification: FAIL\n`);
    }
    
    // Save HTML content for debugging
    const html = await page.content();
    fs.writeFileSync(path.join(outputDir, `client-${clientId}-coa-html.txt`), html);
    
    // Close page
    await page.close();
    
    return passed;
  } catch (error) {
    fs.appendFileSync(logFile, `Error verifying client ${clientId} UI: ${error.message}\n`);
    return false;
  }
}

/**
 * Print verification summary
 */
function printSummary() {
  fs.appendFileSync(logFile, '\n======= UI VERIFICATION SUMMARY =======\n\n');
  
  // Test Client result
  fs.appendFileSync(logFile, `Test Client (ID ${testClientId}): ${results.testClientUi ? 'PASS' : 'FAIL'}\n`);
  
  // Existing Client result
  fs.appendFileSync(logFile, `Existing Client (ID ${existingClientId}): ${results.existingClientUi ? 'PASS' : 'FAIL'}\n\n`);
  
  // Overall result
  const allPassed = results.testClientUi && results.existingClientUi;
  
  if (allPassed) {
    fs.appendFileSync(logFile, 'VERIFICATION PASSED: Chart of Accounts display is working correctly\n');
    fs.appendFileSync(logFile, 'The original "CoA data not displaying" bug IS RESOLVED\n');
    fs.appendFileSync(logFile, 'Task B.1 (Chart of Accounts) is functionally complete and verified\n');
  } else {
    fs.appendFileSync(logFile, 'VERIFICATION FAILED: Chart of Accounts display has issues\n');
    
    if (!results.testClientUi) {
      fs.appendFileSync(logFile, `- Test Client (ID ${testClientId}) UI verification failed\n`);
    }
    
    if (!results.existingClientUi) {
      fs.appendFileSync(logFile, `- Existing Client (ID ${existingClientId}) UI verification failed\n`);
    }
  }
  
  fs.appendFileSync(logFile, '\nNote: The tsc --noEmit check still has unresolved issues/timeouts/JSX errors.\n');
  fs.appendFileSync(logFile, 'These TypeScript issues will be addressed separately as agreed.\n\n');
  
  fs.appendFileSync(logFile, `UI Verification completed at ${new Date().toUTCString()}\n`);
}

// Run verification
verifyCoaDisplay().catch(console.error);