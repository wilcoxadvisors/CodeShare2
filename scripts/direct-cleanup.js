/**
 * Direct Database Cleanup Script 
 * 
 * This script directly accesses the database to remove test clients and their data,
 * bypassing the non-functional API endpoints.
 * 
 * IMPORTANT: Preserves the following clients:
 * - OK
 * - ONE1  
 * - Pepper 
 * - Admin Client
 */
import { db } from "../server/db.ts";
import { clients, accounts, entities } from "../shared/schema.ts";
import { eq, not, inArray } from "drizzle-orm";
import chalk from "chalk";

// Define clients to preserve (by exact name)
const PRESERVE_CLIENTS = ['OK', 'ONE1', 'Pepper', 'Admin Client'];

// Main function
async function main() {
  try {
    console.log(chalk.blue('Starting direct database cleanup...'));
    console.log(chalk.blue(`Will preserve clients: ${PRESERVE_CLIENTS.join(', ')}`));
    
    // Step 1: Get all clients
    const allClients = await db.select().from(clients);
    console.log(chalk.blue(`Found ${allClients.length} total clients in database`));
    
    // Step 2: Identify clients to delete (exclude preserved clients)
    const clientsToDelete = allClients.filter(client => {
      if (!client || !client.name) {
        console.log(chalk.yellow(`Skipping client with missing name property: ${JSON.stringify(client)}`));
        return false;
      }
      
      // Check if the client name matches any preserved client name
      const shouldPreserve = PRESERVE_CLIENTS.includes(client.name);
      
      if (shouldPreserve) {
        console.log(chalk.green(`Preserving client ${client.id}: ${client.name}`));
      }
      
      return !shouldPreserve;
    });
    
    const clientIdsToDelete = clientsToDelete.map(client => client.id);
    console.log(chalk.blue(`Found ${clientIdsToDelete.length} clients to delete out of ${allClients.length} total clients`));
    
    if (clientIdsToDelete.length === 0) {
      console.log(chalk.green('No clients to delete. Exiting.'));
      return;
    }
    
    // Step 3: Process clients in batches
    const BATCH_SIZE = 5;
    const clientBatches = [];
    
    // Split client IDs into batches
    for (let i = 0; i < clientIdsToDelete.length; i += BATCH_SIZE) {
      clientBatches.push(clientIdsToDelete.slice(i, i + BATCH_SIZE));
    }
    
    console.log(chalk.blue(`Split clients into ${clientBatches.length} batches of up to ${BATCH_SIZE} clients each`));
    
    // Process each batch
    let totalDeleted = 0;
    
    for (let batchIndex = 0; batchIndex < clientBatches.length; batchIndex++) {
      const batch = clientBatches[batchIndex];
      console.log(chalk.blue(`\nProcessing batch ${batchIndex + 1} of ${clientBatches.length}...`));
      
      // Delete entities for these clients first
      try {
        const entitiesDeleted = await db.delete(entities)
          .where(inArray(entities.clientId, batch));
        console.log(chalk.green(`Deleted ${entitiesDeleted.count || 'unknown number of'} entities`));
      } catch (error) {
        console.error(chalk.red('Error deleting entities:'), error.message);
      }
      
      // Delete accounts for these clients
      try {
        const accountsDeleted = await db.delete(accounts)
          .where(inArray(accounts.clientId, batch));
        console.log(chalk.green(`Deleted ${accountsDeleted.count || 'unknown number of'} accounts`));
      } catch (error) {
        console.error(chalk.red('Error deleting accounts:'), error.message);
      }
      
      // Delete clients themselves
      try {
        const clientsDeleted = await db.delete(clients)
          .where(inArray(clients.id, batch));
        console.log(chalk.green(`Deleted ${clientsDeleted.count || 'unknown number of'} clients`));
        totalDeleted += batch.length;
      } catch (error) {
        console.error(chalk.red('Error deleting clients:'), error.message);
      }
      
      // Report progress
      console.log(chalk.blue(`Batch ${batchIndex + 1} complete. ${totalDeleted} clients deleted so far.`));
    }
    
    console.log(chalk.green('\nCleanup process completed!'));
    console.log(chalk.green(`Deleted ${totalDeleted} out of ${clientIdsToDelete.length} clients`));
    console.log(chalk.green(`Preserved clients: ${PRESERVE_CLIENTS.join(', ')}`));
    
  } catch (error) {
    console.error(chalk.red('Fatal error during cleanup:'), error.message);
    if (error.stack) {
      console.error(chalk.red(error.stack));
    }
  }
}

// Run the script
main();