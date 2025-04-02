/**
 * Chart of Accounts Display Verification Script
 * 
 * This script verifies that:
 * 1. The Chart of Accounts data displays correctly for a test client (ID 100)
 * 2. The Chart of Accounts data displays correctly for an existing client (ID 1)
 * 
 * It performs API checks to verify the accountCode field is present.
 */
import fetch from 'node-fetch';
import fs from 'fs';

// Variables to track verification results
const results = {
  clientsChecked: 0,
  apiChecksPassedCount: 0,
  apiChecksFailed: [],
  totalAccountsFound: 0,
  accountsWithAccountCode: 0,
  accountsWithoutAccountCode: 0,
  accountCodesFound: []
};

/**
 * Main verification function
 */
async function verifyCoaDisplay() {
  console.log('Starting Chart of Accounts Display Verification...');
  
  try {
    // Get cookies from file for authentication
    const cookies = getCookieHeader();
    
    // Check API for client 1 (existing client)
    console.log('\n--- Checking Existing Client (ID: 1) ---');
    await verifyClientCoaApi(1, cookies);
    
    // Check API for client 100 (test client)
    console.log('\n--- Checking Test Client (ID: 100) ---');
    await verifyClientCoaApi(100, cookies);
    
    // Print final results
    printResults();
    
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    const cookiesContent = fs.readFileSync('cookies.txt', 'utf8');
    return cookiesContent.trim();
  } catch (error) {
    console.error('Failed to read cookies.txt file:', error);
    throw new Error('Authentication required: Run scripts/login.js first');
  }
}

/**
 * Verify client CoA via API
 */
async function verifyClientCoaApi(clientId, cookies) {
  console.log(`\nVerifying client ${clientId} Chart of Accounts via API...`);
  
  try {
    // Make API request to get accounts
    const response = await fetch(`http://localhost:5000/api/clients/${clientId}/accounts`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      results.apiChecksFailed.push(`Client ${clientId}: ${response.status} ${response.statusText}`);
      return;
    }
    
    const accounts = await response.json();
    
    // Check if there are any accounts
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      console.error(`No accounts found for client ${clientId}`);
      results.apiChecksFailed.push(`Client ${clientId}: No accounts found`);
      return;
    }
    
    console.log(`Found ${accounts.length} accounts for client ${clientId}`);
    
    // Count total accounts including children
    const totalAccounts = countTotalAccounts(accounts);
    console.log(`Total accounts including nested: ${totalAccounts}`);
    
    // Verify accountCode field exists
    const { hasAccountCodeField, accountsWithField } = verifyAccountCodeField(accounts);
    console.log(`Accounts with accountCode field: ${accountsWithField}/${totalAccounts}`);
    
    if (hasAccountCodeField) {
      console.log(`✓ All accounts have accountCode field for client ${clientId}`);
      results.apiChecksPassedCount++;
    } else {
      console.error(`✗ Some accounts are missing accountCode field for client ${clientId}`);
      results.apiChecksFailed.push(`Client ${clientId}: Missing accountCode field on some accounts`);
    }
    
    // Update results
    results.clientsChecked++;
    results.totalAccountsFound += totalAccounts;
    results.accountsWithAccountCode += accountsWithField;
    results.accountsWithoutAccountCode += (totalAccounts - accountsWithField);
    
  } catch (error) {
    console.error(`API verification failed for client ${clientId}:`, error);
    results.apiChecksFailed.push(`Client ${clientId}: ${error.message}`);
  }
}

/**
 * Count total accounts including children
 */
function countTotalAccounts(accounts) {
  return countRecursive(accounts);
  
  function countRecursive(accts) {
    if (!accts || !Array.isArray(accts)) return 0;
    
    let count = accts.length;
    for (const acct of accts) {
      if (acct.children && Array.isArray(acct.children)) {
        count += countRecursive(acct.children);
      }
    }
    return count;
  }
}

/**
 * Verify accounts have accountCode field
 */
function verifyAccountCodeField(accounts) {
  let countWithField = 0;
  let countTotal = 0;
  
  const result = checkRecursive(accounts);
  return { 
    hasAccountCodeField: (countWithField === countTotal), 
    accountsWithField: countWithField,
    totalAccounts: countTotal
  };
  
  function checkRecursive(accts) {
    if (!accts || !Array.isArray(accts)) return true;
    
    let allHaveField = true;
    
    for (const acct of accts) {
      countTotal++;
      
      if (acct.accountCode !== undefined) {
        countWithField++;
        // Add to the list of codes found (up to 10 for display)
        if (results.accountCodesFound.length < 10) {
          results.accountCodesFound.push(acct.accountCode);
        }
      } else {
        allHaveField = false;
      }
      
      if (acct.children && Array.isArray(acct.children)) {
        const childrenHaveField = checkRecursive(acct.children);
        if (!childrenHaveField) {
          allHaveField = false;
        }
      }
    }
    
    return allHaveField;
  }
}

/**
 * Print final verification results
 */
function printResults() {
  console.log('\n===========================================');
  console.log('Chart of Accounts Display Verification Results');
  console.log('===========================================');
  console.log(`Clients checked: ${results.clientsChecked}`);
  console.log(`API checks passed: ${results.apiChecksPassedCount}/${results.clientsChecked}`);
  console.log(`Total accounts found: ${results.totalAccountsFound}`);
  console.log(`Accounts with accountCode field: ${results.accountsWithAccountCode}/${results.totalAccountsFound} (${Math.round(results.accountsWithAccountCode/results.totalAccountsFound*100)}%)`);
  
  if (results.accountCodesFound.length > 0) {
    console.log(`\nSample accountCode values found: ${results.accountCodesFound.join(', ')}`);
  }
  
  if (results.apiChecksFailed.length > 0) {
    console.log('\nFailed API checks:');
    results.apiChecksFailed.forEach(failure => console.log(`- ${failure}`));
  }
  
  console.log('\nVerification ', results.apiChecksFailed.length === 0 ? 'PASSED ✓' : 'FAILED ✗');
  console.log('===========================================');
  
  // Exit with appropriate code
  process.exit(results.apiChecksFailed.length === 0 ? 0 : 1);
}

// Run the verification
verifyCoaDisplay();