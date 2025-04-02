import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const API_BASE = 'http://localhost:5000';
const CLIENT_ID = 128;

async function run() {
  try {
    // Login
    console.log('Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    console.log('Login successful:', loginResponse.data.name);
    
    // Save the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies returned from login');
    }
    
    // Create a minimal CSV with just one new account to avoid changing too many accounts
    const csvContent = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId,ParentCode,ParentName
9999,Test Import Account,asset,Bank,No,,Yes,New test account for import,,1100,Current Assets`;
    
    const csvPath = '/tmp/coa_minimal_import.csv';
    fs.writeFileSync(csvPath, csvContent);
    console.log('Created minimal test CSV file at', csvPath);
    
    // Submit import request with selections to only add the new account
    console.log(`Performing import for client ${CLIENT_ID}...`);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(csvPath));
    // Only want to add the new account, not remove any existing ones
    form.append('selections', JSON.stringify({
      addAccounts: true,
      updateAccounts: false,
      removeAccounts: false
    }));
    
    const importResponse = await axios.post(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts/import`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Cookie: cookies.join('; ')
        }
      }
    );
    
    // Output the results
    console.log('\nImport Results:');
    console.log('Status:', importResponse.data.status);
    console.log('Count:', importResponse.data.count);
    console.log('Added:', importResponse.data.added);
    console.log('Updated:', importResponse.data.updated);
    console.log('Unchanged:', importResponse.data.unchanged);
    console.log('Skipped:', importResponse.data.skipped);
    console.log('Inactive:', importResponse.data.inactive);
    
    if (importResponse.data.errors && importResponse.data.errors.length > 0) {
      console.log('\nErrors:');
      importResponse.data.errors.forEach((error, index) => {
        console.log(`Error ${index + 1}:`, error);
      });
    }
    
    if (importResponse.data.warnings && importResponse.data.warnings.length > 0) {
      console.log('\nWarnings:');
      importResponse.data.warnings.forEach((warning, index) => {
        console.log(`Warning ${index + 1}:`, warning);
      });
    }
    
    // Verify the account was added by retrieving all accounts
    console.log('\nVerifying account was added...');
    const accountsResponse = await axios.get(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts`,
      {
        headers: {
          Cookie: cookies.join('; ')
        }
      }
    );
    
    const addedAccount = accountsResponse.data.find(account => account.accountCode === '9999');
    if (addedAccount) {
      console.log('Successfully found the imported account:');
      console.log(JSON.stringify(addedAccount, null, 2));
    } else {
      console.log('Imported account not found in the accounts list.');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

run();
