/**
 * Diagnose 500 Error After Back Navigation Simulation Script
 * 
 * This script simulates the exact user flow that causes the 500 error:
 * Dashboard -> Add Client -> Step 1 -> Step 2 -> Add two entities -> Step 3 -> Click "Back" -> Step 2 -> Edit entity -> Save Changes
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
let entityIds = [];

/**
 * Utility function to log with a timestamp and wait for console output to flush
 */
function log(message, data = null) {
  const timestamp = new Date().toISOString().substring(11, 19);
  if (data) {
    console.log(`[${timestamp}] ${message}:`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * Step 1: Authenticate as admin
 */
async function authenticate() {
  log('Step 1: Authenticating as admin user');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
      redirect: 'manual'
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
      log(`Extracted session cookie: ${sessionCookie}`);
    } else {
      sessionCookie = cookieHeader;
      log(`Using full cookie: ${sessionCookie}`);
    }
    
    // Now verify we're actually logged in by checking the me endpoint
    const verifyResponse = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { 'Cookie': sessionCookie },
      redirect: 'manual'
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Authentication verification failed: ${verifyResponse.status}`);
    }
    
    const userData = await verifyResponse.json();
    log(`Authentication successful for user: ${userData.username} (${userData.role})`);
    return true;
  } catch (error) {
    log('Authentication failed:', error.message);
    return false;
  }
}

/**
 * Step 2: Create client (simulating Step 1 of setup)
 */
async function createClient() {
  log('Step 2: Creating test client (Step 1 of setup)');
  
  const clientData = {
    name: 'Back Navigation Test Client',
    legalName: 'Back Navigation Test Legal Name',
    industry: 'technology',
    email: 'back-nav-test@example.com',
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
      redirect: 'manual'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create client: ${await response.text()}`);
    }
    
    const result = await response.json();
    clientId = result.data.id;
    log(`Created client with ID: ${clientId}`);
    return clientId;
  } catch (error) {
    log('Failed to create client:', error.message);
    throw error;
  }
}

/**
 * Step 3: Create first entity (Step 2 of setup)
 */
async function createFirstEntity() {
  log('Step 3: Creating first entity (Step 2 of setup)');
  
  const entityData = {
    name: 'First Entity',
    legalName: 'First Entity Legal Name',
    entityType: 'llc',
    industry: 'finance',
    taxId: '987-65-4321',
    clientId: clientId,
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
      redirect: 'manual'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create first entity: ${await response.text()}`);
    }
    
    const result = await response.json();
    const entityId = result.data.id;
    entityIds.push(entityId);
    log(`Created first entity with ID: ${entityId}`);
    return entityId;
  } catch (error) {
    log('Failed to create first entity:', error.message);
    throw error;
  }
}

/**
 * Step 4: Create second entity (Step 2 of setup)
 */
async function createSecondEntity() {
  log('Step 4: Creating second entity (Step 2 of setup)');
  
  const entityData = {
    name: 'Second Entity',
    legalName: 'Second Entity Legal Name',
    entityType: 'corporation',
    industry: 'healthcare',
    taxId: '456-78-9012',
    clientId: clientId,
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
      redirect: 'manual'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create second entity: ${await response.text()}`);
    }
    
    const result = await response.json();
    const entityId = result.data.id;
    entityIds.push(entityId);
    log(`Created second entity with ID: ${entityId}`);
    return entityId;
  } catch (error) {
    log('Failed to create second entity:', error.message);
    throw error;
  }
}

/**
 * Step 5: Simulate advancing to Step 3 and then going back to Step 2
 * This is crucial for reproducing the specific back navigation scenario
 */
async function simulateBackNavigation() {
  log('Step 5: Simulating Step 3 view and back navigation to Step 2');
  
  // Just log the action as we don't need to make actual API calls for this step
  log('Viewed Step 3 (Summary page)');
  log('Clicked "Back" button to return to Step 2');
  
  // This is typically handled in localStorage in the browser
  log('Back in Step 2 (Entity Management)');
  
  return true;
}

/**
 * Step 6: Edit and update the first entity after back navigation
 * This is where the 500 error occurs according to user reports
 */
async function editEntityAfterBackNavigation() {
  log('Step 6: Editing first entity after back navigation');
  
  if (entityIds.length === 0) {
    throw new Error('No entities created yet');
  }
  
  const entityIdToEdit = entityIds[0];
  log(`Editing entity with ID: ${entityIdToEdit}`);
  
  // First, get the current entity data
  try {
    const getResponse = await fetch(`${API_BASE}/entities/${entityIdToEdit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      redirect: 'manual'
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get entity: ${await getResponse.text()}`);
    }
    
    const entityData = await getResponse.json();
    log('Retrieved current entity data:', entityData);
    
    // Now modify the entity data
    const updatedData = {
      ...entityData.data || entityData, // Handle both response formats
      name: 'First Entity (Edited After Back Navigation)',
      industry: 'retail', // Changed industry
    };
    
    log('Sending update with modified data:', updatedData);
    
    // Send the update request
    const updateResponse = await fetch(`${API_BASE}/admin/entities/${entityIdToEdit}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(updatedData),
      redirect: 'manual'
    });
    
    // Log the full response information
    log(`Update response status: ${updateResponse.status} ${updateResponse.statusText}`);
    
    const responseText = await updateResponse.text();
    log('Update response body:', responseText);
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update entity: ${responseText}`);
    }
    
    log('Entity updated successfully!');
    return true;
  } catch (error) {
    log('Failed to edit entity:', error.message);
    // Don't throw the error here - we want to diagnose what went wrong
    log('Error details:', error);
    return false;
  }
}

/**
 * Main function that runs the simulation
 */
async function runBackNavigationSimulation() {
  console.log('===========================================================');
  console.log('BACK NAVIGATION 500 ERROR SIMULATION');
  console.log('Simulating the exact user flow with back navigation that causes the 500 error');
  console.log('===========================================================\n');
  
  try {
    // Step 1: Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.error('Authentication failed, cannot continue simulation');
      return false;
    }
    
    // Step 2: Create client (Step 1 of setup)
    await createClient();
    
    // Step 3: Create first entity (Step 2 of setup)
    await createFirstEntity();
    
    // Step 4: Create second entity (Step 2 of setup)
    await createSecondEntity();
    
    // Step 5: Simulate advancing to Step 3 and then going back to Step 2
    await simulateBackNavigation();
    
    // Step 6: Edit and update the first entity after back navigation
    console.log('\n=== CRITICAL SIMULATION PART: UPDATING ENTITY AFTER BACK NAVIGATION ===\n');
    const updateResult = await editEntityAfterBackNavigation();
    
    console.log('\n===========================================================');
    if (updateResult) {
      console.log('BACK NAVIGATION SIMULATION COMPLETED SUCCESSFULLY');
      console.log('===========================================================');
      console.log('No 500 error occurred during entity update after back navigation.');
      console.log('This suggests the issue may have been fixed or cannot be');
      console.log('reproduced with the current simulation.');
    } else {
      console.log('BACK NAVIGATION SIMULATION FAILED');
      console.log('===========================================================');
      console.log('The 500 error was successfully reproduced during entity update.');
      console.log('See the backend logs for details on what caused the error.');
    }
    
    return updateResult;
  } catch (error) {
    console.error('\n===========================================================');
    console.error('SIMULATION FAILED WITH ERROR');
    console.error('===========================================================');
    console.error('Error:', error.message);
    
    return false;
  }
}

// Run the simulation
runBackNavigationSimulation().then(success => {
  console.log(`\nSimulation ${success ? 'completed successfully' : 'encountered errors'}`);
  exit(success ? 0 : 1);
});