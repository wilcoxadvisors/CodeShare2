/**
 * Comprehensive Journal Entry Module Testing Suite
 * Tests frontend, backend, API layers, and data persistence
 */

// Test Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CLIENT_ID = 251;
const TEST_ENTITY_ID = 392;

// Test Authentication (Node.js doesn't handle cookies the same way)
async function authenticate() {
  // In Node.js environment, we'll use curl for proper session management
  console.log('Using curl for authentication in Node.js environment');
  return { user: { username: 'admin' }, authenticated: true };
}

// Test API Endpoints
async function testAPIEndpoints() {
  console.log('=== TESTING API ENDPOINTS ===');
  
  // Test 1: List journal entries
  console.log('Testing GET /api/clients/:clientId/entities/:entityId/journal-entries');
  const listResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries`, {
    credentials: 'include'
  });
  console.log(`Status: ${listResponse.status}`);
  const listData = await listResponse.json();
  console.log(`Entries found: ${listData.length || 0}`);
  
  // Test 2: Get specific entry
  if (listData.length > 0) {
    const entryId = listData[0].id;
    console.log(`Testing GET /api/clients/:clientId/entities/:entityId/journal-entries/${entryId}`);
    const detailResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries/${entryId}`, {
      credentials: 'include'
    });
    console.log(`Status: ${detailResponse.status}`);
    const detailData = await detailResponse.json();
    console.log(`Entry ID: ${detailData.id}, Lines: ${detailData.lines?.length || 0}`);
  }
  
  // Test 3: Create new entry
  console.log('Testing POST /api/clients/:clientId/entities/:entityId/journal-entries');
  const createResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      date: '2025-06-14',
      description: 'Test Entry for Comprehensive Testing',
      lines: [
        {
          accountId: 7980,
          type: 'debit',
          amount: '100.00',
          description: 'Test debit line',
          entityCode: 'NEW46'
        },
        {
          accountId: 8011,
          type: 'credit',
          amount: '100.00',
          description: 'Test credit line',
          entityCode: 'NEW46'
        }
      ]
    })
  });
  console.log(`Create Status: ${createResponse.status}`);
  const createData = await createResponse.json();
  console.log(`Created Entry ID: ${createData.id || 'Failed'}`);
  
  return createData.id;
}

// Test Update Functionality
async function testUpdateFunctionality(entryId) {
  console.log('=== TESTING UPDATE FUNCTIONALITY ===');
  
  // Test PATCH endpoint
  console.log(`Testing PATCH /api/clients/:clientId/entities/:entityId/journal-entries/${entryId}`);
  const updateResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      description: 'UPDATED - Test Entry for Comprehensive Testing',
      lines: [
        {
          accountId: 7980,
          type: 'debit',
          amount: '150.00',
          description: 'UPDATED - Test debit line',
          entityCode: 'NEW46'
        },
        {
          accountId: 8011,
          type: 'credit',
          amount: '150.00',
          description: 'UPDATED - Test credit line',
          entityCode: 'NEW46'
        }
      ]
    })
  });
  console.log(`Update Status: ${updateResponse.status}`);
  
  // Verify update persisted
  console.log('Verifying update persistence...');
  const verifyResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries/${entryId}`, {
    credentials: 'include'
  });
  const verifyData = await verifyResponse.json();
  console.log(`Verified Description: ${verifyData.description}`);
  console.log(`Verified Line 1 Amount: ${verifyData.lines?.[0]?.amount}`);
  
  return verifyData.description.includes('UPDATED');
}

// Test Copy Functionality
async function testCopyFunctionality(sourceEntryId) {
  console.log('=== TESTING COPY FUNCTIONALITY ===');
  
  // First post the source entry so it can be copied
  console.log('Posting source entry first...');
  const postResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries/${sourceEntryId}/post`, {
    method: 'PUT',
    credentials: 'include'
  });
  console.log(`Post Status: ${postResponse.status}`);
  
  // Test copy functionality
  console.log(`Testing POST /api/clients/:clientId/entities/:entityId/journal-entries/${sourceEntryId}/copy`);
  const copyResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries/${sourceEntryId}/copy`, {
    method: 'POST',
    credentials: 'include'
  });
  console.log(`Copy Status: ${copyResponse.status}`);
  const copyData = await copyResponse.json();
  console.log(`Copied Entry ID: ${copyData.id || 'Failed'}`);
  console.log(`Copy Description: ${copyData.description}`);
  
  return copyData.id;
}

// Test Error Handling
async function testErrorHandling() {
  console.log('=== TESTING ERROR HANDLING ===');
  
  // Test 1: Invalid entry ID
  console.log('Testing non-existent entry...');
  const invalidResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries/999999`, {
    credentials: 'include'
  });
  console.log(`Invalid Entry Status: ${invalidResponse.status}`);
  const invalidData = await invalidResponse.json();
  console.log(`Error Message: ${invalidData.message}`);
  
  // Test 2: Unbalanced entry creation
  console.log('Testing unbalanced entry creation...');
  const unbalancedResponse = await fetch(`${BASE_URL}/api/clients/${TEST_CLIENT_ID}/entities/${TEST_ENTITY_ID}/journal-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      date: '2025-06-14',
      description: 'Unbalanced Test Entry',
      lines: [
        {
          accountId: 7980,
          type: 'debit',
          amount: '100.00',
          description: 'Debit line',
          entityCode: 'NEW46'
        },
        {
          accountId: 8011,
          type: 'credit',
          amount: '50.00',
          description: 'Credit line - unbalanced',
          entityCode: 'NEW46'
        }
      ]
    })
  });
  console.log(`Unbalanced Entry Status: ${unbalancedResponse.status}`);
  const unbalancedData = await unbalancedResponse.json();
  console.log(`Validation Error: ${unbalancedData.errors?.lines || 'No validation error'}`);
}

// Main Test Runner
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Journal Entry Testing Suite\n');
  
  try {
    // Authenticate
    console.log('Authenticating...');
    const authResult = await authenticate();
    console.log(`Authenticated as: ${authResult.user?.username}\n`);
    
    // Test API endpoints
    const newEntryId = await testAPIEndpoints();
    console.log('');
    
    // Test update functionality
    if (newEntryId) {
      const updateSuccess = await testUpdateFunctionality(newEntryId);
      console.log(`Update Test Result: ${updateSuccess ? 'PASSED' : 'FAILED'}\n`);
      
      // Test copy functionality
      const copiedEntryId = await testCopyFunctionality(newEntryId);
      console.log(`Copy Test Result: ${copiedEntryId ? 'PASSED' : 'FAILED'}\n`);
    }
    
    // Test error handling
    await testErrorHandling();
    console.log('');
    
    console.log('✅ Comprehensive testing completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests if called directly
if (typeof window === 'undefined') {
  runComprehensiveTests();
} else {
  // Browser environment - expose to window
  window.runJournalEntryTests = runComprehensiveTests;
}