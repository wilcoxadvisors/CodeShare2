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

// Main test flow
async function testEntityUpdateRoute() {
  let sessionCookie = '';
  let clientId = null;
  let entityId = null;

  try {
    log('Starting entity update route test');

    // Step 1: Login to get session cookie
    log('Step 1: Logging in');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    
    const loginData = await loginRes.json();
    log('Login response', loginData);

    // Save session cookie
    sessionCookie = loginRes.headers.get('set-cookie');
    log('Saved session cookie', sessionCookie);

    // Step 2: Create a test client
    log('Step 2: Creating test client');
    const clientRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Test Client ${new Date().toISOString()}`,
        contactName: 'Test Contact',
        email: 'test@example.com',
        phone: '555-123-4567',
        address: '123 Test St',
        ownerId: loginData.user.id
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

    // Step 3: Create a test entity for the client
    log('Step 3: Creating test entity');
    const entityRes = await fetch(`${BASE_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Test Entity ${new Date().toISOString()}`,
        legalName: 'Test Legal Name',
        entityType: 'llc',
        industry: 'technology',
        clientId: clientId,
        ownerId: loginData.user.id,
        code: 'TEST' + Math.floor(Math.random() * 1000)
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

    // Step 4: Update the entity with the new endpoint
    log('Step 4: Updating entity with new regular endpoint');
    const regularUpdateRes = await fetch(`${BASE_URL}/api/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Updated Regular API ${new Date().toISOString()}`,
        industry: 'finance',
        clientId: clientId,
        ownerId: loginData.user.id
      })
    });
    
    const regularUpdateData = await regularUpdateRes.json();
    log('Regular endpoint update response', regularUpdateData);
    
    if (regularUpdateData.status !== 'success') {
      throw new Error('Regular endpoint update failed');
    }

    // Step 5: Also update the entity with the admin endpoint
    log('Step 5: Updating entity with admin endpoint');
    const adminUpdateRes = await fetch(`${BASE_URL}/api/admin/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Updated Admin API ${new Date().toISOString()}`,
        industry: 'healthcare',
        clientId: clientId,
        ownerId: loginData.user.id
      })
    });
    
    const adminUpdateData = await adminUpdateRes.json();
    log('Admin endpoint update response', adminUpdateData);
    
    if (adminUpdateData.status !== 'success') {
      throw new Error('Admin endpoint update failed');
    }

    // Final confirmation
    log('TEST PASSED: Successfully tested both regular and admin entity update endpoints');
    
  } catch (error) {
    log('TEST FAILED: Error during entity update route test', error);
  }
}

// Run the test
testEntityUpdateRoute();