/**
 * Test Script to Verify Client Field Saving
 * 
 * This script tests that all client fields, including contact fields and Tax ID, are correctly
 * saved and retrieved from the database.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import util from 'util';

// Logging helper
function log(...args) {
  console.log('[TEST]', ...args);
}

// Format JSON nicely for logging
function prettyJSON(obj) {
  return util.inspect(obj, { colors: true, depth: null });
}

// Get auth cookies from file if available
function getCookieHeader() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      return { Cookie: fs.readFileSync('./cookies.txt', 'utf8').trim() };
    }
  } catch (e) {
    console.error('Error reading cookie file:', e);
  }
  return {};
}

// Login to get auth cookie
async function login() {
  log('Logging in to get auth token...');
  
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'password'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  
  // Get and save cookies
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    fs.writeFileSync('./cookies.txt', cookies);
    log('Auth cookies saved.');
    return { Cookie: cookies };
  } else {
    throw new Error('No cookies received from login');
  }
}

// Create a test client with all fields populated
async function createTestClient(cookieHeader) {
  const clientData = {
    name: "Test Client Fields " + Date.now(),
    legalName: "Test Legal Name LLC",
    contactName: "John Contact",
    contactEmail: "john@test.example.com",
    contactPhone: "555-1234-5678",
    industry: "technology",
    address: "123 Test Ave, Suite 100",
    city: "Testville",
    state: "TS",
    country: "Testland",
    postalCode: "12345",
    website: "https://test.example.com",
    notes: "This is a test client for verifying field saving",
    taxId: "12-3456789",
    userId: 1,
    active: true
  };
  
  log('Creating test client with data:', prettyJSON(clientData));
  
  const response = await fetch('http://localhost:3000/api/admin/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...cookieHeader
    },
    body: JSON.stringify(clientData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create client: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  const result = await response.json();
  log('Client created successfully:', prettyJSON(result));
  return result.data;
}

// Get a client by ID
async function getClientById(clientId, cookieHeader) {
  log(`Fetching client with ID ${clientId}...`);
  
  const response = await fetch(`http://localhost:3000/api/admin/clients/${clientId}`, {
    headers: cookieHeader
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get client: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  log('Client fetched successfully:', prettyJSON(result));
  return result.data;
}

// Update a client
async function updateClient(clientId, updateData, cookieHeader) {
  log(`Updating client ${clientId} with data:`, prettyJSON(updateData));
  
  const response = await fetch(`http://localhost:3000/api/admin/clients/${clientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...cookieHeader
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update client: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  const result = await response.json();
  log('Client updated successfully:', prettyJSON(result));
  return result.data;
}

// Main test function
async function runTests() {
  try {
    log('Starting client field verification tests...');
    
    // Get auth cookies
    let cookieHeader = getCookieHeader();
    if (Object.keys(cookieHeader).length === 0) {
      cookieHeader = await login();
    }
    
    // Test 1: Create a client with all fields populated
    log('TEST 1: Create client with all fields populated');
    const newClient = await createTestClient(cookieHeader);
    
    // Test 2: Verify the client was created with all fields
    log('TEST 2: Verify client was created with all expected fields');
    const retrievedClient = await getClientById(newClient.id, cookieHeader);
    
    // Verify all contact fields and tax ID were saved
    const contactFieldCheck = {
      contactName: retrievedClient.contactName === "John Contact",
      contactEmail: retrievedClient.contactEmail === "john@test.example.com",
      contactPhone: retrievedClient.contactPhone === "555-1234-5678",
      taxId: retrievedClient.taxId === "12-3456789"
    };
    
    log('Contact field verification:', prettyJSON(contactFieldCheck));
    
    const allFieldsCorrect = Object.values(contactFieldCheck).every(val => val === true);
    if (allFieldsCorrect) {
      log('✅ SUCCESS: All contact fields and tax ID saved correctly');
    } else {
      log('❌ FAIL: Some fields were not saved correctly');
      // Identify which fields failed
      for (const [field, result] of Object.entries(contactFieldCheck)) {
        if (!result) {
          log(`  - Field '${field}' was not saved correctly. Expected value was not found.`);
          log(`    Actual value: ${retrievedClient[field]}`);
        }
      }
    }
    
    // Test 3: Update the client with new contact values
    log('TEST 3: Update client with new contact values');
    const updateData = {
      id: newClient.id,
      contactName: "Updated Contact",
      contactEmail: "updated@test.example.com",
      contactPhone: "999-8888-7777",
      taxId: "98-7654321",
      website: "https://updated.example.com"
    };
    
    const updatedClient = await updateClient(newClient.id, updateData, cookieHeader);
    
    // Test 4: Verify the updated fields were saved
    log('TEST 4: Verify updated fields were saved');
    const reRetrievedClient = await getClientById(newClient.id, cookieHeader);
    
    const updateFieldCheck = {
      contactName: reRetrievedClient.contactName === "Updated Contact",
      contactEmail: reRetrievedClient.contactEmail === "updated@test.example.com",
      contactPhone: reRetrievedClient.contactPhone === "999-8888-7777",
      taxId: reRetrievedClient.taxId === "98-7654321",
      website: reRetrievedClient.website === "https://updated.example.com"
    };
    
    log('Updated field verification:', prettyJSON(updateFieldCheck));
    
    const allUpdatesCorrect = Object.values(updateFieldCheck).every(val => val === true);
    if (allUpdatesCorrect) {
      log('✅ SUCCESS: All contact fields and tax ID updated correctly');
    } else {
      log('❌ FAIL: Some field updates were not saved correctly');
      // Identify which fields failed
      for (const [field, result] of Object.entries(updateFieldCheck)) {
        if (!result) {
          log(`  - Field '${field}' was not updated correctly.`);
          log(`    Expected: ${updateData[field]}`);
          log(`    Actual: ${reRetrievedClient[field]}`);
        }
      }
    }
    
    log('🏁 All tests completed!');
    
  } catch (error) {
    log('❌ ERROR:', error.message);
    console.error(error);
  }
}

// Run the tests
runTests();