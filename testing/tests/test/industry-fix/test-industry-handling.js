/**
 * Industry Field Value Handling Test
 * 
 * This script tests various scenarios for the industry field value handling
 * during entity creation and updating.
 */

// Import the required libraries
import axios from 'axios';

// Base API URL (using local development server)
const API_URL = 'http://localhost:5000/api';

// Test credentials
const credentials = {
  username: 'admin',
  password: 'password123'
};

// Log section utility
function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

async function authenticate() {
  logSection('AUTHENTICATING');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    
    if (response.data && response.data.token) {
      console.log('Authentication successful');
      return response.data.token;
    } else {
      throw new Error('No token received from authentication');
    }
  } catch (error) {
    console.error('Authentication failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

async function createClient(token) {
  logSection('CREATING TEST CLIENT');
  
  const client = {
    name: `Test Client ${Date.now()}`,
    industry: 'tech',
    active: true
  };
  
  try {
    const response = await axios.post(`${API_URL}/clients`, client, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Client created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create client:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

async function createEntitiesWithDifferentIndustries(token, clientId) {
  logSection('CREATING TEST ENTITIES WITH DIFFERENT INDUSTRY VALUES');
  
  const testCases = [
    { name: 'Entity with string industry', industry: 'tech' },
    { name: 'Entity with numeric industry', industry: 123 },
    { name: 'Entity with empty industry', industry: '' },
    { name: 'Entity with null industry', industry: null },
    { name: 'Entity with "other" industry', industry: 'other' }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      console.log(`Creating entity: ${testCase.name}, industry: ${testCase.industry} (${typeof testCase.industry})`);
      
      const entity = {
        name: testCase.name,
        code: testCase.name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4),
        clientId,
        ownerId: 1,
        active: true,
        fiscalYearStart: '01-01',
        fiscalYearEnd: '12-31',
        industry: testCase.industry,
        currency: 'USD'
      };
      
      const response = await axios.post(`${API_URL}/entities`, entity, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Entity created successfully. ID: ${response.data.id}, Industry: ${response.data.industry} (${typeof response.data.industry})`);
      results.push(response.data);
    } catch (error) {
      console.error(`Failed to create entity "${testCase.name}":`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
  
  return results;
}

async function verifyEntities(token, entities) {
  logSection('VERIFYING CREATED ENTITIES');
  
  for (const entity of entities) {
    try {
      const response = await axios.get(`${API_URL}/entities/${entity.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fetchedEntity = response.data;
      console.log(`Verified entity ${fetchedEntity.id}: "${fetchedEntity.name}"`);
      console.log(`Industry value: "${fetchedEntity.industry}" (${typeof fetchedEntity.industry})`);
      
      // Check if industry value matches what we expect
      if (entity.name.includes('string') || entity.name.includes('"other"')) {
        // String values should be preserved
        if (fetchedEntity.industry === entity.industry) {
          console.log('✅ Industry value preserved correctly');
        } else {
          console.log(`❌ Industry value mismatch. Expected: "${entity.industry}", Got: "${fetchedEntity.industry}"`);
        }
      } else if (entity.name.includes('numeric')) {
        // Numeric values should be converted to strings
        if (typeof fetchedEntity.industry === 'string' && fetchedEntity.industry === String(entity.industry)) {
          console.log('✅ Numeric industry converted to string correctly');
        } else {
          console.log(`❌ Industry conversion issue. Expected: "${String(entity.industry)}" (string), Got: "${fetchedEntity.industry}" (${typeof fetchedEntity.industry})`);
        }
      } else if (entity.name.includes('empty') || entity.name.includes('null')) {
        // Empty/null values should default to "other"
        if (fetchedEntity.industry === 'other') {
          console.log('✅ Empty/null industry defaulted to "other" correctly');
        } else {
          console.log(`❌ Empty/null handling issue. Expected: "other", Got: "${fetchedEntity.industry}"`);
        }
      }
    } catch (error) {
      console.error(`Failed to verify entity ${entity.id}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

async function cleanupEntities(token, entities) {
  logSection('CLEANING UP TEST ENTITIES');
  
  for (const entity of entities) {
    try {
      await axios.delete(`${API_URL}/entities/${entity.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Deleted entity ${entity.id}: "${entity.name}"`);
    } catch (error) {
      console.error(`Failed to delete entity ${entity.id}:`, error.message);
    }
  }
}

async function cleanupClient(token, clientId) {
  logSection('CLEANING UP TEST CLIENT');
  
  try {
    await axios.delete(`${API_URL}/clients/${clientId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Deleted client ${clientId}`);
  } catch (error) {
    console.error(`Failed to delete client ${clientId}:`, error.message);
  }
}

async function runTest() {
  logSection('STARTING INDUSTRY FIELD HANDLING TEST');
  
  try {
    // Authenticate
    const token = await authenticate();
    
    // Create a test client
    const client = await createClient(token);
    
    // Create entities with different industry values
    const entities = await createEntitiesWithDifferentIndustries(token, client.id);
    
    // Verify the entities were created with correct industry values
    await verifyEntities(token, entities);
    
    // Clean up
    await cleanupEntities(token, entities);
    await cleanupClient(token, client.id);
    
    logSection('TEST COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
runTest();