// test-journal-entry-reversal.js
// Test script to verify the journal entry reversal functionality

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import chalk from 'chalk';

dotenv.config();

const API_URL = 'http://localhost:5000';

// Helper functions
const log = {
  info: (msg) => console.log(chalk.blue(`INFO: ${msg}`)),
  success: (msg) => console.log(chalk.green(`SUCCESS: ${msg}`)),
  error: (msg) => console.log(chalk.red(`ERROR: ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(`WARNING: ${msg}`)),
  debug: (data) => console.log(chalk.gray('\nDEBUG:'), data)
};

// Login function to get authenticated session
async function login() {
  try {
    log.info('Logging in to get authenticated session...');
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      }),
      redirect: 'manual'
    });
    
    // Check if the login was successful
    if (response.status !== 200 && response.status !== 302) {
      throw new Error(`Login failed with status: ${response.status}`);
    }
    
    // Get cookies for session authentication
    const cookies = response.headers.get('set-cookie');
    log.success('Login successful!');
    return cookies;
  } catch (error) {
    log.error(`Login failed: ${error.message}`);
    throw error;
  }
}

// Create test client
async function createTestClient(cookies) {
  try {
    log.info('Creating test client...');
    
    const response = await fetch(`${API_URL}/api/admin/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        name: 'Test Client for JE Reversal',
        active: true,
        industry: 'ACCOUNTING'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create client: ${JSON.stringify(errorData)}`);
    }
    
    const client = await response.json();
    log.success(`Created test client with ID: ${client.id}`);
    return client;
  } catch (error) {
    log.error(`Failed to create test client: ${error.message}`);
    throw error;
  }
}

// Create test entity
async function createTestEntity(cookies, clientId) {
  try {
    log.info('Creating test entity...');
    
    const response = await fetch(`${API_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        name: 'Test Entity for JE Reversal',
        code: 'TEST-JER',
        clientId: clientId,
        active: true
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create entity: ${JSON.stringify(errorData)}`);
    }
    
    const entity = await response.json();
    log.success(`Created test entity with ID: ${entity.id}`);
    return entity;
  } catch (error) {
    log.error(`Failed to create test entity: ${error.message}`);
    throw error;
  }
}

// Seed chart of accounts
async function seedChartOfAccounts(cookies, clientId) {
  try {
    log.info(`Seeding chart of accounts for client ID: ${clientId}...`);
    
    const response = await fetch(`${API_URL}/api/admin/seed-coa/${clientId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to seed chart of accounts: ${JSON.stringify(errorData)}`);
    }
    
    log.success('Chart of accounts seeded successfully!');
  } catch (error) {
    log.error(`Failed to seed chart of accounts: ${error.message}`);
    throw error;
  }
}

// Get accounts for testing
async function getAccounts(cookies, clientId) {
  try {
    log.info(`Getting accounts for client ID: ${clientId}...`);
    
    const response = await fetch(`${API_URL}/api/clients/${clientId}/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get accounts: ${JSON.stringify(errorData)}`);
    }
    
    const accounts = await response.json();
    log.success(`Retrieved ${accounts.length} accounts`);
    
    // Find one asset account and one liability account for testing
    const assetAccount = accounts.find(account => account.type === 'asset');
    const liabilityAccount = accounts.find(account => account.type === 'liability');
    
    if (!assetAccount || !liabilityAccount) {
      throw new Error('Could not find required account types for testing');
    }
    
    return { assetAccount, liabilityAccount };
  } catch (error) {
    log.error(`Failed to get accounts: ${error.message}`);
    throw error;
  }
}

// Create a test journal entry
async function createJournalEntry(cookies, clientId, entityId, accounts) {
  try {
    log.info('Creating test journal entry...');
    
    const journalEntryData = {
      entry: {
        clientId,
        entityId,
        date: new Date().toISOString().split('T')[0],
        referenceNumber: 'TEST-JE-001',
        description: 'Test Journal Entry for Reversal',
        journalType: 'JE'
      },
      lines: [
        {
          accountId: accounts.assetAccount.id,
          type: 'debit',
          amount: '1000.00',
          description: 'Test debit line'
        },
        {
          accountId: accounts.liabilityAccount.id,
          type: 'credit',
          amount: '1000.00',
          description: 'Test credit line'
        }
      ]
    };
    
    const response = await fetch(`${API_URL}/api/journal-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(journalEntryData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create journal entry: ${JSON.stringify(errorData)}`);
    }
    
    const journalEntry = await response.json();
    log.success(`Created test journal entry with ID: ${journalEntry.id}`);
    return journalEntry;
  } catch (error) {
    log.error(`Failed to create journal entry: ${error.message}`);
    throw error;
  }
}

// Post a journal entry
async function postJournalEntry(cookies, journalEntryId) {
  try {
    log.info(`Posting journal entry ID: ${journalEntryId}...`);
    
    const response = await fetch(`${API_URL}/api/journal-entries/${journalEntryId}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to post journal entry: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    log.success(`Journal entry posted successfully: ${result.message}`);
    return result.entry;
  } catch (error) {
    log.error(`Failed to post journal entry: ${error.message}`);
    throw error;
  }
}

// Reverse a journal entry
async function reverseJournalEntry(cookies, journalEntryId) {
  try {
    log.info(`Reversing journal entry ID: ${journalEntryId}...`);
    
    const response = await fetch(`${API_URL}/api/journal-entries/${journalEntryId}/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        description: `Reversal Test for JE ${journalEntryId}`,
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to reverse journal entry: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    log.success(`Journal entry reversed successfully!`);
    return result;
  } catch (error) {
    log.error(`Failed to reverse journal entry: ${error.message}`);
    throw error;
  }
}

// Validate reversal entry
function validateReversalEntry(originalEntry, reversalEntry) {
  log.info('Validating reversal entry...');
  
  // Check that the reversal entry has the correct properties
  if (!reversalEntry.isReversal) {
    throw new Error('Reversal entry does not have isReversal flag set to true');
  }
  
  if (reversalEntry.reversedEntryId !== originalEntry.id) {
    throw new Error(`Reversal entry has incorrect reversedEntryId: ${reversalEntry.reversedEntryId}, expected: ${originalEntry.id}`);
  }
  
  // Check that the line amounts match but types are flipped
  if (reversalEntry.lines.length !== originalEntry.lines.length) {
    throw new Error(`Line count mismatch: original=${originalEntry.lines.length}, reversal=${reversalEntry.lines.length}`);
  }
  
  // For each original line, find a matching reversed line
  for (const originalLine of originalEntry.lines) {
    const matchingReversalLine = reversalEntry.lines.find(line => 
      line.accountId === originalLine.accountId && 
      line.amount === originalLine.amount && 
      line.type !== originalLine.type); // Type should be opposite
    
    if (!matchingReversalLine) {
      throw new Error(`Could not find matching reversed line for original line with accountId=${originalLine.accountId}`);
    }
  }
  
  log.success('Reversal entry validation passed!');
  return true;
}

// Main test function
async function runTest() {
  try {
    log.info('Starting journal entry reversal test...');
    
    // 1. Login to get session
    const cookies = await login();
    
    // 2. Create test client
    const client = await createTestClient(cookies);
    
    // 3. Create test entity
    const entity = await createTestEntity(cookies, client.id);
    
    // 4. Seed chart of accounts
    await seedChartOfAccounts(cookies, client.id);
    
    // 5. Get accounts for testing
    const accounts = await getAccounts(cookies, client.id);
    
    // 6. Create a test journal entry
    const journalEntry = await createJournalEntry(cookies, client.id, entity.id, accounts);
    
    // 7. Post the journal entry (required for reversal)
    const postedEntry = await postJournalEntry(cookies, journalEntry.id);
    
    // 8. Reverse the journal entry
    const reversalResult = await reverseJournalEntry(cookies, postedEntry.id);
    
    // 9. Validate the reversal
    validateReversalEntry(reversalResult.originalEntry, reversalResult.reversalEntry);
    
    log.success('Journal entry reversal test completed successfully!');
    log.debug(reversalResult);
    
    return { success: true, result: reversalResult };
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the test
runTest().then((result) => {
  if (result.success) {
    log.success('🎉 ALL TESTS PASSED! 🎉');
    process.exit(0);
  } else {
    log.error('❌ TEST FAILED ❌');
    process.exit(1);
  }
});