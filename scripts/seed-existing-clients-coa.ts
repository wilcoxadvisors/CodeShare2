/**
 * Script to seed Chart of Accounts for existing clients
 * 
 * This script identifies clients that don't have any accounts
 * and seeds them with the standard Chart of Accounts template
 */

import { db } from '../server/db';
import { clients, accounts } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';
import { standardCoaTemplate } from '../server/coaTemplate';
import chalk from 'chalk';

/**
 * Find clients without any accounts (no Chart of Accounts)
 */
async function findClientsWithoutCoA(): Promise<number[]> {
  console.log(chalk.blue('Searching for clients without Chart of Accounts...'));
  
  // Find all clients
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients);
    
  console.log(chalk.gray(`Total clients in database: ${allClients.length}`));
  
  // For each client, check if they have accounts
  const clientsWithoutCoA: number[] = [];
  
  for (const client of allClients) {
    const clientAccounts = await db
      .select({ count: accounts.id })
      .from(accounts)
      .where(eq(accounts.clientId, client.id));
      
    if (clientAccounts.length === 0) {
      clientsWithoutCoA.push(client.id);
      console.log(chalk.yellow(`Client ID ${client.id} (${client.name}) has no accounts`));
    }
  }
  
  return clientsWithoutCoA;
}

/**
 * Seed Chart of Accounts for a specific client
 */
async function seedCoAForClient(clientId: number): Promise<boolean> {
  console.log(chalk.blue(`Starting CoA seed for client ID: ${clientId}`));
  
  try {
    // Verify client exists
    const clientCheck = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
      
    if (clientCheck.length === 0) {
      console.log(chalk.red(`Client ID ${clientId} not found. Skipping.`));
      return false;
    }
    
    // Double-check again if this client already has accounts (safety check)
    const existingAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.clientId, clientId))
      .limit(1);
      
    if (existingAccounts.length > 0) {
      console.log(chalk.yellow(`Client ${clientId} (${clientCheck[0].name}) already has accounts. Skipping seed.`));
      return false;
    }
    
    // Map to store account codes to their generated IDs for parentId resolution
    const codeToIdMap = new Map<string, number>();
    
    // Use a transaction to ensure data consistency
    await db.transaction(async (tx) => {
      console.log(chalk.blue(`Processing ${standardCoaTemplate.length} account records in transaction`));
      
      // Process each template account
      for (const templateAccount of standardCoaTemplate) {
        // Determine parentId by looking up the parent accountCode in our map
        let parentId: number | null = null;
        
        if (templateAccount.parentCode) {
          parentId = codeToIdMap.get(templateAccount.parentCode) || null;
          if (!parentId && templateAccount.parentCode) {
            console.warn(chalk.yellow(`Parent account with accountCode ${templateAccount.parentCode} not found for ${templateAccount.accountCode} (${templateAccount.name})`));
          }
        }
        
        // Insert the account
        const [newAccount] = await tx
          .insert(accounts)
          .values({
            clientId,
            accountCode: templateAccount.accountCode,
            code: templateAccount.accountCode, // For backward compatibility
            name: templateAccount.name,
            type: templateAccount.type,
            subtype: templateAccount.subtype,
            isSubledger: templateAccount.isSubledger || false,
            subledgerType: templateAccount.subledgerType,
            parentId,
            description: templateAccount.description,
            active: true
          })
          .returning({ id: accounts.id });
        
        // Store the generated ID mapped to the account code
        if (newAccount && newAccount.id) {
          codeToIdMap.set(templateAccount.accountCode, newAccount.id);
        } else {
          console.error(chalk.red(`Failed to insert account ${templateAccount.accountCode}`));
        }
      }
    });
    
    console.log(chalk.green(`Successfully seeded ${standardCoaTemplate.length} accounts for client ID: ${clientId} (${clientCheck[0].name})`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to seed Chart of Accounts for client ${clientId}:`), error);
    return false;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  console.log(chalk.blue('===== Chart of Accounts Seeder for Existing Clients ====='));
  
  try {
    // Find clients without Chart of Accounts
    const clientsToSeed = await findClientsWithoutCoA();
    
    if (clientsToSeed.length === 0) {
      console.log(chalk.green('All clients already have Chart of Accounts. Nothing to do.'));
      process.exit(0);
    }
    
    console.log(chalk.blue(`Found ${clientsToSeed.length} clients without Chart of Accounts.`));
    
    // Track successful and failed seeding operations
    let successCount = 0;
    let failCount = 0;
    
    // Seed Chart of Accounts for each client
    for (const clientId of clientsToSeed) {
      const success = await seedCoAForClient(clientId);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    // Print summary
    console.log(chalk.blue('\n===== Seeding Summary ====='));
    console.log(chalk.green(`Successfully seeded ${successCount} clients`));
    if (failCount > 0) {
      console.log(chalk.red(`Failed to seed ${failCount} clients`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Fatal error during seeding process:'), error);
    process.exit(1);
  }
}

// Execute the main function
main().catch((error) => {
  console.error(chalk.red('Unhandled exception:'), error);
  process.exit(1);
});