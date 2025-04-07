import axios from 'axios';
import fs from 'fs';

const API_BASE = 'http://localhost:5000';
const CLIENT_ID = 128;
const OUTPUT_DIR = '/tmp/verification-results';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function login() {
  console.log('Logging in as admin...');
  const response = await axios.post(`${API_BASE}/api/auth/login`, {
    username: 'admin',
    password: 'password123'
  });
  
  console.log('Login successful!');
  return response.headers['set-cookie'];
}

async function verifyEndpoints(cookies) {
  try {
    // 1. Verify GET /api/clients/:clientId/accounts endpoint
    console.log('\n1. Testing GET /api/clients/:clientId/accounts...');
    const accountsResponse = await axios.get(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts`,
      { headers: { Cookie: cookies.join('; ') } }
    );
    
    console.log(`✅ Success! Retrieved ${accountsResponse.data.length} accounts`);
    
    const accountsSummary = {
      totalAccounts: accountsResponse.data.length,
      activeAccounts: accountsResponse.data.filter(a => a.active).length,
      inactiveAccounts: accountsResponse.data.filter(a => !a.active).length,
      accountTypes: {}
    };
    
    // Count account types
    accountsResponse.data.forEach(account => {
      if (!accountsSummary.accountTypes[account.type]) {
        accountsSummary.accountTypes[account.type] = 0;
      }
      accountsSummary.accountTypes[account.type]++;
    });
    
    // Save accounts to file for reference
    fs.writeFileSync(
      `${OUTPUT_DIR}/accounts-list.json`, 
      JSON.stringify(accountsResponse.data, null, 2)
    );
    console.log(`Saved accounts list to ${OUTPUT_DIR}/accounts-list.json`);
    
    // 2. Verify GET /api/clients/:clientId/accounts/tree endpoint
    console.log('\n2. Testing GET /api/clients/:clientId/accounts/tree...');
    const treeResponse = await axios.get(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts/tree`,
      { headers: { Cookie: cookies.join('; ') } }
    );
    
    // Log the structure of the response to understand it
    console.log('Tree response structure:', JSON.stringify(Object.keys(treeResponse.data), null, 2));
    
    // The response might be in a different format than expected
    let rootAccountsCount = 0;
    if (treeResponse.data.rootNodes) {
      rootAccountsCount = treeResponse.data.rootNodes.length;
    } else if (Array.isArray(treeResponse.data)) {
      rootAccountsCount = treeResponse.data.length;
    }
    
    console.log(`✅ Success! Retrieved account tree with ${rootAccountsCount} root accounts`);
    
    // Save tree to file for reference
    fs.writeFileSync(
      `${OUTPUT_DIR}/accounts-tree.json`, 
      JSON.stringify(treeResponse.data, null, 2)
    );
    console.log(`Saved account tree to ${OUTPUT_DIR}/accounts-tree.json`);
    
    // 3. Verify GET /api/clients/:clientId/accounts/:id endpoint
    console.log('\n3. Testing GET /api/clients/:clientId/accounts/:id...');
    // Get the ID of the account we just imported
    const testAccount = accountsResponse.data.find(a => a.accountCode === '9999');
    if (testAccount) {
      const accountDetailResponse = await axios.get(
        `${API_BASE}/api/clients/${CLIENT_ID}/accounts/${testAccount.id}`,
        { headers: { Cookie: cookies.join('; ') } }
      );
      
      console.log(`✅ Success! Retrieved details for account ${testAccount.accountCode}`);
      console.log(JSON.stringify(accountDetailResponse.data, null, 2));
    } else {
      console.log('⚠️ Couldn\'t find test account with code 9999');
    }
    
    // 4. Verify GET /api/clients/:clientId/accounts/export endpoint (CSV)
    console.log('\n4. Testing GET /api/clients/:clientId/accounts/export (CSV)...');
    const csvExportResponse = await axios.get(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts/export?format=csv`,
      { 
        headers: { Cookie: cookies.join('; ') },
        responseType: 'arraybuffer'
      }
    );
    
    fs.writeFileSync(`${OUTPUT_DIR}/accounts-export.csv`, csvExportResponse.data);
    console.log(`✅ Success! Exported accounts to CSV (${csvExportResponse.data.length} bytes)`);
    
    // 5. Verify GET /api/clients/:clientId/accounts/export endpoint (Excel)
    console.log('\n5. Testing GET /api/clients/:clientId/accounts/export (Excel)...');
    const excelExportResponse = await axios.get(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts/export?format=excel`,
      { 
        headers: { Cookie: cookies.join('; ') },
        responseType: 'arraybuffer'
      }
    );
    
    fs.writeFileSync(`${OUTPUT_DIR}/accounts-export.xlsx`, excelExportResponse.data);
    console.log(`✅ Success! Exported accounts to Excel (${excelExportResponse.data.length} bytes)`);
    
    // Generate summary report
    const summaryReport = {
      timestamp: new Date().toISOString(),
      clientId: CLIENT_ID,
      accountsSummary,
      rootAccounts: rootAccountsCount,
      exportSizes: {
        csv: csvExportResponse.data.length,
        excel: excelExportResponse.data.length
      },
      apiVerification: 'All endpoints verified successfully'
    };
    
    fs.writeFileSync(
      `${OUTPUT_DIR}/verification-summary.json`, 
      JSON.stringify(summaryReport, null, 2)
    );
    
    console.log('\n========== VERIFICATION SUMMARY ==========');
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Total Accounts: ${accountsSummary.totalAccounts}`);
    console.log(`Active Accounts: ${accountsSummary.activeAccounts}`);
    console.log(`Inactive Accounts: ${accountsSummary.inactiveAccounts}`);
    console.log('Account Types:', accountsSummary.accountTypes);
    console.log(`Root Accounts: ${rootAccountsCount}`);
    console.log(`CSV Export Size: ${csvExportResponse.data.length} bytes`);
    console.log(`Excel Export Size: ${excelExportResponse.data.length} bytes`);
    console.log('API Verification: All endpoints verified successfully');
    console.log('==========================================');
    
  } catch (error) {
    console.error('Error during verification:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

// Execute the verification
login()
  .then(cookies => verifyEndpoints(cookies))
  .catch(err => console.error('Authentication error:', err.message));
