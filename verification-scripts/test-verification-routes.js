/**
 * Test script for verification routes
 * 
 * This script tests that the verification routes are working properly
 * without requiring authentication.
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
const logFile = path.join(logsDir, `verification-routes-test-${Date.now()}.log`);
const errorLogFile = path.join(logsDir, `verification-routes-error-${Date.now()}.log`);

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

// Test route function
async function testRoute(method, route, data = null) {
  log(`Testing ${method.toUpperCase()} ${route}...`);
  
  try {
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(`${API_URL}${route}`);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(`${API_URL}${route}`, data);
    } else if (method.toLowerCase() === 'put') {
      response = await axios.put(`${API_URL}${route}`, data);
    } else if (method.toLowerCase() === 'delete') {
      response = await axios.delete(`${API_URL}${route}`);
    }
    
    log(`SUCCESS: ${method.toUpperCase()} ${route} - Status: ${response.status}`);
    return response.data;
  } catch (error) {
    logError(`Failed ${method.toUpperCase()} ${route}`, error);
    return null;
  }
}

// Main test function
async function runTests() {
  log('Starting verification routes test');
  
  try {
    // Test admin registration
    await testRoute('post', '/register-test-admin');
    
    // Test entity creation
    const entityData = {
      name: "Test Entity " + Date.now(),
      code: "TEST" + Date.now().toString().slice(-5),
      clientId: 131,
      ownerId: 1,
      entityType: "LLC",
      email: "test@example.com",
      active: true
    };
    
    const newEntity = await testRoute('post', '/entities', entityData);
    
    if (newEntity && newEntity.id) {
      log(`Created entity with ID: ${newEntity.id}`);
      
      // Test entity retrieval
      await testRoute('get', `/entities/${newEntity.id}`);
      
      // Test entity update
      const updateData = {
        name: "Updated " + entityData.name,
        taxId: "123-45-6789",
        phone: "555-123-4567"
      };
      await testRoute('put', `/entities/${newEntity.id}`, updateData);
      
      // Test set inactive
      await testRoute('post', `/entities/${newEntity.id}/set-inactive`);
      
      // Test soft delete
      await testRoute('delete', `/entities/${newEntity.id}`);
      
      // Test restore
      await testRoute('post', `/entities/${newEntity.id}/restore`);
    }
    
    // Test client listing
    await testRoute('get', '/clients');
    
    // Test entity listing
    await testRoute('get', '/entities');
    
    log('All tests completed');
  } catch (error) {
    logError('Test execution failed', error);
  }
}

// Run the tests
runTests().then(() => {
  log('Test script execution completed');
}).catch(error => {
  logError('Unhandled error in test script', error);
});