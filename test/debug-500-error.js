/**
 * Debug 500 Error Reproduction Script
 * 
 * This script simulates the exact flow that causes the 500 error:
 * Dashboard -> Add Client -> Step 1 -> Step 2 -> Add Entity -> Edit Entity -> Save Changes
 */

import fetch from 'node-fetch';
import * as util from 'util';

// Configuration
const BASE_URL = 'http://localhost:5000';
const USERNAME = 'admin';
const PASSWORD = 'password123';

// Utility functions
const log = (message, data = null) => {
  console.log('\n------------------------------------------------------------');
  console.log(`🔍 ${message}`);
  if (data) {
    console.log(util.inspect(data, { colors: true, depth: null }));
  }
  console.log('------------------------------------------------------------\n');
};

// Wait function
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test flow
async function reproduceEntityUpdateError() {
  let sessionCookie = '';
  let clientId = null;
  let entityId = null;
  
  try {
    log('Starting 500 error reproduction test');
    
    // Step 1: Login to get session
    log('Step 1: Logging in as admin');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    
    const loginData = await loginRes.json();
    log('Login response', loginData);
    
    // Save session cookie
    sessionCookie = loginRes.headers.get('set-cookie');
    log('Session cookie retrieved', sessionCookie ? 'Cookie present' : 'No cookie');
    
    // Step 2: Create a test client (Setup Step 1)
    log('Step 2: Creating test client');
    const clientRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Debug Client ${new Date().toISOString()}`,
        legalName: 'Debug Legal Name',
        industry: 'tech',
        email: 'debug@example.com'
      })
    });
    
    const clientData = await clientRes.json();
    log('Client creation response', clientData);
    
    if (clientData.status === 'success' && clientData.data) {
      clientId = clientData.data.id;
      log('Created client with ID', clientId);
    } else {
      throw new Error('Failed to create test client');
    }
    
    // Step 3: Create a test entity (Setup Step 2)
    log('Step 3: Creating test entity');
    const entityRes = await fetch(`${BASE_URL}/api/admin/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Debug Entity ${new Date().toISOString()}`,
        legalName: 'Debug Entity Legal Name',
        entityType: 'llc',
        industry: 'retail',
        taxId: '123-45-6789',
        clientId: clientId,
        ownerId: loginData.user.id,
        code: 'DBG' + Math.floor(Math.random() * 1000)
      })
    });
    
    const entityData = await entityRes.json();
    log('Entity creation response', entityData);
    
    if (entityData.status === 'success' && entityData.data) {
      entityId = entityData.data.id;
      log('Created entity with ID', entityId);
    } else {
      throw new Error('Failed to create test entity');
    }
    
    // Optional Step 4: Simulate going to Step 3 then back to Step 2
    log('Step 4: Simulating navigation to Step 3 then back to Step 2');
    await wait(500); // Simulating time spent viewing Step 3
    
    // Step 5: Update the entity - this should trigger the 500 error
    log('Step 5: Updating entity with problematic payload - SHOULD TRIGGER 500 ERROR');
    log('WATCH THE BACKEND CONSOLE FOR DETAILED LOGS DURING THIS REQUEST');
    
    const updatePayload = {
      id: entityId,
      name: `Updated Entity ${new Date().toISOString()}`,
      // Using numeric industry value to potentially trigger type conversion issues
      industry: 123,
      clientId: clientId,
      ownerId: loginData.user.id
    };
    
    log('Update payload', updatePayload);
    
    // Using the admin endpoint for the update
    const updateRes = await fetch(`${BASE_URL}/api/admin/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(updatePayload)
    });
    
    const updateStatus = updateRes.status;
    let updateData;
    
    try {
      updateData = await updateRes.json();
    } catch (e) {
      updateData = await updateRes.text();
      log('Failed to parse response as JSON', { text: updateData.substring(0, 1000) });
    }
    
    log(`Entity update response (Status: ${updateStatus})`, updateData);
    
    if (updateStatus === 500) {
      log('✅ Successfully reproduced the 500 error! Check backend logs for details.');
    } else if (updateStatus === 200) {
      log('❌ Could not reproduce the error - update succeeded with status 200');
    } else {
      log(`❓ Unexpected status code ${updateStatus}`);
    }
    
  } catch (error) {
    log('Error during test execution', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the reproduction test
log('DEBUG 500 ERROR REPRODUCTION SCRIPT');
log('IMPORTANT: Watch the backend console for detailed logs during execution');
reproduceEntityUpdateError();