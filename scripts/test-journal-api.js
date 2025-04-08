/**
 * Journal Entries API Test Script
 * 
 * This script provides a way to test the Journal Entries API endpoints
 * with various scenarios to verify functionality and validation.
 * 
 * Usage:
 * 1. Login to the application to get a valid session cookie
 * 2. Run: node scripts/test-journal-api.js <entity-id> <command>
 * 
 * Commands:
 * - list: List all journal entries for the entity
 * - get <id>: Get a specific journal entry
 * - create: Create a new test journal entry
 * - update <id>: Update a journal entry
 * - delete <id>: Delete a journal entry
 * - workflow <id> <action>: Test workflow transitions (request-approval, approve, reject, post, void)
 */

const fs = require('fs');
const path = require('path');
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

// API Functions
async function listJournalEntries(entityId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/entities/${entityId}/journal-entries`, {
      headers: { Cookie: cookieHeader }
    });
    console.log('Journal Entries:');
    console.table(response.data.map(entry => ({
      id: entry.id,
      reference: entry.reference || entry.referenceNumber,
      date: entry.date,
      status: entry.status,
      description: entry.description,
      lines: entry.lines?.length || 0
    })));
    return response.data;
  } catch (error) {
    console.error('Error listing journal entries:', error.response?.data || error.message);
    return null;
  }
}

async function getJournalEntry(entityId, id) {
  try {
    const response = await axios.get(`${BASE_URL}/api/entities/${entityId}/journal-entries/${id}`, {
      headers: { Cookie: cookieHeader }
    });
    console.log('Journal Entry:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error getting journal entry:', error.response?.data || error.message);
    return null;
  }
}

async function createJournalEntry(entityId) {
  // Sample journal entry with balanced lines
  const newEntry = {
    "date": new Date().toISOString().split('T')[0],
    "reference": `TEST-${Date.now()}`,
    "description": "API Test Journal Entry",
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
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/entities/${entityId}/journal-entries`, newEntry, {
      headers: { 
        Cookie: cookieHeader,
        'Content-Type': 'application/json'
      }
    });
    console.log('Created Journal Entry:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error creating journal entry:', error.response?.data || error.message);
    return null;
  }
}

async function updateJournalEntry(entityId, id) {
  try {
    // First get the current entry
    const currentEntry = await getJournalEntry(entityId, id);
    if (!currentEntry) return null;
    
    // Update description and add a note
    const updateData = {
      "description": `${currentEntry.description} (Updated)`,
      "notes": "Updated via API test script",
      "lines": currentEntry.lines // Include existing lines
    };

    const response = await axios.put(`${BASE_URL}/api/entities/${entityId}/journal-entries/${id}`, updateData, {
      headers: { 
        Cookie: cookieHeader,
        'Content-Type': 'application/json'
      }
    });
    console.log('Updated Journal Entry:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error updating journal entry:', error.response?.data || error.message);
    return null;
  }
}

async function deleteJournalEntry(entityId, id) {
  try {
    // For posted entries, include a void reason
    const data = { voidReason: "Deleted via API test script" };
    
    const response = await axios.delete(`${BASE_URL}/api/entities/${entityId}/journal-entries/${id}`, {
      headers: { 
        Cookie: cookieHeader,
        'Content-Type': 'application/json'
      },
      data // Include data in delete request
    });
    console.log('Delete Result:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error deleting journal entry:', error.response?.data || error.message);
    return null;
  }
}

async function workflowAction(entityId, id, action) {
  const validActions = ['request-approval', 'approve', 'reject', 'post', 'void'];
  if (!validActions.includes(action)) {
    console.error(`Invalid action: ${action}. Valid actions are: ${validActions.join(', ')}`);
    return null;
  }
  
  try {
    // Data for different actions
    let data = {};
    if (action === 'reject') {
      data = { reason: "Rejected via API test script" };
    } else if (action === 'void') {
      data = { voidReason: "Voided via API test script" };
    }
    
    const response = await axios.post(`${BASE_URL}/api/entities/${entityId}/journal-entries/${id}/${action}`, data, {
      headers: { 
        Cookie: cookieHeader,
        'Content-Type': 'application/json'
      }
    });
    console.log(`${action.toUpperCase()} Result:`);
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Error with ${action} action:`, error.response?.data || error.message);
    return null;
  }
}

// Main execution
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node test-journal-api.js <entity-id> <command> [additional args]');
    process.exit(1);
  }
  
  const entityId = args[0];
  const command = args[1];
  
  await loadCookies();
  
  // Execute the requested command
  switch (command) {
    case 'list':
      await listJournalEntries(entityId);
      break;
    case 'get':
      if (args.length < 3) {
        console.error('Usage: node test-journal-api.js <entity-id> get <journal-entry-id>');
        process.exit(1);
      }
      await getJournalEntry(entityId, args[2]);
      break;
    case 'create':
      await createJournalEntry(entityId);
      break;
    case 'update':
      if (args.length < 3) {
        console.error('Usage: node test-journal-api.js <entity-id> update <journal-entry-id>');
        process.exit(1);
      }
      await updateJournalEntry(entityId, args[2]);
      break;
    case 'delete':
      if (args.length < 3) {
        console.error('Usage: node test-journal-api.js <entity-id> delete <journal-entry-id>');
        process.exit(1);
      }
      await deleteJournalEntry(entityId, args[2]);
      break;
    case 'workflow':
      if (args.length < 4) {
        console.error('Usage: node test-journal-api.js <entity-id> workflow <journal-entry-id> <action>');
        console.error('Valid actions: request-approval, approve, reject, post, void');
        process.exit(1);
      }
      await workflowAction(entityId, args[2], args[3]);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});