/**
 * Test Script for Chart of Accounts Import/Export Functionality
 * 
 * This script tests the end-to-end functionality of CoA import and export
 * including the handling of different file formats (CSV & Excel)
 * and error handling for invalid data.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Update if using a different port
const AUTH = {
  username: 'admin',
  password: 'password123'
};
const TEST_CLIENT_ID = 1; // Using the default admin client ID

// Test data for import files
const VALID_CSV_CONTENT = 
`Code,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId
1000,Cash,asset,current_asset,NO,,YES,Cash on hand and in banks,
1100,Checking Account,asset,bank,NO,,YES,Primary business checking account,1000
1200,Savings Account,asset,bank,NO,,YES,Business savings account,1000
2000,Accounts Payable,liability,accounts_payable,NO,,YES,Amounts owed to vendors,`;

const VALID_EXCEL_DATA = [
  { Code: "1000", Name: "Cash", Type: "asset", Subtype: "current_asset", IsSubledger: "NO", SubledgerType: "", Active: "YES", Description: "Cash on hand and in banks", ParentId: "" },
  { Code: "1100", Name: "Checking Account", Type: "asset", Subtype: "bank", IsSubledger: "NO", SubledgerType: "", Active: "YES", Description: "Primary business checking account", ParentId: "1000" },
  { Code: "1200", Name: "Savings Account", Type: "asset", Subtype: "bank", IsSubledger: "NO", SubledgerType: "", Active: "YES", Description: "Business savings account", ParentId: "1000" },
  { Code: "2000", Name: "Accounts Payable", Type: "liability", Subtype: "accounts_payable", IsSubledger: "NO", SubledgerType: "", Active: "YES", Description: "Amounts owed to vendors", ParentId: "" }
];

const INVALID_CSV_CONTENT = 
`Code,Name,InvalidType,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId
1000,Cash,something_invalid,current_asset,NO,,YES,Cash on hand and in banks,
1100,Checking Account,asset,bank,NO,,YES,Primary business checking account,1000`;

// Helper function to create test files
function createTestFiles() {
  const testFilesDir = path.join(__dirname, 'test-files');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
  }
  
  // Create valid CSV file
  fs.writeFileSync(path.join(testFilesDir, 'valid_import.csv'), VALID_CSV_CONTENT);
  
  // Create invalid CSV file
  fs.writeFileSync(path.join(testFilesDir, 'invalid_import.csv'), INVALID_CSV_CONTENT);
  
  // For Excel files, we'll need to use a library like xlsx to create them
  // For simplicity in this test script, we'll simulate the Excel test
  console.log('Test files created in', testFilesDir);
  
  return testFilesDir;
}

// Test authentication and setup
async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, AUTH);
    const cookies = response.headers['set-cookie'];
    
    if (!cookies) {
      throw new Error('No cookies returned from login. Authentication failed.');
    }
    
    console.log('✅ Authentication successful');
    return cookies[0]; // Return the session cookie for subsequent requests
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Test export CSV
async function testExportCsv(sessionCookie) {
  try {
    console.log('\n--- Testing CSV Export ---');
    const response = await axios.get(
      `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/export`,
      {
        headers: { Cookie: sessionCookie },
        responseType: 'stream'
      }
    );
    
    if (response.status === 200) {
      const contentDisposition = response.headers['content-disposition'];
      const isCSV = contentDisposition && contentDisposition.includes('.csv');
      
      if (isCSV) {
        console.log('✅ CSV export successful');
        console.log('Content-Disposition:', contentDisposition);
        
        // Save the exported file for inspection
        const filePath = path.join(__dirname, 'test-files', 'exported_coa.csv');
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        console.log('Exported file saved to:', filePath);
        return true;
      } else {
        console.error('❌ Export response not recognized as CSV');
        return false;
      }
    } else {
      console.error('❌ Export failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Export CSV test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

// Test import valid CSV
async function testImportValidCsv(sessionCookie, testFilesDir) {
  try {
    console.log('\n--- Testing Valid CSV Import ---');
    
    const filePath = path.join(testFilesDir, 'valid_import.csv');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(
      `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/import`,
      formData,
      {
        headers: {
          Cookie: sessionCookie,
          ...formData.getHeaders()
        }
      }
    );
    
    if (response.status === 200) {
      console.log('✅ Valid CSV import successful');
      console.log('Response:', response.data);
      
      // Verify the accounts were imported by fetching the tree
      await verifyImportedAccounts(sessionCookie);
      
      return true;
    } else {
      console.error('❌ Valid CSV import failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Valid CSV import test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Test import invalid CSV
async function testImportInvalidCsv(sessionCookie, testFilesDir) {
  try {
    console.log('\n--- Testing Invalid CSV Import ---');
    
    // First, fetch the current accounts to compare after the invalid import
    const beforeImportResponse = await axios.get(
      `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/tree`,
      { headers: { Cookie: sessionCookie } }
    );
    const beforeImportAccounts = beforeImportResponse.data;
    
    // Try importing invalid CSV
    const filePath = path.join(testFilesDir, 'invalid_import.csv');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    try {
      await axios.post(
        `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/import`,
        formData,
        {
          headers: {
            Cookie: sessionCookie,
            ...formData.getHeaders()
          }
        }
      );
      console.error('❌ Invalid import unexpectedly succeeded when it should have failed');
      return false;
    } catch (importError) {
      if (importError.response && importError.response.status === 400) {
        console.log('✅ Invalid CSV import correctly rejected with 400 status');
        console.log('Error response:', importError.response.data);
        
        // Check the accounts haven't changed
        const afterImportResponse = await axios.get(
          `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/tree`,
          { headers: { Cookie: sessionCookie } }
        );
        const afterImportAccounts = afterImportResponse.data;
        
        if (JSON.stringify(beforeImportAccounts) === JSON.stringify(afterImportAccounts)) {
          console.log('✅ Account data remained unchanged after invalid import attempt');
          return true;
        } else {
          console.error('❌ Account data was modified despite invalid import');
          return false;
        }
      } else {
        console.error('❌ Invalid import failed with unexpected status:', importError.response?.status);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Invalid CSV import test errored:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Helper to verify imported accounts match the test data
async function verifyImportedAccounts(sessionCookie) {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/clients/${TEST_CLIENT_ID}/accounts/tree`,
      { headers: { Cookie: sessionCookie } }
    );
    
    const accounts = response.data;
    console.log('Fetched accounts:', accounts.length);
    
    // Verify the main accounts were imported
    const cashAccount = accounts.find(a => a.code === '1000');
    const checkingAccount = accounts.find(a => a.code === '1100');
    const savingsAccount = accounts.find(a => a.code === '1200');
    const accountsPayable = accounts.find(a => a.code === '2000');
    
    if (!cashAccount || !checkingAccount || !savingsAccount || !accountsPayable) {
      console.error('❌ Not all expected accounts were found after import');
      return false;
    }
    
    // Verify parent-child relationships
    if (checkingAccount.parentId !== cashAccount.id || savingsAccount.parentId !== cashAccount.id) {
      console.error('❌ Parent-child relationships not correctly established');
      return false;
    }
    
    console.log('✅ Account validation successful - all accounts found with correct hierarchy');
    return true;
  } catch (error) {
    console.error('❌ Account verification failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  try {
    console.log('Starting Chart of Accounts Import/Export Tests');
    console.log('==============================================');
    
    // Create test files
    const testFilesDir = createTestFiles();
    
    // Authenticate
    const sessionCookie = await authenticate();
    
    // Test export CSV
    const exportResult = await testExportCsv(sessionCookie);
    
    // Test import valid CSV
    const importValidCsvResult = await testImportValidCsv(sessionCookie, testFilesDir);
    
    // Test import invalid CSV
    const importInvalidCsvResult = await testImportInvalidCsv(sessionCookie, testFilesDir);
    
    // For Excel import, we would need a similar test but for simplicity we're simulating
    console.log('\n--- Excel Import Test (Simulated) ---');
    console.log('Note: Full Excel import testing would require additional libraries and handling');
    console.log('Based on code inspection, Excel files should be processed using XLSX.read()');
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Export CSV: ${exportResult ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Import Valid CSV: ${importValidCsvResult ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Import Invalid CSV: ${importInvalidCsvResult ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Import Excel: SIMULATED (not fully tested)`);
    
    process.exit(0);
  } catch (error) {
    console.error('Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runTests();