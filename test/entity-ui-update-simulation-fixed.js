/**
 * Entity Update UI Simulation
 * Simulates entity updates exactly as they would occur from the UI with complete payload
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
let clientId = null;
let entityId = null;

// Authenticate
async function authenticate() {
  console.log('Authenticating as admin user...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
      redirect: 'manual' // Don't automatically follow redirects
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }
    
    // Get the cookie from the Set-Cookie header
    const cookieHeader = response.headers.get('set-cookie');
    if (!cookieHeader) {
      throw new Error('No cookie returned from authentication');
    }
    
    // Extract just the connect.sid part from the cookie
    const match = cookieHeader.match(/connect\.sid=[^;]+/);
    if (match) {
      sessionCookie = match[0];
      console.log(`Extracted session cookie: ${sessionCookie}`);
    } else {
      sessionCookie = cookieHeader;
      console.log(`Using full cookie: ${sessionCookie}`);
    }
    
    // Now verify we're actually logged in by checking the me endpoint
    const verifyResponse = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      },
      redirect: 'manual' // Don't automatically follow redirects
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Authentication verification failed: ${verifyResponse.status}`);
    }
    
    const userData = await verifyResponse.json();
    console.log(`✅ Authentication successful for user: ${userData.username} (${userData.role})`);
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Create client - simulates Step 1 in the setup flow
async function createClient() {
  console.log('\nCreating test client (Step 1)...');
  
  const clientData = {
    name: 'UI Simulation Client',
    legalName: 'UI Simulation Legal Name',
    industry: 'technology',
    email: 'ui-sim@example.com',
    taxId: '123-45-6789'
  };
  
  try {
    const response = await fetch(`${API_BASE}/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(clientData),
      redirect: 'manual' // Don't follow redirects
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create client: ${await response.text()}`);
    }
    
    const result = await response.json();
    clientId = result.data.id;
    console.log(`✅ Created client with ID: ${clientId}`);
    return clientId;
  } catch (error) {
    console.error('❌ Failed to create client:', error.message);
    throw error;
  }
}

// Create entity - simulates adding entity in Step 2
async function createEntity() {
  console.log('\nCreating test entity (Step 2)...');
  
  // This matches the exact format from the UI component
  const entityData = {
    name: 'UI Simulation Entity',
    legalName: 'UI Simulation Entity Legal',
    entityType: 'llc',
    industry: 'finance',
    taxId: '987-65-4321',
    clientId: clientId,
    // Additional fields that might be sent from UI
    currency: 'USD',
    timezone: 'UTC',
    fiscalYearStart: '01-01',
    fiscalYearEnd: '12-31',
    active: true
  };
  
  try {
    const response = await fetch(`${API_BASE}/admin/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(entityData),
      redirect: 'manual' // Don't follow redirects
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create entity: ${await response.text()}`);
    }
    
    const result = await response.json();
    entityId = result.data.id;
    console.log(`✅ Created entity with ID: ${entityId}`);
    console.log(`Entity data:`, JSON.stringify(result.data, null, 2));
    return entityId;
  } catch (error) {
    console.error('❌ Failed to create entity:', error.message);
    throw error;
  }
}

// Helper to parse entity data from responses that could be in different formats
async function parseEntityFromResponse(response) {
  // Read the response text
  const responseText = await response.text();
  console.log(`Raw entity response: ${responseText.substring(0, 100)}...`);
  
  // Try to parse as JSON
  let entityData;
  try {
    entityData = JSON.parse(responseText);
    // Check if data is nested inside a data property
    if (entityData.data) {
      console.log(`Entity response has nested data structure`);
      entityData = entityData.data;
    }
  } catch (e) {
    console.error(`Failed to parse entity response as JSON: ${e.message}`);
    
    // If the response is HTML, it's likely an error page or unexpected response
    if (responseText.includes('<!DOCTYPE html>')) {
      console.error('Received HTML instead of JSON. This is likely due to a server error or authentication issue.');
      console.error('HTML response excerpt:');
      // Print first 500 chars to see what kind of HTML we're getting
      console.error(responseText.substring(0, 500));
    }
    
    // Try to extract JSON from HTML response (if we got a HTML page with JSON data)
    if (responseText.includes('<pre>')) {
      const jsonMatch = responseText.match(/<pre>(.*?)<\/pre>/s);
      if (jsonMatch && jsonMatch[1]) {
        try {
          entityData = JSON.parse(jsonMatch[1]);
          console.log(`Successfully extracted JSON from HTML response`);
        } catch (e2) {
          console.error(`Failed to parse extracted content as JSON: ${e2.message}`);
          throw new Error(`Could not parse entity data from response`);
        }
      } else {
        throw new Error(`Could not extract JSON from HTML response`);
      }
    } else {
      throw new Error(`Response is not valid JSON and does not contain extractable JSON. Check server logs for potential 500 error.`);
    }
  }
  
  return entityData;
}

// Edit entity - simulates clicking "Edit" in the UI and then "Save Changes"
async function editEntity() {
  console.log('\nEditing entity (simulating UI edit action)...');
  
  // First - Get the current entity to simulate the UI having the complete entity data
  try {
    console.log(`Fetching current entity data for ID: ${entityId}`);
    const getResponse = await fetch(`${API_BASE}/entities/${entityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      redirect: 'manual' // Don't follow redirects
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get entity: ${await getResponse.text()}`);
    }
    
    const entityData = await parseEntityFromResponse(getResponse);
    console.log(`Entity response data:`, JSON.stringify(entityData, null, 2));
    const currentEntity = entityData;
    console.log(`✅ Retrieved current entity data`);
    
    // Simulate modifying the entity in the UI form
    // The key part is that we modify the industry field value
    const modifiedEntity = {
      ...currentEntity,
      name: currentEntity.name + ' (Edited)',
      industry: 'healthcare' // Updated industry 
    };
    
    console.log(`Sending entity update with modified data...`);
    console.log(`Update payload (EXACT UI FORMAT):`, JSON.stringify(modifiedEntity, null, 2));
    
    // This simulates the exact PUT request from the UI
    const putResponse = await fetch(`${API_BASE}/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(modifiedEntity),
      redirect: 'manual' // Don't follow redirects
    });
    
    // Log the complete response for debugging
    console.log(`Update response status: ${putResponse.status} ${putResponse.statusText}`);
    const updateResponseText = await putResponse.text();
    console.log(`Update response body:`, updateResponseText);
    
    if (!putResponse.ok) {
      throw new Error(`Failed to update entity: ${updateResponseText}`);
    }
    
    console.log(`✅ Entity updated successfully!`);
    return true;
  } catch (error) {
    console.error('❌ Failed to edit entity:', error.message);
    throw error;
  }
}

// Now try updating with the modified payload - this simulates the real UI issue
async function editEntityWithEmptyFields() {
  console.log('\nSimulating the problematic UI update with empty/undefined fields...');
  
  // First, get the current entity data
  try {
    const getResponse = await fetch(`${API_BASE}/entities/${entityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      redirect: 'manual' // Don't follow redirects
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get entity: ${await getResponse.text()}`);
    }
    
    const entityData = await parseEntityFromResponse(getResponse);
    console.log(`Entity response data (problematic test):`, JSON.stringify(entityData, null, 2));
    const currentEntity = entityData;
    
    // Create a modified payload that includes some empty or undefined values
    // This better simulates what might be happening in the UI
    const problematicPayload = {
      // Include only fields that would be in the form
      id: currentEntity.id,
      name: currentEntity.name + ' (Problem Test)',
      legalName: currentEntity.legalName,
      code: currentEntity.code,
      entityType: currentEntity.entityType,
      industry: 'retail', // Changed industry
      taxId: currentEntity.taxId,
      // Some fields might be missing or empty
      email: '', // Empty string
      phone: null, // Null value
      address: undefined, // Undefined value
      clientId: currentEntity.clientId,
      // Include a potentially problematic field or structure
      // This is to simulate any UI quirks that might cause issues
      foundedYear: 'not-a-number', // Invalid data type
      meta: {} // Extra field not expected by backend
    };
    
    console.log(`Sending problematic update payload...`);
    console.log(`Problematic payload:`, JSON.stringify(problematicPayload, null, 2));
    
    // This simulates the exact PUT request that might be causing the 500 error
    const putResponse = await fetch(`${API_BASE}/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(problematicPayload),
      redirect: 'manual' // Don't follow redirects
    });
    
    // Log the complete response for debugging
    console.log(`Problematic update response status: ${putResponse.status} ${putResponse.statusText}`);
    const problematicResponseText = await putResponse.text();
    console.log(`Problematic update response body:`, problematicResponseText);
    
    if (!putResponse.ok) {
      console.error(`⚠️ Expected error occurred: ${putResponse.status} ${putResponse.statusText}`);
      return false;
    }
    
    console.log(`✅ Problematic update succeeded (no error occurred)`);
    return true;
  } catch (error) {
    console.error('❌ Problematic update failed:', error.message);
    throw error;
  }
}

// Main function
async function runSimulation() {
  console.log('===========================================================');
  console.log('ENTITY UI UPDATE SIMULATION');
  console.log('Simulating the exact UI flow that might cause 500 error');
  console.log('===========================================================\n');
  
  try {
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.error('Authentication failed, cannot continue simulation');
      return false;
    }
    
    // Create client (Step 1)
    await createClient();
    
    // Create entity (Step 2)
    await createEntity();
    
    // Edit entity with standard data (first test)
    await editEntity();
    
    // Edit entity with potentially problematic data (second test)
    await editEntityWithEmptyFields();
    
    console.log('\n===========================================================');
    console.log('UI SIMULATION COMPLETED SUCCESSFULLY');
    console.log('===========================================================');
    console.log('The entity update process worked without errors in our simulation.');
    console.log('This suggests the issue may be related to a specific UI state or');
    console.log('payload structure not captured in our simulation.');
    
    return true;
  } catch (error) {
    console.error('\n===========================================================');
    console.error('UI SIMULATION FAILED');
    console.error('===========================================================');
    console.error('Error:', error.message);
    console.error('This simulation has identified a potential issue that might');
    console.error('be causing the 500 error in the actual UI.');
    
    return false;
  }
}

// Run the simulation
runSimulation().then(success => {
  console.log(`\nSimulation ${success ? 'completed successfully' : 'failed with errors'}`);
  exit(success ? 0 : 1);
});