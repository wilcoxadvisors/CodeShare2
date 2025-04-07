/**
 * Test script to verify the following entity states:
 * 1. Active entity (active=true, deletedAt=null)
 * 2. Inactive entity (active=false, deletedAt=null)
 * 3. Soft-deleted entity (active=false, deletedAt=timestamp)
 * 
 * This script will:
 * 1. Create a new entity
 * 2. Set it to inactive using the proper endpoint
 * 3. Delete it using the soft-delete endpoint
 * 4. Restore it from deletion
 * 5. Verify all these operations work correctly
 */

// Use global fetch which is available in newer Node.js versions
// If running in an older Node.js version, you may need: const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api/verification';
const TEST_PREFIX = 'Entity-States-Test-';
const timestamp = Date.now();
const entityName = `${TEST_PREFIX}${timestamp}`;

// Create a log directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file paths
const logFile = path.join(logDir, `entity-states-test-${timestamp}.log`);
const errorLogFile = path.join(logDir, `entity-states-test-${timestamp}-errors.log`);

// Helper to log messages and also print to console
function log(message) {
  const formattedMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, formattedMessage);
}

// Helper to log errors
function logError(message, error) {
  const formattedMessage = `[${new Date().toISOString()}] ERROR: ${message}\n${error.stack || error}\n`;
  console.error(`ERROR: ${message}`, error);
  fs.appendFileSync(errorLogFile, formattedMessage);
}

// Helper for API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    logError(`API request failed: ${method} ${endpoint}`, error);
    throw error;
  }
}

// Create a validation function
function validateEntityState(entity, expectedState) {
  const { active, deletedAt } = entity;
  const result = {
    valid: true,
    errors: []
  };

  switch (expectedState) {
    case 'active':
      if (active !== true) {
        result.valid = false;
        result.errors.push(`Expected active=true, got active=${active}`);
      }
      if (deletedAt !== null) {
        result.valid = false;
        result.errors.push(`Expected deletedAt=null, got deletedAt=${deletedAt}`);
      }
      break;
    case 'inactive':
      if (active !== false) {
        result.valid = false;
        result.errors.push(`Expected active=false, got active=${active}`);
      }
      if (deletedAt !== null) {
        result.valid = false;
        result.errors.push(`Expected deletedAt=null, got deletedAt=${deletedAt}`);
      }
      break;
    case 'deleted':
      if (active !== false) {
        result.valid = false;
        result.errors.push(`Expected active=false, got active=${active}`);
      }
      if (deletedAt === null) {
        result.valid = false;
        result.errors.push(`Expected deletedAt to be a timestamp, got deletedAt=${deletedAt}`);
      }
      break;
    default:
      result.valid = false;
      result.errors.push(`Unknown expected state: ${expectedState}`);
  }

  return result;
}

// Main test function
async function runEntityStateTests() {
  log(`Starting entity state verification tests with entity name: ${entityName}`);
  let entityId = null;
  let success = true;

  try {
    // Step 1: Create a new test entity 
    const testEntityData = {
      name: entityName,
      code: entityName.substring(0, 10),
      active: true,
      taxId: '12-3456789',
      businessType: 'LLC',
      fiscalYearEnd: '12-31',
      address: '123 Test St',
      city: 'Testville',
      state: 'TS',
      country: 'USA',
      postalCode: '12345',
      phone: '555-123-4567',
      email: 'test@example.com'
    };

    // Look for admin client ID first
    const clientsResponse = await apiRequest('/clients');
    if (!clientsResponse.ok) {
      throw new Error(`Failed to get clients list: ${JSON.stringify(clientsResponse.data)}`);
    }

    // Find the admin client (usually the first one)
    const adminClient = clientsResponse.data.find(client => client.name.includes('Admin'));
    if (!adminClient) {
      throw new Error('Could not find admin client in the clients list');
    }

    // Register test admin user to get userId
    const registerResponse = await apiRequest('/register-test-admin', 'POST');
    if (!registerResponse.ok) {
      throw new Error(`Failed to register test admin: ${JSON.stringify(registerResponse.data)}`);
    }
    
    const adminUser = registerResponse.data.user;
    log(`Using admin user with ID ${adminUser.id}`);
    
    // Add client ID and owner ID to entity data
    testEntityData.clientId = adminClient.id;
    testEntityData.ownerId = adminUser.id;
    
    log(`Found admin client with ID ${adminClient.id}`);
    
    // Create the entity
    const createResponse = await apiRequest('/entities', 'POST', testEntityData);
    if (!createResponse.ok) {
      throw new Error(`Failed to create test entity: ${JSON.stringify(createResponse.data)}`);
    }

    entityId = createResponse.data.id;
    log(`Created test entity with ID ${entityId}`);

    // Validate initial state (active)
    const initialValidation = validateEntityState(createResponse.data, 'active');
    if (!initialValidation.valid) {
      log(`❌ Initial entity state validation failed: ${initialValidation.errors.join(', ')}`);
      success = false;
    } else {
      log('✅ Initial entity state validation passed (active=true, deletedAt=null)');
    }

    // Step 2: Set entity to inactive
    const inactiveResponse = await apiRequest(`/entities/${entityId}/set-inactive`, 'POST');
    if (!inactiveResponse.ok) {
      throw new Error(`Failed to set entity as inactive: ${JSON.stringify(inactiveResponse.data)}`);
    }
    
    log(`Set entity ${entityId} to inactive state`);

    // Debug the response for better understanding
    log(`DEBUG - Inactive entity response data: ${JSON.stringify(inactiveResponse.data)}`);
    
    // Validate inactive state
    const inactiveValidation = validateEntityState(inactiveResponse.data, 'inactive');
    if (!inactiveValidation.valid) {
      log(`❌ Inactive entity state validation failed: ${inactiveValidation.errors.join(', ')}`);
      success = false;
    } else {
      log('✅ Inactive entity state validation passed (active=false, deletedAt=null)');
    }

    // Step 3: Soft-delete the entity
    const deleteResponse = await apiRequest(`/entities/${entityId}`, 'DELETE');
    if (!deleteResponse.ok) {
      throw new Error(`Failed to soft-delete entity: ${JSON.stringify(deleteResponse.data)}`);
    }
    
    log(`Soft-deleted entity ${entityId}`);

    // Validate deleted state
    const deletedValidation = validateEntityState(deleteResponse.data, 'deleted');
    if (!deletedValidation.valid) {
      log(`❌ Deleted entity state validation failed: ${deletedValidation.errors.join(', ')}`);
      success = false;
    } else {
      log('✅ Deleted entity state validation passed (active=false, deletedAt=timestamp)');
    }

    // Step 4: Verify that regular GET request doesn't return deleted entity
    const getResponse = await apiRequest(`/entities/${entityId}`);
    if (getResponse.status !== 404) {
      log(`❌ Regular GET request returned deleted entity when it shouldn't: ${JSON.stringify(getResponse.data)}`);
      success = false;
    } else {
      log('✅ Regular GET request correctly does not return deleted entity');
    }

    // Step 5: Verify that GET request with includeDeleted=true returns deleted entity
    const getDeletedResponse = await apiRequest(`/entities/${entityId}?includeDeleted=true`);
    if (!getDeletedResponse.ok) {
      log(`❌ GET with includeDeleted=true failed to return deleted entity: ${JSON.stringify(getDeletedResponse.data)}`);
      success = false;
    } else {
      log('✅ GET with includeDeleted=true correctly returns deleted entity');
    }

    // Step 6: Restore the entity
    const restoreResponse = await apiRequest(`/entities/${entityId}/restore`, 'POST');
    if (!restoreResponse.ok) {
      throw new Error(`Failed to restore entity: ${JSON.stringify(restoreResponse.data)}`);
    }
    
    log(`Restored entity ${entityId} from deletion`);
    
    // Debug the response for better understanding
    log(`DEBUG - Restored entity response data: ${JSON.stringify(restoreResponse.data)}`);

    // Validate restored state (should be active)
    const restoredValidation = validateEntityState(restoreResponse.data, 'active');
    if (!restoredValidation.valid) {
      log(`❌ Restored entity state validation failed: ${restoredValidation.errors.join(', ')}`);
      success = false;
    } else {
      log('✅ Restored entity state validation passed (active=true, deletedAt=null)');
    }

    // Final success message
    if (success) {
      log('\n🎉 All entity state tests PASSED! The system correctly implements:');
      log('  - Active entities (active=true, deletedAt=null)');
      log('  - Inactive entities (active=false, deletedAt=null)');
      log('  - Soft-deleted entities (active=false, deletedAt=timestamp)');
      log('  - Entity restoration from deletion');
    } else {
      log('\n❌ Some entity state tests FAILED. See errors above.');
    }
    
    return success;

  } catch (error) {
    logError('Test execution failed', error);
    return false;
  }
}

// Run the tests
runEntityStateTests()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    logError('Unhandled error in test execution', error);
    process.exit(1);
  });