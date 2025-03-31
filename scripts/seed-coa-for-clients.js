#!/usr/bin/env node

/**
 * Utility script to seed Chart of Accounts for existing clients
 * This is a one-time fix for clients that were created before CoA seeding was implemented
 */
import '../server/dotenv-config.js';
import { db } from '../server/db.ts';
import { clients } from '../shared/schema.ts';
import { Storage } from '../server/storage.ts';

async function seedCoaForExistingClients() {
  const storage = new Storage();
  
  try {
    // Get all clients from the database
    console.log("Fetching all clients...");
    const allClients = await db.select().from(clients);
    console.log(`Found ${allClients.length} clients in the database.`);
    
    // Counter for stats
    let seededCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each client
    for (const client of allClients) {
      try {
        console.log(`\nProcessing client ID ${client.id}: ${client.name}`);
        
        // Call the seedClientCoA method
        await storage.seedClientCoA(client.id);
        console.log(`✅ Successfully seeded Chart of Accounts for client ID: ${client.id}`);
        seededCount++;
      } catch (error) {
        if (error.message && error.message.includes("already has accounts configured")) {
          console.log(`⏭️ Client ${client.id} already has accounts. Skipping.`);
          skippedCount++;
        } else {
          console.error(`❌ Error seeding CoA for client ${client.id}:`, error);
          errorCount++;
        }
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