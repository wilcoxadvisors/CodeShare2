/**
 * Migration Script: Convert entity_ids array to junction table
 * 
 * This script will:
 * 1. Read all consolidation groups
 * 2. For each group, extract the entity_ids array
 * 3. Create corresponding records in the consolidation_group_entities junction table
 * 4. Verify that all relationships were migrated correctly
 * 
 * Run this script after the consolidation_group_entities table has been created
 * via a database migration.
 */

import { db } from "../server/db";
import { consolidationGroups, consolidationGroupEntities } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateConsolidationGroupEntities() {
  console.log("Starting migration of consolidation group entities to junction table...");
  let migratedGroups = 0;
  let totalRelationships = 0;

  // Get all active consolidation groups
  const groups = await db.select()
    .from(consolidationGroups)
    .where(eq(consolidationGroups.isActive, true));
  
  console.log(`Found ${groups.length} active consolidation groups to migrate`);

  // For each group, migrate entity relationships
  for (const group of groups) {
    const entityIds = group.entity_ids || [];
    console.log(`Group #${group.id} "${group.name}" has ${entityIds.length} entities to migrate`);
    
    if (entityIds.length === 0) {
      console.log(`  - No entities to migrate for group #${group.id}`);
      continue;
    }

    try {
      // Begin transaction for this group's migration
      await db.transaction(async (tx) => {
        // Create junction table entries for each entity ID
        const relationships = entityIds.map(entityId => ({
          groupId: group.id,
          entityId: entityId,
          createdAt: new Date()
        }));
        
        // Insert relationships into junction table
        await tx.insert(consolidationGroupEntities)
          .values(relationships);
        
        // Update the original record to mark migration
        await tx.update(consolidationGroups)
          .set({ 
            migrated_to_junction: true,
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, group.id));
          
        totalRelationships += entityIds.length;
        console.log(`  - Successfully migrated ${entityIds.length} entities for group #${group.id}`);
      });
      
      migratedGroups++;
    } catch (error) {
      console.error(`Error migrating group #${group.id}:`, error);
      throw error; // Rethrow to halt the migration
    }
  }

  // Verify migration
  console.log("\nVerifying migration results...");
  const junctionEntries = await db.select()
    .from(consolidationGroupEntities)
    .groupBy(consolidationGroupEntities.groupId);
  
  console.log(`Migration complete: 
  - ${migratedGroups}/${groups.length} groups migrated
  - ${totalRelationships} total relationships created
  - ${junctionEntries.length} groups have junction table entries`);
  
  // Final verification
  const success = migratedGroups === groups.length && junctionEntries.length === migratedGroups;
  console.log(`Migration ${success ? 'SUCCEEDED' : 'FAILED'}`);
  return success;
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateConsolidationGroupEntities()
    .then(success => {
      if (success) {
        console.log("Migration completed successfully");
        process.exit(0);
      } else {
        console.error("Migration completed with errors");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Migration failed with error:", error);
      process.exit(1);
    });
}

export { migrateConsolidationGroupEntities };