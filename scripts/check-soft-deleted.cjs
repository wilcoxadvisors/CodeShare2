#!/usr/bin/env node

/**
 * Check Soft-Deleted Clients Script
 * 
 * This script checks for soft-deleted clients and displays information 
 * about when they would be permanently deleted.
 * 
 * Usage: node scripts/check-soft-deleted.cjs
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants for the cleanup process
const DELETION_THRESHOLD_DAYS = 90;
const PROTECTED_CLIENT_NAMES = ['Admin Client', 'OK', 'ONE1', 'Pepper'];

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Get all clients that have been soft-deleted
 */
async function getAllSoftDeletedClients() {
  try {
    const result = await pool.query(
      `SELECT * FROM clients WHERE deleted_at IS NOT NULL ORDER BY deleted_at ASC`
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching soft-deleted clients:', error);
    return [];
  }
}

/**
 * Calculate days until permanent deletion
 */
function daysUntilDeletion(deletedAt) {
  const deleteDate = new Date(deletedAt);
  const thresholdDate = new Date(deleteDate);
  thresholdDate.setDate(thresholdDate.getDate() + DELETION_THRESHOLD_DAYS);
  
  const now = new Date();
  const daysRemaining = Math.ceil((thresholdDate - now) / (1000 * 60 * 60 * 24));
  
  return daysRemaining;
}

/**
 * Main function
 */
async function main() {
  console.log('============================');
  console.log('SOFT-DELETED CLIENTS REPORT');
  console.log('============================');
  
  try {
    // Get all soft-deleted clients
    const softDeletedClients = await getAllSoftDeletedClients();
    
    console.log(`Found ${softDeletedClients.length} soft-deleted clients.\n`);
    
    if (softDeletedClients.length === 0) {
      console.log('No soft-deleted clients found.');
      return;
    }
    
    // Display information about each soft-deleted client
    console.log('ID  | Name                           | Deletion Date        | Days Until Permanent | Protected');
    console.log('----+--------------------------------+----------------------+---------------------+----------');
    
    softDeletedClients.forEach(client => {
      const days = daysUntilDeletion(client.deleted_at);
      const isProtected = PROTECTED_CLIENT_NAMES.includes(client.name);
      const status = days <= 0 ? 'ELIGIBLE NOW' : `${days} days left`;
      
      console.log(
        `${client.id.toString().padEnd(3)} | ` +
        `${client.name.substring(0, 30).padEnd(30)} | ` +
        `${new Date(client.deleted_at).toISOString().substring(0, 19)} | ` +
        `${status.padEnd(19)} | ` +
        `${isProtected ? 'YES' : 'NO'}`
      );
    });
    
    // Find eligible clients for permanent deletion
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - DELETION_THRESHOLD_DAYS);
    
    const eligibleClients = softDeletedClients.filter(client => 
      new Date(client.deleted_at) < thresholdDate && 
      !PROTECTED_CLIENT_NAMES.includes(client.name)
    );
    
    console.log('\n-----------------------');
    console.log(`${eligibleClients.length} clients eligible for permanent deletion.`);
    
    if (eligibleClients.length > 0) {
      console.log('\nELIGIBLE FOR PERMANENT DELETION:');
      eligibleClients.forEach(client => {
        console.log(`- ${client.name} (ID: ${client.id}), deleted on: ${new Date(client.deleted_at).toISOString().substring(0, 10)}`);
      });
    }
    
  } catch (error) {
    console.error('\nERROR:');
    console.error('------');
    console.error(`An unexpected error occurred: ${error.message || error}`);
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
  console.log('\nExiting script...');
  process.exit(0);
});
