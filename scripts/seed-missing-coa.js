#!/usr/bin/env tsx
/**
 * Script to seed Chart of Accounts for clients that don't have any
 * Run with: npx tsx scripts/seed-missing-coa.js
 */
import { db } from '../server/db';
import { clients, accounts } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { standardCoaTemplate } from '../server/coaTemplate';

// Adapted from AccountStorage.seedClientCoA method
async function seedClientCoA(clientId) {
  console.log(`\nAttempting to seed CoA for client ${clientId}`);
  console.log(`Template has ${standardCoaTemplate.length} accounts`);
  
  try {
    await db.transaction(async (tx) => {
      // Check if there are any existing accounts
      const existingAccounts = await tx.select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.clientId, clientId))
        .limit(1);
      
      if (existingAccounts.length > 0) {
        console.log(`Client ${clientId} already has accounts. Skipping.`);
        return;
      }
      
      console.log(`Seeding standard CoA for client ${clientId}...`);
      const accountMap = new Map(); // Maps template ID to actual DB ID
      
      const insertedIds = [];
      
      // First pass: Insert all accounts with null parentId
      for (const acc of standardCoaTemplate) {
        const accountData = {
          clientId: clientId,
          accountCode: acc.accountCode,
          name: acc.name,
          type: acc.type,
          parentId: null, // Set parent IDs in second pass
          subtype: acc.subtype || null,
          isSubledger: acc.isSubledger ?? false,
          subledgerType: acc.subledgerType || null,
          active: true,
          description: acc.description || '',
        };
        
        const inserted = await tx.insert(accounts).values(accountData).returning({ id: accounts.id });
        
        if (inserted.length > 0) {
          const dbId = inserted[0].id;
          accountMap.set(acc.accountCode, dbId);
          insertedIds.push({ 
            templateCode: acc.accountCode, 
            dbId: dbId, 
            parentTemplateCode: acc.parentCode 
          });
        } else {
          throw new Error(`Failed to insert account ${acc.accountCode} for client ${clientId}`);
        }
      }
      
      // Second pass: Set parent relationships
      const parentUpdates = [];
      for (const item of insertedIds) {
        if (item.parentTemplateCode) {
          const parentDbId = accountMap.get(item.parentTemplateCode);
          if (parentDbId) {
            parentUpdates.push(
              tx.update(accounts)
                .set({ parentId: parentDbId })
                .where(eq(accounts.id, item.dbId))
            );
          }
        }
      }
      
      if (parentUpdates.length > 0) {
        await Promise.all(parentUpdates);
      }
      
      console.log(`Successfully seeded ${standardCoaTemplate.length} accounts for client ${clientId}`);
    });
    
    return { success: true, message: `Seeded ${standardCoaTemplate.length} accounts` };
  } catch (error) {
    console.error(`Error seeding CoA for client ${clientId}:`, error);
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function findAndSeedMissingCoA() {
  try {
    console.log('Finding clients without Chart of Accounts...');
    
    // Get all active clients
    const allClients = await db.select({
      id: clients.id,
      name: clients.name
    })
    .from(clients)
    .where(eq(clients.active, true));
    
    console.log(`Found ${allClients.length} active clients`);
    
    // Get counts of accounts per client
    const accountCounts = await db.select({
      clientId: accounts.clientId,
      count: sql`count(${accounts.id})`
    })
    .from(accounts)
    .groupBy(accounts.clientId);
    
    // Convert to a map for easier lookup
    const accountCountMap = new Map();
    accountCounts.forEach(item => {
      accountCountMap.set(item.clientId, parseInt(String(item.count)));
    });
    
    // Find clients with no accounts
    const clientsWithoutAccounts = allClients.filter(client => 
      !accountCountMap.has(client.id) || accountCountMap.get(client.id) === 0
    );
    
    console.log(`\nFound ${clientsWithoutAccounts.length} clients without any accounts`);
    
    if (clientsWithoutAccounts.length === 0) {
      console.log('All clients have accounts. Nothing to do.');
      return;
    }
    
    console.log('\nSeeding missing Chart of Accounts...');
    
    // Seed CoA for each client
    const results = [];
    for (const client of clientsWithoutAccounts) {
      const result = await seedClientCoA(client.id);
      results.push({
        clientId: client.id,
        name: client.name || '',
        ...result
      });
    }
    
    // Print summary
    console.log('\n== Seeding Results ==');
    console.log('Client ID | Name | Result');
    console.log('----------|------|-------');
    
    results.forEach(result => {
      const status = result.success ? '✅ Success' : '❌ Failed';
      console.log(`${result.clientId.toString().padEnd(10)} | ${(result.name || '').padEnd(20)} | ${status}`);
    });
    
    // Get updated counts
    const successCount = results.filter(r => r.success).length;
    console.log(`\nSuccessfully seeded accounts for ${successCount} out of ${clientsWithoutAccounts.length} clients`);
    
  } catch (error) {
    console.error('Error in findAndSeedMissingCoA:', error);
  } finally {
    process.exit(0);
  }
}

findAndSeedMissingCoA();