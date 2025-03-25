/**
 * Verification Script: Check if entity_ids column can be safely removed
 * 
 * This script performs verification steps to ensure it's safe to remove the entity_ids column:
 * 1. Checks if all consolidation groups have corresponding records in the junction table
 * 2. Verifies consistency between entity_ids arrays and junction table entries
 * 3. Provides a detailed report of any inconsistencies that need to be fixed
 */

import { pool } from "../server/db";
import { log } from "../server/vite";

interface ConsolidationGroup {
  id: number;
  name: string;
  entity_ids: number[] | null;
  junction_count: number;
  legacy_count: number | null;
}

async function verifyMigrationComplete() {
  log("Verifying migration status before removing entity_ids column...");

  try {
    // Check for consolidation groups with inconsistent entity relationships
    const verificationResult = await pool.query(`
      SELECT 
        cg.id, 
        cg.name,
        cg.entity_ids,
        COUNT(cge.entity_id) as junction_count,
        array_length(cg.entity_ids, 1) as legacy_count
      FROM consolidation_groups cg
      LEFT JOIN consolidation_group_entities cge ON cg.id = cge.group_id
      GROUP BY cg.id, cg.name, cg.entity_ids
      ORDER BY cg.id
    `);

    if (verificationResult.rowCount === 0) {
      log("No consolidation groups found in the database.");
      return { safe: true, groups: [], issues: 0 };
    }

    log(`Found ${verificationResult.rowCount} consolidation groups.`);
    
    const groups: ConsolidationGroup[] = verificationResult.rows;
    let issues = 0;
    
    // Check for inconsistencies
    for (const group of groups) {
      if (group.entity_ids === null && group.junction_count === 0) {
        log(`Group ID ${group.id} (${group.name}): No entities in either storage method.`);
        continue;
      }
      
      if (group.entity_ids === null && group.junction_count > 0) {
        log(`Group ID ${group.id} (${group.name}): Has ${group.junction_count} entities in junction table, but null entity_ids array.`);
        continue;
      }
      
      if (group.legacy_count !== group.junction_count) {
        log(`[ISSUE] Group ID ${group.id} (${group.name}): Inconsistent entity count - entity_ids: ${group.legacy_count}, junction table: ${group.junction_count}`);
        issues++;
        
        // Get detailed information about the inconsistency
        const entityResult = await pool.query(`
          SELECT 
            e.id as entity_id, 
            e.name as entity_name,
            CASE WHEN e.id = ANY(cg.entity_ids) THEN true ELSE false END as in_legacy,
            CASE WHEN cge.entity_id IS NOT NULL THEN true ELSE false END as in_junction
          FROM consolidation_groups cg
          CROSS JOIN entities e
          LEFT JOIN consolidation_group_entities cge ON cg.id = cge.group_id AND e.id = cge.entity_id
          WHERE cg.id = $1 AND (e.id = ANY(cg.entity_ids) OR cge.entity_id IS NOT NULL)
          ORDER BY e.id
        `, [group.id]);
        
        for (const entity of entityResult.rows) {
          if (entity.in_legacy !== entity.in_junction) {
            log(`  -> Entity ID ${entity.entity_id} (${entity.entity_name}): in legacy array: ${entity.in_legacy}, in junction table: ${entity.in_junction}`);
          }
        }
      }
    }
    
    return {
      safe: issues === 0,
      groups,
      issues
    };
  } catch (error) {
    log(`Error during verification: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      log(error.stack);
    }
    return { safe: false, groups: [], issues: -1 }; // -1 indicates an error occurred
  }
}

// Self-executing async function
(async () => {
  try {
    const result = await verifyMigrationComplete();
    
    if (result.safe) {
      log("VERIFICATION SUCCESSFUL: It's safe to remove the entity_ids column.");
      log(`Verified ${result.groups.length} consolidation groups with no inconsistencies.`);
    } else if (result.issues > 0) {
      log("VERIFICATION FAILED: Inconsistencies detected between entity_ids array and junction table.");
      log(`Found ${result.issues} groups with inconsistencies that need to be fixed first.`);
      log("Please run the migration script to fix these inconsistencies before removing the column.");
    } else {
      log("VERIFICATION ERROR: Unable to complete verification due to an error.");
    }
    
    process.exit(result.safe ? 0 : 1);
  } catch (error) {
    log(`Fatal error during verification: ${error}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();