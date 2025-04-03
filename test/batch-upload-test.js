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
    console.log('Starting admin login process...');
    
    // Create a new axios instance specifically for login
    const loginInstance = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Sending login request to:', `${API_URL}/api/auth/login`);
    console.log('With credentials:', { username: 'admin', password: 'password123' });
    
    const response = await loginInstance.post(`/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response headers:', JSON.stringify(response.headers, null, 2));
    
    // Extract the cookie
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      console.log('Cookies received:', cookies);
      
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
          console.log('Testing authentication with /api/users/me endpoint...');
          const testResponse = await axiosInstance.get('/api/users/me');
          console.log('Auth test response status:', testResponse.status);
          console.log('Auth test response data:', JSON.stringify(testResponse.data, null, 2));
          
          // Any valid 200 response means we're authenticated
          if (testResponse.status === 200) {
            // Log whatever data structure we received
            console.log('Successfully authenticated, received data:', 
              typeof testResponse.data === 'object' ? 
                Object.keys(testResponse.data).join(', ') : 
                typeof testResponse.data);
            
            // Extract any user information we can find
            const userData = testResponse.data?.user || testResponse.data;
            if (userData) {
              const username = userData.username || userData.name || 'unknown user';
              console.log('Authenticated as:', username);
            }
            return true;
          } else {
            console.warn('Authentication test response was not 200 OK');
            return false;
          }
        } catch (testError) {
          console.warn('Cookie test failed:', testError.response?.data || testError.message);
          console.warn('Error status:', testError.response?.status);
          console.warn('Error headers:', JSON.stringify(testError.response?.headers || {}, null, 2));
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
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', JSON.stringify(error.response?.headers || {}, null, 2));
    return false;
  }
}

// Batch upload test function
async function testBatchUpload() {
  // Define test data for batch upload - properly formatted for both endpoints
  const batchData = {
    // Primary endpoint format needs entries with debit/credit fields
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
    
    // Set the cookie for the axios instance
    axiosInstance.defaults.headers.common['Cookie'] = cookie;
    
    // First, check authentication with a simple endpoint
    console.log('Verifying authentication before batch upload...');
    try {
      // Try different possible auth check endpoints
      let authCheckResponse;
      try {
        console.log('Trying /api/auth/me endpoint...');
        authCheckResponse = await axiosInstance.get('/api/auth/me');
      } catch (e) {
        console.log('Trying /api/users/me endpoint instead...');
        authCheckResponse = await axiosInstance.get('/api/users/me');
      }
      
      console.log('Authentication check successful:', authCheckResponse.status);
      console.log('Authenticated as:', JSON.stringify(authCheckResponse.data, null, 2));
    } catch (authError) {
      console.error('Authentication check failed:', authError.response?.status, authError.response?.data || authError.message);
      console.error('Cannot proceed with batch upload test without authentication');
      return; // Exit the function if not authenticated
    }
    
    // Make API request using axios instance with batch upload endpoint
    console.log('Making batch upload request with cookie:', cookie);
    
    // Try the alternate endpoint first as a test
    console.log('Testing alternate batch upload endpoint first...');
    try {
      const altResponse = await axiosInstance.post('/api/journal-entries/batch', {
        clientId: 2, // Using clientId directly (entity 130 belongs to client 2)
        entries: batchData.entries
      });
      console.log('Alternate endpoint batch upload response:', altResponse.status, altResponse.data);
    } catch (altError) {
      console.warn('Alternate endpoint test failed:', altError.response?.status, altError.response?.data || altError.message);
      console.warn('Continuing with primary endpoint test...');
    }
    
    // Now try the main endpoint with a valid entity ID
    console.log('Testing primary batch upload endpoint...');
    const response = await axiosInstance.post(
      `/api/entities/130/journal-entries/batch`,
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
    console.error('Error during batch upload request:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data || error.message);
    console.error('Headers:', JSON.stringify(error.response?.headers || {}, null, 2));
  }
}

// Admin users should have implicit access to all entities
// This function is kept for backward compatibility but does nothing
async function grantEntityAccess() {
  console.log('Admin users have implicit access to all entities, no need to grant explicit access');
  return true;
}

// Run test
(async () => {
  // Check if we need to login first
  try {
    console.log('Logging in as admin...');
    const loginSuccess = await adminLogin();
    if (loginSuccess) {
      console.log('Login successful.');
      // Try to grant entity access
      await grantEntityAccess();
      // Continue with batch upload test
      console.log('Testing batch upload...');
      await testBatchUpload();
    } else {
      console.error('Login failed. Cannot continue with test.');
    }
  } catch (error) {
    console.error('Error during test:', error.message);
  }
})();