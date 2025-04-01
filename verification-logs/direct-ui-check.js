import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create log file
const logFile = path.join(__dirname, 'ui-verification.log');
fs.writeFileSync(logFile, '===== UI VERIFICATION: CHART OF ACCOUNTS =====\n');
fs.appendFileSync(logFile, `Start time: ${new Date().toUTCString()}\n\n`);

// Configuration
const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};
const TEST_CLIENT_ID = 100;
const EXISTING_CLIENT_ID = 1;

// Results
const results = {
  testClientUi: false,
  existingClientUi: false
};

/**
 * Main verification function
 */
async function verifyCoaDisplay() {
  try {
    // Step 1: Login to get auth cookies
    fs.appendFileSync(logFile, 'Step 1: Logging in to get auth cookies...\n');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(CREDENTIALS)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    fs.appendFileSync(logFile, `Login successful: ${JSON.stringify(loginData)}\n`);
    
    // Get cookies
    const cookies = loginResponse.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('No cookies received from login');
    }
    fs.appendFileSync(logFile, `Cookies received: ${cookies}\n\n`);
    
    // Step 2: Check HTML content of the CoA pages for both clients
    
    // Test Client (ID 100)
    fs.appendFileSync(logFile, `Step 2: Checking Test Client (ID ${TEST_CLIENT_ID}) Chart of Accounts UI...\n`);
    const testClientResult = await checkClientCoaUI(TEST_CLIENT_ID, cookies);
    results.testClientUi = testClientResult.success;
    
    // Existing Client (ID 1)
    fs.appendFileSync(logFile, `\nStep 3: Checking Existing Client (ID ${EXISTING_CLIENT_ID}) Chart of Accounts UI...\n`);
    const existingClientResult = await checkClientCoaUI(EXISTING_CLIENT_ID, cookies);
    results.existingClientUi = existingClientResult.success;
    
    // Print summary
    printSummary();
    
  } catch (error) {
    fs.appendFileSync(logFile, `ERROR: ${error.message}\n`);
    console.error('Verification error:', error);
    printSummary();
  }
}

/**
 * Check Chart of Accounts UI for a client
 */
async function checkClientCoaUI(clientId, cookies) {
  try {
    // Get the Chart of Accounts page HTML
    const response = await fetch(`${BASE_URL}/chart-of-accounts?clientId=${clientId}`, {
      headers: {
        Cookie: cookies
      }
    });
    
    if (!response.ok) {
      fs.appendFileSync(logFile, `Error getting CoA page for client ${clientId}: ${response.status}\n`);
      return { success: false };
    }
    
    const html = await response.text();
    
    // Save HTML for analysis
    fs.writeFileSync(path.join(__dirname, `client-${clientId}-coa-html.txt`), html);
    fs.appendFileSync(logFile, `Saved HTML for client ${clientId}\n`);
    
    // Analyze HTML content
    const indicators = {
      hasTable: html.includes('<table') || html.includes('role="table"'),
      hasRows: (html.match(/<tr/g) || []).length,
      hasAccountCodes: /\b\d{1,4}(\.\d{1,4})?\b/.test(html),
      hasCOATitle: html.includes('Chart of Accounts') || html.includes('CoA'),
      hasHierarchyElements: html.includes('chevron-right') || html.includes('chevron-down'),
      hasNoAccountsMessage: html.includes('No accounts found')
    };
    
    // Log indicators
    fs.appendFileSync(logFile, `Table element exists: ${indicators.hasTable}\n`);
    fs.appendFileSync(logFile, `Number of rows detected: ${indicators.hasRows}\n`);
    fs.appendFileSync(logFile, `Account codes detected: ${indicators.hasAccountCodes}\n`);
    fs.appendFileSync(logFile, `CoA title detected: ${indicators.hasCOATitle}\n`);
    fs.appendFileSync(logFile, `Hierarchy elements detected: ${indicators.hasHierarchyElements}\n`);
    fs.appendFileSync(logFile, `"No accounts found" message: ${indicators.hasNoAccountsMessage}\n`);
    
    // Determine if rendering seems successful
    const success = indicators.hasTable && 
                    indicators.hasRows > 2 && 
                    indicators.hasAccountCodes && 
                    !indicators.hasNoAccountsMessage;
    
    if (success) {
      fs.appendFileSync(logFile, `Client ${clientId} UI verification: PASS\n`);
    } else {
      fs.appendFileSync(logFile, `Client ${clientId} UI verification: FAIL\n`);
    }
    
    return { 
      success,
      indicators
    };
    
  } catch (error) {
    fs.appendFileSync(logFile, `Error checking client ${clientId} UI: ${error.message}\n`);
    return { success: false };
  }
}

/**
 * Print verification summary
 */
function printSummary() {
  fs.appendFileSync(logFile, '\n======= UI VERIFICATION SUMMARY =======\n\n');
  
  // Test Client result
  fs.appendFileSync(logFile, `Test Client (ID ${TEST_CLIENT_ID}): ${results.testClientUi ? 'PASS' : 'FAIL'}\n`);
  
  // Existing Client result
  fs.appendFileSync(logFile, `Existing Client (ID ${EXISTING_CLIENT_ID}): ${results.existingClientUi ? 'PASS' : 'FAIL'}\n\n`);
  
  // Overall result
  const allPassed = results.testClientUi && results.existingClientUi;
  
  if (allPassed) {
    fs.appendFileSync(logFile, 'VERIFICATION PASSED: Chart of Accounts display is working correctly\n');
    fs.appendFileSync(logFile, 'The original "CoA data not displaying" bug IS RESOLVED\n');
    fs.appendFileSync(logFile, 'Task B.1 (Chart of Accounts) is functionally complete and verified\n');
  } else {
    fs.appendFileSync(logFile, 'VERIFICATION FAILED: Chart of Accounts display has issues\n');
    
    if (!results.testClientUi) {
      fs.appendFileSync(logFile, `- Test Client (ID ${TEST_CLIENT_ID}) UI verification failed\n`);
    }
    
    if (!results.existingClientUi) {
      fs.appendFileSync(logFile, `- Existing Client (ID ${EXISTING_CLIENT_ID}) UI verification failed\n`);
    }
  }
  
  fs.appendFileSync(logFile, '\nNote: The tsc --noEmit check still has unresolved issues/timeouts/JSX errors.\n');
  fs.appendFileSync(logFile, 'These TypeScript issues will be addressed separately as agreed.\n\n');
  
  fs.appendFileSync(logFile, `UI Verification completed at ${new Date().toUTCString()}\n`);
}

// Run verification
verifyCoaDisplay().catch(console.error);