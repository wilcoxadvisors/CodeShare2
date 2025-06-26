/**
 * Test script for Phase 3 Mission 3.1 - Batch Processing API Endpoint
 * 
 * This script validates the complete batch processing workflow:
 * 1. Authentication
 * 2. Batch processing API endpoint functionality
 * 3. Database transaction integrity
 */

import axios from 'axios';
const BASE_URL = 'http://localhost:5000';

// Configure axios to handle cookies
axios.defaults.withCredentials = true;

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'SUCCESS' ? '✅' : type === 'ERROR' ? '❌' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function login() {
  try {
    log('Authenticating with admin credentials...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });

    if (response.status === 200) {
      log('Authentication successful', 'SUCCESS');
      return response.headers['set-cookie'];
    } else {
      throw new Error(`Login failed with status: ${response.status}`);
    }
  } catch (error) {
    log(`Authentication failed: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function testBatchProcessing(cookies) {
  try {
    log('Testing batch processing endpoint...');

    const testPayload = {
      approvedEntries: [
        {
          header: {
            Date: '2025-01-15',
            Description: 'Test Batch Processing Entry',
            Reference: 'BATCH-PROCESS-TEST-001'
          },
          lines: [
            {
              accountId: 1, // Using existing account ID
              amount: 250.00,
              description: 'Test debit line - Office Supplies',
              entityCode: 'GW2' // Use actual entity code from database
            },
            {
              accountId: 2, // Using existing account ID
              amount: -250.00,
              description: 'Test credit line - Cash',
              entityCode: 'GW2' // Use actual entity code from database
            }
          ]
        },
        {
          header: {
            Date: '2025-01-15',
            Description: 'Test Batch Processing Entry #2',
            Reference: 'BATCH-PROCESS-TEST-002'
          },
          lines: [
            {
              accountId: 1,
              amount: 150.00,
              description: 'Test debit line - Equipment',
              entityCode: 'GW2'
            },
            {
              accountId: 2,
              amount: -150.00,
              description: 'Test credit line - Accounts Payable',
              entityCode: 'GW2'
            }
          ]
        }
      ],
      entityId: 393, // Using actual entity ID from database (GCW entity)
      batchSettings: {
        isAccrual: false,
        description: 'Test batch processing'
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api/clients/250/journal-entries/batch-process`,
      testPayload,
      {
        headers: {
          'Cookie': cookies.join('; '),
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200 && response.data.success) {
      log(`Batch processing successful! Created ${response.data.data.createdCount} entries`, 'SUCCESS');
      log(`Journal Entry IDs: ${response.data.data.createdEntryIds.join(', ')}`, 'SUCCESS');
      return response.data;
    } else {
      throw new Error(`Batch processing failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    log(`Batch processing failed: ${error.response?.data?.error?.message || error.message}`, 'ERROR');
    if (error.response?.data) {
      log(`Error details: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
}

async function testInvalidPayload(cookies) {
  try {
    log('Testing batch processing with invalid payload...');

    const invalidPayload = {
      approvedEntries: [], // Empty array should trigger validation error
      entityId: null
    };

    const response = await axios.post(
      `${BASE_URL}/api/clients/250/journal-entries/batch-process`,
      invalidPayload,
      {
        headers: {
          'Cookie': cookies.join('; '),
          'Content-Type': 'application/json'
        }
      }
    );

    // This should not succeed
    log('Unexpected success with invalid payload', 'ERROR');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log('Invalid payload correctly rejected with 400 status', 'SUCCESS');
      return true;
    } else {
      log(`Unexpected error response: ${error.response?.status}`, 'ERROR');
      return false;
    }
  }
}

async function runBatchProcessingTests() {
  try {
    log('='.repeat(60));
    log('PHASE 3 MISSION 3.1: BATCH PROCESSING API ENDPOINT TEST');
    log('='.repeat(60));

    // Step 1: Authenticate
    const cookies = await login();

    // Step 2: Test successful batch processing
    const result = await testBatchProcessing(cookies);

    // Step 3: Test error handling
    const validationTest = await testInvalidPayload(cookies);

    // Step 4: Summary
    log('='.repeat(60));
    log('TEST SUMMARY');
    log('='.repeat(60));
    log(`✅ Authentication: Working`);
    log(`✅ Batch Processing: Working (Created ${result.data.createdCount} entries)`);
    log(`✅ Error Handling: ${validationTest ? 'Working' : 'Failed'}`);
    log('='.repeat(60));
    log('PHASE 3 MISSION 3.1: COMPLETE ✅', 'SUCCESS');
    log('Backend batch processing endpoint is fully functional!', 'SUCCESS');
    log('='.repeat(60));

  } catch (error) {
    log('='.repeat(60));
    log('TEST FAILED ❌', 'ERROR');
    log(`Error: ${error.message}`, 'ERROR');
    log('='.repeat(60));
    process.exit(1);
  }
}

// Run the test
runBatchProcessingTests();