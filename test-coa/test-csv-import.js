/**
 * Test script for testing CSV import functionality
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000';
const CLIENT_ID = 236;
const ENTITY_ID = 375;

// Test 1: New accounts to add
const NEW_ACCOUNTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
9100,Test Revenue Account,REVENUE,sales,FALSE,,TRUE,Account for testing revenue additions,
9110,Test Revenue Subaccount,REVENUE,sales,FALSE,,TRUE,Subaccount for testing hierarchy,9100
9200,Test Expense Account,EXPENSE,operating_expense,FALSE,,TRUE,Account for testing expense additions,`;

// Test 2: Modifications to existing accounts
const MODIFIED_ACCOUNTS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1110,Cash (Modified),asset,Bank,No,,Yes,Modified description for cash account,1100
1120,Accounts Receivable (Modified),asset,Receivable,Yes,accounts_receivable,Yes,Modified description for receivables,1100`;

// Test 3: Mixed operations (add/modify)
const MIXED_OPERATIONS_CSV = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
1110,Cash (Mixed),asset,Bank,No,,Yes,Cash with mixed operations test,1100
9300,New Mixed Operation Account,EXPENSE,operating_expense,FALSE,,TRUE,Testing mixed operations,
9310,Child Mixed Account,EXPENSE,operating_expense,FALSE,,TRUE,Child of mixed operations,9300`;

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

async function importCsv(cookie, filePath) {
  try {
    console.log(`Importing CSV from ${filePath}...`);
    
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
    console.error('CSV import error:', error.message);
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

async function test1_AddNewAccounts(cookie) {
  console.log('\n=== Test 1: Add New Accounts ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test CSV file
  const csvPath = await createCsvFile(NEW_ACCOUNTS_CSV, 'test1-add-accounts.csv');
  
  // Import the CSV
  await importCsv(cookie, csvPath);
  
  // Verify changes
  await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9100', '9110', '9200']
  });
}

async function test2_ModifyExistingAccounts(cookie) {
  console.log('\n=== Test 2: Modify Existing Accounts ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test CSV file
  const csvPath = await createCsvFile(MODIFIED_ACCOUNTS_CSV, 'test2-modify-accounts.csv');
  
  // Import the CSV
  await importCsv(cookie, csvPath);
  
  // Verify changes
  await verifyAccountChanges(cookie, beforeAccounts, {
    modifications: ['1110', '1120']
  });
}

async function test3_MixedOperations(cookie) {
  console.log('\n=== Test 3: Mixed Operations (Add + Modify) ===');
  
  // Get current accounts before import
  const beforeAccounts = await getAccounts(cookie);
  
  // Create test CSV file
  const csvPath = await createCsvFile(MIXED_OPERATIONS_CSV, 'test3-mixed-operations.csv');
  
  // Import the CSV
  await importCsv(cookie, csvPath);
  
  // Verify changes
  await verifyAccountChanges(cookie, beforeAccounts, {
    additions: ['9300', '9310'],
    modifications: ['1110']
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
    
    console.log('\n✅ All CSV import tests completed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
  }
}

runTests();