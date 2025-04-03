// test/batch-upload-test.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000';
const COOKIE_FILE = path.join(__dirname, '..', 'cookies.txt');

// Create an axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to read cookies from file
function getCookies() {
  try {
    const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
    console.log('Using cookie:', cookie);
    return cookie;
  } catch (error) {
    console.error('Could not read cookies file. Please ensure you are logged in.');
    process.exit(1);
  }
}

// Admin login helper
async function adminLogin() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    // Extract the cookie
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      // Extract the connect.sid cookie
      const sessionCookie = cookies.find(cookie => cookie.startsWith('connect.sid='));
      if (sessionCookie) {
        // Parse out just the cookie value (connect.sid=value)
        const cookieValue = sessionCookie.split(';')[0];
        fs.writeFileSync(COOKIE_FILE, cookieValue, 'utf8');
        console.log('Admin login successful, cookie saved:', cookieValue);
        
        // Reset the axios instance with the new cookie
        axiosInstance.defaults.headers.common['Cookie'] = cookieValue;
        
        // Make a test request to verify the cookie is working
        try {
          const testResponse = await axiosInstance.get('/api/users/me');
          console.log('Successfully authenticated as:', testResponse.data.username || testResponse.data.name);
          return true;
        } catch (testError) {
          console.warn('Cookie test failed:', testError.response?.data || testError.message);
          return false;
        }
      } else {
        console.error('No session cookie found in response.');
        return false;
      }
    } else {
      console.error('No cookies returned from login response.');
      return false;
    }
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Batch upload test function
async function testBatchUpload() {
  // Define test data for batch upload
  const batchData = {
    entries: [
      {
        date: '2025-04-01',
        reference: 'BATCH-TEST-001',
        description: 'Batch Test Journal Entry 1',
        lines: [
          {
            accountId: 4516, // Asset account
            description: 'Debit line',
            debit: '1000.00',
            credit: '0.00'
          },
          {
            accountId: 4517, // Liability account
            description: 'Credit line',
            debit: '0.00',
            credit: '1000.00'
          }
        ]
      },
      {
        date: '2025-04-02',
        reference: 'BATCH-TEST-002',
        description: 'Batch Test Journal Entry 2',
        lines: [
          {
            accountId: 175, // Revenue account
            description: 'Credit line',
            debit: '0.00',
            credit: '500.00'
          },
          {
            accountId: 176, // Expense account
            description: 'Debit line 1',
            debit: '300.00',
            credit: '0.00'
          },
          {
            accountId: 4516, // Asset account
            description: 'Debit line 2',
            debit: '200.00',
            credit: '0.00'
          }
        ]
      }
    ]
  };
  
  try {
    // Read the cookie file directly to ensure we have the latest cookie
    const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
    
    // Make API request using axios instance with batch upload endpoint
    console.log('Making batch upload request with cookie:', cookie);
    
    // Set the cookie for the axios instance
    axiosInstance.defaults.headers.common['Cookie'] = cookie;
    
    const response = await axiosInstance.post(
      `/api/entities/248/journal-entries/batch`,
      batchData
    );
    
    console.log('Batch upload response:', response.data);
    
    // Verify results
    if (response.data.success) {
      console.log(`✅ Batch upload successful: Created ${response.data.created} entries, Failed: ${response.data.failed}`);
      
      // If there are errors, log them
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Errors encountered:');
        response.data.errors.forEach((error, index) => {
          console.log(`  Entry ${error.entryIndex}: ${error.message}`);
        });
      }
    } else {
      console.error('❌ Batch upload failed:', response.data.message);
    }
  } catch (error) {
    console.error('Error during batch upload request:', error.response?.data || error.message);
  }
}

// Run test
(async () => {
  // Check if we need to login first
  try {
    console.log('Logging in as admin...');
    const loginSuccess = await adminLogin();
    if (loginSuccess) {
      console.log('Login successful. Testing batch upload...');
      await testBatchUpload();
    } else {
      console.error('Login failed. Cannot continue with test.');
    }
  } catch (error) {
    console.error('Error during test:', error.message);
  }
})();