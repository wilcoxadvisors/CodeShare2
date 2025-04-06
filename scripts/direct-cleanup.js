/**
 * Direct Cleanup Script
 * 
 * This script allows direct execution of the client cleanup process
 * from the command line. It's intended for maintenance operations.
 * 
 * Usage: node scripts/direct-cleanup.js
 */

// Import required modules
const { runAllScheduledTasks, cleanupSoftDeletedClients } = require('../server/tasks/scheduledTasks');

async function main() {
  console.log('========================');
  console.log('DIRECT CLEANUP EXECUTION');
  console.log('========================');
  console.log('Starting soft-deleted client cleanup process...');
  
  try {
    // Execute the cleanup process
    const result = await cleanupSoftDeletedClients();
    
    console.log('\nCleanup Results:');
    console.log('----------------');
    console.log(`Clients permanently deleted: ${result.deleted}`);
    
    if (result.errors.length > 0) {
      console.log(`\nErrors encountered (${result.errors.length}):`);
      result.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    } else {
      console.log('No errors encountered.');
    }
    
    console.log('\nCleanup process completed successfully.');
    
  } catch (error) {
    console.error('\nFATAL ERROR:');
    console.error('------------');
    console.error(`An unexpected error occurred during the cleanup process: ${error.message || error}`);
    console.error(error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(err => {
  console.error('Unhandled error in main process:', err);
  process.exit(1);
}).then(() => {
  console.log('Exiting script...');
  process.exit(0);
});