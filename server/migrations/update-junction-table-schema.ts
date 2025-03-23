import { sql } from "drizzle-orm";
import { db } from "../db";

// Migration to update the consolidation_group_entities table schema
// to match the updated schema definition in shared/schema.ts
export async function updateJunctionTableSchema() {
  console.log("Starting migration: Updating consolidation_group_entities table schema");
  
  try {
    // Check if the id column already exists
    const checkIdColumn = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'consolidation_group_entities' AND column_name = 'id'
      );
    `);
    
    const idColumnExists = checkIdColumn.rows[0].exists;
    
    if (idColumnExists) {
      console.log("The id column already exists in consolidation_group_entities table, skipping migration");
      return { updated: false, message: "Schema already updated" };
    }
    
    // If the id column doesn't exist, we need to update the schema
    // using a transaction to ensure atomicity
    await db.transaction(async (tx) => {
      console.log("Beginning transaction to update table schema");
      
      // Drop the primary key constraint
      console.log("Dropping primary key constraint");
      await tx.execute(sql`
        ALTER TABLE consolidation_group_entities
        DROP CONSTRAINT consolidation_group_entities_pkey;
      `);
      
      // Add id column as serial primary key
      console.log("Adding id column as serial primary key");
      await tx.execute(sql`
        ALTER TABLE consolidation_group_entities
        ADD COLUMN id SERIAL PRIMARY KEY;
      `);
      
      // Ensure created_at column is NOT NULL
      console.log("Ensuring created_at column is NOT NULL");
      await tx.execute(sql`
        ALTER TABLE consolidation_group_entities
        ALTER COLUMN created_at SET NOT NULL;
      `);
      
      // Add a unique constraint on group_id and entity_id
      console.log("Adding unique constraint on group_id and entity_id");
      await tx.execute(sql`
        ALTER TABLE consolidation_group_entities
        ADD CONSTRAINT group_entity_unique UNIQUE (group_id, entity_id);
      `);
      
      console.log("Transaction completed successfully");
    });
    
    console.log("Schema update complete: added id column and unique constraint to consolidation_group_entities");
    return { updated: true, message: "Schema updated successfully" };
  } catch (error) {
    console.error("Error updating junction table schema:", error);
    throw error;
  }
}

// Allow running this migration directly
if (require.main === module) {
  updateJunctionTableSchema()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}