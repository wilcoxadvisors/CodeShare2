/**
 * Script to update existing clients with unique client codes
 * This is a one-time script to be run after the migration adds the client_code column
 */

import pg from 'pg';
const { Pool } = pg;

// Create a database connection using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function assignClientCodes() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Get all clients without a client code
    const { rows } = await client.query('SELECT id FROM clients WHERE client_code IS NULL ORDER BY id');
    
    console.log(`Found ${rows.length} clients without client codes`);
    
    // For each client, generate and assign a unique client code
    for (const [index, row] of rows.entries()) {
      const clientId = row.id;
      const clientCode = `CLIENT${clientId.toString().padStart(4, '0')}`;
      
      console.log(`Setting client ${clientId} to code ${clientCode}`);
      
      // Update the client with the new code
      await client.query(
        'UPDATE clients SET client_code = $1 WHERE id = $2',
        [clientCode, clientId]
      );
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Successfully updated all clients with unique client codes');
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
assignClientCodes()
  .then(() => {
    console.log('Client code update complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });