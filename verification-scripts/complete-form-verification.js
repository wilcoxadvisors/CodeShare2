/**
 * Complete Form Fields Verification Script
 * 
 * This script verifies that all form fields for Clients and Entities are properly:
 * 1. Saved on creation
 * 2. Retrieved correctly when viewing
 * 3. Persisted after refresh
 * 4. Updated correctly when edited
 * 
 * It also verifies the distinction between "inactive" entities and "soft-deleted" entities.
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)){
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for verification results
const LOG_FILE = path.join(LOGS_DIR, 'verification_results.log');

// Create or clear the log file
fs.writeFileSync(LOG_FILE, `FORM VERIFICATION RESULTS - ${new Date().toISOString()}\n\n`);

function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, formattedMessage);
}

function getCookieHeader() {
  try {
    // Try to read cookie from file
    const cookie = fs.readFileSync(path.join(__dirname, 'auth_cookie.txt'), 'utf8').trim();
    return { Cookie: cookie };
  } catch (error) {
    log('Error reading auth cookie file. Please run login first.');
    return null;
  }
}

async function login() {
  try {
    log('Setting up admin account for verification...');
    
    // First make sure we have a test admin user created
    const setupAdminRes = await axios.post(`${API_URL}/verification/setup-test-admin`);
    log(`Admin setup result: ${setupAdminRes.data.message}`);
    
    // Login as admin
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'adminpass'
    });
    
    if (loginResponse.status === 200 && loginResponse.headers['set-cookie']) {
      const cookieHeader = loginResponse.headers['set-cookie'][0].split(';')[0];
      fs.writeFileSync(path.join(__dirname, 'auth_cookie.txt'), cookieHeader);
      log('Login successful, auth cookie saved');
      return cookieHeader;
    } else {
      log('Login successful but no cookie received');
      return null;
    }
  } catch (error) {
    log(`Login error: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function createTestClient(cookieHeader) {
  try {
    log('Creating test client with all fields...');
    
    const testClient = {
      name: 'Verification Test Client',
      legalName: 'Verification Test Client LLC',
      contactName: 'John Tester',
      contactEmail: 'john@test.com',
      contactPhone: '123-456-7890',
      industry: 'Technology',
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
      website: 'https://test.com',
      notes: 'This is a test client for verification',
      taxId: '12-3456789',
      referralSource: 'Internal Testing'
    };
    
    const response = await axios.post(`${API_URL}/clients`, testClient, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 201) {
      log(`Test client created successfully with ID: ${response.data.id}`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error creating test client: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function getClientById(clientId, cookieHeader) {
  try {
    log(`Retrieving client with ID: ${clientId}...`);
    
    const response = await axios.get(`${API_URL}/clients/${clientId}`, {
      headers: {
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Client retrieved successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error retrieving client: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function updateClient(clientId, clientData, cookieHeader) {
  try {
    log(`Updating client with ID: ${clientId}...`);
    
    const response = await axios.put(`${API_URL}/clients/${clientId}`, clientData, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Client updated successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error updating client: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function createEntity(clientId, cookieHeader) {
  try {
    log(`Creating test entity for client ${clientId} with all fields...`);
    
    const testEntity = {
      clientId,
      name: 'Verification Test Entity',
      legalName: 'Verification Test Entity Inc',
      taxId: '98-7654321',
      entityType: 'Corporation',
      industry: 'Finance',
      fiscalYearEnd: '12/31',
      address: '456 Entity Road',
      city: 'Entity City',
      state: 'Entity State',
      country: 'Entity Country',
      postalCode: '54321',
      phone: '987-654-3210',
      email: 'entity@test.com',
      website: 'https://entity-test.com',
      notes: 'This is a test entity for verification'
    };
    
    const response = await axios.post(`${API_URL}/entities`, testEntity, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 201 || response.status === 200) {
      const entityId = response.data.id || response.data.data.id;
      log(`Test entity created successfully with ID: ${entityId}`);
      return response.data.data || response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error creating test entity: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function getEntityById(entityId, cookieHeader) {
  try {
    log(`Retrieving entity with ID: ${entityId}...`);
    
    const response = await axios.get(`${API_URL}/entities/${entityId}`, {
      headers: {
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Entity retrieved successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error retrieving entity: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function updateEntity(entityId, entityData, cookieHeader) {
  try {
    log(`Updating entity with ID: ${entityId}...`);
    
    const response = await axios.put(`${API_URL}/entities/${entityId}`, entityData, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Entity updated successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error updating entity: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function setEntityInactive(entityId, cookieHeader) {
  try {
    log(`Setting entity ${entityId} to inactive...`);
    
    const entityData = {
      active: false
    };
    
    const response = await axios.put(`${API_URL}/entities/${entityId}/status`, entityData, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Entity set to inactive successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error setting entity inactive: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function softDeleteEntity(entityId, cookieHeader) {
  try {
    log(`Soft deleting entity ${entityId}...`);
    
    const response = await axios.delete(`${API_URL}/entities/${entityId}`, {
      headers: {
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Entity soft deleted successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error soft deleting entity: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function restoreEntity(entityId, cookieHeader) {
  try {
    log(`Restoring soft-deleted entity ${entityId}...`);
    
    const response = await axios.post(`${API_URL}/entities/${entityId}/restore`, {}, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      }
    });
    
    if (response.status === 200) {
      log(`Entity restored successfully`);
      return response.data;
    } else {
      log(`Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    log(`Error restoring entity: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

function verifyFieldsMatch(original, retrieved, label = 'Record') {
  log(`\nVerifying ${label} fields match...`);
  
  const allFields = new Set([...Object.keys(original), ...Object.keys(retrieved)]);
  let allFieldsMatch = true;
  const mismatchedFields = [];
  
  for (const field of allFields) {
    // Skip system fields and null fields
    if (['id', 'createdAt', 'updatedAt', 'deletedAt'].includes(field)) continue;
    if (original[field] === null && retrieved[field] === null) continue;
    
    // Check if fields match
    const fieldsMatch = JSON.stringify(original[field]) === JSON.stringify(retrieved[field]);
    if (!fieldsMatch) {
      allFieldsMatch = false;
      mismatchedFields.push(field);
      log(`❌ Field mismatch for "${field}": original="${original[field]}" != retrieved="${retrieved[field]}"`);
    }
  }
  
  if (allFieldsMatch) {
    log(`✅ All fields match for ${label}`);
    return true;
  } else {
    log(`❌ Mismatched fields for ${label}: ${mismatchedFields.join(', ')}`);
    return false;
  }
}

async function testClientFormPersistence(cookieHeader) {
  log('\n==== TESTING CLIENT FORM FIELDS PERSISTENCE ====\n');
  
  // 1. Create a test client with all fields
  const newClient = await createTestClient(cookieHeader);
  if (!newClient) {
    log('❌ Failed to create test client, aborting test');
    return false;
  }
  
  // 2. Retrieve the client and verify all fields persisted correctly
  const retrievedClient = await getClientById(newClient.id, cookieHeader);
  if (!retrievedClient) {
    log('❌ Failed to retrieve client, aborting test');
    return false;
  }
  
  // Compare original and retrieved client fields
  const initialFieldsVerified = verifyFieldsMatch(newClient, retrievedClient, 'Client');
  
  // 3. Update all client fields
  const updatedClientData = {
    ...retrievedClient,
    name: 'Updated Verification Client',
    legalName: 'Updated Verification Client LLC',
    contactName: 'Jane Updated',
    contactEmail: 'jane@updated.com',
    contactPhone: '999-888-7777',
    industry: 'Updated Industry',
    address: 'Updated Address',
    city: 'Updated City',
    state: 'Updated State',
    country: 'Updated Country',
    postalCode: 'U1234',
    website: 'https://updated.com',
    notes: 'This client has been updated for verification',
    taxId: '98-7654321',
    referralSource: 'Updated Source'
  };
  
  const updatedClient = await updateClient(retrievedClient.id, updatedClientData, cookieHeader);
  if (!updatedClient) {
    log('❌ Failed to update client, aborting test');
    return false;
  }
  
  // 4. Retrieve the client again and verify updated fields persisted
  const retrievedUpdatedClient = await getClientById(updatedClient.id, cookieHeader);
  if (!retrievedUpdatedClient) {
    log('❌ Failed to retrieve updated client, aborting test');
    return false;
  }
  
  // Compare updated and retrieved updated client fields
  const updatedFieldsVerified = verifyFieldsMatch(updatedClientData, retrievedUpdatedClient, 'Updated Client');
  
  return initialFieldsVerified && updatedFieldsVerified;
}

async function testEntityFormPersistence(cookieHeader) {
  log('\n==== TESTING ENTITY FORM FIELDS PERSISTENCE ====\n');
  
  // 0. Create a client first to use as parent
  const parentClient = await createTestClient(cookieHeader);
  if (!parentClient) {
    log('❌ Failed to create parent client for entity test, aborting test');
    return false;
  }
  
  // 1. Create a test entity with all fields
  const newEntity = await createEntity(parentClient.id, cookieHeader);
  if (!newEntity) {
    log('❌ Failed to create test entity, aborting test');
    return false;
  }
  
  // 2. Retrieve the entity and verify all fields persisted correctly
  const retrievedEntity = await getEntityById(newEntity.id, cookieHeader);
  if (!retrievedEntity) {
    log('❌ Failed to retrieve entity, aborting test');
    return false;
  }
  
  // Compare original and retrieved entity fields
  const initialFieldsVerified = verifyFieldsMatch(newEntity, retrievedEntity, 'Entity');
  
  // 3. Update all entity fields
  const updatedEntityData = {
    ...retrievedEntity,
    name: 'Updated Verification Entity',
    legalName: 'Updated Verification Entity Inc',
    taxId: '12-3456789',
    entityType: 'Updated Type',
    industry: 'Updated Industry',
    fiscalYearEnd: '06/30',
    address: 'Updated Entity Address',
    city: 'Updated Entity City',
    state: 'Updated Entity State',
    country: 'Updated Entity Country',
    postalCode: 'E5432',
    phone: '111-222-3333',
    email: 'updated-entity@test.com',
    website: 'https://updated-entity.com',
    notes: 'This entity has been updated for verification'
  };
  
  const updatedEntity = await updateEntity(retrievedEntity.id, updatedEntityData, cookieHeader);
  if (!updatedEntity) {
    log('❌ Failed to update entity, aborting test');
    return false;
  }
  
  // 4. Retrieve the entity again and verify updated fields persisted
  const retrievedUpdatedEntity = await getEntityById(updatedEntity.id, cookieHeader);
  if (!retrievedUpdatedEntity) {
    log('❌ Failed to retrieve updated entity, aborting test');
    return false;
  }
  
  // Compare updated and retrieved updated entity fields
  const updatedFieldsVerified = verifyFieldsMatch(updatedEntityData, retrievedUpdatedEntity, 'Updated Entity');
  
  return initialFieldsVerified && updatedFieldsVerified;
}

async function testInactiveVsSoftDeletion(cookieHeader) {
  log('\n==== TESTING INACTIVE VS SOFT-DELETED ENTITIES ====\n');
  
  // 0. Create a client first to use as parent
  const parentClient = await createTestClient(cookieHeader);
  if (!parentClient) {
    log('❌ Failed to create parent client for inactive/delete test, aborting test');
    return false;
  }
  
  // 1. Create a test entity for inactivation
  log('Creating entity for inactive test...');
  const inactiveEntity = await createEntity(parentClient.id, cookieHeader);
  if (!inactiveEntity) {
    log('❌ Failed to create test entity for inactive test, aborting test');
    return false;
  }
  
  // 2. Create a test entity for soft deletion
  log('Creating entity for soft deletion test...');
  const deleteEntity = await createEntity(parentClient.id, cookieHeader);
  if (!deleteEntity) {
    log('❌ Failed to create test entity for soft deletion test, aborting test');
    return false;
  }
  
  // 3. Set the first entity to inactive
  const inactivatedEntity = await setEntityInactive(inactiveEntity.id, cookieHeader);
  if (!inactivatedEntity) {
    log('❌ Failed to set entity inactive, aborting test');
    return false;
  }
  
  // 4. Soft delete the second entity
  const deletedEntity = await softDeleteEntity(deleteEntity.id, cookieHeader);
  if (!deletedEntity) {
    log('❌ Failed to soft delete entity, aborting test');
    return false;
  }
  
  // 5. Retrieve both entities and verify their status
  const retrievedInactiveEntity = await getEntityById(inactiveEntity.id, cookieHeader);
  const retrievedDeletedEntity = await getEntityById(deleteEntity.id, cookieHeader);
  
  // Verify inactive entity has active=false but no deletedAt timestamp
  let inactiveTestPassed = false;
  if (retrievedInactiveEntity) {
    inactiveTestPassed = !retrievedInactiveEntity.active && !retrievedInactiveEntity.deletedAt;
    log(`Inactive entity test: ${inactiveTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
    log(`- active=${retrievedInactiveEntity.active} (should be false)`);
    log(`- deletedAt=${retrievedInactiveEntity.deletedAt} (should be null)`);
  } else {
    log('❌ Failed to retrieve inactive entity');
  }
  
  // Verify soft-deleted entity has active=false and a deletedAt timestamp
  let softDeleteTestPassed = false;
  if (retrievedDeletedEntity) {
    softDeleteTestPassed = !retrievedDeletedEntity.active && !!retrievedDeletedEntity.deletedAt;
    log(`Soft-deleted entity test: ${softDeleteTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
    log(`- active=${retrievedDeletedEntity.active} (should be false)`);
    log(`- deletedAt=${retrievedDeletedEntity.deletedAt} (should be a timestamp)`);
  } else {
    log('❌ Failed to retrieve soft-deleted entity');
  }
  
  // 6. Restore the soft-deleted entity
  const restoredEntity = await restoreEntity(deleteEntity.id, cookieHeader);
  if (!restoredEntity) {
    log('❌ Failed to restore entity, skipping restore verification');
    return inactiveTestPassed && softDeleteTestPassed;
  }
  
  // 7. Verify restored entity has active=true and no deletedAt timestamp
  const retrievedRestoredEntity = await getEntityById(deleteEntity.id, cookieHeader);
  
  let restoreTestPassed = false;
  if (retrievedRestoredEntity) {
    restoreTestPassed = retrievedRestoredEntity.active && !retrievedRestoredEntity.deletedAt;
    log(`Restored entity test: ${restoreTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
    log(`- active=${retrievedRestoredEntity.active} (should be true)`);
    log(`- deletedAt=${retrievedRestoredEntity.deletedAt} (should be null)`);
  } else {
    log('❌ Failed to retrieve restored entity');
  }
  
  return inactiveTestPassed && softDeleteTestPassed && restoreTestPassed;
}

async function runTests() {
  log('==== STARTING VERIFICATION TESTS ====');
  
  // First login to get auth cookie
  const cookieHeader = await login();
  if (!cookieHeader) {
    log('❌ Failed to login, aborting all tests');
    return;
  }
  
  // Run the client form persistence tests
  const clientTestPassed = await testClientFormPersistence(cookieHeader);
  log(`\nClient form fields persistence test: ${clientTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Run the entity form persistence tests
  const entityTestPassed = await testEntityFormPersistence(cookieHeader);
  log(`\nEntity form fields persistence test: ${entityTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Run the inactive vs soft deletion tests
  const deletionTestPassed = await testInactiveVsSoftDeletion(cookieHeader);
  log(`\nInactive vs soft-deleted entity test: ${deletionTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Final summary
  log('\n==== VERIFICATION TEST SUMMARY ====');
  log(`Client form fields persistence: ${clientTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  log(`Entity form fields persistence: ${entityTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  log(`Inactive vs soft-deleted entity: ${deletionTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allTestsPassed = clientTestPassed && entityTestPassed && deletionTestPassed;
  log(`\nOverall verification: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  log(`\nDetailed logs available at: ${LOG_FILE}`);
}

// Run all tests
runTests().catch(error => {
  log(`Unhandled error in verification script: ${error.message}`);
  console.error(error);
});