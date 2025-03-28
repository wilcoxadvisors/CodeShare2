/**
 * Test script to verify entity update functionality in the UI
 * 
 * This script simulates the complete UI flow:
 * 1. Authentication
 * 2. Navigate to Admin Dashboard -> Add Client setup flow
 * 3. Complete Step 1 (Enter client data)
 * 4. In Step 2, add a new entity
 * 5. Edit the entity and update the industry field
 * 6. Save changes and verify the update works correctly
 */

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const AUTH_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Store cookies for session persistence
let cookies = '';

// Utility functions for logging
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`${title.toUpperCase()}`);
  console.log('='.repeat(80));
}

function logNetworkRequest(method, url, data = null) {
  console.log(`🌐 REQUEST: ${method} ${url}`);
  if (data) {
    console.log('📦 REQUEST DATA:', JSON.stringify(data, null, 2));
  }
}

function logNetworkResponse(response) {
  console.log(`✅ RESPONSE: Status ${response.status}`);
  if (response.data) {
    console.log('📦 RESPONSE DATA:', JSON.stringify(response.data, null, 2).substring(0, 500));
    if (JSON.stringify(response.data).length > 500) {
      console.log('... (response truncated)');
    }
  }
}

// Custom API client with cookie handling
async function api(method, path, data = null) {
  const url = API_BASE_URL + path;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    credentials: 'include'
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    // Extract and save cookie
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      cookies = setCookieHeader.split(';')[0];
      console.log('🍪 Cookie received:', cookies);
    }
    
    // Handle non-JSON responses gracefully
    let responseData;
    try {
      responseData = await response.json();
    } catch (err) {
      responseData = { message: 'Non-JSON response received' };
    }
    
    return {
      status: response.status,
      data: responseData,
      ok: response.ok
    };
  } catch (error) {
    console.error('❌ Network error:', error.message);
    throw error;
  }
}

// Main test function
async function testEntityUpdateInUI() {
  try {
    logSection('Starting entity update UI simulation test');
    
    // Step 1: Authenticate
    logSection('Step 1: Authentication');
    logNetworkRequest('POST', '/api/auth/login', AUTH_CREDENTIALS);
    
    const authResponse = await api('POST', '/api/auth/login', AUTH_CREDENTIALS);
    
    if (!authResponse.ok) {
      throw new Error('Authentication failed: ' + JSON.stringify(authResponse.data));
    }
    
    logNetworkResponse(authResponse);
    console.log('👤 Authenticated as:', authResponse.data.user.username);
    
    // Set cookie for future requests (from cookie file)
    const sessionID = authResponse.data.sessionID;
    cookies = `connect.sid=s%3A${sessionID}`;
    console.log('🍪 Using cookie for future requests:', cookies);
    
    // Verify authentication
    logNetworkRequest('GET', '/api/auth/me');
    const meResponse = await api('GET', '/api/auth/me', null);
    // Add a small delay to ensure session is properly established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!meResponse.ok) {
      throw new Error('Authentication verification failed: ' + JSON.stringify(meResponse.data));
    }
    
    logNetworkResponse(meResponse);
    console.log('✅ Authentication verified');
    
    // Step 2: Create a client (simulate Step 1 of setup flow)
    logSection('Step 2: Create client (Setup Step 1)');
    const clientData = {
      name: 'Test Client ' + Date.now(),
      contactName: 'Test Contact',
      industry: 'technology',
      phone: '555-123-4567',
      email: 'test@example.com',
      ownerId: 1 // Admin user ID
    };
    
    logNetworkRequest('POST', '/api/admin/clients', clientData);
    const clientResponse = await api('POST', '/api/admin/clients', clientData);
    
    if (!clientResponse.ok) {
      throw new Error('Client creation failed: ' + JSON.stringify(clientResponse.data));
    }
    
    logNetworkResponse(clientResponse);
    const createdClient = clientResponse.data.data;
    console.log('✅ Client created with ID:', createdClient.id);
    
    // Step 3: Add entity (simulate Step 2 of setup flow)
    logSection('Step 3: Add entity (Setup Step 2)');
    const entityData = {
      name: 'Test Entity ' + Date.now(),
      legalName: 'Test Entity Legal Name',
      clientId: createdClient.id,
      entityType: 'llc',
      industry: 'technology', // Initial industry
      taxId: '12-3456789',
      address: '123 Test Street',
      phone: '555-987-6543',
      email: 'entity@example.com',
      ownerId: 1, // Admin user ID
      code: 'TE' + Math.floor(Math.random() * 1000)
    };
    
    logNetworkRequest('POST', '/api/admin/entities', entityData);
    const entityResponse = await api('POST', '/api/admin/entities', entityData);
    
    if (!entityResponse.ok) {
      throw new Error('Entity creation failed: ' + JSON.stringify(entityResponse.data));
    }
    
    logNetworkResponse(entityResponse);
    const createdEntity = entityResponse.data.data;
    console.log('✅ Entity created with ID:', createdEntity.id);
    
    // Step 4: Edit entity - change industry (simulate Edit button click in UI)
    logSection('Step 4: Edit entity - change industry');
    const updatedEntityData = {
      ...createdEntity,
      industry: 'finance', // Change industry from technology to finance
      name: createdEntity.name + ' (Updated)'
    };
    
    logNetworkRequest('PUT', `/api/admin/entities/${createdEntity.id}`, updatedEntityData);
    const updateResponse = await api('PUT', `/api/admin/entities/${createdEntity.id}`, updatedEntityData);
    
    if (!updateResponse.ok) {
      throw new Error('Entity update failed: ' + JSON.stringify(updateResponse.data));
    }
    
    logNetworkResponse(updateResponse);
    console.log('✅ Entity updated successfully');
    
    // Verify the update
    const updatedEntity = updateResponse.data.data;
    if (updatedEntity.industry === 'finance' && updatedEntity.name.includes('(Updated)')) {
      console.log('✅ VERIFICATION: Entity industry and name were updated correctly');
    } else {
      console.error('❌ VERIFICATION: Entity update verification failed');
      console.error('Expected industry: finance, Actual:', updatedEntity.industry);
      console.error('Expected name to include "(Updated)", Actual:', updatedEntity.name);
      throw new Error('Entity update verification failed');
    }
    
    // Step 5: Verify entity update in dashboard data (simulate dashboard refresh)
    logSection('Step 5: Verify entity update in dashboard data');
    logNetworkRequest('GET', '/api/admin/dashboard');
    const dashboardResponse = await api('GET', '/api/admin/dashboard');
    
    if (!dashboardResponse.ok) {
      throw new Error('Dashboard data verification failed: ' + JSON.stringify(dashboardResponse.data));
    }
    
    logNetworkResponse(dashboardResponse);
    
    // Find our updated entity in the dashboard data
    const entities = dashboardResponse.data.entities;
    const updatedEntityInDashboard = entities.find(e => e.id === createdEntity.id);
    
    if (updatedEntityInDashboard) {
      console.log('✅ Entity found in dashboard data:', updatedEntityInDashboard);
      
      if (updatedEntityInDashboard.industry === 'finance' && updatedEntityInDashboard.name.includes('(Updated)')) {
        console.log('✅ FINAL VERIFICATION: Entity updates are correctly reflected in dashboard data');
      } else {
        console.error('❌ FINAL VERIFICATION: Entity updates not properly reflected in dashboard');
        console.error('Expected industry: finance, Actual:', updatedEntityInDashboard.industry);
        console.error('Expected name to include "(Updated)", Actual:', updatedEntityInDashboard.name);
        throw new Error('Entity updates not properly reflected in dashboard');
      }
    } else {
      console.error('❌ FINAL VERIFICATION: Updated entity not found in dashboard data');
      throw new Error('Updated entity not found in dashboard data');
    }
    
    logSection('TEST COMPLETED SUCCESSFULLY');
    return {
      success: true,
      client: createdClient,
      entity: createdEntity
    };
  } catch (error) {
    logSection('TEST FAILED');
    console.error('💥 Test error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testEntityUpdateInUI()
  .then(result => {
    console.log('\nFinal test result:', result.success ? 'SUCCESS ✅' : 'FAILURE ❌');
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled test error:', err);
    process.exit(1);
  });