#!/usr/bin/env node

/**
 * Utility script to seed Chart of Accounts for existing clients
 * This is a one-time fix for clients that were created before CoA seeding was implemented
 */
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

// Create PostgreSQL client from environment variables
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

async function seedCoaForExistingClients() {
  try {
    // Connect to the database
    await pgClient.connect();
    console.log("Connected to database successfully!");
    
    // Get all clients from the database
    console.log("Fetching all clients...");
    const { rows: allClients } = await pgClient.query('SELECT id, name FROM clients ORDER BY id');
    console.log(`Found ${allClients.length} clients in the database.`);
    
    // Counter for stats
    let seededCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each client
    for (const client of allClients) {
      try {
        // Check if client already has accounts
        const { rows: accounts } = await pgClient.query(
          'SELECT COUNT(*) as count FROM accounts WHERE client_id = $1',
          [client.id]
        );
        
        if (parseInt(accounts[0].count) > 0) {
          console.log(`⏭️ Client ${client.id} (${client.name}) already has ${accounts[0].count} accounts. Skipping.`);
          skippedCount++;
          continue;
        }

        console.log(`\nProcessing client ID ${client.id}: ${client.name}`);
        
        // Execute the stored function to seed CoA
        const result = await pgClient.query(
          'SELECT seed_client_coa($1) AS success',
          [client.id]
        );
        
        if (result.rows[0].success) {
          console.log(`✅ Successfully seeded Chart of Accounts for client ${client.name} (ID: ${client.id})`);
          seededCount++;
        } else {
          console.log(`⚠️ No accounts were seeded for client ${client.name} (ID: ${client.id})`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error seeding CoA for client ${client.id}:`, error);
        errorCount++;
      }
    }
    
    // Display final stats
    console.log("\n===== COMPLETION STATISTICS =====");
    console.log(`Total clients: ${allClients.length}`);
    console.log(`Successfully seeded: ${seededCount}`);
    console.log(`Skipped (already had accounts): ${skippedCount}`);
    console.log(`Failed: ${errorCount}`);
    
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pgClient.end();
    console.log("Database connection closed.");
  }
}

// Execute the main function
seedCoaForExistingClients()
  .then(() => {
    console.log("CoA seeding process completed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });