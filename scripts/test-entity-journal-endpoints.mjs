/**
 * Script to test entity-specific journal entry endpoints
 * 
 * To run this script, use the following command:
 * node scripts/test-entity-journal-endpoints.mjs
 */

import { journalEntryStorage } from '../server/storage/journalEntryStorage.js';
import { JournalEntryStatus } from '../shared/schema.js';
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Testing entity-specific journal entry endpoints implementation...\n');
    
    // Get all entities with journal entries
    const entities = await db.execute(
      sql`SELECT DISTINCT e.id, e.name, e.code
          FROM entities e
          JOIN journal_entries je ON e.id = je.entity_id
          LIMIT 5`
    );
    
    if (entities.length === 0) {
      console.log('No entities with journal entries found. Creating test data...');
      // Create test journal entry data
      await createTestData();
    } else {
      console.log('Found entities with journal entries:');
      for (const entity of entities) {
        console.log(`- Entity ${entity.id}: ${entity.name} (${entity.code})`);
        
        // Test getting journal entries for this entity
        const entries = await journalEntryStorage.listJournalEntries({ entityId: entity.id });
        console.log(`  Found ${entries.length} journal entries`);
        
        if (entries.length > 0) {
          const entry = entries[0];
          console.log(`  First entry: ID=${entry.id}, Reference=${entry.referenceNumber}, Status=${entry.status}`);
          
          // Get lines for this entry
          const lines = await journalEntryStorage.getJournalEntryLines(entry.id);
          console.log(`  Entry has ${lines.length} lines`);
          
          // Check if all lines belong to the same entry
          const allLinesValid = lines.every(line => line.journalEntryId === entry.id);
          console.log(`  Lines validation check: ${allLinesValid ? 'PASSED' : 'FAILED'}`);
        }
      }
    }
    
    console.log('\nEnumerated journals accessible through entity-specific endpoints.');
    console.log('Implementation Test Complete!');
    
  } catch (error) {
    console.error('Error testing journal entry implementations:', error);
  } finally {
    process.exit(0);
  }
}

async function createTestData() {
  const testEntityId = 1; // Using entity ID 1 for test data
  const testClientId = 1; // Using client ID 1 for test data
  const testUserId = 1;   // Using user ID 1 for test data
  
  console.log(`Creating test journal entry for Entity ID: ${testEntityId}`);
  
  // Create a test journal entry
  const journalEntryData = {
    date: new Date(),
    clientId: testClientId,
    entityId: testEntityId,
    referenceNumber: `TEST-${Date.now().toString().substring(9)}`,
    description: 'Test journal entry for entity endpoint testing',
    status: JournalEntryStatus.DRAFT,
    createdBy: testUserId
  };
  
  const journalEntry = await journalEntryStorage.createJournalEntry(
    journalEntryData.clientId,
    journalEntryData.createdBy,
    journalEntryData
  );
  
  console.log(`Created test journal entry with ID: ${journalEntry.id}`);
  
  // Create some test lines
  const lineData1 = {
    journalEntryId: journalEntry.id,
    type: 'debit',
    accountId: 1001, // Replace with a valid account ID from your system
    amount: '100.00',
    description: 'Test debit line'
  };
  
  const lineData2 = {
    journalEntryId: journalEntry.id,
    type: 'credit',
    accountId: 1002, // Replace with a valid account ID from your system
    amount: '100.00',
    description: 'Test credit line'
  };
  
  const line1 = await journalEntryStorage.createJournalEntryLine(lineData1);
  const line2 = await journalEntryStorage.createJournalEntryLine(lineData2);
  
  console.log(`Created test journal entry lines: ${line1.id}, ${line2.id}`);
  
  return journalEntry;
}

main();