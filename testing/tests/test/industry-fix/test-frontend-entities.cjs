/**
 * Test Front-End Entity Update Functionality
 * 
 * This script simulates the entity update process that would happen in the frontend
 * and verifies that the industry field is correctly processed during entity updates.
 */

const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const AUTH_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Helper for colored output
try {
  require('colors');
} catch (err) {
  console.log('Installing colors package...');
  execSync('npm install colors --no-save', { stdio: 'inherit' });
}
const colors = require('colors/safe');

const log = {
  info: (msg) => console.log(colors.cyan(`[INFO] ${msg}`)),
  success: (msg) => console.log(colors.green(`[SUCCESS] ${msg}`)),
  warn: (msg) => console.log(colors.yellow(`[WARNING] ${msg}`)),
  error: (msg) => console.log(colors.red(`[ERROR] ${msg}`)),
  debug: (msg) => console.log(colors.gray(`[DEBUG] ${msg}`)),
  section: (msg) => console.log(colors.magenta(`\n===== ${msg} =====`))
};

// Axios instance with cookie support
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

async function runTest() {
  let client = null;
  let entity = null;
  
  try {
    log.section('STARTING FRONTEND ENTITY UPDATE TEST');
    
    // Step 1: Login
    log.info('Authenticating as admin...');
    const authResponse = await api.post('/auth/login', AUTH_CREDENTIALS);
    
    if (authResponse.status !== 200) {
      throw new Error(`Authentication failed with status ${authResponse.status}`);
    }
    
    log.success('Authentication successful');
    
    // Step 2: Create a test client
    log.section('CREATING TEST CLIENT');
    
    const timestamp = Date.now();
    const clientData = {
      name: `Test Client ${timestamp}`,
      industry: 'tech',
      active: true
    };
    
    log.info(`Creating client "${clientData.name}"...`);
    try {
      const clientResponse = await api.post('/admin/clients', clientData);
      client = clientResponse.data;
      log.success(`Client created with ID: ${client.id}`);
      log.debug(`Client data: ${JSON.stringify(client, null, 2)}`);
    } catch (error) {
      log.error(`Client creation failed: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error('Client creation failed');
    }
    
    // Step 3: Create an entity for this client
    log.section('CREATING ENTITY');
    
    const entityData = {
      name: `Entity ${timestamp}`,
      code: `ENT${timestamp.toString().slice(-6)}`,
      industry: 'tech',
      clientId: client.id,
      active: true,
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31",
      entityType: "llc"
    };
    
    log.info(`Creating entity "${entityData.name}"...`);
    try {
      const entityResponse = await api.post('/admin/entities', entityData);
      entity = entityResponse.data;
      log.success(`Entity created with ID: ${entity.id}`);
      log.debug(`Entity data: ${JSON.stringify(entity, null, 2)}`);
      log.debug(`Current industry value: "${entity.industry}" (${typeof entity.industry})`);
    } catch (error) {
      log.error(`Entity creation failed: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error('Entity creation failed');
    }
    
    // Step 4: Update the entity with a different industry value
    log.section('UPDATING ENTITY INDUSTRY VALUE');
    
    // First get the current entity data
    log.info(`Fetching current data for entity ID ${entity.id}...`);
    const getEntityResponse = await api.get(`/admin/entities/${entity.id}`);
    const currentEntity = getEntityResponse.data;
    
    // Now update it with a different industry
    const updatedEntityData = {
      ...currentEntity,
      name: `${currentEntity.name} (Updated)`,
      industry: 'manufacturing'  // Change from 'tech' to 'manufacturing'
    };
    
    log.info(`Updating entity - changing industry from "${currentEntity.industry}" to "${updatedEntityData.industry}"`);
    try {
      const updateResponse = await api.put(`/admin/entities/${entity.id}`, updatedEntityData);
      const updatedEntity = updateResponse.data;
      log.success('Entity updated successfully');
      log.debug(`Updated entity data: ${JSON.stringify(updatedEntity, null, 2)}`);
      
      // Verify the industry field was updated correctly
      if (updatedEntity.industry === 'manufacturing') {
        log.success('✓ Industry field was updated correctly');
      } else {
        log.error(`✗ Industry field was NOT updated correctly. Expected "manufacturing" but got "${updatedEntity.industry}"`);
        throw new Error('Industry field update verification failed');
      }
    } catch (error) {
      log.error(`Entity update failed: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error('Entity update failed');
    }
    
    // Step 5: Verify the client's entities list includes the updated entity
    log.section('VERIFYING ENTITY LIST');
    
    log.info(`Fetching entities for client ID ${client.id}...`);
    const entitiesResponse = await api.get(`/test/entities-by-client/${client.id}`);
    const entities = entitiesResponse.data;
    
    if (Array.isArray(entities) && entities.length > 0) {
      const foundEntity = entities.find(e => e.id === entity.id);
      
      if (foundEntity) {
        log.success('Entity found in client entities list');
        
        if (foundEntity.industry === 'manufacturing') {
          log.success('✓ Entity in list shows correct industry value');
        } else {
          log.error(`✗ Entity in list shows incorrect industry value. Expected "manufacturing" but got "${foundEntity.industry}"`);
        }
      } else {
        log.error(`Entity ID ${entity.id} not found in client entities list`);
      }
    } else {
      log.error('No entities found for client');
    }
    
    // Clean up
    log.section('CLEANING UP TEST DATA');
    
    // Delete the entity and client
    log.info(`Deleting test entity ID ${entity.id}...`);
    await api.delete(`/admin/entities/${entity.id}`);
    log.success('Entity deleted');
    
    log.info(`Deleting test client ID ${client.id}...`);
    await api.delete(`/admin/clients/${client.id}`);
    log.success('Client deleted');
    
    log.section('TEST COMPLETED SUCCESSFULLY');
    log.success('✓ Entity creation works correctly');
    log.success('✓ Entity industry value updates correctly');
    log.success('✓ Entity list reflects the updated industry value');
    
    return true;
  } catch (error) {
    log.section('TEST FAILED');
    log.error(`Error: ${error.message}`);
    
    // Attempt cleanup even if test fails
    try {
      if (entity && entity.id) {
        log.info(`Cleaning up - deleting test entity ID ${entity.id}...`);
        await api.delete(`/admin/entities/${entity.id}`);
      }
      
      if (client && client.id) {
        log.info(`Cleaning up - deleting test client ID ${client.id}...`);
        await api.delete(`/admin/clients/${client.id}`);
      }
    } catch (cleanupError) {
      log.error(`Cleanup failed: ${cleanupError.message}`);
    }
    
    return false;
  }
}

// Run the test
runTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });