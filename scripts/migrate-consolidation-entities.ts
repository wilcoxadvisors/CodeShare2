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

import { db } from '../server/db';
import { logEntityIdsDeprecation } from '../shared/deprecation-logger';
import { sql } from 'drizzle-orm';

interface ConsolidationGroupRecord {
  id: number;
  entity_ids: number[] | null;
  is_active: boolean;
  name?: string; // Optional fields that might be returned
  migrated_to_junction?: boolean;
}

async function migrateConsolidationGroupEntities() {
  console.log("Starting migration from entity_ids to junction table...");
  
  try {
    // Check if the table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'consolidation_group_entities'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error("Error: consolidation_group_entities table doesn't exist. Run migrations first.");
      return;
    }
    
    // 1. Get all consolidation groups with entity_ids that haven't been migrated yet
    const groups = await db.execute<ConsolidationGroupRecord>(sql`
      SELECT id, entity_ids, is_active, name, migrated_to_junction 
      FROM consolidation_groups 
      WHERE is_active = true 
        AND (migrated_to_junction IS NULL OR migrated_to_junction = false)
        AND entity_ids IS NOT NULL
    `);
    
    console.log(`Found ${groups.rows.length} consolidation groups to migrate`);
    
    // 2. For each group with entity_ids, create entries in junction table
    for (const group of groups.rows) {
      if (!group.entity_ids || !group.entity_ids.length) {
        console.log(`Skipping group ${group.id} (${group.name || 'unnamed'}) - no entity_ids`);
        continue;
      }
      
      console.log(`Processing group ${group.id} (${group.name || 'unnamed'}) with ${group.entity_ids.length} entities`);
      
      // Log the deprecation to track usage
      logEntityIdsDeprecation('migrate-consolidation-entities.ts', {
        groupId: group.id,
        entities: group.entity_ids
      });
      
      // Create junction table entries for each entity in entity_ids
      for (const entityId of group.entity_ids) {
        try {
          // First, check if the entity exists
          const entityCheck = await db.execute(sql`
            SELECT EXISTS (
              SELECT 1 FROM entities 
              WHERE id = ${entityId} AND active = true
            );
          `);
          
          if (!entityCheck.rows[0].exists) {
            console.log(`Skipping entity ${entityId} - entity doesn't exist in entities table or is inactive`);
            continue;
          }
          
          // Check if the relationship already exists to avoid duplicates
          const existingCheck = await db.execute(sql`
            SELECT EXISTS (
              SELECT 1 FROM consolidation_group_entities 
              WHERE group_id = ${group.id} AND entity_id = ${entityId}
            );
          `);
          
          if (!existingCheck.rows[0].exists) {
            await db.execute(sql`
              INSERT INTO consolidation_group_entities (group_id, entity_id)
              VALUES (${group.id}, ${entityId})
            `);
            console.log(`Added entity ${entityId} to junction table for group ${group.id}`);
          } else {
            console.log(`Entity ${entityId} already exists in junction table for group ${group.id}`);
          }
        } catch (error) {
          console.error(`Error adding entity ${entityId} to group ${group.id}:`, error);
        }
      }
      
      // 3. Verify migration was successful by checking valid entities only
      // First, get all valid entity IDs from the entity_ids array
      const validEntityIds: number[] = [];
      
      for (const entityId of group.entity_ids) {
        const entityCheck = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM entities 
            WHERE id = ${entityId} AND active = true
          );
        `);
        
        if (entityCheck.rows[0].exists) {
          validEntityIds.push(entityId);
        }
      }
      
      // Now get the entities in the junction table
      const junctionEntities = await db.execute(sql`
        SELECT entity_id FROM consolidation_group_entities WHERE group_id = ${group.id}
      `);
      
      const junctionEntityIds = junctionEntities.rows.map(row => row.entity_id);
      
      // Check if all valid entity_ids exist in the junction table
      const allValidMigrated = validEntityIds.every(entityId => 
        junctionEntityIds.includes(entityId)
      );
      
      if (allValidMigrated) {
        // 4. Mark as migrated to prevent future migrations
        await db.execute(sql`
          UPDATE consolidation_groups 
          SET migrated_to_junction = true, updated_at = NOW()
          WHERE id = ${group.id}
        `);
        console.log(`Group ${group.id} (${group.name || 'unnamed'}) successfully migrated`);
        
        // If there were invalid entities in entity_ids, log it
        if (validEntityIds.length < group.entity_ids.length) {
          console.log(`Note: Group ${group.id} had ${group.entity_ids.length - validEntityIds.length} invalid entity references that were skipped`);
        }
      } else {
        console.error(`Migration verification failed for group ${group.id} (${group.name || 'unnamed'})`);
      }
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// Run the migration
migrateConsolidationGroupEntities()
  .then(() => {
    console.log("Migration script completed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Unhandled error in migration script:", error);
    process.exit(1);
  });