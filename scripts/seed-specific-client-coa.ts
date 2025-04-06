#!/usr/bin/env tsx
/**
 * Script to seed Chart of Accounts for a specific client
 * Run with: npx tsx scripts/seed-specific-client-coa.ts [CLIENT_ID]
 * Example: npx tsx scripts/seed-specific-client-coa.ts 188
 */
import { db } from '../server/db';
import { clients, accounts } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { standardCoaTemplate } from '../server/coaTemplate';

// Seed Chart of Accounts for a specific client
async function seedClientCoA(clientId: number) {
  try {
    // First check if the client exists
    const clientRecord = await db.select({
      id: clients.id,
      name: clients.name,
      active: clients.active
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

    if (clientRecord.length === 0) {
      console.error(`Client with ID ${clientId} not found.`);
      process.exit(1);
    }

    const client = clientRecord[0];
    
    if (!client.active) {
      console.warn(`Warning: Client ${clientId} (${client.name}) is inactive.`);
      const proceed = await askQuestion('Do you want to proceed with seeding accounts for this inactive client? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        process.exit(0);
      }
    }

    console.log(`\nSeeding CoA for client ${clientId} (${client.name})...`);
    console.log(`Template has ${standardCoaTemplate.length} accounts`);
    
    // Check if there are any existing accounts
    const existingAccounts = await db.select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.clientId, clientId))
      .limit(1);
    
    if (existingAccounts.length > 0) {
      console.log(`Client ${clientId} already has accounts.`);
      const proceed = await askQuestion('Do you want to force re-seed accounts for this client? This may create duplicates. (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        process.exit(0);
      }
    }
    
    await db.transaction(async (tx) => {
      const accountMap = new Map<string, number>(); // Maps template ID to actual DB ID
      const insertedIds: Array<{
        templateCode: string;
        dbId: number;
        parentTemplateCode: string | null;
      }> = [];
      
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
      const parentUpdates: Promise<any>[] = [];
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
      
      console.log(`✅ Successfully seeded ${standardCoaTemplate.length} accounts for client ${clientId}`);
    });
    
  } catch (error) {
    console.error(`❌ Error seeding CoA for client ${clientId}:`, error);
    process.exit(1);
  }
}

// Helper function for command-line interaction
function askQuestion(question: string): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  try {
    // Get client ID from command line argument
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Error: Client ID is required.');
      console.log('Usage: npx tsx scripts/seed-specific-client-coa.ts [CLIENT_ID]');
      console.log('Example: npx tsx scripts/seed-specific-client-coa.ts 188');
      process.exit(1);
    }

    const clientId = parseInt(args[0], 10);
    if (isNaN(clientId)) {
      console.error('Error: Client ID must be a number.');
      process.exit(1);
    }

    await seedClientCoA(clientId);
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
main();