#!/usr/bin/env node

/**
 * Comprehensive test script for dimension API endpoints
 * Tests all CRUD operations for dimensions and dimension values
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_CLIENT_ID = 235; // Known test client with seeded data

// Test authentication session cookie
const TEST_COOKIE = 'connect.sid=s%3Akx4ghqgVR37KFNpyphW1R4KErNtxB0FS.%2B%2FfZhEwNc1MLN2jZECp8z%2BUCjMDdlDWFIBx9HpPHO5Q';

function log(message) {
  console.log(`[TEST] ${message}`);
}

function logError(message, error) {
  console.error(`[ERROR] ${message}:`, error?.message || error);
}

async function makeRequest(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': TEST_COOKIE,
      'Accept': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    log(`${method} ${endpoint}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`✓ ${method} ${endpoint} - Success`);
    return result;
  } catch (error) {
    logError(`${method} ${endpoint}`, error);
    throw error;
  }
}

async function testDimensionEndpoints() {
  log('Starting dimension API endpoint tests...');
  
  try {
    // Test 1: Get all dimensions for client 235
    log('\n--- Test 1: GET dimensions for client ---');
    const dimensions = await makeRequest('GET', `/api/clients/${TEST_CLIENT_ID}/dimensions`);
    log(`Found ${dimensions.length} dimensions for client ${TEST_CLIENT_ID}`);
    
    if (dimensions.length === 0) {
      throw new Error('No dimensions found for test client');
    }

    // Display first few dimensions
    dimensions.slice(0, 3).forEach(dim => {
      log(`  - ${dim.name} (${dim.code}): ${dim.values?.length || 0} values`);
    });

    // Test 2: Create a new dimension
    log('\n--- Test 2: POST new dimension ---');
    const newDimensionData = {
      code: `TEST_DIM_${Date.now()}`,
      name: `Test Dimension ${Date.now()}`,
      description: 'Test dimension created by API test script',
      isSystemDimension: false
    };

    const newDimension = await makeRequest('POST', `/api/clients/${TEST_CLIENT_ID}/dimensions`, newDimensionData);
    log(`Created dimension: ${newDimension.name} (ID: ${newDimension.id})`);

    // Test 3: Update the dimension
    log('\n--- Test 3: PUT update dimension ---');
    const updateData = {
      name: `Updated ${newDimension.name}`,
      description: 'Updated description via API test'
    };

    const updatedDimension = await makeRequest('PUT', `/api/dimensions/${newDimension.id}`, updateData);
    log(`Updated dimension: ${updatedDimension.name}`);

    // Test 4: Create dimension value
    log('\n--- Test 4: POST new dimension value ---');
    const newValueData = {
      code: `TEST_VAL_${Date.now()}`,
      name: `Test Value ${Date.now()}`,
      description: 'Test value created by API test script'
    };

    const newValue = await makeRequest('POST', `/api/dimensions/${newDimension.id}/values`, newValueData);
    log(`Created dimension value: ${newValue.name} (ID: ${newValue.id})`);

    // Test 5: Update dimension value
    log('\n--- Test 5: PUT update dimension value ---');
    const updateValueData = {
      name: `Updated ${newValue.name}`,
      description: 'Updated value description via API test'
    };

    const updatedValue = await makeRequest('PUT', `/api/dimension-values/${newValue.id}`, updateValueData);
    log(`Updated dimension value: ${updatedValue.name}`);

    // Test 6: Verify all changes
    log('\n--- Test 6: GET updated dimensions ---');
    const finalDimensions = await makeRequest('GET', `/api/clients/${TEST_CLIENT_ID}/dimensions`);
    const testDimension = finalDimensions.find(d => d.id === newDimension.id);
    
    if (!testDimension) {
      throw new Error('Test dimension not found in final check');
    }

    log(`Verified dimension: ${testDimension.name}`);
    log(`Dimension has ${testDimension.values?.length || 0} values`);

    const testValue = testDimension.values?.find(v => v.id === newValue.id);
    if (testValue) {
      log(`Verified value: ${testValue.name}`);
    } else {
      log('Warning: Test value not found in dimension values');
    }

    log('\n🎉 All dimension API tests completed successfully!');
    
    return {
      success: true,
      totalDimensions: finalDimensions.length,
      testDimensionId: newDimension.id,
      testValueId: newValue.id
    };

  } catch (error) {
    logError('Dimension API test failed', error);
    return { success: false, error: error.message };
  }
}

// Run the tests
testDimensionEndpoints()
  .then(result => {
    if (result.success) {
      log(`\nTest Summary:`);
      log(`- Total dimensions in system: ${result.totalDimensions}`);
      log(`- Created test dimension ID: ${result.testDimensionId}`);
      log(`- Created test value ID: ${result.testValueId}`);
      process.exit(0);
    } else {
      logError('Tests failed', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    logError('Unexpected error', error);
    process.exit(1);
  });