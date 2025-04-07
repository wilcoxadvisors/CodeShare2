/**
 * Entity Update Test with Detailed Logging
 * 
 * This script simulates the complete user flow:
 * 1. Authentication as admin
 * 2. Create a new client (simulating Step 1)
 * 3. Create a new entity (simulating Step 2)
 * 4. Edit the entity
 * 5. Save changes
 * 
 * It captures and displays detailed logs at each step to help diagnose issues.
 */

import axios from 'axios';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:5000'; // Server runs on port 5000
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Utility for logging
function logHeader(text) {
  const border = '='.repeat(80);
  console.log('\n' + border);
  console.log(text);
  console.log(border + '\n');
}

function logRequest(method, url, data = null) {
  console.log(`🌐 ${method} ${url}`);
  if (data) {
    console.log('📦 Request data:', JSON.stringify(data, null, 2));
  }
}

function logResponse(response) {
  console.log(`✅ Response status: ${response.status}`);
  console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
}

function logError(error) {
  console.error('❌ ERROR:', error.message);
  
  if (error.response) {
    console.error('📦 Error response:', {
      status: error.response.status,
      data: error.response.data
    });
  }
}

// Main execution function
async function runTest() {
  logHeader('STARTING ENTITY UPDATE TEST WITH DETAILED LOGGING');
  
  // Store cookies for session management
  let cookies = [];
  
  try {
    // Step 1: Authentication
    logHeader('STEP 1: AUTHENTICATION');
    
    logRequest('POST', '/api/auth/login', ADMIN_CREDENTIALS);
    const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS, {
      withCredentials: true
    });
    
    // Extract and save cookies
    if (authResponse.headers['set-cookie']) {
      cookies = authResponse.headers['set-cookie'];
      console.log('🍪 Cookies received:', cookies);
    }
    
    logResponse(authResponse);
    console.log('👤 Authenticated as admin');
    
    // Verify authentication with a separate request
    logRequest('GET', '/api/auth/me');
    const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookies.join('; ') }
    });
    
    logResponse(meResponse);
    console.log('✅ Authentication confirmed');
    
    // Step 2: Create client (simulating Step 1 of setup flow)
    logHeader('STEP 2: CREATE CLIENT (SETUP STEP 1)');
    
    const clientData = {
      name: `Test Client ${Date.now()}`,
      contactName: 'Test Contact',
      industry: 'technology',
      phone: '555-123-4567',
      email: 'test@example.com',
      ownerId: 1 // Admin user ID
    };
    
    logRequest('POST', '/api/admin/clients', clientData);
    const clientResponse = await axios.post(`${BASE_URL}/api/admin/clients`, clientData, {
      headers: { Cookie: cookies.join('; ') }
    });
    
    logResponse(clientResponse);
    const createdClient = clientResponse.data.data;
    console.log(`✅ Client created with ID: ${createdClient.id}`);
    
    // Step 3: Create entity (simulating Step 2 of setup flow)
    logHeader('STEP 3: CREATE ENTITY (SETUP STEP 2)');
    
    const entityData = {
      name: `Test Entity ${Date.now()}`,
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
    
    logRequest('POST', '/api/admin/entities', entityData);
    const entityResponse = await axios.post(`${BASE_URL}/api/admin/entities`, entityData, {
      headers: { Cookie: cookies.join('; ') }
    });
    
    logResponse(entityResponse);
    const createdEntity = entityResponse.data.data;
    console.log(`✅ Entity created with ID: ${createdEntity.id}`);
    
    // IMPORTANT: Log initial entity industry value
    console.log(`INITIAL INDUSTRY VALUE: "${createdEntity.industry}"`);
    
    // Step 4: Edit entity - This is where the bug should be triggered
    logHeader('STEP 4: EDIT ENTITY (SIMULATE CLICKING "EDIT" BUTTON)');
    
    // First, get the current entity to see what we're working with
    logRequest('GET', `/api/admin/entities/${createdEntity.id}`);
    const getEntityResponse = await axios.get(`${BASE_URL}/api/admin/entities/${createdEntity.id}`, {
      headers: { Cookie: cookies.join('; ') }
    });
    logResponse(getEntityResponse);
    
    // Step 5: Save updated entity - This is where the error should occur
    logHeader('STEP 5: UPDATE ENTITY (SIMULATE CLICKING "SAVE CHANGES")');
    
    // Make a copy of the entity and make changes
    // Note: We're explicitly testing with a numeric industry to reproduce the reported issue
    const updatedEntityData = {
      ...createdEntity,
      name: `${createdEntity.name} (Updated)`,
      industry: 123 // THIS IS THE CRITICAL PART - testing with numeric industry value
    };
    
    logRequest('PUT', `/api/admin/entities/${createdEntity.id}`, updatedEntityData);
    try {
      const updateResponse = await axios.put(
        `${BASE_URL}/api/admin/entities/${createdEntity.id}`, 
        updatedEntityData, 
        { headers: { Cookie: cookies.join('; ') }
      });
      
      logResponse(updateResponse);
      const updatedEntity = updateResponse.data.data;
      
      console.log(`UPDATED INDUSTRY VALUE: "${updatedEntity.industry}"`);
      console.log('✅ Entity updated successfully');
      
      // Verify the changes
      if (updatedEntity.name.includes('(Updated)') && updatedEntity.industry === String(123)) {
        console.log('✅ VERIFICATION: Entity was updated correctly');
        console.log(`- Industry sent as numeric 123, stored as string "${updatedEntity.industry}"`);
      } else {
        console.log('❌ VERIFICATION FAILED: Entity was not updated as expected');
        console.log(`- Expected industry to be "123", got "${updatedEntity.industry}"`);
        console.log(`- Expected name to include "(Updated)", got "${updatedEntity.name}"`);
      }
      
      // Get fresh data from API to double-check
      logHeader('STEP 6: VERIFY UPDATE WITH FRESH API CALL');
      
      // Try the regular entities endpoint instead of admin endpoint
      logRequest('GET', `/api/entities/${createdEntity.id}`);
      const verifyResponse = await axios.get(`${BASE_URL}/api/entities/${createdEntity.id}`, {
        headers: { Cookie: cookies.join('; ') }
      });
      
      logResponse(verifyResponse);
      
      console.log("RAW RESPONSE STRUCTURE:", JSON.stringify({
        keys: Object.keys(verifyResponse.data || {}),
        hasData: verifyResponse.data && typeof verifyResponse.data === 'object',
        dataType: verifyResponse.data ? typeof verifyResponse.data : 'undefined',
        isArray: Array.isArray(verifyResponse.data),
        statusCode: verifyResponse.status
      }, null, 2));
      
      // Handle both response formats - some endpoints use {status, data}, others return direct data
      let verifiedEntity;
      if (verifyResponse.data && verifyResponse.data.data) {
        // Format: { status: 'success', data: { ... } }
        verifiedEntity = verifyResponse.data.data;
        console.log('RESPONSE FORMAT: Using nested data object');
      } else if (typeof verifyResponse.data === 'object' && verifyResponse.data !== null) {
        // Direct entity format
        verifiedEntity = verifyResponse.data;
        console.log('RESPONSE FORMAT: Using direct data object');
      } else {
        console.log('❌ UNEXPECTED RESPONSE FORMAT:', typeof verifyResponse.data);
        verifiedEntity = null;
      }
      
      if (verifiedEntity) {
        console.log(`VERIFIED ENTITY STRUCTURE:`, {
          id: verifiedEntity.id,
          name: verifiedEntity.name,
          industry: verifiedEntity.industry,
          keys: Object.keys(verifiedEntity)
        });
        console.log(`VERIFIED INDUSTRY VALUE: "${verifiedEntity.industry}"`);
      } else {
        console.log('❌ VERIFIED ENTITY IS NULL OR UNDEFINED');
      }
      
      // Final verification
      if (verifiedEntity && verifiedEntity.name && verifiedEntity.name.includes('(Updated)') && verifiedEntity.industry === String(123)) {
        console.log('✅ FINAL VERIFICATION: Entity was truly updated in the database');
      } else {
        console.log('❌ FINAL VERIFICATION FAILED: Entity data is inconsistent');
        if (verifiedEntity && verifiedEntity.industry !== undefined) {
          console.log(`- Expected industry to be "123", got "${verifiedEntity.industry}"`);
        } else {
          console.log(`- Could not verify industry value, might be null or undefined`);
        }
        if (verifiedEntity && verifiedEntity.name) {
          console.log(`- Expected name to include "(Updated)", got "${verifiedEntity.name}"`);
        } else {
          console.log(`- Could not verify name, might be null or undefined`);
        }
      }
      
    } catch (error) {
      console.log('❌ UPDATE FAILED');
      logError(error);
    }
    
    // Wrap up
    logHeader('TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ TEST FAILED');
    logError(error);
  }
}

// Run the test
runTest().catch(console.error);