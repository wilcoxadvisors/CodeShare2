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

// Main verification flow
async function verifyEntityUpdateUI() {
  let sessionCookie = '';
  let clientId = null;
  let entityId = null;
  let timestamps = {};

  try {
    log('FINAL VERIFICATION: Starting UI flow simulation for entity updates');
    timestamps.start = new Date().toISOString();

    // Step 1: Authentication
    log('VERIFICATION STEP 1: Authenticating as admin');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    
    const loginData = await loginRes.json();
    log('Authentication successful', loginData.user);
    sessionCookie = loginRes.headers.get('set-cookie');
    timestamps.login = new Date().toISOString();

    // Step 2: Create client (simulating Step 1 of setup flow)
    log('VERIFICATION STEP 2: Creating client (Step 1 of setup flow)');
    const clientRes = await fetch(`${BASE_URL}/api/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Final Verification Client ${new Date().toISOString()}`,
        contactName: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        address: '123 Test St',
        ownerId: loginData.user.id
      })
    });
    
    const clientData = await clientRes.json();
    log('Client created successfully', clientData.data);
    
    if (clientData.status !== 'success' || !clientData.data) {
      throw new Error('Failed to create test client');
    }
    
    clientId = clientData.data.id;
    timestamps.clientCreated = new Date().toISOString();

    // Step 3: Create entity (simulating adding an entity in Step 2 of setup flow)
    log('VERIFICATION STEP 3: Creating entity (Step 2 of setup flow)');
    const entityRes = await fetch(`${BASE_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Entity for UI Testing ${new Date().toISOString()}`,
        legalName: 'Test Legal Name LLC',
        entityType: 'llc',
        industry: 'tech', // Using exactly "tech" as specified
        clientId: clientId,
        ownerId: loginData.user.id,
        code: 'VTEST' + Math.floor(Math.random() * 1000)
      })
    });
    
    const entityData = await entityRes.json();
    log('Entity created successfully', entityData.data);
    
    if (entityData.status !== 'success' || !entityData.data) {
      throw new Error('Failed to create test entity');
    }
    
    entityId = entityData.data.id;
    timestamps.entityCreated = new Date().toISOString();
    
    // Step 4: Simulate clicking "Edit" and getting entity details
    log('VERIFICATION STEP 4: Simulating clicking "Edit" on entity');
    const getEntityRes = await fetch(`${BASE_URL}/api/entities/${entityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    });
    
    const entityDetails = await getEntityRes.json();
    log('Entity details retrieved (simulating edit form populated)', entityDetails);
    timestamps.editClicked = new Date().toISOString();
    
    // Step 5: Simulate saving changes (edit entity)
    log('VERIFICATION STEP 5: Simulating "Save Changes" with updated values');
    
    // First try with the regular endpoint that's been fixed
    const updateRes = await fetch(`${BASE_URL}/api/entities/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: `Updated Name ${new Date().toISOString()}`,
        industry: 'finance', // Changed from "tech" to "finance" as specified
        clientId: clientId,
        ownerId: loginData.user.id
      })
    });
    
    // Note response code
    const updateStatus = updateRes.status;
    const updateData = await updateRes.json();
    
    log(`Entity update response (Status: ${updateStatus})`, updateData);
    timestamps.updateAttempted = new Date().toISOString();
    
    if (updateStatus !== 200 || updateData.status !== 'success') {
      throw new Error(`Entity update failed with status ${updateStatus}`);
    }
    
    // Step 6: Verify the entity was updated correctly
    log('VERIFICATION STEP 6: Verifying entity was updated in database');
    const verifyRes = await fetch(`${BASE_URL}/api/entities/${entityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    });
    
    const verifiedEntity = await verifyRes.json();
    log('Updated entity details', verifiedEntity);
    timestamps.verified = new Date().toISOString();
    
    // Final verification of key changes
    const industryUpdated = verifiedEntity.industry === 'finance';
    const nameUpdated = verifiedEntity.name.includes('Updated Name');
    
    if (!industryUpdated || !nameUpdated) {
      throw new Error('Entity data was not properly updated. Changes not reflected in database.');
    }
    
    // Summary
    log('VERIFICATION SUCCESSFUL: Entity update process complete', {
      entityId,
      clientId,
      timestamps,
      updateResult: 'SUCCESS',
      apiEndpointUsed: '/api/entities/:id',
      requestStatus: updateStatus,
      industryUpdated,
      nameUpdated
    });
    
    log('CONCLUSION: The entity update process initiated from the UI in Step 2 now works correctly without any errors. All backend fixes have been successfully applied and verified.');
    
  } catch (error) {
    log('VERIFICATION FAILED', {
      error: error.message,
      stack: error.stack,
      timestamps
    });
  }
}

// Run the verification
verifyEntityUpdateUI();