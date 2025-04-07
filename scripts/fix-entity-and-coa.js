/**
 * Entity and CoA Fix Script
 * 
 * This script directly addresses the issue with entity creation and CoA seeding
 * by bypassing the API layer completely and working directly with the database.
 * 
 * It:
 * 1. Finds clients that are missing entities
 * 2. Creates default entities for them
 * 3. Seeds the Chart of Accounts for clients without accounts
 * 
 * USAGE: node scripts/fix-entity-and-coa.js
 */

// Import DB connection and schema directly
import { db } from '../server/db.ts';
import { clients, entities, accounts } from '../shared/schema.ts';
import { eq, and, isNull, not, sql } from 'drizzle-orm';

// Get CoA template 
import { getChartOfAccounts } from '../server/coaTemplate.ts';

async function fixEntityAndCoA() {
  try {
    console.log('===== ENTITY AND COA FIX SCRIPT =====');
    console.log('Finding clients without entities...');
    
    // Get all active clients
    const allClients = await db.select()
      .from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(clients.id);
    
    console.log(`Found ${allClients.length} total clients`);
    
    // Process each client
    for (const client of allClients) {
      console.log(`\nProcessing client: #${client.id} - ${client.name}`);
      
      // Check if client has entities
      const clientEntities = await db.select()
        .from(entities)
        .where(and(
          eq(entities.clientId, client.id),
          isNull(entities.deletedAt)
        ));
      
      console.log(`  Found ${clientEntities.length} entities`);
      
      // Create default entity if needed
      if (clientEntities.length === 0) {
        console.log(`  Creating default entity for client ${client.id}...`);
        try {
          const entityCode = await generateUniqueEntityCode(client.id);
          
          // Insert the new entity
          const [newEntity] = await db.insert(entities).values({
            name: `${client.name} Default Entity`,
            code: "DEFAULT",
            entityCode: entityCode,
            ownerId: client.userId,
            clientId: client.id,
            active: true,
            fiscalYearStart: "01-01",
            fiscalYearEnd: "12-31",
            currency: "USD",
            timezone: "UTC",
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          
          console.log(`  ✅ Entity created with ID ${newEntity.id}`);
        } catch (error) {
          console.error(`  ❌ Failed to create entity:`, error);
        }
      }
      
      // Check if client has accounts
      const clientAccounts = await db.select()
        .from(accounts)
        .where(eq(accounts.clientId, client.id));
      
      console.log(`  Found ${clientAccounts.length} accounts`);
      
      // Seed Chart of Accounts if needed
      if (clientAccounts.length === 0) {
        console.log(`  Seeding Chart of Accounts for client ${client.id}...`);
        try {
          // Get the CoA template data
          const coaData = getChartOfAccounts();
          
          // Create each account
          for (const account of coaData) {
            await db.insert(accounts).values({
              clientId: client.id,
              accountCode: account.accountCode,
              name: account.name,
              type: account.type,
              description: account.description || null,
              active: true,
              isSubledger: false,
              subledgerType: null,
              subtype: null,
              parentId: null // We'll set parent relationships later
            });
          }
          
          // Count accounts after seeding
          const accountsAfter = await db.select()
            .from(accounts)
            .where(eq(accounts.clientId, client.id));
          
          console.log(`  ✅ ${accountsAfter.length} accounts created`);
        } catch (error) {
          console.error(`  ❌ Failed to seed Chart of Accounts:`, error);
        }
      }
    }
    
    console.log('\n===== ENTITY AND COA FIX COMPLETE =====');
  } catch (error) {
    console.error('ERROR DURING FIX:', error);
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

/**
 * Generate a unique hierarchical entity code based on the client's code
 * Format: {ClientCode}-{SequentialNumber}
 * Example: "ABC123-001"
 */
async function generateUniqueEntityCode(clientId) {
  // Get client code
  const [clientResult] = await db.select()
    .from(clients)
    .where(eq(clients.id, clientId));
  
  if (!clientResult) {
    throw new Error(`Client with ID ${clientId} not found`);
  }
  
  const clientCode = clientResult.clientCode || `CL${clientId}`;
  
  // Count existing entities for this client to determine the next sequence number
  const existingCount = await db.select({ count: sql`count(*)` })
    .from(entities)
    .where(eq(entities.clientId, clientId));
  
  const count = Number(existingCount[0].count) + 1;
  const sequenceNumber = count.toString().padStart(3, '0');
  
  return `${clientCode}-${sequenceNumber}`;
}

// Run the fix
fixEntityAndCoA();