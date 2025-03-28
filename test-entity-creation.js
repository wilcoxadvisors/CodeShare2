/**
 * Entity Creation Test with Detailed Logging
 * 
 * This script simulates the entity creation flow while providing detailed logging
 * specifically focused on the industry field handling.
 */

import axios from 'axios';
import fs from 'fs';

// Configuration
const API_URL = 'http://localhost:4000'; // The server URL
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Store cookies for authenticated requests
let cookies = [];

function logHeader(text) {
  console.log('\n' + '='.repeat(80));
  console.log(text);
  console.log('='.repeat(80) + '\n');
}

function logRequest(method, url, data = null) {
  console.log(`🌐 ${method} ${url}`);
  if (data) {
    console.log('📦 Request data:', JSON.stringify(data, null, 2));
  }
}

function logResponse(response) {
  console.log('✅ Response status:', response.status);
  console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
}

function logError(error) {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('📦 Response status:', error.response.status);
    console.error('📦 Response data:', error.response.data);
  }
}

// Configure axios to handle cookies
axios.defaults.withCredentials = true;

async function runTest() {
  logHeader('STARTING ENTITY CREATION TEST WITH DETAILED LOGGING');

  try {
    // Step 1: Authentication
    logHeader('STEP 1: AUTHENTICATION');
    logRequest('POST', '/api/auth/login', ADMIN_CREDENTIALS);
    
    const authResponse = await axios.post(`${API_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    logResponse(authResponse);
    
    // Save cookies
    if (authResponse.headers['set-cookie']) {
      cookies = authResponse.headers['set-cookie'];
      console.log('🍪 Cookies received:', cookies);
    }
    
    // Configure axios to send the cookies with subsequent requests
    axios.defaults.headers.Cookie = cookies.join('; ');
    
    console.log('👤 Authenticated as admin');
    
    // Verify authentication
    logRequest('GET', '/api/auth/me');
    const meResponse = await axios.get(`${API_URL}/api/auth/me`);
    logResponse(meResponse);
    console.log('✅ Authentication confirmed');

    // Step 2: Create a client (required for entity creation)
    logHeader('STEP 2: CREATE CLIENT');
    
    const timestamp = Date.now();
    const clientData = {
      name: `Test Client ${timestamp}`,
      contactName: 'Test Contact',
      industry: 'technology',
      phone: '555-123-4567',
      email: 'test@example.com',
      ownerId: 1
    };
    
    logRequest('POST', '/api/admin/clients', clientData);
    const clientResponse = await axios.post(`${API_URL}/api/admin/clients`, clientData);
    logResponse(clientResponse);
    
    const clientId = clientResponse.data.data.id;
    console.log(`✅ Client created with ID: ${clientId}`);

    // Test different industry scenarios
    await testIndustryCase(clientId, 'String Value', 'technology', 'Test Case 1: String Industry Value');
    await testIndustryCase(clientId, 'Numeric Value', 123, 'Test Case 2: Numeric Industry Value');
    await testIndustryCase(clientId, 'Empty String', '', 'Test Case 3: Empty String Industry Value');
    await testIndustryCase(clientId, 'Null Value', null, 'Test Case 4: Null Industry Value');
    
    logHeader('ENTITY CREATION TEST SUMMARY');
    console.log('✅ All test cases executed');

  } catch (error) {
    logError(error);
  }
}

async function testIndustryCase(clientId, caseName, industryValue, description) {
  logHeader(description);
  
  const timestamp = Date.now();
  const entityData = {
    name: `${caseName} Entity ${timestamp}`,
    legalName: `Test ${caseName} Legal Name`,
    clientId: clientId,
    entityType: 'llc',
    industry: industryValue,
    taxId: '12-3456789',
    address: '123 Test Street',
    phone: '555-987-6543',
    email: 'entity@example.com',
    ownerId: 1,
    code: `TE${Math.floor(Math.random() * 1000)}`
  };
  
  console.log(`🏢 Creating entity with industry value: ${industryValue} (${typeof industryValue})`);
  logRequest('POST', '/api/admin/entities', entityData);
  
  try {
    const entityResponse = await axios.post(`${API_URL}/api/admin/entities`, entityData);
    logResponse(entityResponse);
    
    const entityId = entityResponse.data.data.id;
    const storedIndustry = entityResponse.data.data.industry;
    
    console.log(`✅ Entity created with ID: ${entityId}`);
    console.log(`👁️ Sent industry value: ${industryValue} (${typeof industryValue})`);
    console.log(`👁️ Stored industry value: "${storedIndustry}" (${typeof storedIndustry})`);
    
    // Analyze results
    if (storedIndustry === null) {
      console.log('❌ ISSUE: Industry was stored as NULL despite being set in request');
    } else if (typeof storedIndustry === 'string' && industryValue !== null && storedIndustry !== String(industryValue) && storedIndustry !== 'other') {
      console.log('⚠️ NOTE: Industry was stored but with modified value');
    } else {
      console.log('✅ Industry value handling was as expected');
    }
    
    // Verify entity by ID 
    logRequest('GET', `/api/admin/entities/${entityId}`);
    const verifyResponse = await axios.get(`${API_URL}/api/admin/entities/${entityId}`);
    const verifiedIndustry = verifyResponse.data.industry;
    console.log(`👁️ Verified industry value: "${verifiedIndustry}" (${typeof verifiedIndustry})`);
    
    return entityId;
  } catch (error) {
    logError(error);
    return null;
  }
}

// Run the test
runTest().catch(console.error);