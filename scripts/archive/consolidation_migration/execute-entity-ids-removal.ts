/**
 * Execute Entity IDs Removal
 * 
 * This script performs the final migration step to completely remove the entity_ids column:
 * 1. Runs verification to ensure it's safe to remove the column
 * 2. If verification passes, executes the removal migration
 * 3. Outputs detailed logs for diagnosis if anything fails
 * 
 * Usage:
 *   npx tsx scripts/execute-entity-ids-removal.ts [--force]
 * 
 * Arguments:
 *   --force - Skip verification and force column removal (use with caution!)
 */

import { removeEntityIdsColumn } from "../server/migrations/remove-entity-ids-column";
import { log } from "../server/vite";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runVerification(): Promise<boolean> {
  try {
    log("Running verification script...");
    const { stdout, stderr } = await execAsync("npx tsx scripts/verify-migration-complete.ts");
    
    if (stderr) {
      log(`Verification stderr: ${stderr}`);
    }
    
    log(stdout);
    return !stdout.includes("VERIFICATION FAILED") && !stdout.includes("VERIFICATION ERROR");
  } catch (error) {
    log(`Verification script execution error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function executeRemoval() {
  const args = process.argv.slice(2);
  const forceRemoval = args.includes("--force");
  
  log("=== ENTITY_IDS COLUMN REMOVAL EXECUTION ===");
  
  if (forceRemoval) {
    log("WARNING: Force flag detected. Skipping verification.");
  } else {
    const isVerified = await runVerification();
    
    if (!isVerified) {
      log("ABORTED: Verification failed. Fix inconsistencies before proceeding or use --force to override.");
      log("IMPORTANT: Using --force without fixing inconsistencies may cause data loss!");
      process.exit(1);
    }
  }
  
  log("Proceeding with entity_ids column removal...");
  const success = await removeEntityIdsColumn();
  
  if (success) {
    log("SUCCESS: entity_ids column has been successfully removed from the database.");
    log("NEXT STEPS:");
    log("1. Update any remaining code references to entity_ids");
    log("2. Remove any deprecated methods that were using entity_ids");
    log("3. Update frontend components to use the junction table data exclusively");
  } else {
    log("FAILED: entity_ids column removal encountered an error.");
    log("Please check the logs above for details on what went wrong.");
    process.exit(1);
  }
}

// Self-executing async function
(async () => {
  try {
    await executeRemoval();
    process.exit(0);
  } catch (error) {
    log(`Fatal error during execution: ${error}`);
    process.exit(1);
  }
})();