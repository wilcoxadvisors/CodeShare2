/**
 * Migration script to completely remove the entity_ids column
 * from the consolidation_groups table.
 * 
 * This script implements the complete removal of legacy entity_ids
 * as we've fully migrated to the junction table approach.
 */

import { pool } from "../db";
import { log } from "../vite";

export async function removeEntityIdsColumn() {
  log("Starting migration to remove legacy entity_ids column...");

  try {
    // First verify that all consolidation groups have corresponding junction table entries
    const verificationResult = await pool.query(`
      SELECT cg.id, array_length(cg.entity_ids, 1) as legacy_count, COUNT(cge.entity_id) as junction_count
      FROM consolidation_groups cg
      LEFT JOIN consolidation_group_entities cge ON cg.id = cge.group_id
      GROUP BY cg.id, cg.entity_ids
      HAVING array_length(cg.entity_ids, 1) != COUNT(cge.entity_id)
    `);

    if (verificationResult.rowCount > 0) {
      log("ERROR: Data verification failed. Some consolidation groups have inconsistent data between entity_ids and junction table.");
      log(`Found ${verificationResult.rowCount} groups with inconsistent data. Fix these first before removing the column.`);
      
      // Log the problematic groups
      for (const row of verificationResult.rows) {
        log(`Group ID ${row.id}: legacy_count=${row.legacy_count}, junction_count=${row.junction_count}`);
      }
      
      throw new Error("Data verification failed");
    }

    // Drop the entity_ids column
    await pool.query(`
      ALTER TABLE consolidation_groups DROP COLUMN entity_ids;
    `);

    log("Successfully removed legacy entity_ids column from consolidation_groups table.");
    return true;
  } catch (error) {
    log(`Error removing entity_ids column: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      log(error.stack);
    }
    return false;
  }
}