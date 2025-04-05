/**
 * Migration script to update existing entity codes to 4-digit format
 * 
 * This script finds all entities in the database and ensures they use the 
 * 4-digit format for the sequential part of their entity code.
 * Example: CLIENT-0001 instead of CLIENT-001
 */

import { db } from "../server/db";
import { clients, entities } from "../shared/schema";
import { eq, like } from "drizzle-orm";

async function migrateEntityCodesTo4Digit() {
  console.log("Starting migration of entity codes to 4-digit format...");
  
  try {
    // Get all clients
    const allClients = await db.select().from(clients);
    console.log(`Found ${allClients.length} clients to process`);
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    // Process each client
    for (const client of allClients) {
      console.log(`\nProcessing client ${client.id} (${client.name}) with code ${client.clientCode}`);
      
      // Get all entities for this client
      const clientEntities = await db
        .select()
        .from(entities)
        .where(eq(entities.clientId, client.id));
      
      console.log(`  Found ${clientEntities.length} entities for this client`);
      
      if (clientEntities.length === 0) continue;
      
      // Group entities by their client code prefix to handle any inconsistencies
      const entitiesByPrefix = new Map<string, typeof clientEntities>();
      
      for (const entity of clientEntities) {
        if (!entity.entityCode) {
          console.log(`  WARNING: Entity ${entity.id} has no entity code, skipping`);
          totalSkipped++;
          continue;
        }
        
        const parts = entity.entityCode.split('-');
        if (parts.length !== 2) {
          console.log(`  WARNING: Entity ${entity.id} has invalid code format: ${entity.entityCode}, skipping`);
          totalSkipped++;
          continue;
        }
        
        const prefix = parts[0];
        if (!entitiesByPrefix.has(prefix)) {
          entitiesByPrefix.set(prefix, []);
        }
        entitiesByPrefix.get(prefix)?.push(entity);
      }
      
      // Process each prefix group
      for (const [prefix, prefixEntities] of entitiesByPrefix.entries()) {
        console.log(`  Processing ${prefixEntities.length} entities with prefix ${prefix}`);
        
        // Sort entities by their numeric suffix to preserve order
        prefixEntities.sort((a, b) => {
          const aNum = parseInt(a.entityCode?.split('-')[1] || '0', 10);
          const bNum = parseInt(b.entityCode?.split('-')[1] || '0', 10);
          return aNum - bNum;
        });
        
        // Update each entity with a 4-digit code
        let counter = 1;
        for (const entity of prefixEntities) {
          const existingCode = entity.entityCode || '';
          const parts = existingCode.split('-');
          const existingNumber = parseInt(parts[1] || '0', 10);
          
          // Determine if this entity's code actually needs updating
          // Only update if it doesn't already have 4 digits
          if (parts[1].length < 4) {
            const newCode = `${prefix}-${String(existingNumber).padStart(4, '0')}`;
            
            // Update the entity code
            await db
              .update(entities)
              .set({ entityCode: newCode })
              .where(eq(entities.id, entity.id));
            
            console.log(`  Updated entity ${entity.id} code from ${existingCode} to ${newCode}`);
            totalUpdated++;
          } else {
            console.log(`  Entity ${entity.id} already has 4-digit code ${existingCode}, skipping`);
            totalSkipped++;
          }
          
          counter++;
        }
      }
    }
    
    console.log("\nMigration summary:");
    console.log(`  Total entities updated: ${totalUpdated}`);
    console.log(`  Total entities skipped: ${totalSkipped}`);
    console.log("4-digit entity code migration completed successfully!");
    
  } catch (error) {
    console.error("Error during entity code migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateEntityCodesTo4Digit()
  .catch(console.error)
  .finally(() => {
    console.log("Migration script execution completed");
    setTimeout(() => process.exit(), 1000); // Allow pending DB operations to complete
  });