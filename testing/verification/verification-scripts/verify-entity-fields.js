/**
 * Entity Fields Verification Script
 * 
 * This script verifies that all entity fields (name, legalName, taxId, etc.)
 * are correctly saved to the database and can be retrieved.
 * Also verifies that the inactive and soft-delete functionality works as expected.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Base URL for the API
const API_URL = 'http://localhost:5000/api/verification';

// Create a directory for logs if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const logFile = path.join(logsDir, `entity-fields-verification-${Date.now()}.log`);
const errorLogFile = path.join(logsDir, `entity-fields-error-${Date.now()}.log`);

// Helper to log to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Helper to log errors
function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = `${timestamp} - ERROR: ${message}`;
  const errorDetails = error.response 
    ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
    : error.message;
  
  console.error(errorMessage);
  console.error(errorDetails);
  
  fs.appendFileSync(errorLogFile, errorMessage + '\n');
  fs.appendFileSync(errorLogFile, errorDetails + '\n\n');
}

// Verify entity fields and status (active/inactive/deleted)
async function verifyEntityFields() {
  log('Starting entity fields verification test');
  
  try {
    // Create a test entity with all essential fields
    const entityData = {
      name: "Test Entity " + Date.now(),
      code: "TE" + Date.now().toString().slice(-6),
      clientId: 131, // Use the admin client
      ownerId: 1, // Use the admin user
      taxId: "12-3456789",
      businessType: "LLC", // Use businessType instead of entityType
      email: "test@example.com",
      phone: "555-123-4567",
      address: "123 Main St",
      city: "Anytown",
      state: "NY",
      country: "USA",
      postalCode: "12345",
      website: "example.com",
      industry: "Technology",
      active: true
    };
    
    log(`Creating test entity with data: ${JSON.stringify(entityData)}`);
    
    // Create the entity
    let response = await axios.post(`${API_URL}/entities`, entityData);
    if (response.status !== 201) {
      throw new Error(`Failed to create entity. Status: ${response.status}`);
    }
    
    const newEntity = response.data;
    const entityId = newEntity.id;
    
    log(`Created entity with ID: ${entityId}`);
    
    // Retrieve the entity to verify fields were saved
    response = await axios.get(`${API_URL}/entities/${entityId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve entity. Status: ${response.status}`);
    }
    
    const retrievedEntity = response.data;
    
    // Verify essential fields are present and match
    const fieldsToVerify = [
      { name: 'name', expected: entityData.name, actual: retrievedEntity.name },
      { name: 'taxId', expected: entityData.taxId, actual: retrievedEntity.taxId },
      { name: 'businessType', expected: entityData.businessType, actual: retrievedEntity.businessType },
      { name: 'email', expected: entityData.email, actual: retrievedEntity.email },
      { name: 'phone', expected: entityData.phone, actual: retrievedEntity.phone },
      { name: 'address', expected: entityData.address, actual: retrievedEntity.address },
      { name: 'city', expected: entityData.city, actual: retrievedEntity.city },
      { name: 'state', expected: entityData.state, actual: retrievedEntity.state },
      { name: 'country', expected: entityData.country, actual: retrievedEntity.country },
      { name: 'postalCode', expected: entityData.postalCode, actual: retrievedEntity.postalCode },
      { name: 'website', expected: entityData.website, actual: retrievedEntity.website },
      { name: 'industry', expected: entityData.industry, actual: retrievedEntity.industry },
      { name: 'active', expected: entityData.active, actual: retrievedEntity.active },
    ];
    
    let allFieldsVerified = true;
    
    for (const field of fieldsToVerify) {
      if (field.actual === field.expected) {
        log(`✓ Field '${field.name}' verified: ${field.actual}`);
      } else {
        logError(
          `Field '${field.name}' mismatch`,
          { response: { status: 'FIELD_MISMATCH', data: { expected: field.expected, actual: field.actual } } }
        );
        allFieldsVerified = false;
      }
    }
    
    // Test 1: Set entity as inactive (active=false, deletedAt=null)
    log('Step 1: Setting entity to inactive');
    response = await axios.post(`${API_URL}/entities/${entityId}/set-inactive`);
    if (response.status !== 200) {
      throw new Error(`Failed to set entity as inactive. Status: ${response.status}`);
    }
    
    // Verify entity is now inactive
    response = await axios.get(`${API_URL}/entities/${entityId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve entity after setting inactive. Status: ${response.status}`);
    }
    
    const inactiveEntity = response.data;
    if (inactiveEntity.active === false && inactiveEntity.deletedAt === null) {
      log('✓ Entity successfully set to inactive state (active=false, deletedAt=null)');
    } else {
      logError(
        'Entity inactive state incorrect',
        { response: { status: 'FIELD_MISMATCH', data: { expected: 'active=false, deletedAt=null', actual: `active=${inactiveEntity.active}, deletedAt=${inactiveEntity.deletedAt}` } } }
      );
      allFieldsVerified = false;
    }
    
    // Test 2: Soft delete entity (active=false, deletedAt=timestamp)
    log('Step 2: Soft-deleting the entity');
    response = await axios.delete(`${API_URL}/entities/${entityId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to soft-delete entity. Status: ${response.status}`);
    }
    
    // Verify entity is now soft-deleted - need to include deleted entities
    response = await axios.get(`${API_URL}/entities/${entityId}?includeDeleted=true`);
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve entity after soft-deletion. Status: ${response.status}`);
    }
    
    const deletedEntity = response.data;
    if (deletedEntity.active === false && deletedEntity.deletedAt !== null) {
      log('✓ Entity successfully soft-deleted (active=false, deletedAt=timestamp)');
    } else {
      logError(
        'Entity soft-delete state incorrect',
        { response: { status: 'FIELD_MISMATCH', data: { expected: 'active=false, deletedAt=timestamp', actual: `active=${deletedEntity.active}, deletedAt=${deletedEntity.deletedAt}` } } }
      );
      allFieldsVerified = false;
    }
    
    // Test 3: Restore entity (active=true, deletedAt=null)
    log('Step 3: Restoring the soft-deleted entity');
    response = await axios.post(`${API_URL}/entities/${entityId}/restore`);
    if (response.status !== 200) {
      throw new Error(`Failed to restore entity. Status: ${response.status}`);
    }
    
    // Verify entity is now restored
    response = await axios.get(`${API_URL}/entities/${entityId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve entity after restoration. Status: ${response.status}`);
    }
    
    const restoredEntity = response.data;
    if (restoredEntity.active === true && restoredEntity.deletedAt === null) {
      log('✓ Entity successfully restored (active=true, deletedAt=null)');
    } else {
      logError(
        'Entity restore state incorrect',
        { response: { status: 'FIELD_MISMATCH', data: { expected: 'active=true, deletedAt=null', actual: `active=${restoredEntity.active}, deletedAt=${restoredEntity.deletedAt}` } } }
      );
      allFieldsVerified = false;
    }
    
    if (allFieldsVerified) {
      log('✓ All entity fields and state transitions verified successfully!');
    } else {
      log('❌ Some fields or state transitions failed verification. Check error log for details.');
    }
    
    return allFieldsVerified;
  } catch (error) {
    logError('Verification test failed', error);
    return false;
  }
}

// Run the verification
verifyEntityFields().then(success => {
  if (success) {
    log('Verification completed successfully!');
    process.exit(0);
  } else {
    log('Verification failed!');
    process.exit(1);
  }
}).catch(error => {
  logError('Unhandled error in verification script', error);
  process.exit(1);
});