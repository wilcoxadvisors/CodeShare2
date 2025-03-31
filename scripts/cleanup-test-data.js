/**
 * Test Data Cleanup Script
 * 
 * This script safely removes test clients and their associated data
 * while preserving essential system accounts and clients.
 */

const { Client } = require('pg');
require('dotenv').config();

// Database connection
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Protected client IDs/names that should never be deleted
const PROTECTED_CLIENTS = [
  { id: 1, name: 'Admin Client' },
  { id: 2, name: 'OK' },
  { id: 3, name: 'ONE1' },
  { id: 4, name: 'Pepper' },
];

// Define test data patterns that identify test clients
const TEST_CLIENT_PATTERNS = [
  'test',
  'demo',
  'sample',
  'temp',
  'example',
  'dummy',
  'import-test',
  'export-test'
];

async function connectToDatabase() {
  try {
    await dbClient.connect();
    console.log('Connected to database');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

async function disconnectFromDatabase() {
  try {
    await dbClient.end();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

async function findTestClients() {
  const patternSearch = TEST_CLIENT_PATTERNS.map(pattern => 
    `LOWER(name) LIKE '%${pattern}%'`
  ).join(' OR ');
  
  const query = `
    SELECT id, name, created_at
    FROM clients 
    WHERE (${patternSearch})
    AND id NOT IN (${PROTECTED_CLIENTS.map(c => c.id).join(',')})
    ORDER BY created_at DESC;
  `;
  
  try {
    const result = await dbClient.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error finding test clients:', error);
    return [];
  }
}

async function countAssociatedData(clientId) {
  try {
    // Get count of various entity types associated with this client
    const counts = {
      accounts: await countRecords('accounts', 'client_id', clientId),
      entities: await countRecords('entities', 'client_id', clientId),
      journalEntries: 0,
      journalEntryLines: 0
    };
    
    // Get entities for this client to count their journal entries
    const entitiesQuery = `
      SELECT id FROM entities WHERE client_id = $1;
    `;
    const entitiesResult = await dbClient.query(entitiesQuery, [clientId]);
    const entityIds = entitiesResult.rows.map(row => row.id);
    
    if (entityIds.length > 0) {
      // Count journal entries for these entities
      const entriesQuery = `
        SELECT COUNT(*) FROM journal_entries 
        WHERE entity_id IN (${entityIds.join(',')});
      `;
      const entriesResult = await dbClient.query(entriesQuery);
      counts.journalEntries = parseInt(entriesResult.rows[0].count);
      
      // Count journal entry lines for these entities
      const linesQuery = `
        SELECT COUNT(*) FROM journal_entry_lines 
        WHERE journal_entry_id IN (
          SELECT id FROM journal_entries
          WHERE entity_id IN (${entityIds.join(',')})
        );
      `;
      const linesResult = await dbClient.query(linesQuery);
      counts.journalEntryLines = parseInt(linesResult.rows[0].count);
    }
    
    return counts;
  } catch (error) {
    console.error(`Error counting associated data for client ${clientId}:`, error);
    return {
      accounts: 0,
      entities: 0,
      journalEntries: 0,
      journalEntryLines: 0
    };
  }
}

async function countRecords(table, columnName, value) {
  try {
    const query = `SELECT COUNT(*) FROM ${table} WHERE ${columnName} = $1;`;
    const result = await dbClient.query(query, [value]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`Error counting records in ${table}:`, error);
    return 0;
  }
}

async function deleteClientAndAssociatedData(clientId) {
  try {
    await dbClient.query('BEGIN');
    
    // Get entities for this client
    const entitiesQuery = `
      SELECT id FROM entities WHERE client_id = $1;
    `;
    const entitiesResult = await dbClient.query(entitiesQuery, [clientId]);
    const entityIds = entitiesResult.rows.map(row => row.id);
    
    // Delete journal entry lines for these entities' journal entries
    if (entityIds.length > 0) {
      const deleteJournalLinesQuery = `
        DELETE FROM journal_entry_lines 
        WHERE journal_entry_id IN (
          SELECT id FROM journal_entries
          WHERE entity_id IN (${entityIds.join(',')})
        );
      `;
      await dbClient.query(deleteJournalLinesQuery);
      console.log(`Deleted journal entry lines for client ${clientId}`);
      
      // Delete journal entries for these entities
      const deleteJournalEntriesQuery = `
        DELETE FROM journal_entries 
        WHERE entity_id IN (${entityIds.join(',')});
      `;
      await dbClient.query(deleteJournalEntriesQuery);
      console.log(`Deleted journal entries for client ${clientId}`);
    }
    
    // Delete accounts for this client
    const deleteAccountsQuery = `DELETE FROM accounts WHERE client_id = $1;`;
    await dbClient.query(deleteAccountsQuery, [clientId]);
    console.log(`Deleted accounts for client ${clientId}`);
    
    // Delete entities for this client
    const deleteEntitiesQuery = `DELETE FROM entities WHERE client_id = $1;`;
    await dbClient.query(deleteEntitiesQuery, [clientId]);
    console.log(`Deleted entities for client ${clientId}`);
    
    // Finally, delete the client
    const deleteClientQuery = `DELETE FROM clients WHERE id = $1;`;
    await dbClient.query(deleteClientQuery, [clientId]);
    console.log(`Deleted client ${clientId}`);
    
    await dbClient.query('COMMIT');
    return true;
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error(`Error deleting client ${clientId}:`, error);
    return false;
  }
}

async function main() {
  try {
    await connectToDatabase();
    
    // Find all test clients
    console.log('Finding test clients...');
    const testClients = await findTestClients();
    
    if (testClients.length === 0) {
      console.log('No test clients found.');
      await disconnectFromDatabase();
      return;
    }
    
    console.log(`Found ${testClients.length} test clients:`);
    
    // Process each test client
    for (const client of testClients) {
      console.log(`\nProcessing client: ${client.id} - ${client.name}`);
      
      // Count associated data
      const counts = await countAssociatedData(client.id);
      console.log(`Associated data: ${counts.accounts} accounts, ${counts.entities} entities, ${counts.journalEntries} journal entries, ${counts.journalEntryLines} journal entry lines`);
      
      // Confirm deletion
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise(resolve => {
        readline.question(`Delete client ${client.id} - ${client.name}? (y/n): `, resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() === 'y') {
        console.log(`Deleting client ${client.id} - ${client.name}...`);
        const success = await deleteClientAndAssociatedData(client.id);
        if (success) {
          console.log(`Successfully deleted client ${client.id} - ${client.name}`);
        } else {
          console.log(`Failed to delete client ${client.id} - ${client.name}`);
        }
      } else {
        console.log(`Skipping client ${client.id} - ${client.name}`);
      }
    }
    
    await disconnectFromDatabase();
  } catch (error) {
    console.error('Error:', error);
    await disconnectFromDatabase();
    process.exit(1);
  }
}

// Run the main function
main();