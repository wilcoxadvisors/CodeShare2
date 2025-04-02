// Script to verify COA import/export functionality
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load cookies for authentication
// First try to load from the test directory, then fallback to root
const testDirCookiesPath = path.resolve(__dirname, 'cookies.txt');
const rootCookiesPath = path.resolve('cookies.txt');
console.log(`Looking for cookies at: ${testDirCookiesPath} or ${rootCookiesPath}`);

let cookies = '';
try {
  // Try to read from test directory first
  let cookiesFile;
  try {
    cookiesFile = fs.readFileSync(testDirCookiesPath, 'utf8');
    console.log('Cookies loaded from test directory');
  } catch (err) {
    // Fallback to root directory
    cookiesFile = fs.readFileSync(rootCookiesPath, 'utf8');
    console.log('Cookies loaded from root directory');
  }
  
  // Parse the cookie file
  cookies = cookiesFile.trim();
  console.log('Cookies loaded successfully');
  console.log('Cookie value:', cookies);
} catch (err) {
  console.error(`Error loading cookies: ${err.message}`);
  console.error('Continuing with empty cookies, authentication might fail');
}

// Configure axios instance with cookies
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    Cookie: cookies,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

// Add response interceptor for debugging
api.interceptors.response.use(response => {
  // Log the full response for debugging
  console.log(`API Response Status: ${response.status}`);
  
  // Handle string responses containing JSON
  if (typeof response.data === 'string' && response.data.includes('id')) {
    console.log('Response appears to contain JSON string, attempting to parse');
    try {
      response.data = JSON.parse(response.data);
      console.log('Successfully parsed response data to JSON');
    } catch (e) {
      console.log('Failed to parse response data as JSON, extracting ID manually');
    }
  }
  return response;
}, error => {
  console.error('API Error:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  }
  return Promise.reject(error);
});

// Paths to test files
const CSV_TEST_FILE = path.join(__dirname, '..', 'data', 'coa-import', 'updated-tests', 'test-accounts-import-updated.csv');
const EXCEL_TEST_FILE = path.join(__dirname, '..', 'data', 'coa-import', 'updated-tests', 'test-accounts-import-updated.xlsx');

// Make sure the files exist
if (!fs.existsSync(CSV_TEST_FILE)) {
  console.error(`Test CSV file not found at: ${CSV_TEST_FILE}`);
  console.log('Checking available files:');
  const baseDir = path.join(__dirname, '..', 'data', 'coa-import');
  if (fs.existsSync(baseDir)) {
    console.log('Files in coa-import directory:');
    fs.readdirSync(baseDir).forEach(file => {
      console.log(`- ${file}`);
    });
  }
}

if (!fs.existsSync(EXCEL_TEST_FILE)) {
  console.error(`Test Excel file not found at: ${EXCEL_TEST_FILE}`);
}

// Utility to create a test client
async function createTestClient(name) {
  try {
    console.log(`Creating test client with name: "${name}"`);
    
    // Create a custom axios instance with headers specifically for this request
    const clientAxios = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    // Add response interceptor for debugging
    clientAxios.interceptors.response.use(response => {
      console.log(`Client API Response Status: ${response.status} ${response.statusText}`);
      return response;
    }, error => {
      console.error(`Client API Error: ${error.message}`);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('Data:', error.response.data);
      }
      return Promise.reject(error);
    });
    
    const clientData = { 
      name,
      active: true,
      userId: 1  // Assuming the admin user has ID 1
    };
    
    console.log('Client data:', JSON.stringify(clientData, null, 2));
    
    // Try the admin route first
    try {
      const response = await clientAxios.post('/admin/clients'.replace('/api/api/', '/api/').replace('//admin', '/admin'), clientData);
      
      // Make sure the client ID is actually returned
      if (!response.data) {
        console.error('Client created but no data was returned');
        throw new Error('No data returned from API');
      }
      
      // Handle success response format with data property
      if (response.data.status === 'success' && response.data.data && response.data.data.id) {
        console.log(`Extracted client ID from success response: ${response.data.data.id}`);
        return response.data.data;
      }
      
      // Direct ID in response data
      if (response.data.id) {
        console.log(`Client created with ID: ${response.data.id}`);
        return response.data;
      }
      
      // Try to extract ID from string response
      if (typeof response.data === 'string' && response.data.includes('id')) {
        try {
          const idMatch = response.data.match(/"id":(\d+)/);
          if (idMatch && idMatch[1]) {
            const clientId = parseInt(idMatch[1]);
            console.log(`Extracted client ID from response: ${clientId}`);
            return { id: clientId };
          }
        } catch (e) {
          console.error('Failed to extract ID from response:', e.message);
        }
      }
      
      console.error('Unable to find client ID in response:', response.data);
      throw new Error('No client ID returned from API');
    } catch (adminError) {
      console.error('Admin route failed:', adminError.message);
      
      // Try the non-admin route as fallback
      console.log('Attempting fallback client creation route...');
      try {
        const fallbackResponse = await clientAxios.post('/clients'.replace('/api/api/', '/api/'), clientData);
        
        if (fallbackResponse.data && fallbackResponse.data.id) {
          console.log(`Client created via fallback with ID: ${fallbackResponse.data.id}`);
          return fallbackResponse.data;
        }
        
        throw new Error('Fallback route succeeded but no client ID found');
      } catch (fallbackError) {
        console.error('Fallback client creation also failed:', fallbackError.message);
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error('Error creating test client:', error.response?.data || error.message);
    throw error;
  }
}

// Utility to seed test accounts
async function seedInitialAccounts(clientId) {
  try {
    // Create a custom axios instance with headers specifically for this request
    const seedAxios = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    // Seed a few sample accounts for testing updates
    const seedAccounts = [
      {
        name: "Test Asset Account",
        accountCode: "10101",
        type: "ASSET",
        subtype: "Current",
        description: "Initial test account for updates",
        active: true
      },
      {
        name: "Test Liability Account",
        accountCode: "20100",
        type: "LIABILITY",
        subtype: "Current",
        description: "Initial test account for updates",
        active: true
      },
      {
        name: "Test Expense Account",
        accountCode: "50300",
        type: "EXPENSE",
        subtype: "Operating",
        description: "Initial test account to be updated",
        active: true
      }
    ];

    for (const account of seedAccounts) {
      try {
        // Use admin route for account creation to avoid auth issues
        const response = await seedAxios.post(`/admin/clients/${clientId}/accounts`.replace('/api/api/', '/api/').replace('//admin', '/admin'), account);
        console.log(`Seeded account: ${account.name} (${account.accountCode})`);
      } catch (accountError) {
        console.error(`Error creating account ${account.accountCode}:`, accountError.message);
        
        // Try fallback approach with non-admin route
        try {
          console.log(`Attempting fallback route for account ${account.accountCode}...`);
          await seedAxios.post(`/clients/${clientId}/accounts`.replace('/api/api/', '/api/'), account);
          console.log(`Seeded account via fallback: ${account.name} (${account.accountCode})`);
        } catch (fallbackError) {
          console.error(`Fallback also failed for ${account.accountCode}:`, fallbackError.message);
          // Continue to next account even if this one fails
        }
      }
    }
    
    console.log("Initial accounts seeded successfully");
  } catch (error) {
    console.error('Error seeding initial accounts:', error.response?.data || error.message);
    throw error;
  }
}

// Utility to import COA file
async function importCoaFile(clientId, filePath, format) {
  try {
    console.log(`\n=== Importing ${format} file for client ID: ${clientId} ===`);
    console.log(`File path: ${filePath}`);
    
    // Check if file exists and get stats
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: File does not exist at path: ${filePath}`);
      throw new Error(`Import file not found: ${filePath}`);
    }
    
    const fileStats = fs.statSync(filePath);
    console.log(`File size: ${fileStats.size} bytes`);
    console.log(`Last modified: ${fileStats.mtime}`);
    
    // For CSV files, log a preview of the content
    if (format.toLowerCase() === 'csv') {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        console.log(`CSV file contains ${lines.length} lines`);
        if (lines.length > 0) {
          console.log('CSV Headers:', lines[0]);
          
          // Verify the accountCode column is present in the headers
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const hasAccountCodeHeader = headers.includes('accountcode');
          console.log(`CSV has accountCode header: ${hasAccountCodeHeader}`);
          
          if (lines.length > 1) {
            console.log('First data row:', lines[1]);
          }
        }
      } catch (previewError) {
        console.error('Error previewing CSV file:', previewError.message);
      }
    }
    
    // Create form data with the file
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    console.log('FormData created successfully');
    
    // Create a custom axios instance with interceptors for this request
    const importAxios = axios.create({
      headers: {
        Cookie: cookies,
        'Accept': 'application/json'
      },
      withCredentials: true,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    // Add request interceptor for debugging
    importAxios.interceptors.request.use(config => {
      console.log(`Making request to: ${config.url}`);
      console.log('Request headers:', JSON.stringify(config.headers, null, 2));
      return config;
    }, error => {
      console.error('Request configuration error:', error.message);
      return Promise.reject(error);
    });
    
    // Add response interceptor for debugging
    importAxios.interceptors.response.use(response => {
      console.log(`Import API Response Status: ${response.status} ${response.statusText}`);
      return response;
    }, error => {
      console.error(`Import API Error: ${error.message}`);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        
        // Try to parse response data
        if (error.response.data) {
          if (typeof error.response.data === 'object') {
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
          } else if (Buffer.isBuffer(error.response.data)) {
            console.error('Error data (buffer):', error.response.data.toString('utf8'));
          } else {
            console.error('Error data:', error.response.data);
          }
        }
      } else if (error.request) {
        console.error('No response received, request details:', error.request);
      }
      return Promise.reject(error);
    });
    
    // Execute the import request
    console.log(`Sending ${format} import request to server...`);
    // Use client API route for importing accounts
    console.log(`Making request to: http://localhost:5000/api/clients/${clientId}/accounts/import?format=${format}`);
    const importResponse = await importAxios.post(
      `http://localhost:5000/api/clients/${clientId}/accounts/import?format=${format}`.replace('/api/api/', '/api/'), 
      formData, 
      { 
        headers: { 
          ...formData.getHeaders()
        }
      }
    );
    
    // Process the response
    console.log(`${format} Import Response Status: ${importResponse.status} ${importResponse.statusText}`);
    
    if (importResponse.data) {
      if (typeof importResponse.data === 'object') {
        console.log(`${format} Import Response Data:`, JSON.stringify(importResponse.data, null, 2));
      } else {
        console.log(`${format} Import Response Data:`, importResponse.data);
      }
    }
    
    return importResponse.data;
  } catch (error) {
    console.error(`\nERROR importing ${format} file:`, error.message);
    
    // Try to provide more detailed error information
    if (error.response) {
      console.error(`Status: ${error.response.status} ${error.response.statusText}`);
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          console.error('Error details:', JSON.stringify(error.response.data, null, 2));
        } else if (Buffer.isBuffer(error.response.data)) {
          console.error('Error details (buffer):', error.response.data.toString('utf8'));
        } else {
          console.error('Error details:', error.response.data);
        }
      }
    }
    
    throw error;
  }
}

// Utility to get accounts for a client
async function getAccounts(clientId) {
  try {
    console.log(`Retrieving accounts for client ID: ${clientId}`);
    
    // Create a custom axios instance with headers specifically for this request
    const accountsAxios = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    // Add request interceptor for debugging
    accountsAxios.interceptors.request.use(config => {
      console.log(`Making account request to: ${config.url}`);
      console.log('Request headers:', JSON.stringify(config.headers, null, 2));
      return config;
    }, error => {
      console.error('Request configuration error:', error.message);
      return Promise.reject(error);
    });
    
    // Add response interceptor for debugging
    accountsAxios.interceptors.response.use(response => {
      console.log(`Accounts API Response Status: ${response.status} ${response.statusText}`);
      return response;
    }, error => {
      console.error(`Accounts API Error: ${error.message}`);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        if (error.response.data) {
          if (typeof error.response.data === 'object') {
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
          } else {
            console.error('Error data:', error.response.data);
          }
        }
      }
      return Promise.reject(error);
    });
    
    // Always use admin route for getting accounts - more reliable
    console.log('Using admin route to retrieve accounts');
    
    // Load the most recent cookie directly from file
    try {
      console.log('Loading fresh cookies for account retrieval');
      const freshCookiesFile = fs.readFileSync(path.resolve('cookies.txt'), 'utf8');
      const freshCookies = freshCookiesFile.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(cookie => cookie.split('\t').pop().trim())
        .join('; ');
      
      // Update the headers with fresh cookies
      accountsAxios.defaults.headers.Cookie = freshCookies;
      console.log('Updated cookies for account retrieval');
    } catch (cookieError) {
      console.warn('Failed to refresh cookies, continuing with existing session:', cookieError.message);
    }
    
    // Use client accounts API endpoint
    console.log(`Making request to: /clients/${clientId}/accounts`);
    const response = await accountsAxios.get(`/clients/${clientId}/accounts`.replace('/api/api/', '/api/'));
    
    // Handle HTML responses - these indicate auth issues
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      console.error('Received HTML response instead of JSON. Authentication issue.');
      console.log('HTML response first 300 chars:', response.data.substring(0, 300));
      
      // Try to find any session-related info in the HTML
      const sessionPattern = /session|auth|login/i;
      if (sessionPattern.test(response.data)) {
        console.log('Session-related info found in response');
        const lines = response.data.split('\n')
          .filter(line => sessionPattern.test(line))
          .slice(0, 5); // Show just first 5 matches
        
        console.log('Session-related lines:', lines);
      }
      
      throw new Error('Authentication error when retrieving accounts - received HTML');
    }
    
    // Check if response data is valid
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response when retrieving accounts:', response.data);
      throw new Error('Invalid response format when retrieving accounts');
    }
    
    console.log(`Retrieved ${response.data.length} accounts for client ${clientId}`);
    
    // Log a sample of accounts for debugging
    if (response.data.length > 0) {
      console.log('Sample account:', JSON.stringify(response.data[0], null, 2));
      
      // Check if accounts have the accountCode field
      const accountCodePresent = response.data.every(account => 'accountCode' in account);
      console.log(`All accounts have accountCode field: ${accountCodePresent}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error retrieving accounts:', error.response?.data || error.message);
    
    // Log more complete error information
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
    }
    
    throw error;
  }
}

// Utility to export CoA
async function exportCoa(clientId, format) {
  try {
    console.log(`Exporting ${format} file for client ID: ${clientId}`);
    
    // Create a custom axios instance with headers specifically for this request
    const exportAxios = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        Cookie: cookies,
        'Accept': '*/*'  // Accept any content type for binary files
      },
      withCredentials: true
    });
    
    // Use client API route for exporting accounts
    console.log(`Making request to: /clients/${clientId}/accounts/export?format=${format}`);
    const response = await exportAxios.get(`/clients/${clientId}/accounts/export?format=${format}`.replace('/api/api/', '/api/'), {
      responseType: 'arraybuffer'
    });
    
    if (!response.data || response.data.length === 0) {
      console.error(`Received empty response when exporting ${format}`);
      throw new Error(`Empty export data received for format: ${format}`);
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save the exported file
    const outputPath = path.join(outputDir, `client-${clientId}-export.${format}`);
    fs.writeFileSync(outputPath, response.data);
    
    console.log(`Exported ${format} file (${response.data.length} bytes) saved to: ${outputPath}`);
    
    // For CSV files, analyze the content for debugging
    if (format === 'csv') {
      try {
        const csvContent = response.data.toString('utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          console.error('CSV file appears to be empty');
        } else {
          console.log(`CSV has ${lines.length} lines`);
          console.log('CSV Headers:', lines[0]);
          
          // Verify the accountCode column is present in the headers
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const hasAccountCodeHeader = headers.includes('accountcode');
          console.log(`CSV has accountCode header: ${hasAccountCodeHeader}`);
          
          if (lines.length > 1) {
            console.log('First row:', lines[1]);
          }
        }
      } catch (csvError) {
        console.error('Error analyzing CSV content:', csvError.message);
      }
    }
    
    return outputPath;
  } catch (error) {
    console.error(`Error exporting ${format}:`, error.response?.data || error.message);
    throw error;
  }
}

// Utility to verify account updates
function verifyAccountUpdates(originalAccounts, updatedAccounts) {
  console.log("\n=== Verifying Account Updates ===");
  
  // Map accounts by account code for easier lookup
  const originalMap = originalAccounts.reduce((map, account) => {
    map[account.accountCode] = account;
    return map;
  }, {});
  
  const updatedMap = updatedAccounts.reduce((map, account) => {
    map[account.accountCode] = account;
    return map;
  }, {});
  
  // Check updates for our seed accounts
  const accountsToCheck = ['10101', '20100', '50300'];
  
  for (const code of accountsToCheck) {
    const original = originalMap[code];
    const updated = updatedMap[code];
    
    if (!original) {
      console.log(`FAIL: Original account ${code} not found`);
      continue;
    }
    
    if (!updated) {
      console.log(`FAIL: Updated account ${code} not found`);
      continue;
    }
    
    // Verify the account was updated and not duplicated
    console.log(`Account ${code}:`);
    console.log(`  Original Name: ${original.name}`);
    console.log(`  Updated Name: ${updated.name}`);
    console.log(`  Original Description: ${original.description}`);
    console.log(`  Updated Description: ${updated.description}`);
    console.log(`  Same ID? ${original.id === updated.id ? 'YES' : 'NO'}`);
    
    if (original.id === updated.id) {
      console.log(`  PASS: Account ${code} was properly updated, not duplicated`);
    } else {
      console.log(`  FAIL: Account ${code} appears to have been duplicated instead of updated`);
    }
  }
  
  // Check for new accounts that should have been added
  const newAccountCodes = ['10102', '10200', '40100', '50100', '50200'];
  for (const code of newAccountCodes) {
    if (updatedMap[code]) {
      console.log(`PASS: New account ${code} was added`);
    } else {
      console.log(`FAIL: New account ${code} was not added`);
    }
  }
}

// Main test function
async function runTests() {
  try {
    console.log("=== Starting CoA Import/Export Verification ===");
    
    // Part 1: CSV Import Test
    console.log("\n=== CSV Import Test ===");
    const csvClient = await createTestClient("Import RE-Verify CSV");
    
    // Seed initial accounts for testing updates
    await seedInitialAccounts(csvClient.id);
    
    // Get original accounts before import
    const originalCsvAccounts = await getAccounts(csvClient.id);
    
    // Import CSV file
    const csvImportResult = await importCoaFile(csvClient.id, CSV_TEST_FILE, 'CSV');
    
    // Get updated accounts after import
    const updatedCsvAccounts = await getAccounts(csvClient.id);
    
    // Verify account updates
    verifyAccountUpdates(originalCsvAccounts, updatedCsvAccounts);
    
    // Part 2: Excel Import Test
    console.log("\n=== Excel Import Test ===");
    const excelClient = await createTestClient("Import RE-Verify Excel");
    
    // Seed initial accounts for testing updates
    await seedInitialAccounts(excelClient.id);
    
    // Get original accounts before import
    const originalExcelAccounts = await getAccounts(excelClient.id);
    
    // Import Excel file
    const excelImportResult = await importCoaFile(excelClient.id, EXCEL_TEST_FILE, 'Excel');
    
    // Get updated accounts after import
    const updatedExcelAccounts = await getAccounts(excelClient.id);
    
    // Verify account updates
    verifyAccountUpdates(originalExcelAccounts, updatedExcelAccounts);
    
    // Part 3: Export Tests
    console.log("\n=== Export Tests ===");
    
    // Test CSV Export
    const csvExportPath = await exportCoa(csvClient.id, 'csv');
    
    // Test Excel Export
    const excelExportPath = await exportCoa(excelClient.id, 'excel');
    
    console.log("\n=== Test Summary ===");
    console.log("CSV Import Test: COMPLETE");
    console.log("Excel Import Test: COMPLETE");
    console.log("CSV Export Test: COMPLETE");
    console.log("Excel Export Test: COMPLETE");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the tests
runTests();