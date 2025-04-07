/**
 * Test Entity Creation and CoA Seeding
 * 
 * This script tests entity creation and Chart of Accounts seeding
 * with enhanced error handling and diagnostics to identify the
 * root cause of the silent failure in entity creation and CoA seeding.
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const LOG_FILE = path.join(__dirname, '..', 'verification-logs', 'entity-creation-test.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create log writer
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
};

// Clear previous log file
fs.writeFileSync(LOG_FILE, '# Entity Creation and CoA Seeding Test Log\n\n');

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    const cookiesPath = path.join(__dirname, '..', '.auth-cookies');
    if (fs.existsSync(cookiesPath)) {
      const cookies = fs.readFileSync(cookiesPath, 'utf8').trim();
      return cookies;
    }
  } catch (error) {
    log(`ERROR: Failed to read cookies file: ${error.message}`);
  }
  return '';
}

/**
 * Login to get auth cookie
 */
async function login() {
  log('Logging in as admin user...');
  
  try {
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    
    // Extract the session cookie
    const cookies = loginRes.headers.get('set-cookie');
    if (cookies) {
      // Find connect.sid cookie
      const connectSidMatch = cookies.match(/connect\.sid=[^;]+/);
      if (connectSidMatch) {
        const formattedCookie = connectSidMatch[0];
        fs.writeFileSync(path.join(__dirname, '..', '.auth-cookies'), formattedCookie);
        log('Login successful, session cookie saved');
        return formattedCookie;
      }
    }
    
    log('Login successful but no connect.sid cookie was found');
    return '';
  } catch (error) {
    log(`ERROR during login: ${error.message}`);
    return '';
  }
}

/**
 * Create a test client
 */
async function createTestClient() {
  log('Creating test client...');
  
  const cookie = getCookieHeader();
  if (!cookie) {
    log('WARNING: No auth cookie found, attempting to login first');
    await login();
  }
  
  const timestamp = Date.now();
  const clientData = {
    name: `Test Client ${timestamp}`,
    clientCode: `TST${timestamp}`,
    userId: 1, // Admin user ID
    notes: 'Client created for entity creation and CoA seeding test',
    website: 'https://example.com',
    phone: '555-1234',
    active: true
  };
  
  try {
    log(`Sending client creation request with data: ${JSON.stringify(clientData)}`);
    
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookieHeader()
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Client creation failed with status ${response.status}: ${errorText}`);
    }
    
    const newClient = await response.json();
    log(`Client created successfully with ID ${newClient.id}`);
    return newClient;
  } catch (error) {
    log(`ERROR creating client: ${error.message}`);
    throw error;
  }
}

/**
 * Get entities for a client
 */
async function getEntities(clientId) {
  log(`Getting entities for client ${clientId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/entities?clientId=${clientId}`, {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get entities with status ${response.status}: ${errorText}`);
    }
    
    const entities = await response.json();
    log(`Found ${entities.length} entities for client ${clientId}`);
    return entities;
  } catch (error) {
    log(`ERROR getting entities: ${error.message}`);
    return [];
  }
}

/**
 * Manually create an entity for a client
 */
async function createEntity(clientId) {
  log(`Creating entity for client ${clientId}...`);
  
  const entityData = {
    name: `Default Entity for Client ${clientId}`,
    code: "DEFAULT",
    entityCode: `TST-${clientId}-001`,
    ownerId: 1, // Admin user ID
    clientId,
    active: true,
    fiscalYearStart: "01-01",
    fiscalYearEnd: "12-31",
    currency: "USD",
    timezone: "UTC",
    industry: "other",
    createdBy: 1 // Admin user ID
  };
  
  try {
    log(`Sending entity creation request with data: ${JSON.stringify(entityData)}`);
    
    const response = await fetch(`${API_BASE_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookieHeader()
      },
      body: JSON.stringify(entityData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Entity creation failed with status ${response.status}: ${errorText}`);
    }
    
    const newEntity = await response.json();
    log(`Entity created successfully with ID ${newEntity.id}`);
    return newEntity;
  } catch (error) {
    log(`ERROR creating entity: ${error.message}`);
    return null;
  }
}

/**
 * Seed Chart of Accounts for a client
 */
async function seedCoA(clientId) {
  log(`Seeding Chart of Accounts for client ${clientId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/seed-coa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': getCookieHeader()
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CoA seeding failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    log(`CoA seeding result: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    log(`ERROR seeding CoA: ${error.message}`);
    return null;
  }
}

/**
 * Get accounts for a client
 */
async function getAccounts(clientId) {
  log(`Getting accounts for client ${clientId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}/accounts`, {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get accounts with status ${response.status}: ${errorText}`);
    }
    
    const accounts = await response.json();
    log(`Found ${accounts.length} accounts for client ${clientId}`);
    return accounts;
  } catch (error) {
    log(`ERROR getting accounts: ${error.message}`);
    return [];
  }
}

/**
 * Run the full test procedure
 */
async function runTest() {
  log('Starting entity creation and CoA seeding test...');
  
  try {
    // Login first to ensure we have an auth cookie
    await login();
    
    // Step 1: Create a test client
    const client = await createTestClient();
    if (!client) {
      throw new Error('Failed to create test client');
    }
    
    // Step 2: Check if entities were automatically created
    const entities = await getEntities(client.id);
    if (entities.length === 0) {
      log('WARNING: No entities were automatically created during client creation');
      
      // Try to create entity manually
      log('Attempting to create entity manually...');
      const entity = await createEntity(client.id);
      if (!entity) {
        throw new Error('Failed to create entity manually');
      }
    }
    
    // Step 3: Check if accounts were automatically created
    const initialAccounts = await getAccounts(client.id);
    if (initialAccounts.length === 0) {
      log('WARNING: No accounts were automatically created during client creation');
      
      // Try to seed CoA manually
      log('Attempting to seed CoA manually...');
      const seedResult = await seedCoA(client.id);
      if (!seedResult || !seedResult.success) {
        throw new Error('Failed to seed CoA manually');
      }
      
      // Verify accounts after manual seeding
      const accountsAfterManualSeed = await getAccounts(client.id);
      if (accountsAfterManualSeed.length === 0) {
        throw new Error('No accounts found after manual CoA seeding');
      }
      
      log(`SUCCESS: CoA was manually seeded with ${accountsAfterManualSeed.length} accounts`);
    } else {
      log(`SUCCESS: CoA was automatically seeded with ${initialAccounts.length} accounts`);
    }
    
    log('Entity creation and CoA seeding test completed successfully');
  } catch (error) {
    log(`TEST FAILED: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  log('Test script completed');
});