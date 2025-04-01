// Script to test Chart of Accounts UI buttons
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import chalk from 'chalk';

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Function to authenticate and get cookies
async function authenticate() {
  console.log(chalk.blue('Authenticating with admin credentials...'));
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'password123'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }
  
  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error('No cookies received from authentication.');
  }
  
  // Extract session cookie
  const sessionCookie = setCookieHeader.split(';')[0];
  console.log(chalk.green('Authentication successful.'));
  
  return { cookie: sessionCookie };
}

// Function to fetch client information
async function getClients(cookie) {
  console.log(chalk.blue('Fetching clients...'));
  
  const response = await fetch(`${BASE_URL}/api/clients`, {
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(chalk.green(`Found ${result.length} clients.`));
  
  return result;
}

// Function to check if the client already has a Chart of Accounts
async function checkClientCoA(cookie, clientId) {
  console.log(chalk.blue(`Checking Chart of Accounts for client ID ${clientId}...`));
  
  const response = await fetch(`${BASE_URL}/api/clients/${clientId}/accounts`, {
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to check CoA for client ${clientId}: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  // Check response format - could be direct array or nested in data property
  const accounts = Array.isArray(result) ? result : (result.data || []);
  console.log(chalk.green(`Client has ${accounts.length} accounts in Chart of Accounts.`));
  
  return accounts;
}

// Function to test account creation
async function testCreateAccount(cookie, clientId) {
  console.log(chalk.blue(`Testing account creation for client ID ${clientId}...`));
  
  // Create a simple account
  const newAccount = {
    clientId: clientId,
    code: "9999",
    name: "Test Account",
    type: "EXPENSE",
    subtype: "Office",
    isSubledger: false,
    active: true,
    description: "Test account created via API"
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/clients/${clientId}/accounts`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newAccount)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create account: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(chalk.green('Account created successfully:'), result);
    return result;
  } catch (error) {
    console.error(chalk.red('Error creating account:'), error.message);
    throw error;
  }
}

// Function to test CSV export
async function testExportCSV(cookie, clientId) {
  console.log(chalk.blue(`Testing CSV export for client ID ${clientId}...`));
  
  try {
    const response = await fetch(`${BASE_URL}/api/clients/${clientId}/accounts/export?format=csv`, {
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/csv')) {
      throw new Error(`Expected CSV but got ${contentType}`);
    }
    
    const fileName = 'exported-accounts.csv';
    const fileBuffer = await response.buffer();
    fs.writeFileSync(fileName, fileBuffer);
    
    console.log(chalk.green(`CSV export successful. Saved to ${fileName}`));
    return fileName;
  } catch (error) {
    console.error(chalk.red('Error exporting CSV:'), error.message);
    throw error;
  }
}

// Function to test Excel export
async function testExcelExport(cookie, clientId) {
  console.log(chalk.blue(`Testing Excel export for client ID ${clientId}...`));
  
  try {
    const response = await fetch(`${BASE_URL}/api/clients/${clientId}/accounts/export?format=excel`, {
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export Excel: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      throw new Error(`Expected Excel file but got ${contentType}`);
    }
    
    const fileName = 'exported-accounts.xlsx';
    const fileBuffer = await response.buffer();
    fs.writeFileSync(fileName, fileBuffer);
    
    console.log(chalk.green(`Excel export successful. Saved to ${fileName}`));
    return fileName;
  } catch (error) {
    console.error(chalk.red('Error exporting Excel:'), error.message);
    throw error;
  }
}

// Function to test CSV import
async function testImportCSV(cookie, clientId, csvFilePath) {
  console.log(chalk.blue(`Testing CSV import for client ID ${clientId}...`));
  
  try {
    // First, check if the file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    // Create form data with the file
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath));
    
    const response = await fetch(`${BASE_URL}/api/clients/${clientId}/accounts/import`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        ...form.getHeaders()
      },
      body: form
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to import CSV: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(chalk.green('CSV import successful:'), result);
    return result;
  } catch (error) {
    console.error(chalk.red('Error importing CSV:'), error.message);
    throw error;
  }
}

// Main function to run the test
async function runTest() {
  console.log(chalk.yellow('=== Chart of Accounts UI Buttons Test ==='));
  
  try {
    // Authenticate and get cookie
    const { cookie } = await authenticate();
    
    // Get clients
    const clients = await getClients(cookie);
    
    if (clients.length === 0) {
      throw new Error('No clients found. Cannot continue test.');
    }
    
    // Use the first client for testing
    const clientId = clients[0].id;
    console.log(chalk.blue(`Using client ID ${clientId} for testing.`));
    
    // Check if the client already has accounts
    const accounts = await checkClientCoA(cookie, clientId);
    
    // Test account creation if no accounts exist
    if (accounts.length === 0) {
      console.log(chalk.yellow('No accounts found. Testing account creation...'));
      await testCreateAccount(cookie, clientId);
    } else {
      console.log(chalk.green(`Client already has ${accounts.length} accounts.`));
    }
    
    // Test CSV export
    const csvFile = await testExportCSV(cookie, clientId);
    
    // Test Excel export
    const excelFile = await testExcelExport(cookie, clientId);
    
    // Test CSV import using the exported file
    if (fs.existsSync(csvFile)) {
      await testImportCSV(cookie, clientId, csvFile);
    }
    
    console.log(chalk.green('=== All Chart of Accounts tests completed successfully! ==='));
  } catch (error) {
    console.error(chalk.red('Test failed:'), error.message);
    process.exit(1);
  }
}

// Run the test
runTest();