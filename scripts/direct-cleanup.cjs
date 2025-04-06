#!/usr/bin/env node

/**
 * Direct Cleanup Script (CommonJS version)
 * 
 * This script allows direct execution of the client cleanup process
 * from the command line. It's intended for maintenance operations.
 * 
 * Usage: node scripts/direct-cleanup.cjs
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants for the cleanup process
const SYSTEM_USER_ID = 0;
const DELETION_THRESHOLD_DAYS = 90;
const PROTECTED_CLIENT_NAMES = ['Admin Client', 'OK', 'ONE1', 'Pepper'];

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Get all clients that have been soft-deleted before the threshold date
 */
async function getClientsDeletedBefore(thresholdDate) {
  try {
    const result = await pool.query(
      `SELECT * FROM clients WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
      [thresholdDate]
    );
    
    return result.rows.filter(client => 
      !PROTECTED_CLIENT_NAMES.includes(client.name)
    );
  } catch (error) {
    console.error('Error fetching soft-deleted clients:', error);
    return [];
  }
}

/**
 * Permanently delete a client and all associated data
 */
async function permanentlyDeleteClient(clientId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete client record
    await client.query(
      'DELETE FROM clients WHERE id = $1',
      [clientId]
    );
    
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error permanently deleting client ${clientId}:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error during client deletion' 
    };
  } finally {
    client.release();
  }
}

/**
 * Main cleanup function
 */
async function cleanupSoftDeletedClients() {
  console.log('Starting soft-deleted client cleanup process...');
  
  // Calculate the threshold date (90 days ago)
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - DELETION_THRESHOLD_DAYS);
  
  console.log(`Looking for clients deleted before: ${thresholdDate.toISOString()}`);
  
  // Get clients eligible for permanent deletion
  const clientsToDelete = await getClientsDeletedBefore(thresholdDate);
  
  console.log(`Found ${clientsToDelete.length} clients eligible for permanent deletion.`);
  
  if (clientsToDelete.length === 0) {
    return { deleted: 0, errors: [] };
  }
  
  // Track results
  const result = {
    deleted: 0,
    errors: []
  };
  
  // Delete each client
  for (const client of clientsToDelete) {
    console.log(`Attempting to permanently delete client: ${client.name} (ID: ${client.id})`);
    
    const deleteResult = await permanentlyDeleteClient(client.id);
    
    if (deleteResult.success) {
      console.log(`Successfully deleted client ${client.name} (ID: ${client.id})`);
      result.deleted++;
    } else {
      const errorMsg = `Failed to delete client ${client.name} (ID: ${client.id}): ${deleteResult.error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }
  }
  
  console.log('\nCleanup process completed.');
  console.log(`Results: ${result.deleted} clients deleted, ${result.errors.length} errors.`);
  
  return result;
}

/**
 * Main function
 */
async function main() {
  console.log('========================');
  console.log('DIRECT CLEANUP EXECUTION');
  console.log('========================');
  
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
  } finally {
    // Close the database pool
    await pool.end();
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
