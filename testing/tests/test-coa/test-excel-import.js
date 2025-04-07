/**
 * Test script for testing Excel import functionality
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

async function importExcel(cookie, filePath) {
  try {
    console.log(`Importing Excel from ${filePath}...`);
    
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
    return response.data;
  } catch (error) {
    console.error('Excel import error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

async function verifyAccountChanges(cookie, beforeAccounts, expectedChanges) {
  const afterAccounts = await getAccounts(cookie);
  
  console.log(`\nBefore: ${beforeAccounts.length} accounts, After: ${afterAccounts.length} accounts`);
  
  // Check for new accounts
  for (const expectedAdd of expectedChanges.additions || []) {
    const found = afterAccounts.find(acc => acc.accountCode === expectedAdd);
    if (found) {
      console.log(`✅ Added account found: ${expectedAdd}`);
    } else {
      console.log(`❌ Failed to find added account: ${expectedAdd}`);
    }
  }
  
  // Check for modifications
  for (const expectedMod of expectedChanges.modifications || []) {
    const beforeAccount = beforeAccounts.find(acc => acc.accountCode === expectedMod);
    const afterAccount = afterAccounts.find(acc => acc.accountCode === expectedMod);
    
    if (beforeAccount && afterAccount && beforeAccount.name !== afterAccount.name) {
      console.log(`✅ Account modified: ${expectedMod} (${beforeAccount.name} -> ${afterAccount.name})`);
    } else {
      console.log(`❌ Account not modified as expected: ${expectedMod}`);
    }
  }
  
  return afterAccounts;
}

// Test Excel files content - same as CSV tests for consistency
const NEW_ACCOUNTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
9500,Excel Test Revenue Account,REVENUE,sales,FALSE,,TRUE,Account for testing Excel revenue additions,
9510,Excel Test Revenue Subaccount,REVENUE,sales,FALSE,,TRUE,Subaccount for testing Excel hierarchy,9500
9600,Excel Test Expense Account,EXPENSE,operating_expense,FALSE,,TRUE,Account for testing Excel expense additions,`;

const MODIFIED_ACCOUNTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1130,Inventory (Excel Modified),asset,Inventory,No,,Yes,Modified description for inventory via Excel,1100
1140,Prepaid Expenses (Excel Modified),asset,Other Current Asset,No,,Yes,Modified description for prepaid expenses via Excel,1100`;

const MIXED_OPERATIONS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1150,Short-term Investments (Excel Mixed),asset,Investment,No,,Yes,Investments with Excel mixed operations test,1100
9700,New Excel Mixed Operation Account,EXPENSE,operating_expense,FALSE,,TRUE,Testing Excel mixed operations,
9710,Child Excel Mixed Account,EXPENSE,operating_expense,FALSE,,TRUE,Child of Excel mixed operations,9700`;

async function test1_AddNewAccounts(cookie) {
  console.log('\n=== Test 1: Add New Accounts via Excel ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test Excel file
  const excelPath = await createExcelFile(NEW_ACCOUNTS_CSV, 'test1-add-accounts.xlsx');
  
  // Import the Excel
  await importExcel(cookie, excelPath);
  
  // Verify changes
  await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9500', '9510', '9600']
  });
}

async function test2_ModifyExistingAccounts(cookie) {
  console.log('\n=== Test 2: Modify Existing Accounts via Excel ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test Excel file
  const excelPath = await createExcelFile(MODIFIED_ACCOUNTS_CSV, 'test2-modify-accounts.xlsx');
  
  // Import the Excel
  await importExcel(cookie, excelPath);
  
  // Verify changes
  await verifyAccountChanges(cookie, beforeAccounts, {
    modifications: ['1130', '1140']
  });
}

async function test3_MixedOperations(cookie) {
  console.log('\n=== Test 3: Mixed Operations (Add + Modify) via Excel ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test Excel file
  const excelPath = await createExcelFile(MIXED_OPERATIONS_CSV, 'test3-mixed-operations.xlsx');
  
  // Import the Excel
  await importExcel(cookie, excelPath);
  
  // Verify changes
  await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9700', '9710'],
    modifications: ['1150']
  });
}

async function runTests() {
  try {
    // Login once for all tests
    const sessionCookie = await login();
    
    // Run tests sequentially
    await test1_AddNewAccounts(sessionCookie);
    await test2_ModifyExistingAccounts(sessionCookie);
    await test3_MixedOperations(sessionCookie);
    
    console.log('\n✅ All Excel import tests completed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
  }
}

runTests();