/**
 * Test Data Cleanup Script
 * 
 * This script safely removes all clients except OK, ONE1, and Pepper, including their associated data
 * (entities, accounts) from the database.
 * 
 * IMPORTANT: This script permanently deletes data. Run with caution!
 * Always back up your database before running this script.
 */

import { db } from '../server/db';
import { clients, entities, accounts, userEntityAccess } from '../shared/schema';
import { eq, ilike, and, not, inArray } from 'drizzle-orm';
import chalk from 'chalk';

// Names of clients to keep
const CLIENT_NAMES_TO_KEEP: string[] = ['OK', 'ONE1', 'Pepper', 'Admin Client'];

/**
 * Main function to run the cleanup script
 */
async function main() {
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.yellow('CLIENT CLEANUP SCRIPT'));
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.red('WARNING: This script permanently deletes all clients except Admin Client, OK, ONE1, and Pepper.'));
  console.log(chalk.yellow('Protected Clients that will NOT be deleted: ' + CLIENT_NAMES_TO_KEEP.join(', ')));
  console.log(chalk.yellow('='.repeat(80)));
  
  // Find all clients
  console.log(chalk.blue('Fetching all clients...'));
  
  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      userId: clients.userId
    })
    .from(clients);
  
  console.log(chalk.blue(`Found ${allClients.length} total clients.`));
  
  if (allClients.length === 0) {
    console.log(chalk.green('No clients found. Nothing to clean up.'));
    return;
  }
  
  // Filter out clients that should be kept
  const clientsToDelete = allClients.filter(client => !CLIENT_NAMES_TO_KEEP.includes(client.name));
  const clientsSkipped = allClients.filter(client => CLIENT_NAMES_TO_KEEP.includes(client.name));
  
  console.log(chalk.yellow(`Clients to be kept (in protected list): ${clientsSkipped.length}`));
  for (const client of clientsSkipped) {
    console.log(chalk.yellow(`  - Client ID ${client.id}: "${client.name}" (PROTECTED)`));
  }
  
  console.log(chalk.yellow(`Clients to be deleted: ${clientsToDelete.length}`));
  
  // Only show first 10 clients to avoid excessive output
  const showLimit = 10;
  for (let i = 0; i < Math.min(clientsToDelete.length, showLimit); i++) {
    const client = clientsToDelete[i];
    console.log(chalk.yellow(`  - Client ID ${client.id}: "${client.name}"`));
  }
  
  if (clientsToDelete.length > showLimit) {
    console.log(chalk.yellow(`  ... and ${clientsToDelete.length - showLimit} more clients`));
  }
  
  // Statistics
  let successCount = 0;
  let failCount = 0;
  
  // Process each client for deletion
  const totalClients = clientsToDelete.length;
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.blue(`Starting deletion of ${totalClients} clients...`));
  
  for (let i = 0; i < totalClients; i++) {
    const client = clientsToDelete[i];
    
    // Log progress periodically to avoid excessive output but still show progress
    if (i % 5 === 0 || i === totalClients - 1) {
      console.log(chalk.blue(`Processing ${i + 1}/${totalClients}: Client ID ${client.id}: "${client.name}"...`));
    }
    
    try {
      // Use transaction to ensure all or nothing behavior for each client deletion
      await db.transaction(async (tx) => {
        // Step 1: Get all entities for this client
        const clientEntities = await tx
          .select({ id: entities.id, name: entities.name })
          .from(entities)
          .where(eq(entities.clientId, client.id));
        
        // Store entity IDs for deletion
        const entityIds = clientEntities.map(entity => entity.id);
        
        // Step 2: If there are entities, delete entity access records first
        if (entityIds.length > 0) {
          await tx
            .delete(userEntityAccess)
            .where(inArray(userEntityAccess.entityId, entityIds));
        }
        
        // Step 3: Delete accounts associated with the client
        await tx
          .delete(accounts)
          .where(eq(accounts.clientId, client.id));
        
        // Step 4: Delete entities associated with the client
        await tx
          .delete(entities)
          .where(eq(entities.clientId, client.id));
        
        // Step 5: Delete the client itself
        await tx
          .delete(clients)
          .where(eq(clients.id, client.id));
        
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
  console.log(chalk.green('CLIENT DATA CLEANUP COMPLETED'));
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.blue(`Total clients found: ${allClients.length}`));
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