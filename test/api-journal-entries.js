/**
 * Journal Entry API Testing Script
 * 
 * This script tests the journal entry API routes to verify CRUD operations
 * and business logic like balance checking work correctly.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:5000';
let authCookie = '';

// Helper function to read auth cookie
function getCookieHeader() {
  try {
    const cookieContent = fs.readFileSync(path.join(__dirname, '../cookies.txt'), 'utf8');
    return cookieContent.trim();
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return '';
  }
}

// Helper to log test results
function logResult(testName, success, message = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (message) {
    console.log(`  ${message}`);
  }
}

// Initialize client and entity IDs
let clientId = 130;  // Pre-set client ID from our test setup
let entityId = 248;  // Pre-set entity ID from our test setup 
let accountId1 = 4516;  // Pre-set account ID for Cash
let accountId2 = 4517;  // Pre-set account ID for Accounts Payable
let journalEntryId;

// Helper function to login and get auth cookie
async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'testuser',
      password: 'password'
    });
    
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      fs.writeFileSync('cookies.txt', cookies.join('; '), 'utf8');
      console.log('Login successful, cookie saved');
      return true;
    } else {
      console.log('Login successful but no cookies returned');
      return false;
    }
  } catch (error) {
    console.error('Login failed:', error.message);
    return false;
  }
}

// Get test client and entity
async function getTestClientAndEntity() {
  try {
    // Using hardcoded test values 
    console.log(`Using client ID: ${clientId}`);
    console.log(`Using entity ID: ${entityId}`);
    console.log(`Using account IDs: ${accountId1} and ${accountId2}`);
    return true;
  } catch (error) {
    console.error('Error getting test client and entity:', error.message);
    return false;
  }
}

// Test 1: Create a journal entry
async function testCreateJournalEntry() {
  try {
    const cookie = getCookieHeader();
    const journalEntry = {
      date: new Date().toISOString().split('T')[0],
      clientId,
      entityId,
      description: 'Test Journal Entry',
      referenceNumber: 'TEST-001',
      journalType: 'JE',
      lines: [
        {
          type: 'debit',
          accountId: accountId1,
          amount: '100.00',
          description: 'Test Debit'
        },
        {
          type: 'credit',
          accountId: accountId2,
          amount: '100.00',
          description: 'Test Credit'
        }
      ]
    };
    
    const response = await axios.post(`${API_URL}/api/journal-entries`, journalEntry, {
      headers: { Cookie: cookie }
    });
    
    if (response.status === 201 && response.data) {
      journalEntryId = response.data.id;
      logResult('Create Journal Entry', true, `Created journal entry with ID: ${journalEntryId}`);
      return true;
    } else {
      logResult('Create Journal Entry', false, 'Failed to create journal entry');
      return false;
    }
  } catch (error) {
    logResult('Create Journal Entry', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 2: Get journal entry by ID
async function testGetJournalEntry() {
  try {
    const cookie = getCookieHeader();
    const response = await axios.get(`${API_URL}/api/journal-entries/${journalEntryId}`, {
      headers: { Cookie: cookie }
    });
    
    if (response.status === 200 && response.data && response.data.id === journalEntryId) {
      logResult('Get Journal Entry', true, `Retrieved journal entry with ID: ${journalEntryId}`);
      return true;
    } else {
      logResult('Get Journal Entry', false, 'Failed to retrieve journal entry');
      return false;
    }
  } catch (error) {
    logResult('Get Journal Entry', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 3: Update journal entry
async function testUpdateJournalEntry() {
  try {
    const cookie = getCookieHeader();
    const updateData = {
      description: 'Updated Test Journal Entry',
      lines: [
        {
          type: 'debit',
          accountId: accountId1,
          amount: '200.00',
          description: 'Updated Test Debit'
        },
        {
          type: 'credit',
          accountId: accountId2,
          amount: '200.00',
          description: 'Updated Test Credit'
        }
      ]
    };
    
    const response = await axios.put(`${API_URL}/api/journal-entries/${journalEntryId}`, updateData, {
      headers: { Cookie: cookie }
    });
    
    if (response.status === 200 && response.data) {
      logResult('Update Journal Entry', true, 'Successfully updated journal entry');
      return true;
    } else {
      logResult('Update Journal Entry', false, 'Failed to update journal entry');
      return false;
    }
  } catch (error) {
    logResult('Update Journal Entry', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 4: Add line to journal entry
async function testAddJournalEntryLine() {
  try {
    const cookie = getCookieHeader();
    
    // First get the current entry to see what lines we have
    const getResponse = await axios.get(`${API_URL}/api/journal-entries/${journalEntryId}`, {
      headers: { Cookie: cookie }
    });
    
    const existingEntry = getResponse.data;
    
    // Calculate existing totals
    let totalDebits = 0;
    let totalCredits = 0;
    
    existingEntry.lines.forEach(line => {
      if (line.type === 'debit') {
        totalDebits += parseFloat(line.amount);
      } else {
        totalCredits += parseFloat(line.amount);
      }
    });
    
    // Add a new line to balance
    const newLine = {
      type: 'debit',
      accountId: accountId1,
      amount: '100.00',
      description: 'Additional Debit'
    };
    
    const addResponse = await axios.post(`${API_URL}/api/journal-entries/${journalEntryId}/lines`, newLine, {
      headers: { Cookie: cookie }
    });
    
    // Also add a matching credit line to maintain balance
    const balancingLine = {
      type: 'credit',
      accountId: accountId2,
      amount: '100.00',
      description: 'Additional Credit'
    };
    
    const balanceResponse = await axios.post(`${API_URL}/api/journal-entries/${journalEntryId}/lines`, balancingLine, {
      headers: { Cookie: cookie }
    });
    
    if (addResponse.status === 201 && balanceResponse.status === 201) {
      logResult('Add Journal Entry Line', true, 'Successfully added lines to journal entry');
      
      // Verify balance
      if (balanceResponse.data.balanced) {
        logResult('Journal Entry Balance Check', true, 'Journal entry remains balanced');
      } else {
        logResult('Journal Entry Balance Check', false, 'Journal entry is not balanced');
      }
      
      return true;
    } else {
      logResult('Add Journal Entry Line', false, 'Failed to add lines to journal entry');
      return false;
    }
  } catch (error) {
    logResult('Add Journal Entry Line', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 5: Post a journal entry
async function testPostJournalEntry() {
  try {
    const cookie = getCookieHeader();
    const response = await axios.post(`${API_URL}/api/journal-entries/${journalEntryId}/post`, {}, {
      headers: { Cookie: cookie }
    });
    
    if (response.status === 200 && response.data.entry.status === 'posted') {
      logResult('Post Journal Entry', true, 'Successfully posted journal entry');
      return true;
    } else {
      logResult('Post Journal Entry', false, 'Failed to post journal entry');
      return false;
    }
  } catch (error) {
    logResult('Post Journal Entry', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 6: Reverse a journal entry
async function testReverseJournalEntry() {
  try {
    const cookie = getCookieHeader();
    const reverseOptions = {
      date: new Date().toISOString().split('T')[0],
      description: 'Reversal of Test Entry',
      referenceNumber: 'REV-TEST-001'
    };
    
    const response = await axios.post(`${API_URL}/api/journal-entries/${journalEntryId}/reverse`, reverseOptions, {
      headers: { Cookie: cookie }
    });
    
    if (response.status === 201 && response.data.reversalEntry) {
      logResult('Reverse Journal Entry', true, `Created reversal entry with ID: ${response.data.reversalEntry.id}`);
      return true;
    } else {
      logResult('Reverse Journal Entry', false, 'Failed to reverse journal entry');
      return false;
    }
  } catch (error) {
    logResult('Reverse Journal Entry', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 7: List journal entries with filters
async function testListJournalEntries() {
  try {
    const cookie = getCookieHeader();
    const response = await axios.get(`${API_URL}/api/journal-entries?entityId=${entityId}&limit=10`, {
      headers: { Cookie: cookie }
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      logResult('List Journal Entries', true, `Retrieved ${response.data.length} journal entries`);
      return true;
    } else {
      logResult('List Journal Entries', false, 'Failed to list journal entries');
      return false;
    }
  } catch (error) {
    logResult('List Journal Entries', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 8: Test unbalanced journal entry (should fail)
async function testUnbalancedJournalEntry() {
  try {
    const cookie = getCookieHeader();
    const unbalancedEntry = {
      date: new Date().toISOString().split('T')[0],
      clientId,
      entityId,
      description: 'Unbalanced Journal Entry',
      referenceNumber: 'UNBALANCED-001',
      journalType: 'JE',
      lines: [
        {
          type: 'debit',
          accountId: accountId1,
          amount: '100.00',
          description: 'Test Debit'
        },
        {
          type: 'credit',
          accountId: accountId2,
          amount: '50.00',
          description: 'Test Credit'
        }
      ]
    };
    
    try {
      const response = await axios.post(`${API_URL}/api/journal-entries`, unbalancedEntry, {
        headers: { Cookie: cookie }
      });
      
      // If we reach here, the test should fail because an unbalanced entry was accepted
      logResult('Unbalanced Journal Entry Validation', false, 'System accepted an unbalanced journal entry');
      return false;
    } catch (error) {
      // We expect this to fail with a 400 error
      if (error.response && error.response.status === 400) {
        logResult('Unbalanced Journal Entry Validation', true, 'System correctly rejected unbalanced journal entry');
        return true;
      } else {
        logResult('Unbalanced Journal Entry Validation', false, `Unexpected error: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    logResult('Unbalanced Journal Entry Validation', false, `Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Running Journal Entry API Tests...');
  
  // Always login to get a fresh cookie
  console.log('Performing login to get fresh cookie...');
  const loginSuccess = await login();
  
  if (!loginSuccess) {
    console.error('Failed to login, aborting tests');
    return;
  }
  
  // First get test data
  const setupSuccess = await getTestClientAndEntity();
  if (!setupSuccess) {
    console.error('Failed to set up test data, aborting tests');
    return;
  }
  
  // Run the actual tests
  await testCreateJournalEntry();
  await testGetJournalEntry();
  await testUpdateJournalEntry();
  await testAddJournalEntryLine();
  await testPostJournalEntry();
  await testReverseJournalEntry();
  await testListJournalEntries();
  await testUnbalancedJournalEntry();
  
  console.log('\nJournal Entry API Tests completed.');
}

// Run the tests
runAllTests().catch(console.error);