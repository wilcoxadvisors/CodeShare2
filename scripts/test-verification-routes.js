/**
 * Test script for verification routes
 * 
 * This script tests the newly added /api/clients and /api/entities routes
 * to ensure they work correctly for the verification scripts.
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const LOG_FILE = '../verification-logs/api-routes-test.log';
const CREDENTIALS_FILE = '../.auth-credentials';

// Ensure log directory exists
if (!fs.existsSync('../verification-logs')) {
  fs.mkdirSync('../verification-logs', { recursive: true });
}

// Initialize log file
fs.writeFileSync(LOG_FILE, `API Routes Test - ${new Date().toISOString()}\n\n`);

function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

async function getAdminCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const credentialsContent = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const credentials = JSON.parse(credentialsContent);
      return credentials;
    } else {
      log(chalk.red('Credentials file not found. Using default admin credentials.'));
      return { username: 'admin', password: 'password123' };
    }
  } catch (error) {
    log(chalk.red(`Error reading credentials: ${error.message}`));
    return { username: 'admin', password: 'password123' };
  }
}

async function login() {
  try {
    log(chalk.blue('Logging in as admin...'));
    const credentials = await getAdminCredentials();
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('No cookies received from authentication.');
    }
    
    // Extract session cookie
    const sessionCookie = setCookieHeader.split(';')[0];
    log(chalk.green('Login successful.'));
    
    return { cookie: sessionCookie };
  } catch (error) {
    log(chalk.red(`Login error: ${error.message}`));
    throw error;
  }
}

async function testClientRoutes(cookie) {
  log(chalk.blue('Testing client routes...'));
  
  try {
    // Test GET /api/clients
    log(chalk.blue('  Testing GET /api/clients...'));
    const getClientsResponse = await fetch(`${BASE_URL}/api/clients`, {
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    
    if (!getClientsResponse.ok) {
      throw new Error(`GET /api/clients failed: ${getClientsResponse.status} ${getClientsResponse.statusText}`);
    }
    
    const clients = await getClientsResponse.json();
    log(chalk.green(`  GET /api/clients successful, found ${clients.length} clients`));
    
    // Test POST /api/clients
    log(chalk.blue('  Testing POST /api/clients...'));
    const clientData = {
      name: `Test Client ${Date.now()}`,
      contactName: 'Test Contact',
      contactEmail: 'test@example.com',
      contactPhone: '555-123-4567',
      industry: 'technology',
      notes: 'Created by verification test script',
      active: true
    };
    
    const createClientResponse = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });
    
    if (!createClientResponse.ok) {
      const errorText = await createClientResponse.text();
      throw new Error(`POST /api/clients failed: ${createClientResponse.status} ${createClientResponse.statusText}\n${errorText}`);
    }
    
    const newClient = await createClientResponse.json();
    log(chalk.green(`  POST /api/clients successful, created client with ID ${newClient.id}`));
    
    // Test GET /api/clients/:id
    log(chalk.blue(`  Testing GET /api/clients/${newClient.id}...`));
    const getClientResponse = await fetch(`${BASE_URL}/api/clients/${newClient.id}`, {
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    
    if (!getClientResponse.ok) {
      throw new Error(`GET /api/clients/${newClient.id} failed: ${getClientResponse.status} ${getClientResponse.statusText}`);
    }
    
    const retrievedClient = await getClientResponse.json();
    log(chalk.green(`  GET /api/clients/${newClient.id} successful, retrieved client with name "${retrievedClient.name}"`));
    
    // Verify client fields
    const fieldsMatch = 
      retrievedClient.name === clientData.name &&
      retrievedClient.contactName === clientData.contactName &&
      retrievedClient.contactEmail === clientData.contactEmail &&
      retrievedClient.contactPhone === clientData.contactPhone;
    
    if (fieldsMatch) {
      log(chalk.green('  Client fields successfully persisted and retrieved'));
    } else {
      log(chalk.red('  Client fields do not match what was submitted:'));
      log(chalk.red(`    Expected: ${JSON.stringify(clientData)}`));
      log(chalk.red(`    Received: ${JSON.stringify(retrievedClient)}`));
    }
    
    return newClient;
  } catch (error) {
    log(chalk.red(`Error testing client routes: ${error.message}`));
    throw error;
  }
}

async function testEntityRoutes(cookie, clientId) {
  log(chalk.blue('Testing entity routes...'));
  
  try {
    // Test GET /api/entities
    log(chalk.blue('  Testing GET /api/entities...'));
    const getEntitiesResponse = await fetch(`${BASE_URL}/api/entities`, {
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    
    if (!getEntitiesResponse.ok) {
      throw new Error(`GET /api/entities failed: ${getEntitiesResponse.status} ${getEntitiesResponse.statusText}`);
    }
    
    const entities = await getEntitiesResponse.json();
    log(chalk.green(`  GET /api/entities successful, found ${entities.length} entities`));
    
    // Test POST /api/entities
    log(chalk.blue('  Testing POST /api/entities...'));
    const entityData = {
      name: `Test Entity ${Date.now()}`,
      clientId: clientId,
      legalName: 'Test Legal Entity',
      taxId: '12-3456789',
      entityType: 'llc',
      industry: 'technology',
      fiscalYearEnd: '12-31',
      address: '123 Test St',
      phone: '555-987-6543',
      email: 'entity@example.com',
      website: 'https://example.com',
      active: true
    };
    
    const createEntityResponse = await fetch(`${BASE_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entityData)
    });
    
    if (!createEntityResponse.ok) {
      const errorText = await createEntityResponse.text();
      throw new Error(`POST /api/entities failed: ${createEntityResponse.status} ${createEntityResponse.statusText}\n${errorText}`);
    }
    
    const newEntity = await createEntityResponse.json();
    log(chalk.green(`  POST /api/entities successful, created entity with ID ${newEntity.id}`));
    
    // Test GET /api/entities/:id
    log(chalk.blue(`  Testing GET /api/entities/${newEntity.id}...`));
    const getEntityResponse = await fetch(`${BASE_URL}/api/entities/${newEntity.id}`, {
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    
    if (!getEntityResponse.ok) {
      throw new Error(`GET /api/entities/${newEntity.id} failed: ${getEntityResponse.status} ${getEntityResponse.statusText}`);
    }
    
    const retrievedEntity = await getEntityResponse.json();
    log(chalk.green(`  GET /api/entities/${newEntity.id} successful, retrieved entity with name "${retrievedEntity.name}"`));
    
    // Verify entity fields
    const fieldsMatch = 
      retrievedEntity.name === entityData.name &&
      retrievedEntity.legalName === entityData.legalName &&
      retrievedEntity.taxId === entityData.taxId &&
      retrievedEntity.email === entityData.email;
    
    if (fieldsMatch) {
      log(chalk.green('  Entity fields successfully persisted and retrieved'));
    } else {
      log(chalk.red('  Entity fields do not match what was submitted:'));
      log(chalk.red(`    Expected: ${JSON.stringify(entityData)}`));
      log(chalk.red(`    Received: ${JSON.stringify(retrievedEntity)}`));
    }
    
    // Test setting entity inactive
    log(chalk.blue(`  Testing POST /api/entities/${newEntity.id}/set-inactive...`));
    const setInactiveResponse = await fetch(`${BASE_URL}/api/entities/${newEntity.id}/set-inactive`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    
    if (!setInactiveResponse.ok) {
      throw new Error(`POST /api/entities/${newEntity.id}/set-inactive failed: ${setInactiveResponse.status} ${setInactiveResponse.statusText}`);
    }
    
    const inactiveEntity = await setInactiveResponse.json();
    if (inactiveEntity.active === false && inactiveEntity.deletedAt === null) {
      log(chalk.green('  Entity set to inactive successfully (active=false, deletedAt=null)'));
    } else {
      log(chalk.red(`  Failed to set entity to inactive: active=${inactiveEntity.active}, deletedAt=${inactiveEntity.deletedAt}`));
    }
    
    // Test soft deleting entity
    log(chalk.blue(`  Testing DELETE /api/entities/${newEntity.id}...`));
    const deleteResponse = await fetch(`${BASE_URL}/api/entities/${newEntity.id}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookie }
    });
    
    if (!deleteResponse.ok) {
      throw new Error(`DELETE /api/entities/${newEntity.id} failed: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
    
    const deletedEntity = await deleteResponse.json();
    if (deletedEntity.active === false && deletedEntity.deletedAt !== null) {
      log(chalk.green('  Entity soft-deleted successfully (active=false, deletedAt has timestamp)'));
    } else {
      log(chalk.red(`  Failed to soft-delete entity: active=${deletedEntity.active}, deletedAt=${deletedEntity.deletedAt}`));
    }
    
    // Test restoring entity
    log(chalk.blue(`  Testing POST /api/entities/${newEntity.id}/restore...`));
    const restoreResponse = await fetch(`${BASE_URL}/api/entities/${newEntity.id}/restore`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    
    if (!restoreResponse.ok) {
      throw new Error(`POST /api/entities/${newEntity.id}/restore failed: ${restoreResponse.status} ${restoreResponse.statusText}`);
    }
    
    const restoredEntity = await restoreResponse.json();
    if (restoredEntity.active === true && restoredEntity.deletedAt === null) {
      log(chalk.green('  Entity restored successfully (active=true, deletedAt=null)'));
    } else {
      log(chalk.red(`  Failed to restore entity: active=${restoredEntity.active}, deletedAt=${restoredEntity.deletedAt}`));
    }
    
    return newEntity;
  } catch (error) {
    log(chalk.red(`Error testing entity routes: ${error.message}`));
    throw error;
  }
}

async function runTests() {
  try {
    log(chalk.blue('Starting API routes verification tests...'));
    
    // Login first
    const { cookie } = await login();
    
    // Test client routes
    const createdClient = await testClientRoutes(cookie);
    
    // Test entity routes using the client we created
    await testEntityRoutes(cookie, createdClient.id);
    
    log(chalk.green('All API route tests completed successfully!'));
  } catch (error) {
    log(chalk.red(`Test failed: ${error.message}`));
    process.exit(1);
  }
}

// Run tests
runTests();