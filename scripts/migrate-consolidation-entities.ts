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

import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { addJunctionTable } from "../server/migrations/add-junction-table";

async function migrateConsolidationGroupEntities() {
  console.log("Starting migration from entity_ids array to junction table");
  
  try {
    // First, add the junction table if it doesn't exist already
    await addJunctionTable();
    
    console.log("Migration completed successfully!");
    
    // Verify that the junction table has the correct data
    const junctionCount = await db.execute(sql`
      SELECT COUNT(*) FROM consolidation_group_entities
    `);
    
    console.log(`Verification: ${junctionCount.rows[0].count} relationships in junction table`);
    
    // Verify all groups are migrated
    const unmigrated = await db.execute(sql`
      SELECT COUNT(*) FROM consolidation_groups 
      WHERE is_active = true AND migrated_to_junction = false
    `);
    
    if (Number(unmigrated.rows[0].count) > 0) {
      console.log(`Warning: ${unmigrated.rows[0].count} active groups are not marked as migrated`);
    } else {
      console.log("Verification: All active groups are successfully migrated");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration if invoked directly
if (require.main === module) {
  migrateConsolidationGroupEntities()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateConsolidationGroupEntities;