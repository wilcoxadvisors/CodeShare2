/**
 * Migration script to update the consolidation_group_entities junction table
 * 
 * This migration adds:
 * 1. A primary key 'id' column to the junction table
 * 2. A createdAt timestamp column to track when entities were added to groups
 */

import { db } from '../db';

export async function updateJunctionTableSchema() {
  console.log("Running migration to update consolidation_group_entities junction table schema...");
  
  try {
    // First check if the table exists
    const tableExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'consolidation_group_entities'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log("Skipping update - consolidation_group_entities table doesn't exist yet");
      return true;
    }
    
    // Add id column if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE consolidation_group_entities 
        ADD COLUMN IF NOT EXISTS id SERIAL;
      `);
      console.log("Added id column to consolidation_group_entities table");
    } catch (error) {
      console.log("id column already exists or cannot be added:", error.message);
    }
    
    // Check if we need to add a primary key
    const hasPrimaryKey = await db.execute(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'consolidation_group_entities_pkey' 
        AND conrelid = 'consolidation_group_entities'::regclass
      );
    `);
    
    if (!hasPrimaryKey.rows[0].exists) {
      try {
        await db.execute(`
          ALTER TABLE consolidation_group_entities ADD PRIMARY KEY (id);
        `);
        console.log("Added primary key to consolidation_group_entities table");
      } catch (error) {
        console.log("Failed to add primary key:", error.message);
      }
    }
    
    // Add createdAt column if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE consolidation_group_entities 
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();
      `);
      console.log("Added createdAt column to consolidation_group_entities table");
    } catch (error) {
      console.log("createdAt column already exists or cannot be added:", error.message);
    }
    
    // Add index for fast lookups
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_consolidation_group_entities_group_entity
        ON consolidation_group_entities (group_id, entity_id);
      `);
      console.log("Added index on (group_id, entity_id) to consolidation_group_entities table");
    } catch (error) {
      console.log("Failed to add index:", error.message);
    }
    
    console.log("Successfully updated consolidation_group_entities junction table schema.");
    return true;
  } catch (error) {
    console.error("Error updating consolidation_group_entities junction table schema:", error);
    return false;
  }
}