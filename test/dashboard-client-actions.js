/**
 * Comprehensive Dashboard Client Actions Test Script
 * 
 * This script tests the following client actions:
 * 1. Authentication
 * 2. Dashboard data loading
 * 3. View client details
 * 4. Edit client information
 * 5. Edit entity within client
 * 6. Toggle entity status
 * 7. Client deactivation/activation
 */

import fetch from 'node-fetch';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base URL for the API
const API_BASE_URL = 'http://localhost:5000';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Store session information
let SESSION_COOKIE = null;
let TEST_CLIENT_ID = null;
let TEST_ENTITY_ID = null;

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Add session cookie if available
  if (SESSION_COOKIE) {
    options.headers = {
      ...options.headers,
      'Cookie': SESSION_COOKIE
    };
  }
  
  console.log(`\nRequest: ${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log('Request Body:', JSON.stringify(JSON.parse(options.body), null, 2));
  }
  
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`Response Status: ${response.status}`);
    
    // Try to parse response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      if (responseData) {
        console.log('Response Data:', JSON.stringify(responseData, null, 2));
      }
    } catch (e) {
      console.log('Response is not JSON:', responseText.substring(0, 500));
    }
    
    // Check if we received a Set-Cookie header and store it
    if (response.headers.get('set-cookie')) {
      SESSION_COOKIE = response.headers.get('set-cookie');
      console.log('New session cookie received');
    }
    
    return { 
      status: response.status, 
      data: responseData,
      ok: response.ok
    };
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    return { 
      status: 500, 
      data: { error: error.message },
      ok: false
    };
  }
}

/**
 * Step 1: Authenticate with admin credentials
 */
async function authenticate() {
  console.log('\n----- TESTING: Admin Authentication -----');
  
  const response = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(ADMIN_CREDENTIALS)
  });
  
  if (response.ok && (response.data?.user || response.data?.status === 'success')) {
    console.log('✅ SUCCESS: Authentication successful');
    return true;
  } else {
    console.log('❌ FAILURE: Authentication failed');
    return false;
  }
}

/**
 * Step 2: Fetch dashboard data
 */
async function fetchDashboardData() {
  console.log('\n----- TESTING: Fetch Dashboard Data -----');
  
  const response = await apiRequest('/api/admin/dashboard');
  
  if (response.ok && response.data?.status === 'success' && response.data?.data?.clients?.length > 0) {
    console.log(`✅ SUCCESS: Dashboard data loaded with ${response.data.data.clients.length} clients`);
    
    // Select a client for testing
    TEST_CLIENT_ID = response.data.data.clients[0].id;
    console.log(`Selected client ID ${TEST_CLIENT_ID} for testing`);
    
    return true;
  } else {
    console.log('❌ FAILURE: Failed to load dashboard data');
    return false;
  }
}

/**
 * Step 3: Test viewing client details
 */
async function testViewClientDetails() {
  console.log('\n----- TESTING: View Client Details -----');
  
  if (!TEST_CLIENT_ID) {
    console.log('❌ FAILURE: No client ID available for testing');
    return false;
  }
  
  const response = await apiRequest(`/api/admin/clients/${TEST_CLIENT_ID}`);
  
  if (response.ok && response.data?.status === 'success' && response.data?.data?.id === TEST_CLIENT_ID) {
    console.log('✅ SUCCESS: Client details loaded successfully');
    
    // Store an entity ID for later testing
    if (response.data.data.entities && response.data.data.entities.length > 0) {
      TEST_ENTITY_ID = response.data.data.entities[0].id;
      console.log(`Selected entity ID ${TEST_ENTITY_ID} for testing`);
    } else {
      console.log('No entities found for this client');
    }
    
    return true;
  } else {
    console.log('❌ FAILURE: Failed to load client details');
    return false;
  }
}

/**
 * Step 4: Test editing client information
 */
async function testEditClient() {
  console.log('\n----- TESTING: Edit Client Information -----');
  
  if (!TEST_CLIENT_ID) {
    console.log('❌ FAILURE: No client ID available for testing');
    return false;
  }
  
  // First, get current client details
  const getResponse = await apiRequest(`/api/admin/clients/${TEST_CLIENT_ID}`);
  
  if (!getResponse.ok || getResponse.data?.status !== 'success') {
    console.log('❌ FAILURE: Failed to get client details before update');
    return false;
  }
  
  // Update the client information
  const clientUpdateData = {
    ...getResponse.data.data,
    contactName: `Test Contact ${Date.now()}`,
    notes: `Updated via automated test at ${new Date().toISOString()}`
  };
  
  // Remove entities from update data to avoid sending them
  delete clientUpdateData.entities;
  
  const updateResponse = await apiRequest(`/api/admin/clients/${TEST_CLIENT_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(clientUpdateData)
  });
  
  if (updateResponse.ok && updateResponse.data?.status === 'success') {
    console.log('✅ SUCCESS: Client updated successfully');
    return true;
  } else {
    console.log('❌ FAILURE: Failed to update client');
    return false;
  }
}

/**
 * Step 5: Test editing an entity within a client
 */
async function testEditEntity() {
  console.log('\n----- TESTING: Edit Entity -----');
  
  if (!TEST_ENTITY_ID) {
    console.log('❌ FAILURE: No entity ID available for testing');
    return false;
  }
  
  // First, get entity details
  const getResponse = await apiRequest(`/api/admin/entities/${TEST_ENTITY_ID}`);
  
  if (!getResponse.ok || getResponse.data?.status !== 'success') {
    console.log('❌ FAILURE: Failed to get entity details before update');
    // Make fallback request if the admin route doesn't exist
    const fallbackResponse = await apiRequest(`/api/entities/${TEST_ENTITY_ID}`);
    
    if (!fallbackResponse.ok) {
      return false;
    }
    
    // Continue with fallback data
    console.log('Using alternative API endpoint for entity details');
    getResponse.data = {
      status: 'success',
      data: fallbackResponse.data
    };
  }
  
  // Update the entity information
  const entityData = getResponse.data.data || getResponse.data;
  const entityUpdateData = {
    ...entityData,
    name: `${entityData.name} (Updated)`,
    phone: `${entityData.phone || '555-1234'}-${Math.floor(Math.random() * 100)}`
  };
  
  const updateResponse = await apiRequest(`/api/admin/entities/${TEST_ENTITY_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entityUpdateData)
  });
  
  if (updateResponse.ok && updateResponse.data?.status === 'success') {
    console.log('✅ SUCCESS: Entity updated successfully');
    return true;
  } else {
    console.log('❌ FAILURE: Failed to update entity');
    // Try fallback endpoint
    const fallbackResponse = await apiRequest(`/api/entities/${TEST_ENTITY_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entityUpdateData)
    });
    
    if (fallbackResponse.ok && (fallbackResponse.data?.status === 'success' || fallbackResponse.data?.id)) {
      console.log('✅ SUCCESS: Entity updated successfully (via alternate endpoint)');
      return true;
    }
    
    return false;
  }
}

/**
 * Step 6: Test toggling entity status
 */
async function testToggleEntityStatus() {
  console.log('\n----- TESTING: Toggle Entity Status -----');
  
  if (!TEST_ENTITY_ID) {
    console.log('❌ FAILURE: No entity ID available for testing');
    return false;
  }
  
  // First, get entity details
  const getResponse = await apiRequest(`/api/admin/entities/${TEST_ENTITY_ID}`);
  
  if (!getResponse.ok || getResponse.data?.status !== 'success') {
    console.log('❌ FAILURE: Failed to get entity details before status toggle');
    // Try fallback endpoint
    const fallbackResponse = await apiRequest(`/api/entities/${TEST_ENTITY_ID}`);
    
    if (!fallbackResponse.ok) {
      return false;
    }
    
    // Continue with fallback data
    console.log('Using alternative API endpoint for entity details');
    getResponse.data = {
      status: 'success',
      data: fallbackResponse.data
    };
  }
  
  // Toggle the active status
  const entityData = getResponse.data.data || getResponse.data;
  const currentStatus = !!entityData.active;
  const entityUpdateData = {
    ...entityData,
    active: !currentStatus
  };
  
  console.log(`Toggling entity status from ${currentStatus ? 'active' : 'inactive'} to ${!currentStatus ? 'active' : 'inactive'}`);
  
  const updateResponse = await apiRequest(`/api/admin/entities/${TEST_ENTITY_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entityUpdateData)
  });
  
  if (updateResponse.ok && updateResponse.data?.status === 'success') {
    console.log('✅ SUCCESS: Entity status toggled successfully');
    
    // Toggle it back to original state
    entityUpdateData.active = currentStatus;
    
    console.log('Toggling entity status back to original state');
    
    const revertResponse = await apiRequest(`/api/admin/entities/${TEST_ENTITY_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entityUpdateData)
    });
    
    if (revertResponse.ok && revertResponse.data?.status === 'success') {
      console.log('✅ SUCCESS: Entity status restored to original state');
    } else {
      console.log('❌ WARNING: Failed to restore entity to original status');
    }
    
    return true;
  } else {
    console.log('❌ FAILURE: Failed to toggle entity status');
    // Try fallback endpoint
    const fallbackResponse = await apiRequest(`/api/entities/${TEST_ENTITY_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entityUpdateData)
    });
    
    if (fallbackResponse.ok && (fallbackResponse.data?.status === 'success' || fallbackResponse.data?.id)) {
      console.log('✅ SUCCESS: Entity status toggled successfully (via alternate endpoint)');
      
      // Toggle it back
      entityUpdateData.active = currentStatus;
      
      const revertResponse = await apiRequest(`/api/entities/${TEST_ENTITY_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entityUpdateData)
      });
      
      if (revertResponse.ok && (revertResponse.data?.status === 'success' || revertResponse.data?.id)) {
        console.log('✅ SUCCESS: Entity status restored to original state (via alternate endpoint)');
      }
      
      return true;
    }
    
    return false;
  }
}

/**
 * Step 7: Test client deactivation and reactivation
 */
async function testClientDeactivation() {
  console.log('\n----- TESTING: Client Deactivation & Reactivation -----');
  
  if (!TEST_CLIENT_ID) {
    console.log('❌ FAILURE: No client ID available for testing');
    return false;
  }
  
  // First, get client details
  const getResponse = await apiRequest(`/api/admin/clients/${TEST_CLIENT_ID}`);
  
  if (!getResponse.ok || getResponse.data?.status !== 'success') {
    console.log('❌ FAILURE: Failed to get client details before status change');
    return false;
  }
  
  // Get the current active status
  const currentStatus = !!getResponse.data.data.active;
  
  // Prepare update with opposite status
  const clientUpdateData = {
    ...getResponse.data.data,
    active: !currentStatus
  };
  
  // Remove entities from update data to avoid sending them
  delete clientUpdateData.entities;
  
  console.log(`Changing client status from ${currentStatus ? 'active' : 'inactive'} to ${!currentStatus ? 'active' : 'inactive'}`);
  
  // Update the client status
  const updateResponse = await apiRequest(`/api/admin/clients/${TEST_CLIENT_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(clientUpdateData)
  });
  
  if (updateResponse.ok && updateResponse.data?.status === 'success') {
    console.log('✅ SUCCESS: Client status changed successfully');
    
    // Change back to original status
    clientUpdateData.active = currentStatus;
    
    console.log('Restoring client to original status');
    
    const revertResponse = await apiRequest(`/api/admin/clients/${TEST_CLIENT_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientUpdateData)
    });
    
    if (revertResponse.ok && revertResponse.data?.status === 'success') {
      console.log('✅ SUCCESS: Client status restored to original state');
    } else {
      console.log('❌ WARNING: Failed to restore client to original status');
    }
    
    return true;
  } else {
    console.log('❌ FAILURE: Failed to change client status');
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('==================================================');
  console.log('DASHBOARD CLIENT ACTIONS TEST SUITE');
  console.log('==================================================');
  
  const startTime = Date.now();
  
  // Keep track of passed tests
  const results = {
    authentication: false,
    dashboardData: false,
    viewClientDetails: false,
    editClient: false,
    editEntity: false,
    toggleEntityStatus: false, 
    clientDeactivation: false
  };
  
  try {
    // Step 1: Authentication
    results.authentication = await authenticate();
    if (!results.authentication) {
      throw new Error('Authentication failed, aborting tests');
    }
    
    // Step 2: Fetch dashboard data
    results.dashboardData = await fetchDashboardData();
    if (!results.dashboardData) {
      throw new Error('Failed to fetch dashboard data, aborting tests');
    }
    
    // Step 3: View client details
    results.viewClientDetails = await testViewClientDetails();
    
    // Step 4: Edit client information
    results.editClient = await testEditClient();
    
    // Step 5: Edit entity
    if (TEST_ENTITY_ID) {
      results.editEntity = await testEditEntity();
      
      // Step 6: Toggle entity status
      results.toggleEntityStatus = await testToggleEntityStatus();
    } else {
      console.log('\n⚠️ WARNING: Skipping entity tests because no entity ID was found');
    }
    
    // Step 7: Test client deactivation and reactivation
    results.clientDeactivation = await testClientDeactivation();
    
  } catch (error) {
    console.error('\n⚠️ ERROR: Test execution interrupted', error.message);
  }
  
  // Print results summary
  console.log('\n==================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('==================================================');
  
  let passedTests = 0;
  const totalTests = Object.keys(results).length;
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
    if (passed) passedTests++;
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n--------------------------------------------------');
  console.log(`Tests completed in ${duration.toFixed(2)} seconds`);
  console.log(`${passedTests} of ${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
  console.log('==================================================');
  
  // Save results to file
  const resultOutput = `
Dashboard Client Actions Test Results
=====================================
Timestamp: ${new Date().toISOString()}
Pass Rate: ${passedTests} of ${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)
Duration: ${duration.toFixed(2)} seconds

Test Results:
${Object.entries(results).map(([test, passed]) => `- ${test}: ${passed ? 'PASSED' : 'FAILED'}`).join('\n')}
`;

  fs.writeFileSync('test-results-dashboard-actions.txt', resultOutput);
  console.log('Results saved to test-results-dashboard-actions.txt');
}

// Run the tests
runTests();