/**
 * Direct Database Access Test
 * 
 * This test bypasses all API routes to directly query the database
 * for entities and accounts related to a specific client.
 * 
 * Use this to determine if API issues are masking successful database operations.
 */

import { db } from '../server/db.js';
import { clients, entities, accounts } from '../shared/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

async function runDirectDbTest() {
  try {
    console.log('===== DIRECT DATABASE TEST =====');
    
    // Create a list of most recent clients (up to 10)
    const recentClients = await db.select()
      .from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(clients.createdAt, 'desc')
      .limit(10);
    
    console.log(`Found ${recentClients.length} recent clients`);
    
    for (const client of recentClients) {
      console.log(`\nCLIENT: ${client.id} - ${client.name} (created at ${client.createdAt})`);
      
      // Find any entities for this client
      const clientEntities = await db.select()
        .from(entities)
        .where(and(
          eq(entities.clientId, client.id),
          isNull(entities.deletedAt)
        ));
      
      console.log(`  Entities: ${clientEntities.length}`);
      if (clientEntities.length > 0) {
        clientEntities.forEach(entity => {
          console.log(`    - Entity ID: ${entity.id}, Name: ${entity.name}`);
        });
      }
      
      // Find any accounts for this client
      const clientAccounts = await db.select()
        .from(accounts)
        .where(eq(accounts.clientId, client.id));
      
      console.log(`  Accounts: ${clientAccounts.length}`);
      if (clientAccounts.length > 0) {
        // Just summarize account types
        const types = {};
        clientAccounts.forEach(account => {
          types[account.type] = (types[account.type] || 0) + 1;
        });
        
        console.log('    Account types distribution:');
        Object.entries(types).forEach(([type, count]) => {
          console.log(`      ${type}: ${count}`);
        });
      }
    }
    
    console.log('\n===== TEST COMPLETED =====');
  } catch (error) {
    console.error('ERROR DURING TEST:', error);
  } finally {
    // Close DB connection
    if (db.dialect?.pool) {
      try {
        await db.dialect.pool.end();
        console.log('Database connection closed');
      } catch (err) {
        console.error('Error closing database connection:', err);
      }
    }
  }
}

// Run the test
runDirectDbTest();