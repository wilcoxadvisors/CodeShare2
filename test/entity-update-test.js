/**
 * Entity Update Test Script
 * Tests updating an entity with different industry values via direct API calls
 */

import fetch from 'node-fetch';
import { exit } from 'process';

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;
const USERNAME = 'admin';
const PASSWORD = 'password123';

// Global variables
let sessionCookie = '';
let createdEntityId = null;
let createdClientId = null;

// Authentication
async function authenticate() {
  console.log('Step 1: Authenticating as admin user...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD
      })
    });
    
    // Extract cookies for future requests
    const cookies = response.headers.get('set-cookie');
    sessionCookie = cookies;
    
    // Get user info to confirm
    const userResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log(`✅ Logged in as: ${user.username} (ID: ${user.id}, Role: ${user.role})`);
      return user.id;
    } else {
      throw new Error(`Failed to get user info: ${await userResponse.text()}`);
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

// Create a test client
async function createClient(userId) {
  console.log('\nStep 2: Creating test client...');
  
  const clientData = {
    name: 'Test Client for Entity Update',
    legalName: 'Test Client Legal Name',
    industry: 'technology',
    email: 'test-client@example.com',
    taxId: '123-45-6789',
    userId: userId
  };
  
  try {
    const response = await fetch(`${API_BASE}/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create client: ${await response.text()}`);
    }
    
    const result = await response.json();
    createdClientId = result.data.id;
    console.log(`✅ Created test client with ID: ${createdClientId}`);
    return createdClientId;
  } catch (error) {
    console.error('❌ Failed to create client:', error.message);
    throw error;
  }
}

// Create a test entity
async function createEntity(clientId) {
  console.log('\nStep 3: Creating test entity...');
  
  const entityData = {
    name: 'Test Entity for Update',
    legalName: 'Test Entity Legal Name',
    entityType: 'llc',
    industry: 'finance',
    taxId: '111-22-3333',
    clientId: clientId
  };
  
  try {
    const response = await fetch(`${API_BASE}/admin/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(entityData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create entity: ${await response.text()}`);
    }
    
    const result = await response.json();
    createdEntityId = result.data.id;
    console.log(`✅ Created test entity with ID: ${createdEntityId}`);
    console.log(`Entity data:`, JSON.stringify(result.data, null, 2));
    return createdEntityId;
  } catch (error) {
    console.error('❌ Failed to create entity:', error.message);
    throw error;
  }
}

// Update entity with different industry values
async function updateEntityIndustry(entityId, newIndustryValue) {
  console.log(`\nStep 4: Updating entity industry to: ${JSON.stringify(newIndustryValue)}`);
  
  const updateData = {
    // Includes minimal fields to simulate the UI update
    name: 'Test Entity for Update',
    industry: newIndustryValue
  };
  
  try {
    console.log(`Sending UPDATE request to: ${API_BASE}/admin/entities/${entityId}`);
    console.log(`Update payload:`, JSON.stringify(updateData, null, 2));
    
    const response = await fetch(`${API_BASE}/admin/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(updateData)
    });
    
    // Print the full response information
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Get response body
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to update entity: ${responseText}`);
    }
    
    try {
      const result = JSON.parse(responseText);
      console.log(`✅ Updated entity - Result:`, JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      console.log(`⚠️ Response was not valid JSON, but status was OK`);
      return { status: "success" };
    }
  } catch (error) {
    console.error('❌ Failed to update entity:', error.message);
    throw error;
  }
}

// Main test function
async function runTest() {
  console.log('===========================================================');
  console.log('ENTITY UPDATE TEST');
  console.log('Testing entity updates with different industry values');
  console.log('===========================================================\n');
  
  try {
    // Step 1: Authenticate
    const userId = await authenticate();
    
    // Step 2: Create client
    const clientId = await createClient(userId);
    
    // Step 3: Create entity
    const entityId = await createEntity(clientId);
    
    // Step 4: Update with different industry values
    console.log('\n=== TESTING INDUSTRY VALUE UPDATES ===');
    
    // Test 1: Valid string value
    await updateEntityIndustry(entityId, "healthcare");
    
    // Test 2: Numeric value (should be converted to string)
    await updateEntityIndustry(entityId, 123);
    
    // Test 3: Empty string (should default to "other")
    await updateEntityIndustry(entityId, "");
    
    // Test 4: null value (should default to "other")
    await updateEntityIndustry(entityId, null);
    
    // Test 5: undefined value (should leave existing value unchanged)
    await updateEntityIndustry(entityId, undefined);
    
    // Test 6: Multiple updates to catch potential edge cases
    await updateEntityIndustry(entityId, "technology");
    
    console.log('\n===========================================================');
    console.log('ENTITY UPDATE TEST RESULTS');
    console.log('===========================================================');
    console.log('✅ All tests completed');
    
    return true;
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    return false;
  }
}

// Execute the test
runTest().then(success => {
  console.log(`\nTest completed ${success ? 'successfully' : 'with errors'}.`);
  exit(success ? 0 : 1);
});