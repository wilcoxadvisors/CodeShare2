/**
 * Test Script for New Journal Entry API Endpoints
 * 
 * This script tests the enhanced journal entry endpoints including:
 * 1. The new DELETE endpoint
 * 2. The improved validation on POST/PUT endpoints
 * 3. Intercompany validation
 * 
 * Usage:
 * 1. Login to the application to get a valid session cookie
 * 2. Run: node scripts/test-new-journal-endpoints.js <entity-id> <test-name>
 * 
 * Test Names:
 * - create-basic: Create a basic journal entry with balanced lines
 * - create-intercompany: Create a journal entry with intercompany lines
 * - create-invalid: Test validation by creating an invalid journal entry
 * - update-basic: Update a journal entry
 * - delete-draft: Delete a draft journal entry
 * - void-posted: Void a posted journal entry (admin only)
 */

const fs = require('fs');
const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
let cookieHeader = '';

// Helper Functions
async function loadCookies() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      cookieHeader = fs.readFileSync('./cookies.txt', 'utf8').trim();
      console.log('Loaded auth cookies');
    } else {
      console.error('No cookies.txt file found. Please log in to the application first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
    process.exit(1);
  }
}

// Test Data
const getBasicJournalEntry = () => ({
  "date": new Date().toISOString().split('T')[0],
  "reference": `TEST-${Date.now()}`,
  "description": "Basic Test Journal Entry",
  "notes": "Created via test script",
  "lines": [
    {
      "accountId": 1001, // Replace with a valid account ID
      "type": "debit",
      "amount": "100.00",
      "entityCode": "MAIN", // Entity code for the main entity
      "description": "Test debit line"
    },
    {
      "accountId": 2001, // Replace with a valid account ID
      "type": "credit",
      "amount": "100.00",
      "entityCode": "MAIN", // Entity code for the main entity
      "description": "Test credit line"
    }
  ]
});

const getIntercompanyJournalEntry = () => ({
  "date": new Date().toISOString().split('T')[0],
  "reference": `IC-TEST-${Date.now()}`,
  "description": "Intercompany Test Journal Entry",
  "notes": "Created via test script - intercompany transaction",
  "lines": [
    // Entity 1 entries (MAIN)
    {
      "accountId": 1001, // Replace with a valid account ID
      "type": "debit",
      "amount": "100.00",
      "entityCode": "MAIN", // Entity code for the main entity
      "description": "Test debit line entity 1"
    },
    {
      "accountId": 1399, // Intercompany receivable account
      "type": "credit",
      "amount": "100.00",
      "entityCode": "MAIN", // Entity code for the main entity
      "description": "Due from entity 2"
    },
    // Entity 2 entries (SUB)
    {
      "accountId": 1399, // Intercompany payable account
      "type": "debit",
      "amount": "100.00",
      "entityCode": "SUB", // Entity code for the subsidiary
      "description": "Due to entity 1"
    },
    {
      "accountId": 2001, // Replace with a valid account ID
      "type": "credit",
      "amount": "100.00",
      "entityCode": "SUB", // Entity code for the subsidiary
      "description": "Test credit line entity 2"
    }
  ]
});

const getInvalidJournalEntry = () => ({
  "date": new Date().toISOString().split('T')[0],
  "reference": `INVALID-${Date.now()}`,
  "description": "Invalid Test Journal Entry",
  "notes": "Created via test script - unbalanced",
  "lines": [
    {
      "accountId": 1001,
      "type": "debit",
      "amount": "100.00",
      "entityCode": "MAIN",
      "description": "Debit line"
    },
    {
      "accountId": 2001,
      "type": "credit",
      "amount": "50.00", // Deliberately unbalanced
      "entityCode": "MAIN",
      "description": "Credit line (unbalanced)"
    }
  ]
});

// Test Functions
async function testCreateBasic(entityId) {
  console.log('=== Testing: Create Basic Journal Entry ===');
  const journalEntry = getBasicJournalEntry();
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/entities/${entityId}/journal-entries`,
      journalEntry,
      { headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' }}
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== TEST PASSED: Created basic journal entry successfully ===');
    return response.data;
  } catch (error) {
    console.error('Error creating basic journal entry:',
      error.response?.data || error.message
    );
    console.log('=== TEST FAILED ===');
    return null;
  }
}

async function testCreateIntercompany(entityId) {
  console.log('=== Testing: Create Intercompany Journal Entry ===');
  const journalEntry = getIntercompanyJournalEntry();
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/entities/${entityId}/journal-entries`,
      journalEntry,
      { headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' }}
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== TEST PASSED: Created intercompany journal entry successfully ===');
    return response.data;
  } catch (error) {
    console.error('Error creating intercompany journal entry:',
      error.response?.data || error.message
    );
    console.log('=== TEST FAILED ===');
    return null;
  }
}

async function testCreateInvalid(entityId) {
  console.log('=== Testing: Create Invalid Journal Entry (Should Fail) ===');
  const journalEntry = getInvalidJournalEntry();
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/entities/${entityId}/journal-entries`,
      journalEntry,
      { headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' }}
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== TEST FAILED: Invalid entry was accepted! ===');
    return response.data;
  } catch (error) {
    console.log('Validation error (expected):', 
      JSON.stringify(error.response?.data, null, 2)
    );
    console.log('=== TEST PASSED: Validation properly rejected invalid entry ===');
    return null;
  }
}

async function testUpdateBasic(entityId) {
  console.log('=== Testing: Update Journal Entry ===');
  
  // First create a journal entry to update
  console.log('Creating journal entry to update...');
  const created = await testCreateBasic(entityId);
  if (!created) return null;
  
  const updateData = {
    "description": `${created.description} (Updated)`,
    "notes": "Updated via test script",
    "lines": created.lines // Keep same lines
  };
  
  try {
    const response = await axios.put(
      `${BASE_URL}/api/entities/${entityId}/journal-entries/${created.id}`,
      updateData,
      { headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' }}
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== TEST PASSED: Updated journal entry successfully ===');
    return response.data;
  } catch (error) {
    console.error('Error updating journal entry:',
      error.response?.data || error.message
    );
    console.log('=== TEST FAILED ===');
    return null;
  }
}

async function testDeleteDraft(entityId) {
  console.log('=== Testing: Delete Draft Journal Entry ===');
  
  // First create a journal entry to delete
  console.log('Creating journal entry to delete...');
  const created = await testCreateBasic(entityId);
  if (!created) return null;
  
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/entities/${entityId}/journal-entries/${created.id}`,
      { headers: { Cookie: cookieHeader }}
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== TEST PASSED: Deleted draft journal entry successfully ===');
    return response.data;
  } catch (error) {
    console.error('Error deleting journal entry:',
      error.response?.data || error.message
    );
    console.log('=== TEST FAILED ===');
    return null;
  }
}

async function testVoidPosted(entityId, journalEntryId) {
  console.log('=== Testing: Void Posted Journal Entry ===');
  
  if (!journalEntryId) {
    console.log('No journal entry ID provided, creating and posting a new one...');
    
    // Create a journal entry
    const created = await testCreateBasic(entityId);
    if (!created) return null;
    journalEntryId = created.id;
    
    // Request approval
    console.log('Requesting approval...');
    await axios.post(
      `${BASE_URL}/api/entities/${entityId}/journal-entries/${journalEntryId}/request-approval`,
      {},
      { headers: { Cookie: cookieHeader }}
    );
    
    // Approve the entry
    console.log('Approving...');
    await axios.post(
      `${BASE_URL}/api/entities/${entityId}/journal-entries/${journalEntryId}/approve`,
      {},
      { headers: { Cookie: cookieHeader }}
    );
    
    // Post the entry
    console.log('Posting...');
    await axios.post(
      `${BASE_URL}/api/entities/${entityId}/journal-entries/${journalEntryId}/post`,
      {},
      { headers: { Cookie: cookieHeader }}
    );
  }
  
  // Now void the posted entry using DELETE
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/entities/${entityId}/journal-entries/${journalEntryId}`,
      { 
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
        data: { voidReason: "Voided via test script" }
      }
    );
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('=== TEST PASSED: Voided posted journal entry successfully ===');
    return response.data;
  } catch (error) {
    console.error('Error voiding journal entry:',
      error.response?.data || error.message
    );
    console.log('=== TEST FAILED ===');
    return null;
  }
}

// Main execution
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node test-new-journal-endpoints.js <entity-id> <test-name> [journal-entry-id]');
    console.error('Valid test names: create-basic, create-intercompany, create-invalid, update-basic, delete-draft, void-posted');
    process.exit(1);
  }
  
  const entityId = args[0];
  const testName = args[1];
  const journalEntryId = args[2] || null; // Optional for some tests
  
  await loadCookies();
  
  // Execute the requested test
  switch (testName) {
    case 'create-basic':
      await testCreateBasic(entityId);
      break;
    case 'create-intercompany':
      await testCreateIntercompany(entityId);
      break;
    case 'create-invalid':
      await testCreateInvalid(entityId);
      break;
    case 'update-basic':
      await testUpdateBasic(entityId);
      break;
    case 'delete-draft':
      await testDeleteDraft(entityId);
      break;
    case 'void-posted':
      await testVoidPosted(entityId, journalEntryId);
      break;
    default:
      console.error(`Unknown test: ${testName}`);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});