/**
 * Script to update existing clients with numeric client codes
 * This script changes existing CLIENT#### codes to simple numbers (1001, 1002, etc.)
 */

import pg from 'pg';
const { Pool } = pg;

// Create a database connection using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateClientCodesToNumeric() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Get all clients
    const { rows } = await client.query('SELECT id, client_code FROM clients');
    
    console.log(`Found ${rows.length} clients to update`);
    
    // For each client, convert code to numeric format (base is ID + 1000)
    for (const row of rows) {
      const clientId = row.id;
      const oldCode = row.client_code;
      const newCode = (clientId + 1000).toString();
      
      console.log(`Updating client ${clientId} from code ${oldCode} to ${newCode}`);
      
      // Update the client with the new code
      await client.query(
        'UPDATE clients SET client_code = $1 WHERE id = $2',
        [newCode, clientId]
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Successfully updated all clients with numeric client codes');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error updating client codes:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the function
updateClientCodesToNumeric()
  .then(() => {
    console.log('Client code numeric update complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });