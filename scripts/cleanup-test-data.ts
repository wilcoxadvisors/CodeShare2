/**
 * Test Data Cleanup Script
 * 
 * This script safely removes test clients and their associated data (entities, accounts)
 * from the database, while protecting essential core clients.
 * 
 * IMPORTANT: This script permanently deletes data. Run with caution!
 * Always back up your database before running this script.
 */

import { db } from '../server/db';
import { clients, entities, accounts, userEntityAccess } from '../shared/schema';
import { eq, ilike, and, not, inArray } from 'drizzle-orm';
import chalk from 'chalk';

// IDs of clients that MUST NOT be deleted regardless of their name
// Add any other essential client IDs as needed
const CLIENT_IDS_TO_KEEP: number[] = [1]; // Default admin client

/**
 * Main function to run the cleanup script
 */
async function main() {
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.yellow('TEST DATA CLEANUP SCRIPT'));
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.red('WARNING: This script permanently deletes test clients and associated data.'));
  console.log(chalk.yellow('Protected Client IDs that will NOT be deleted: ' + CLIENT_IDS_TO_KEEP.join(', ')));
  console.log(chalk.yellow('='.repeat(80)));
  
  // Find all test clients (containing "Test" in their name)
  console.log(chalk.blue('Searching for clients with "Test" in their name...'));
  
  const testClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      userId: clients.userId
    })
    .from(clients)
    .where(ilike(clients.name, '%Test%'));
  
  console.log(chalk.blue(`Found ${testClients.length} clients with "Test" in their name.`));
  
  if (testClients.length === 0) {
    console.log(chalk.green('No test clients found. Nothing to clean up.'));
    return;
  }
  
  // Filter out clients that should be kept
  const clientsToDelete = testClients.filter(client => !CLIENT_IDS_TO_KEEP.includes(client.id));
  const clientsSkipped = testClients.filter(client => CLIENT_IDS_TO_KEEP.includes(client.id));
  
  console.log(chalk.yellow(`Clients to be kept (in protected list): ${clientsSkipped.length}`));
  for (const client of clientsSkipped) {
    console.log(chalk.yellow(`  - Client ID ${client.id}: "${client.name}" (PROTECTED)`));
  }
  
  console.log(chalk.yellow(`Clients to be deleted: ${clientsToDelete.length}`));
  for (const client of clientsToDelete) {
    console.log(chalk.yellow(`  - Client ID ${client.id}: "${client.name}"`));
  }
  
  // Statistics
  let successCount = 0;
  let failCount = 0;
  
  // Process each client for deletion
  for (const client of clientsToDelete) {
    console.log(chalk.yellow('-'.repeat(80)));
    console.log(chalk.blue(`Processing client ID ${client.id}: "${client.name}"...`));
    
    try {
      // Use transaction to ensure all or nothing behavior for each client deletion
      await db.transaction(async (tx) => {
        // Step 1: Get all entities for this client
        const clientEntities = await tx
          .select({ id: entities.id, name: entities.name })
          .from(entities)
          .where(eq(entities.clientId, client.id));
        
        console.log(chalk.blue(`Found ${clientEntities.length} entities for client ID ${client.id}`));
        
        // Store entity IDs for deletion
        const entityIds = clientEntities.map(entity => entity.id);
        
        // Step 2: If there are entities, delete entity access records first
        if (entityIds.length > 0) {
          // Only attempt to delete user entity access records if there are entities
          const accessRowsDeleted = await tx
            .delete(userEntityAccess)
            .where(inArray(userEntityAccess.entityId, entityIds))
            .returning();
          
          console.log(chalk.blue(`Deleted ${accessRowsDeleted.length} user entity access records related to client ID ${client.id}`));
        }
        
        // Step 3: Delete accounts associated with the client
        const accountRowsDeleted = await tx
          .delete(accounts)
          .where(eq(accounts.clientId, client.id))
          .returning();
        
        console.log(chalk.blue(`Deleted ${accountRowsDeleted.length} accounts related to client ID ${client.id}`));
        
        // Step 4: Delete entities associated with the client
        const entityRowsDeleted = await tx
          .delete(entities)
          .where(eq(entities.clientId, client.id))
          .returning();
        
        console.log(chalk.blue(`Deleted ${entityRowsDeleted.length} entities related to client ID ${client.id}`));
        
        // Step 5: Delete the client itself
        const clientRowsDeleted = await tx
          .delete(clients)
          .where(eq(clients.id, client.id))
          .returning();
        
        console.log(chalk.green(`Deleted client ID ${client.id}: "${client.name}"`));
        
        // If we got here, the transaction was successful
        successCount++;
      });
    } catch (error) {
      console.error(chalk.red(`Error deleting client ID ${client.id}: "${client.name}"`));
      console.error(chalk.red(error));
      failCount++;
    }
  }
  
  // Final summary
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.green('TEST DATA CLEANUP COMPLETED'));
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.blue(`Total "Test" clients found: ${testClients.length}`));
  console.log(chalk.blue(`Clients skipped (kept): ${clientsSkipped.length}`));
  console.log(chalk.green(`Clients successfully deleted: ${successCount}`));
  
  if (failCount > 0) {
    console.log(chalk.red(`Clients failed to delete: ${failCount}`));
  }
  
  console.log(chalk.yellow('='.repeat(80)));
}

// Execute main function
main()
  .catch(error => {
    console.error(chalk.red('Unhandled error:'));
    console.error(chalk.red(error));
    process.exit(1);
  })
  .finally(() => {
    // Ensure the process exits
    process.exit(0);
  });