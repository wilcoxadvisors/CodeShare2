import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { db } from "../db";
import { consolidationGroups, entities } from "../../shared/schema";

// Migration to add the consolidation_group_entities junction table
// and migrate data from entity_ids arrays

export async function addJunctionTable() {
  console.log("Starting migration: Adding consolidation_group_entities junction table");
  
  // First, add migratedToJunction column to track migration status
  await db.execute(sql`
    ALTER TABLE consolidation_groups 
    ADD COLUMN IF NOT EXISTS migrated_to_junction BOOLEAN DEFAULT FALSE;
  `);
  
  // Create the junction table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS consolidation_group_entities (
      group_id INTEGER NOT NULL REFERENCES consolidation_groups(id),
      entity_id INTEGER NOT NULL REFERENCES entities(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (group_id, entity_id)
    );
  `);
  
  // Add indexes for performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_consolidation_group_entities_group_id 
    ON consolidation_group_entities(group_id);
  `);
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_consolidation_group_entities_entity_id 
    ON consolidation_group_entities(entity_id);
  `);
  
  console.log("Junction table and indexes created successfully");
  
  // Migrate existing data from entity_ids arrays to the junction table
  console.log("Migrating existing data to junction table...");
  
  // Get all active consolidation groups that have not been migrated yet
  const groups = await db.execute(sql`
    SELECT * FROM consolidation_groups 
    WHERE is_active = true AND migrated_to_junction = false
  `);
  
  console.log(`Found ${groups.rows.length} groups to migrate`);
  
  let migratedGroups = 0;
  let totalRelationships = 0;
  
  // Migrate each group's entity_ids to the junction table
  for (const group of groups.rows) {
    // Skip if entity_ids is null, empty or not an array
    if (!group.entity_ids || !Array.isArray(group.entity_ids) || group.entity_ids.length === 0) {
      console.log(`Group ${group.id} has no entities to migrate`);
      continue;
    }
    
    try {
      // Log the entities we're about to migrate
      console.log(`Migrating ${group.entity_ids.length} entities for group ${group.id}`);
      
      // Insert each entity relationship
      for (const entityId of group.entity_ids) {
        await db.execute(sql`
          INSERT INTO consolidation_group_entities (group_id, entity_id)
          VALUES (${group.id}, ${entityId})
          ON CONFLICT (group_id, entity_id) DO NOTHING;
        `);
      }
      
      // Mark group as migrated
      await db.execute(sql`
        UPDATE consolidation_groups
        SET migrated_to_junction = true
        WHERE id = ${group.id}
      `);
        
      totalRelationships += group.entity_ids.length;
      migratedGroups++;
      console.log(`Successfully migrated group ${group.id}`);
    } catch (error) {
      console.error(`Error migrating group ${group.id}:`, error);
    }
  }
  
  console.log(`Migration complete: ${migratedGroups} groups, ${totalRelationships} relationships`);
  return { migratedGroups, totalRelationships };
}

// Allow running this migration directly
if (require.main === module) {
  addJunctionTable()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}