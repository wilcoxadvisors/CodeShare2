/**
 * Migration Script: Convert entity_ids array to junction table
 * 
 * This script will:
 * 1. Read all consolidation groups
 * 2. For each group, extract the entity_ids array
 * 3. Create corresponding records in the consolidation_group_entities junction table
 * 4. Verify that all relationships were migrated correctly
 * 5. Mark groups as migrated to prevent duplicate migrations
 * 
 * Run this script after the consolidation_group_entities table has been created
 * via a database migration.
 */

import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { addJunctionTable } from "../server/migrations/add-junction-table";
import { consolidationGroups, consolidationGroupEntities } from "../shared/schema";
import { inArray, eq, and, isNull } from "drizzle-orm";

// Define a more explicit interface that matches the raw SQL result structure
interface ConsolidationGroupRecord {
  id: number;
  entity_ids: number[] | null;
  is_active: boolean;
  name?: string; // Optional fields that might be returned
  migrated_to_junction?: boolean;
}

async function migrateConsolidationGroupEntities() {
  console.log("Starting migration from entity_ids array to junction table");
  
  try {
    // First, add the junction table if it doesn't exist already
    await addJunctionTable();
    console.log("Junction table created or verified");
    
    // Use a transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // Get all consolidation groups that have not been migrated yet
      const result = await tx.execute(sql`
        SELECT id, entity_ids, is_active 
        FROM consolidation_groups 
        WHERE (migrated_to_junction IS NULL OR migrated_to_junction = false)
          AND entity_ids IS NOT NULL
          AND array_length(entity_ids, 1) > 0
      `);
      
      const groups = result.rows as unknown as ConsolidationGroupRecord[];
      console.log(`Found ${groups.length} groups to migrate`);
      
      let totalRelationships = 0;
      
      // Process each group
      for (const group of groups) {
        const { id, entity_ids } = group;
        
        if (entity_ids && entity_ids.length > 0) {
          console.log(`Processing group ${id} with ${entity_ids.length} entities`);
          
          // Create junction records for each entity in the array
          const junctionValues = entity_ids.map(entityId => ({
            groupId: id,
            entityId
          }));
          
          // Insert records into junction table if they don't already exist
          for (const value of junctionValues) {
            await tx.execute(sql`
              INSERT INTO consolidation_group_entities (group_id, entity_id)
              VALUES (${value.groupId}, ${value.entityId})
              ON CONFLICT (group_id, entity_id) DO NOTHING
            `);
          }
          
          totalRelationships += entity_ids.length;
          
          // Mark this group as migrated
          await tx.execute(sql`
            UPDATE consolidation_groups
            SET migrated_to_junction = true
            WHERE id = ${id}
          `);
          
          console.log(`Group ${id} successfully migrated`);
        }
      }
      
      console.log(`Total relationships migrated: ${totalRelationships}`);
    });
    
    console.log("Migration completed successfully!");
    
    // Verify that the junction table has the correct data
    const junctionCount = await db.execute(sql`
      SELECT COUNT(*) AS count FROM consolidation_group_entities
    `);
    
    const relationshipCount = Number(junctionCount.rows[0]?.count || 0);
    console.log(`Verification: ${relationshipCount} relationships in junction table`);
    
    // Verify all active groups are migrated
    const unmigrated = await db.execute(sql`
      SELECT COUNT(*) AS count FROM consolidation_groups 
      WHERE is_active = true AND (migrated_to_junction IS NULL OR migrated_to_junction = false)
        AND entity_ids IS NOT NULL
        AND array_length(entity_ids, 1) > 0
    `);
    
    const count = Number(unmigrated.rows[0]?.count || 0);
    if (count > 0) {
      console.log(`Warning: ${count} active groups with entities are not marked as migrated`);
    } else {
      console.log("Verification: All active groups with entities are successfully migrated");
    }
    
    // Return success status
    return {
      success: true,
      relationshipCount,
      unmigratedGroups: count
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration if invoked directly
if (require.main === module) {
  migrateConsolidationGroupEntities()
    .then((result) => {
      console.log("Migration script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateConsolidationGroupEntities;