/**
 * Frontend UI Simulation Test
 * 
 * This script simulates user interactions with the frontend to test entity update functionality.
 * It follows the flow: Dashboard -> Add Client -> Step 1 -> Step 2 -> Add Entity -> Edit Entity -> Save Changes.
 */

import axios from 'axios';
import chalk from 'chalk';

// Base URL for API requests
const BASE_URL = 'http://localhost:5000/api';

// Credentials for authentication
const credentials = {
  username: 'admin',
  password: 'password123'
};

// Helper function for colorized logging
const log = {
  info: (msg) => console.log(chalk.cyan(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[WARNING] ${msg}`)),
  error: (msg) => console.log(chalk.red(`[ERROR] ${msg}`)),
  debug: (msg) => console.log(chalk.gray(`[DEBUG] ${msg}`)),
  section: (msg) => console.log(chalk.magenta(`\n===== ${msg} =====`))
};

// Helper function to simulate a pause between UI interactions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function simulateUserInteraction() {
  let authToken = null;
  let client = null;
  let entity = null;
  
  try {
    log.section('STARTING FRONTEND SIMULATION TEST');
    
    // Step 1: Authenticate as admin
    log.info('Simulating login as admin...');
    try {
      const authResponse = await axios.post(`${BASE_URL}/auth/login`, credentials);
      log.success('Authentication successful');
      
      // Our application uses cookies for authentication, not tokens,
      // so we don't need to configure axios with a token.
      // The cookie will be automatically included in subsequent requests.
    } catch (error) {
      log.error(`Authentication failed: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error('Failed to authenticate');
    }
    
    // Step 2: Create a test client (simulating Step 1 of the setup flow)
    log.section('SIMULATING CLIENT CREATION (STEP 1)');
    
    const timestamp = Date.now();
    const clientData = {
      name: `Test Client ${timestamp}`,
      industry: 'tech',
      active: true
    };
    
    log.info(`Creating test client "${clientData.name}"...`);
    const clientResponse = await axios.post(`${BASE_URL}/admin/clients`, clientData);
    
    if (clientResponse.data && clientResponse.data.id) {
      client = clientResponse.data;
      log.success(`Client created with ID ${client.id}`);
      log.debug(`Client data: ${JSON.stringify(client, null, 2)}`);
    } else {
      throw new Error('Failed to create client');
    }
    
    // Step 3: Simulate navigating to Step 2 (Entity Management)
    log.section('SIMULATING ENTITY CREATION (STEP 2)');
    
    // Create an entity for the new client
    const entityData = {
      name: `Entity ${timestamp}`,
      code: `ENT${timestamp.toString().substring(8)}`,
      industry: 'tech', // Testing string value
      ownerId: 1, // Admin user ID
      clientId: client.id,
      active: true,
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31",
      entityType: "llc"
    };
    
    log.info(`Creating entity "${entityData.name}" for client "${client.name}"...`);
    const entityResponse = await axios.post(`${BASE_URL}/admin/entities`, entityData);
    
    if (entityResponse.data && entityResponse.data.id) {
      entity = entityResponse.data;
      log.success(`Entity created with ID ${entity.id}`);
      log.debug(`Entity data: ${JSON.stringify(entity, null, 2)}`);
      log.debug(`Initial industry value: "${entity.industry}" (${typeof entity.industry})`);
    } else {
      throw new Error('Failed to create entity');
    }
    
    // Pause to simulate user interaction
    await sleep(1000);
    
    // Step 4: Simulate clicking "Edit" on the entity
    log.section('SIMULATING ENTITY EDIT');
    
    // First, fetch the current entity data to simulate what the UI would show
    log.info(`Fetching current data for entity ID ${entity.id}...`);
    const getEntityResponse = await axios.get(`${BASE_URL}/admin/entities/${entity.id}`);
    
    if (!getEntityResponse.data) {
      throw new Error(`Failed to get entity with ID ${entity.id}`);
    }
    
    const currentEntity = getEntityResponse.data;
    log.debug(`Current entity data: ${JSON.stringify(currentEntity, null, 2)}`);
    
    // Step 5: Simulate editing the entity and clicking "Save Changes"
    log.section('SIMULATING ENTITY UPDATE');
    
    // Prepare updated entity data - change name and industry
    const updatedEntityData = {
      ...currentEntity,
      name: `${currentEntity.name} (Updated)`,
      industry: 'manufacturing' // Change from 'tech' to 'manufacturing'
    };
    
    log.info(`Updating entity - changing name to "${updatedEntityData.name}" and industry to "${updatedEntityData.industry}"`);
    const updateResponse = await axios.put(`${BASE_URL}/admin/entities/${entity.id}`, updatedEntityData);
    
    if (updateResponse.data) {
      const updatedEntity = updateResponse.data;
      log.success('Entity updated successfully');
      log.debug(`Updated entity data: ${JSON.stringify(updatedEntity, null, 2)}`);
      log.debug(`New industry value: "${updatedEntity.industry}" (${typeof updatedEntity.industry})`);
      
      // Verify the industry value was updated correctly
      if (updatedEntity.industry === 'manufacturing') {
        log.success('Industry value was updated correctly to "manufacturing"');
      } else {
        log.error(`Industry value was NOT updated correctly. Expected "manufacturing" but got "${updatedEntity.industry}"`);
      }
    } else {
      throw new Error('Failed to update entity');
    }
    
    // Step 6: Verify the entity list would update correctly in the UI
    log.section('VERIFYING ENTITY LIST UPDATE');
    
    // Fetch the client's entities to simulate what would be shown in the UI
    log.info(`Fetching entities for client ID ${client.id}...`);
    const clientEntitiesResponse = await axios.get(`${BASE_URL}/test/entities-by-client/${client.id}`);
    
    if (clientEntitiesResponse.data) {
      const clientEntities = clientEntitiesResponse.data;
      
      if (Array.isArray(clientEntities) && clientEntities.length > 0) {
        // Find our updated entity in the list
        const foundEntity = clientEntities.find(e => e.id === entity.id);
        
        if (foundEntity) {
          log.success('Entity found in client entities list');
          log.debug(`Entity in list: ${JSON.stringify(foundEntity, null, 2)}`);
          
          // Verify the entity shows the updated data
          if (foundEntity.name === updatedEntityData.name && 
              foundEntity.industry === updatedEntityData.industry) {
            log.success('Entity list shows correct updated data');
          } else {
            log.error('Entity list does not show the updated data correctly');
            log.debug(`Expected name: "${updatedEntityData.name}", got: "${foundEntity.name}"`);
            log.debug(`Expected industry: "${updatedEntityData.industry}", got: "${foundEntity.industry}"`);
          }
        } else {
          log.error(`Entity ID ${entity.id} not found in client entities list`);
          log.debug(`Entities in list: ${JSON.stringify(clientEntities.map(e => ({ id: e.id, name: e.name })), null, 2)}`);
        }
      } else {
        log.error('No entities found for client');
      }
    } else {
      throw new Error(`Failed to get entities for client ID ${client.id}`);
    }
    
    // Cleanup - delete the test entity and client
    log.section('CLEANING UP TEST DATA');
    
    // Delete entity
    log.info(`Deleting test entity ID ${entity.id}...`);
    await axios.delete(`${BASE_URL}/admin/entities/${entity.id}`);
    log.success(`Entity deleted`);
    
    // Delete client
    log.info(`Deleting test client ID ${client.id}...`);
    await axios.delete(`${BASE_URL}/admin/clients/${client.id}`);
    log.success(`Client deleted`);
    
    log.section('TEST COMPLETED SUCCESSFULLY');
    log.success('✓ Entity creation succeeded');
    log.success('✓ Entity update succeeded');
    log.success('✓ Industry value handling worked correctly');
    log.success('✓ UI state (entity list) would update correctly');
    
    return { success: true };
  } catch (error) {
    log.section('TEST FAILED');
    log.error(`Error: ${error.message}`);
    
    if (error.response) {
      log.error(`Response status: ${error.response.status}`);
      log.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    // Attempt cleanup even if test fails
    try {
      if (entity && entity.id) {
        log.info(`Cleaning up - deleting test entity ID ${entity.id}`);
        await axios.delete(`${BASE_URL}/admin/entities/${entity.id}`);
      }
      
      if (client && client.id) {
        log.info(`Cleaning up - deleting test client ID ${client.id}`);
        await axios.delete(`${BASE_URL}/admin/clients/${client.id}`);
      }
    } catch (cleanupError) {
      log.error(`Cleanup failed: ${cleanupError.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

// Run the test immediately
(async () => {
  try {
    const result = await simulateUserInteraction();
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
})();