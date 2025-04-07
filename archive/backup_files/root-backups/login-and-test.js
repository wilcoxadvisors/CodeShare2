import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    
    // Create a sample CSV for testing
    const csvContent = `AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentId,ParentCode,ParentName
1,Assets,asset,,No,,Yes,Resources owned by the business that have economic value,,,
1100,Current Assets,asset,,No,,Yes,Assets expected to be converted to cash or used within one year,,1,Assets
1110,Cash,asset,Bank,No,,Yes,Money in bank accounts and cash on hand,,1100,Current Assets
1120,Accounts Receivable,asset,Receivable,Yes,accounts_receivable,Yes,Money owed to the business by customers,,1100,Current Assets
9999,Test Import Account,asset,Bank,No,,Yes,New test account for import,,1100,Current Assets`;
    
    const csvPath = '/tmp/coa_test_import.csv';
    fs.writeFileSync(csvPath, csvContent);
    console.log('Created test CSV file at', csvPath);
    
    // Submit import preview request
    console.log(`Testing import preview for client ${CLIENT_ID}...`);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(csvPath));
    
    const previewResponse = await axios.post(
      `${API_BASE}/api/clients/${CLIENT_ID}/accounts/import-preview`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Cookie: cookies.join('; ')
        }
      }
    );
    
    // Output the results
    console.log('\nImport Preview Results:');
    console.log('Status:', previewResponse.data.status);
    console.log('Total Changes:', previewResponse.data.preview?.totalChanges);
    console.log('Added:', previewResponse.data.preview?.totalAdds);
    console.log('Updated:', previewResponse.data.preview?.totalUpdates);
    console.log('Removed:', previewResponse.data.preview?.totalRemoves);
    console.log('Unchanged:', previewResponse.data.preview?.totalUnchanged);
    console.log('Accounts with Transactions:', previewResponse.data.preview?.accountsWithTransactions);
    
    // Show a sample of the changes
    if (previewResponse.data.preview?.changes?.length > 0) {
      console.log('\nSample Changes:');
      previewResponse.data.preview.changes.slice(0, 2).forEach((change, index) => {
        console.log(`Change ${index + 1}:`, JSON.stringify(change, null, 2));
      });
    } else {
      console.log('\nNo changes found in preview.');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

run();
