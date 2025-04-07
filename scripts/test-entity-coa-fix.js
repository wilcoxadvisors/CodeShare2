/**
 * test-entity-coa-fix.js
 * 
 * This script tests the fixes for entity creation and CoA seeding
 * by directly interacting with the storage classes and bypassing
 * the usual API routes.
 */

// Import required modules
import fetch from 'node-fetch';
import fs from 'fs';
import chalk from 'chalk';

// Define base URL for API requests
const API_BASE_URL = 'http://localhost:5000';

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    const cookies = fs.readFileSync('cookies.txt', 'utf8');
    return cookies.trim();
  } catch (error) {
    console.error(chalk.red('Error reading cookies file:'), error.message);
    return '';
  }
}

/**
 * Login to get auth cookie
 */
async function login() {
  console.log(chalk.blue('Logging in to get auth cookie...'));
  
  try {
    const credentials = fs.readFileSync('.auth-credentials', 'utf8').trim().split(':');
    
    if (credentials.length !== 2) {
      throw new Error('Invalid credentials format in .auth-credentials');
    }
    
    const [username, password] = credentials;
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Login failed with status ${response.status}: ${errorData}`);
    }
    
    // Extract and save cookies
    const setCookieHeader = response.headers.raw()['set-cookie'];
    if (!setCookieHeader) {
      throw new Error('No cookies received from login');
    }
    
    fs.writeFileSync('cookies.txt', setCookieHeader.join('; '));
    console.log(chalk.green('Login successful and cookies saved'));
    return true;
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    return false;
  }
}

/**
 * Create a test client directly
 */
async function createTestClient() {
  console.log(chalk.blue('Creating a test client...'));
  
  const clientData = {
    name: "Entity CoA Fix Test Client " + Date.now(),
    userId: 1,
    contactName: "Test Contact",
    contactEmail: "test@example.com",
    contactPhone: "555-1234",
    address: "123 Test St",
    city: "Testville",
    state: "TS",
    country: "USA",
    postalCode: "12345",
    industry: "Technology",
    taxId: "12-3456789"
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookieHeader()
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Client creation failed with status ${response.status}: ${errorData}`);
    }
    
    const client = await response.json();
    console.log(chalk.green(`Test client created successfully with ID ${client.id}`));
    return client;
  } catch (error) {
    console.error(chalk.red('Client creation failed:'), error.message);
    return null;
  }
}

/**
 * Get entities for a client
 */
async function getEntities(clientId) {
  console.log(chalk.blue(`Getting entities for client ID ${clientId}...`));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/clients/${clientId}`, {
      method: 'GET',
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Fetching entities failed with status ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    console.log(chalk.green(`Client has ${data.data.entities.length} entities`));
    
    if (data.data.entities.length === 0) {
      console.error(chalk.red('ERROR: No entities found for client!'));
    } else {
      console.log(chalk.green('Entities found:'), data.data.entities);
    }
    
    return data.data.entities;
  } catch (error) {
    console.error(chalk.red(`Fetching entities failed for client ${clientId}:`), error.message);
    return [];
  }
}

/**
 * Manually create an entity for a client
 */
async function createEntity(clientId) {
  console.log(chalk.blue(`Manually creating an entity for client ID ${clientId}...`));
  
  const entityData = {
    name: `Test Entity for Client ${clientId}`,
    code: "MANUAL",
    entityCode: "MANUAL-1",
    ownerId: 1,
    clientId: clientId,
    active: true,
    fiscalYearStart: "01-01",
    fiscalYearEnd: "12-31",
    currency: "USD",
    timezone: "UTC"
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookieHeader()
      },
      body: JSON.stringify(entityData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Entity creation failed with status ${response.status}: ${errorData}`);
    }
    
    const entity = await response.json();
    console.log(chalk.green(`Entity created successfully with ID ${entity.id}`));
    return entity;
  } catch (error) {
    console.error(chalk.red('Entity creation failed:'), error.message);
    return null;
  }
}

/**
 * Seed Chart of Accounts for a client
 */
async function seedCoA(clientId) {
  console.log(chalk.blue(`Seeding Chart of Accounts for client ID ${clientId}...`));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/seed-coa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookieHeader()
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`CoA seeding failed with status ${response.status}: ${errorData}`);
    }
    
    const result = await response.json();
    console.log(chalk.green(`Chart of Accounts seeded successfully for client ID ${clientId}`));
    console.log(result);
    return true;
  } catch (error) {
    console.error(chalk.red(`CoA seeding failed for client ${clientId}:`), error.message);
    return false;
  }
}

/**
 * Get accounts for a client
 */
async function getAccounts(clientId) {
  console.log(chalk.blue(`Getting accounts for client ID ${clientId}...`));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/accounts`, {
      method: 'GET',
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Fetching accounts failed with status ${response.status}: ${errorData}`);
    }
    
    const accounts = await response.json();
    console.log(chalk.green(`Client has ${accounts.length} accounts`));
    
    if (accounts.length === 0) {
      console.error(chalk.red('ERROR: No accounts found for client!'));
    } else {
      console.log(chalk.green(`Found ${accounts.length} accounts, first few:`), 
                 accounts.slice(0, 3).map(a => `${a.id}: ${a.name} (${a.accountCode})`));
    }
    
    return accounts;
  } catch (error) {
    console.error(chalk.red(`Fetching accounts failed for client ${clientId}:`), error.message);
    return [];
  }
}

/**
 * Run the full test procedure
 */
async function runTest() {
  console.log(chalk.blue.bold('=== ENTITY & COA CREATION FIX TEST ==='));
  console.log(chalk.blue('Starting test at'), new Date().toISOString());
  
  // Ensure we're logged in
  const loggedIn = await login();
  if (!loggedIn) {
    console.error(chalk.red.bold('Test failed: Unable to log in'));
    return;
  }
  
  // Step 1: Create a test client
  const client = await createTestClient();
  if (!client) {
    console.error(chalk.red.bold('Test failed: Unable to create test client'));
    return;
  }
  
  // Step 2: Check if entities were automatically created
  const entities = await getEntities(client.id);
  
  // Step 3: If no entities, manually create one
  let entity = null;
  if (entities.length === 0) {
    console.log(chalk.yellow('No entities were automatically created. Trying manual creation...'));
    entity = await createEntity(client.id);
    if (!entity) {
      console.error(chalk.red.bold('Test failed: Unable to manually create entity'));
      return;
    }
  } else {
    entity = entities[0];
  }
  
  // Step 4: Check if accounts were automatically seeded
  const accounts = await getAccounts(client.id);
  
  // Step 5: If no accounts, manually seed them
  if (accounts.length === 0) {
    console.log(chalk.yellow('No accounts were automatically seeded. Trying manual seeding...'));
    const seeded = await seedCoA(client.id);
    if (!seeded) {
      console.error(chalk.red.bold('Test failed: Unable to manually seed Chart of Accounts'));
      return;
    }
    
    // Verify accounts were created
    const accountsAfterSeeding = await getAccounts(client.id);
    if (accountsAfterSeeding.length === 0) {
      console.error(chalk.red.bold('Test failed: No accounts found after manual seeding'));
      return;
    }
  }
  
  console.log(chalk.green.bold('=== TEST COMPLETED SUCCESSFULLY ==='));
  console.log(chalk.green(`Client ID: ${client.id}`));
  console.log(chalk.green(`Entity ID: ${entity.id}`));
  console.log(chalk.green(`Account count: ${accounts.length}`));
}

// Execute the test
runTest().catch(error => {
  console.error(chalk.red.bold('FATAL ERROR:'), error);
  process.exit(1);
});