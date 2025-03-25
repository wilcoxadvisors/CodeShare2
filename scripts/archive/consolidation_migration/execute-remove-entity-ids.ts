/**
 * Execute the removal of entity_ids column from consolidation_groups
 * 
 * This script executes the migration to completely remove the legacy entity_ids column
 * now that we've validated all data is consistent with the junction table approach.
 */

import { removeEntityIdsColumn } from '../server/migrations/remove-entity-ids-column';

async function executeRemoval() {
  console.log("Starting removal of entity_ids column from consolidation_groups table...");
  
  try {
    const result = await removeEntityIdsColumn();
    
    if (result) {
      console.log("✅ Successfully removed entity_ids column from consolidation_groups table.");
    } else {
      console.error("❌ Failed to remove entity_ids column. See logs for details.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error executing migration:", error);
    process.exit(1);
  }
}

// Execute the migration
executeRemoval();