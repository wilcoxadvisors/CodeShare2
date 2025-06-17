/**
 * Script to reduce Admin Client entities to a specified number
 * 
 * This script identifies all entities for the Admin Client and
 * keeps only the specified number of entities, deleting the rest.
 */

import { db } from '../server/db';
import { clients, entities, accounts, userEntityAccess, journalEntries } from '../shared/schema';
import { eq, and, inArray, not } from 'drizzle-orm';
import chalk from 'chalk';

// Admin Client ID and number of entities to keep
const ADMIN_CLIENT_ID = 1;
const ENTITIES_TO_KEEP = 5;

/**
 * Main function to run the script
 */
async function main() {
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.yellow('ADMIN CLIENT ENTITY CLEANUP SCRIPT'));
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.red(`WARNING: This script reduces the Admin Client's entities to ${ENTITIES_TO_KEEP}.`));
  console.log(chalk.yellow('='.repeat(80)));
  
  // Find all entities for Admin Client
  console.log(chalk.blue('Fetching Admin Client entities...'));
  
  const adminEntities = await db
    .select({
      id: entities.id,
      name: entities.name
    })
    .from(entities)
    .where(eq(entities.clientId, ADMIN_CLIENT_ID));
  
  console.log(chalk.blue(`Found ${adminEntities.length} entities for Admin Client.`));
  
  if (adminEntities.length <= ENTITIES_TO_KEEP) {
    console.log(chalk.green(`Admin Client already has ${adminEntities.length} entities, which is <= ${ENTITIES_TO_KEEP}. No cleanup needed.`));
    return;
  }
  
  // Sort entities by ID (usually means older entities first)
  const sortedEntities = [...adminEntities].sort((a, b) => a.id - b.id);
  
  // Keep the first ENTITIES_TO_KEEP entities and delete the rest
  const entitiesToKeep = sortedEntities.slice(0, ENTITIES_TO_KEEP);
  const entitiesToDelete = sortedEntities.slice(ENTITIES_TO_KEEP);
  
  const entityIdsToKeep = entitiesToKeep.map(entity => entity.id);
  const entityIdsToDelete = entitiesToDelete.map(entity => entity.id);
  
  console.log(chalk.yellow(`Entities to keep (${entitiesToKeep.length}):`));
  for (const entity of entitiesToKeep) {
    console.log(chalk.yellow(`  - Entity ID ${entity.id}: "${entity.name}"`));
  }
  
  console.log(chalk.yellow(`Entities to delete (${entitiesToDelete.length}):`));
  for (const entity of entitiesToDelete) {
    console.log(chalk.yellow(`  - Entity ID ${entity.id}: "${entity.name}"`));
  }
  
  // Statistics
  let successCount = 0;
  let failCount = 0;
  
  // First check if there are any journal entries with these entities
  const journalEntriesWithEntity = await db
    .select({ id: journalEntries.id, entityId: journalEntries.entityId })
    .from(journalEntries)
    .where(inArray(journalEntries.entityId, entityIdsToDelete));
  
  if (journalEntriesWithEntity.length > 0) {
    const affectedEntities = journalEntriesWithEntity.map(je => je.entityId);
    const uniqueAffectedEntities = [...new Set(affectedEntities)];
    
    console.log(chalk.red(`ERROR: Found ${journalEntriesWithEntity.length} journal entries associated with ${uniqueAffectedEntities.length} entities.`));
    console.log(chalk.red(`Cannot delete entities with journal entries. These need to be handled manually.`));
    
    // Remove entities with journal entries from the delete list
    const safeToDeleteEntityIds = entityIdsToDelete.filter(id => !uniqueAffectedEntities.includes(id));
    
    if (safeToDeleteEntityIds.length === 0) {
      console.log(chalk.red(`No entities can be safely deleted. Aborting operation.`));
      return;
    }
    
    console.log(chalk.yellow(`Proceeding with deletion of ${safeToDeleteEntityIds.length} entities that don't have journal entries.`));
    console.log(chalk.yellow('-'.repeat(80)));
    
    // Update our list to only include entities safe to delete
    const safeToDeleteEntities = entitiesToDelete.filter(entity => safeToDeleteEntityIds.includes(entity.id));
    entitiesToDelete.length = 0;
    entitiesToDelete.push(...safeToDeleteEntities);
  }
  
  // Process each entity for deletion
  const totalEntities = entitiesToDelete.length;
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.blue(`Starting deletion of ${totalEntities} entities...`));
  
  for (let i = 0; i < totalEntities; i++) {
    const entity = entitiesToDelete[i];
    
    console.log(chalk.blue(`Processing ${i + 1}/${totalEntities}: Entity ID ${entity.id}: "${entity.name}"...`));
    
    try {
      // Use transaction to ensure all or nothing behavior for each entity deletion
      await db.transaction(async (tx) => {
        // Step 1: Delete user entity access records first
        const accessRowsDeleted = await tx
          .delete(userEntityAccess)
          .where(eq(userEntityAccess.entityId, entity.id))
          .returning();
        
        console.log(chalk.blue(`  - Deleted ${accessRowsDeleted.length} user entity access records`));
        
        // Step 2: Delete accounts associated with the entity (by client and entity)
        // Note: Since accounts are associated with clients directly, we won't delete those
        
        // Step 3: Delete the entity itself
        const entityRowsDeleted = await tx
          .delete(entities)
          .where(eq(entities.id, entity.id))
          .returning();
        
        console.log(chalk.green(`  - Deleted entity ID ${entity.id}: "${entity.name}"`));
        
        // If we got here, the transaction was successful
        successCount++;
      });
    } catch (error) {
      console.error(chalk.red(`Error deleting entity ID ${entity.id}: "${entity.name}"`));
      console.error(chalk.red(error));
      failCount++;
    }
  }
  
  // Final summary
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.green('ADMIN CLIENT ENTITY CLEANUP COMPLETED'));
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.blue(`Total entities found for Admin Client: ${adminEntities.length}`));
  console.log(chalk.blue(`Entities kept: ${entitiesToKeep.length}`));
  console.log(chalk.green(`Entities successfully deleted: ${successCount}`));
  
  if (failCount > 0) {
    console.log(chalk.red(`Entities failed to delete: ${failCount}`));
  }
  
  const remainingCount = await db
    .select({ count: db.fn.count() })
    .from(entities)
    .where(eq(entities.clientId, ADMIN_CLIENT_ID));
  
  console.log(chalk.blue(`Admin Client now has ${remainingCount[0].count} entities`));
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