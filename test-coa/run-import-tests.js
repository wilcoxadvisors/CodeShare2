/**
 * Comprehensive test suite for Chart of Accounts import functionality
 * 
 * This script tests:
 * 1. CSV imports (additions, modifications, mixed operations)
 * 2. Excel imports (additions, modifications, mixed operations)
 * 3. Error handling (duplicate codes, invalid parent codes)
 * 
 * The results are logged to the console and also written to a markdown file
 * for easy review.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import xlsx from 'xlsx';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000';
const CLIENT_ID = 236;
const ENTITY_ID = 375;

// Results tracking
const testResults = [];
const startTime = new Date();

// ==================== Test Data ====================

// Test 1: New accounts to add via CSV
const NEW_ACCOUNTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
9100,Test Revenue Account,REVENUE,sales,FALSE,,TRUE,Account for testing revenue additions,
9110,Test Revenue Subaccount,REVENUE,sales,FALSE,,TRUE,Subaccount for testing hierarchy,9100
9200,Test Expense Account,EXPENSE,operating_expense,FALSE,,TRUE,Account for testing expense additions,`;

// Test 2: Modifications to existing accounts via CSV
const MODIFIED_ACCOUNTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1110,Cash (Modified),asset,Bank,No,,Yes,Modified description for cash account,1100
1120,Accounts Receivable (Modified),asset,Receivable,Yes,accounts_receivable,Yes,Modified description for receivables,1100`;

// Test 3: Mixed operations (add/modify) via CSV
const MIXED_OPERATIONS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1110,Cash (Mixed),asset,Bank,No,,Yes,Cash with mixed operations test,1100
9300,New Mixed Operation Account,EXPENSE,operating_expense,FALSE,,TRUE,Testing mixed operations,
9310,Child Mixed Account,EXPENSE,operating_expense,FALSE,,TRUE,Child of mixed operations,9300`;

// Test 4: New accounts to add via Excel
const NEW_ACCOUNTS_EXCEL = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
9500,Excel Test Revenue Account,REVENUE,sales,FALSE,,TRUE,Account for testing Excel revenue additions,
9510,Excel Test Revenue Subaccount,REVENUE,sales,FALSE,,TRUE,Subaccount for testing Excel hierarchy,9500
9600,Excel Test Expense Account,EXPENSE,operating_expense,FALSE,,TRUE,Account for testing Excel expense additions,`;

// Test 5: Modifications to existing accounts via Excel
const MODIFIED_ACCOUNTS_EXCEL = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1130,Inventory (Excel Modified),asset,Inventory,No,,Yes,Modified description for inventory via Excel,1100
1140,Prepaid Expenses (Excel Modified),asset,Other Current Asset,No,,Yes,Modified description for prepaid expenses via Excel,1100`;

// Test 6: Mixed operations (add/modify) via Excel
const MIXED_OPERATIONS_EXCEL = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1150,Short-term Investments (Excel Mixed),asset,Investment,No,,Yes,Investments with Excel mixed operations test,1100
9700,New Excel Mixed Operation Account,EXPENSE,operating_expense,FALSE,,TRUE,Testing Excel mixed operations,
9710,Child Excel Mixed Account,EXPENSE,operating_expense,FALSE,,TRUE,Child of Excel mixed operations,9700`;

// Test 7: Error handling - duplicate account codes
const DUPLICATE_CODES_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
9800,Duplicate Code Test 1,EXPENSE,operating_expense,FALSE,,TRUE,First account with this code,
9800,Duplicate Code Test 2,EXPENSE,operating_expense,FALSE,,TRUE,Second account with same code,`;

// Test 8: Error handling - invalid parent codes
const INVALID_PARENTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
9900,Invalid Parent Test,EXPENSE,operating_expense,FALSE,,TRUE,Account with invalid parent,99999`;

// ==================== Helper Functions ====================

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    // Get session cookie
    const sessionCookie = response.headers['set-cookie'][0];
    console.log('Login successful');
    
    return sessionCookie;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function getAccounts(cookie) {
  try {
    console.log(`Getting current accounts for client ${CLIENT_ID}...`);
    
    const response = await axios.get(`${API_URL}/api/clients/${CLIENT_ID}/accounts`, {
      headers: { Cookie: cookie }
    });
    
    console.log(`Retrieved ${response.data.length} accounts`);
    return response.data;
  } catch (error) {
    console.error('Error getting accounts:', error.message);
    throw error;
  }
}

async function createCsvFile(content, filename) {
  const filePath = path.join(__dirname, 'imports', filename);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Created CSV file: ${filePath}`);
  
  return filePath;
}

async function createExcelFile(data, filename) {
  try {
    const filePath = path.join(__dirname, 'imports', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Parse the headers and rows
    const rows = data.split('\n');
    const headers = rows[0].split(',');
    
    // Create array of objects
    const jsonData = rows.slice(1).map(row => {
      const values = row.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
    
    // Create workbook
    const worksheet = xlsx.utils.json_to_sheet(jsonData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Accounts');
    
    // Write to file
    xlsx.writeFile(workbook, filePath);
    console.log(`Created Excel file: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Error creating Excel file:', error.message);
    throw error;
  }
}

async function importFile(cookie, filePath, expectedSuccess = true) {
  try {
    console.log(`Importing file from ${filePath}...`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(
      `${API_URL}/api/clients/${CLIENT_ID}/accounts/import`,
      formData,
      {
        headers: { 
          Cookie: cookie,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log('Import response:', response.data);
    
    if (expectedSuccess) {
      return { success: true, data: response.data };
    } else {
      console.error('Import succeeded but was expected to fail');
      return { 
        success: false, 
        error: 'Import succeeded but was expected to fail',
        data: response.data
      };
    }
  } catch (error) {
    if (!expectedSuccess) {
      console.log('Expected error received:', error.message);
      return { 
        success: true, 
        expectedError: true,
        error: error.response ? error.response.data : error.message 
      };
    }
    
    console.error('Import error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
}

async function verifyAccountChanges(cookie, beforeAccounts, expectedChanges) {
  const afterAccounts = await getAccounts(cookie);
  
  console.log(`\nBefore: ${beforeAccounts.length} accounts, After: ${afterAccounts.length} accounts`);
  
  const results = {
    success: true,
    additionsFound: [],
    additionsMissing: [],
    modificationsFound: [],
    modificationsMissing: [],
    details: []
  };
  
  // Check for new accounts
  for (const expectedAdd of expectedChanges.additions || []) {
    const found = afterAccounts.find(acc => acc.accountCode === expectedAdd);
    if (found) {
      console.log(`✅ Added account found: ${expectedAdd}`);
      results.additionsFound.push(expectedAdd);
      results.details.push(`✅ Added account found: ${expectedAdd}`);
    } else {
      console.log(`❌ Failed to find added account: ${expectedAdd}`);
      results.additionsMissing.push(expectedAdd);
      results.details.push(`❌ Failed to find added account: ${expectedAdd}`);
      results.success = false;
    }
  }
  
  // Check for modifications
  for (const expectedMod of expectedChanges.modifications || []) {
    const beforeAccount = beforeAccounts.find(acc => acc.accountCode === expectedMod);
    const afterAccount = afterAccounts.find(acc => acc.accountCode === expectedMod);
    
    if (beforeAccount && afterAccount && beforeAccount.name !== afterAccount.name) {
      console.log(`✅ Account modified: ${expectedMod} (${beforeAccount.name} -> ${afterAccount.name})`);
      results.modificationsFound.push(expectedMod);
      results.details.push(`✅ Account modified: ${expectedMod} (${beforeAccount.name} -> ${afterAccount.name})`);
    } else {
      console.log(`❌ Account not modified as expected: ${expectedMod}`);
      results.modificationsMissing.push(expectedMod);
      results.details.push(`❌ Account not modified as expected: ${expectedMod}`);
      results.success = false;
    }
  }
  
  return { accounts: afterAccounts, results };
}

function recordTestResult(testName, success, details) {
  const result = {
    name: testName,
    success,
    details: Array.isArray(details) ? details : [details],
    timestamp: new Date().toISOString()
  };
  
  testResults.push(result);
  
  if (success) {
    console.log(`\n✅ Test "${testName}" PASSED`);
  } else {
    console.log(`\n❌ Test "${testName}" FAILED`);
  }
  
  return result;
}

async function generateTestReport() {
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  
  let report = `# Chart of Accounts Import/Export Test Results\n\n`;
  report += `**Test Date:** ${endTime.toISOString()}\n`;
  report += `**Duration:** ${duration} seconds\n\n`;
  
  // Summary
  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.success).length;
  const failedTests = totalTests - passedTests;
  
  report += `## Summary\n\n`;
  report += `* **Total Tests:** ${totalTests}\n`;
  report += `* **Passed:** ${passedTests}\n`;
  report += `* **Failed:** ${failedTests}\n\n`;
  
  // Detailed Results
  report += `## Detailed Results\n\n`;
  
  testResults.forEach((result, index) => {
    report += `### ${index + 1}. ${result.name}\n\n`;
    report += `**Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    if (result.details && result.details.length > 0) {
      report += `**Details:**\n\n`;
      result.details.forEach(detail => {
        report += `* ${detail}\n`;
      });
    }
    
    report += `\n`;
  });
  
  // Save report
  const reportPath = path.join(__dirname, '..', 'docs', 'coa-import-test-results.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\nTest report generated: ${reportPath}`);
  return reportPath;
}

// ==================== Test Functions ====================

async function test1_AddNewAccountsCsv(cookie) {
  console.log('\n=== Test 1: Add New Accounts via CSV ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test CSV file
  const csvPath = await createCsvFile(NEW_ACCOUNTS_CSV, 'test1-add-accounts.csv');
  
  // Import the CSV
  const importResult = await importFile(cookie, csvPath);
  
  if (!importResult.success) {
    return recordTestResult('Add New Accounts via CSV', false, `Import failed: ${importResult.error}`);
  }
  
  // Verify changes
  const verificationResult = await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9100', '9110', '9200']
  });
  
  return recordTestResult(
    'Add New Accounts via CSV', 
    verificationResult.results.success,
    verificationResult.results.details
  );
}

async function test2_ModifyExistingAccountsCsv(cookie) {
  console.log('\n=== Test 2: Modify Existing Accounts via CSV ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test CSV file
  const csvPath = await createCsvFile(MODIFIED_ACCOUNTS_CSV, 'test2-modify-accounts.csv');
  
  // Import the CSV
  const importResult = await importFile(cookie, csvPath);
  
  if (!importResult.success) {
    return recordTestResult('Modify Existing Accounts via CSV', false, `Import failed: ${importResult.error}`);
  }
  
  // Verify changes
  const verificationResult = await verifyAccountChanges(cookie, beforeAccounts, {
    modifications: ['1110', '1120']
  });
  
  return recordTestResult(
    'Modify Existing Accounts via CSV', 
    verificationResult.results.success,
    verificationResult.results.details
  );
}

async function test3_MixedOperationsCsv(cookie) {
  console.log('\n=== Test 3: Mixed Operations (Add + Modify) via CSV ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test CSV file
  const csvPath = await createCsvFile(MIXED_OPERATIONS_CSV, 'test3-mixed-operations.csv');
  
  // Import the CSV
  const importResult = await importFile(cookie, csvPath);
  
  if (!importResult.success) {
    return recordTestResult('Mixed Operations via CSV', false, `Import failed: ${importResult.error}`);
  }
  
  // Verify changes
  const verificationResult = await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9300', '9310'],
    modifications: ['1110']
  });
  
  return recordTestResult(
    'Mixed Operations via CSV', 
    verificationResult.results.success,
    verificationResult.results.details
  );
}

async function test4_AddNewAccountsExcel(cookie) {
  console.log('\n=== Test 4: Add New Accounts via Excel ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test Excel file
  const excelPath = await createExcelFile(NEW_ACCOUNTS_EXCEL, 'test4-add-accounts.xlsx');
  
  // Import the Excel
  const importResult = await importFile(cookie, excelPath);
  
  if (!importResult.success) {
    return recordTestResult('Add New Accounts via Excel', false, `Import failed: ${importResult.error}`);
  }
  
  // Verify changes
  const verificationResult = await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9500', '9510', '9600']
  });
  
  return recordTestResult(
    'Add New Accounts via Excel', 
    verificationResult.results.success,
    verificationResult.results.details
  );
}

async function test5_ModifyExistingAccountsExcel(cookie) {
  console.log('\n=== Test 5: Modify Existing Accounts via Excel ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test Excel file
  const excelPath = await createExcelFile(MODIFIED_ACCOUNTS_EXCEL, 'test5-modify-accounts.xlsx');
  
  // Import the Excel
  const importResult = await importFile(cookie, excelPath);
  
  if (!importResult.success) {
    return recordTestResult('Modify Existing Accounts via Excel', false, `Import failed: ${importResult.error}`);
  }
  
  // Verify changes
  const verificationResult = await verifyAccountChanges(cookie, beforeAccounts, {
    modifications: ['1130', '1140']
  });
  
  return recordTestResult(
    'Modify Existing Accounts via Excel', 
    verificationResult.results.success,
    verificationResult.results.details
  );
}

async function test6_MixedOperationsExcel(cookie) {
  console.log('\n=== Test 6: Mixed Operations (Add + Modify) via Excel ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test Excel file
  const excelPath = await createExcelFile(MIXED_OPERATIONS_EXCEL, 'test6-mixed-operations.xlsx');
  
  // Import the Excel
  const importResult = await importFile(cookie, excelPath);
  
  if (!importResult.success) {
    return recordTestResult('Mixed Operations via Excel', false, `Import failed: ${importResult.error}`);
  }
  
  // Verify changes
  const verificationResult = await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9700', '9710'],
    modifications: ['1150']
  });
  
  return recordTestResult(
    'Mixed Operations via Excel', 
    verificationResult.results.success,
    verificationResult.results.details
  );
}

async function test7_DuplicateAccountCodes(cookie) {
  console.log('\n=== Test 7: Error Handling - Duplicate Account Codes ===');
  
  // Create test CSV file
  const csvPath = await createCsvFile(DUPLICATE_CODES_CSV, 'test7-duplicate-codes.csv');
  
  // Import the CSV - we expect this to fail
  const importResult = await importFile(cookie, csvPath, false);
  
  // This test passes if import fails as expected
  const success = importResult.success && importResult.expectedError;
  const details = success 
    ? `Successfully detected duplicate account codes error: ${JSON.stringify(importResult.error)}`
    : `Failed to detect duplicate account codes`;
  
  return recordTestResult('Error Handling - Duplicate Account Codes', success, details);
}

async function test8_InvalidParentCodes(cookie) {
  console.log('\n=== Test 8: Error Handling - Invalid Parent Codes ===');
  
  // Create test CSV file
  const csvPath = await createCsvFile(INVALID_PARENTS_CSV, 'test8-invalid-parents.csv');
  
  // Import the CSV - we expect this to fail
  const importResult = await importFile(cookie, csvPath, false);
  
  // This test passes if import fails as expected
  const success = importResult.success && importResult.expectedError;
  const details = success 
    ? `Successfully detected invalid parent code error: ${JSON.stringify(importResult.error)}`
    : `Failed to detect invalid parent code`;
  
  return recordTestResult('Error Handling - Invalid Parent Codes', success, details);
}

// ==================== Main Function ====================

async function runAllTests() {
  try {
    console.log('\n===============================================');
    console.log('Starting Chart of Accounts Import/Export Tests');
    console.log('===============================================\n');
    
    // Login once for all tests
    const sessionCookie = await login();
    
    // Run tests sequentially
    await test1_AddNewAccountsCsv(sessionCookie);
    await test2_ModifyExistingAccountsCsv(sessionCookie);
    await test3_MixedOperationsCsv(sessionCookie);
    await test4_AddNewAccountsExcel(sessionCookie);
    await test5_ModifyExistingAccountsExcel(sessionCookie);
    await test6_MixedOperationsExcel(sessionCookie);
    await test7_DuplicateAccountCodes(sessionCookie);
    await test8_InvalidParentCodes(sessionCookie);
    
    // Generate test report
    const reportPath = await generateTestReport();
    
    console.log('\n===============================================');
    console.log('All Chart of Accounts Import/Export Tests Completed');
    console.log('===============================================\n');
    
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    
    if (failedTests > 0) {
      console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    }
    
    console.log(`\nSee detailed report at: ${reportPath}`);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

runAllTests();