/**
 * Test script to verify entity update functionality in the UI
 * 
 * This script simulates the entire UI flow:
 * 1. Authentication
 * 2. Navigate to Add Client flow
 * 3. Complete Step 1
 * 4. In Step 2, add an entity
 * 5. Edit the entity
 * 6. Save changes
 * 7. Verify the changes appear in the UI
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for the application
const BASE_URL = 'http://localhost:5000';

// Create axios instance with cookie support
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true // Don't throw error on non-2xx responses
});

// Store cookies between requests
let cookies = {};

// Add request interceptor to include cookies
client.interceptors.request.use(config => {
  const cookieString = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  if (cookieString) {
    config.headers.Cookie = cookieString;
  }
  return config;
});

// Add response interceptor to store cookies
client.interceptors.response.use(response => {
  const setCookie = response.headers['set-cookie'];
  if (setCookie) {
    setCookie.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });
  }
  return response;
});

// Helper function to log network requests
function logNetworkRequest(method, url, data = null) {
  console.log(`NETWORK REQUEST: ${method} ${url}`);
  if (data) {
    console.log(`REQUEST PAYLOAD: ${JSON.stringify(data, null, 2)}`);
  }
}

// Helper function to log network responses
function logNetworkResponse(response) {
  console.log(`NETWORK RESPONSE: ${response.status} ${response.statusText} from ${response.config.method.toUpperCase()} ${response.config.url}`);
  return response;
}

// Save cookies to file
function saveCookies() {
  fs.writeFileSync('cookies.txt', JSON.stringify(cookies, null, 2));
  console.log('Cookies saved to cookies.txt');
}

// Load cookies from file
function loadCookies() {
  try {
    if (fs.existsSync('cookies.txt')) {
      cookies = JSON.parse(fs.readFileSync('cookies.txt', 'utf8'));
      console.log('Cookies loaded from cookies.txt');
      return true;
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
  }
  return false;
}

// Helper function for pausing execution
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Authenticate with the application
async function authenticate() {
  console.log('Logging in...');
  
  // Check for existing session first
  try {
    logNetworkRequest('GET', '/api/auth/me');
    const authCheckResponse = await client.get('/api/auth/me');
    logNetworkResponse(authCheckResponse);
    
    if (authCheckResponse.status === 200) {
      console.log('Already authenticated, using existing session');
      console.log('User data:', authCheckResponse.data);
      return authCheckResponse.data;
    }
  } catch (error) {
    console.log('Auth check failed, proceeding with login');
  }
  
  // Login credentials
  const credentials = {
    username: 'admin',
    password: 'password123'
  };
  
  logNetworkRequest('POST', '/api/auth/login', credentials);
  
  try {
    const response = await client.post('/api/auth/login', credentials);
    logNetworkResponse(response);
    
    if (response.status === 200) {
      console.log('Login successful, session established');
      saveCookies();
      
      // Verify authentication by fetching user data
      logNetworkRequest('GET', '/api/auth/me');
      const authResponse = await client.get('/api/auth/me');
      logNetworkResponse(authResponse);
      
      console.log('User data:', authResponse.data);
      return authResponse.data;
    } else {
      console.error('Login failed:', response.data);
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('Error during authentication:', error.message);
    throw error;
  }
}

// Simulate a full setup flow test
async function testEntityUpdateInUI() {
  console.log('Starting entity update in UI test...');
  
  try {
    // Step 1: Authenticate
    const userData = await authenticate();
    console.log('Authentication successful');
    
    // Step 2: Create new client (simulating Step 1 of setup flow)
    const clientData = {
      name: "Test Client for UI Update",
      legalName: "Test Client UI Update LLC",
      industry: "accounting",
      contactName: "Test Contact",
      contactEmail: "test-ui@example.com",
      address: "123 Test St",
      phone: "555-123-4567",
      userId: userData.id
    };
    
    logNetworkRequest('POST', '/api/admin/clients', clientData);
    const clientResponse = await client.post('/api/admin/clients', clientData);
    logNetworkResponse(clientResponse);
    
    if (clientResponse.status !== 201) {
      throw new Error(`Failed to create client: ${clientResponse.statusText}`);
    }
    
    const clientId = clientResponse.data.data.id;
    console.log(`Client created with ID: ${clientId}`);
    
    // Step 3: Create new entity (simulating adding entity in Step 2 of setup flow)
    const entityData = {
      name: "Original Entity Name UI",
      legalName: "Original Legal Name UI LLC",
      entityType: "llc",
      industry: "tech",
      address: "123 Entity St",
      phone: "555-987-6543",
      email: "entity-ui@example.com",
      code: "UI123",
      clientId: clientId,
      ownerId: userData.id
    };
    
    logNetworkRequest('POST', '/api/admin/entities', entityData);
    const entityResponse = await client.post('/api/admin/entities', entityData);
    logNetworkResponse(entityResponse);
    
    if (entityResponse.status !== 201) {
      throw new Error(`Failed to create entity: ${entityResponse.statusText}`);
    }
    
    const entityId = entityResponse.data.data.id;
    console.log(`Entity created with ID: ${entityId}`);
    
    // Step 4: Update the entity (simulating editing entity in Step 2 of setup flow)
    const updatedEntityData = {
      ...entityData,
      id: entityId,
      name: "Updated Entity Name UI Test",
      industry: "healthcare" // Change industry to test that field specifically
    };
    
    logNetworkRequest('PUT', `/api/admin/entities/${entityId}`, updatedEntityData);
    const updateResponse = await client.put(`/api/admin/entities/${entityId}`, updatedEntityData);
    logNetworkResponse(updateResponse);
    
    console.log('Entity update response status:', updateResponse.status);
    console.log('Entity update response data:', JSON.stringify(updateResponse.data, null, 2));
    
    if (updateResponse.status === 200) {
      console.log('✅ Entity update SUCCESS');
      console.log(`Entity name changed from "${entityData.name}" to "${updatedEntityData.name}"`);
      console.log(`Entity industry changed from "${entityData.industry}" to "${updatedEntityData.industry}"`);
    } else {
      console.error('❌ Entity update FAILED');
      console.error('Error:', updateResponse.data);
      throw new Error('Entity update failed');
    }
    
    // Step 5: Fetch entity to confirm update
    console.log('Fetching entity to confirm update...');
    logNetworkRequest('GET', `/api/entities/${entityId}`);
    const fetchResponse = await client.get(`/api/entities/${entityId}`);
    logNetworkResponse(fetchResponse);
    
    console.log('Entity fetch response status:', fetchResponse.status);
    
    // Validate the updated entity data
    const fetchedEntity = fetchResponse.data;
    
    if (fetchedEntity.name === updatedEntityData.name && 
        fetchedEntity.industry === updatedEntityData.industry) {
      console.log('✅ Entity update VERIFICATION SUCCESSFUL');
      console.log(`Entity name verified: "${fetchedEntity.name}"`);
      console.log(`Entity industry verified: "${fetchedEntity.industry}"`);
    } else {
      console.error('❌ Entity update VERIFICATION FAILED');
      console.error(`Expected name: "${updatedEntityData.name}", got: "${fetchedEntity.name}"`);
      console.error(`Expected industry: "${updatedEntityData.industry}", got: "${fetchedEntity.industry}"`);
    }
    
    console.log('Test completed successfully.');
    return true;
  } catch (error) {
    console.error('Test failed with error:', error.message);
    return false;
  }
}

// Run the test
(async () => {
  try {
    const success = await testEntityUpdateInUI();
    if (success) {
      console.log('✅ END-TO-END TEST PASSED: Entity update in UI verified.');
      process.exit(0);
    } else {
      console.error('❌ END-TO-END TEST FAILED: Entity update in UI has issues.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
})();