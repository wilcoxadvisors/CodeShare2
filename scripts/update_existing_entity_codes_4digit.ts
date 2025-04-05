/**
 * Migration script to update existing entity codes to 4-digit format
 * Changes entity codes from CLIENT-XXX to CLIENT-XXXX format
 */

import { db } from "../server/db";
import { clients, entities } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateEntityCodesTo4Digit() {
  console.log("Starting migration of entity codes to 4-digit format...");
  
  // Get all entities with their client relationships
  const allEntities = await db.select().from(entities);
  console.log(`Found ${allEntities.length} entities to update`);

  // Counter for each client to track the sequential numbering
  const counters = new Map<number, number>();

  // Process each entity
  for (const entity of allEntities) {
    const clientId = entity.clientId;
    
    // Skip entities without a clientId
    if (!clientId) {
      console.warn(`Entity ID ${entity.id} has no client ID, skipping`);
      continue;
    }
    
    // Get the client record for this entity
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) {
      console.error(`Client ID ${clientId} not found for entity ID ${entity.id}, skipping`);
      continue;
    }

    const clientCode = client.clientCode;
    
    // Determine the entity sequence number
    // If the entity already has a code, extract and convert the sequence number
    let sequenceNumber: number;
    
    if (entity.entityCode && entity.entityCode.includes('-')) {
      // Extract existing sequence number from entity code
      const parts = entity.entityCode.split('-');
      const existingSequence = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      sequenceNumber = existingSequence || 1; // Use 1 as fallback if extraction fails
    } else {
      // No valid existing code, assign next sequence number for this client
      const currentCount = counters.get(clientId) || 0;
      sequenceNumber = currentCount + 1;
    }
    
    // Update the counter
    counters.set(clientId, Math.max(sequenceNumber, counters.get(clientId) || 0));
    
    // Generate the new 4-digit entity code
    const entityCode = `${clientCode}-${String(sequenceNumber).padStart(4, '0')}`;

    // Update the entity record
    await db.update(entities)
      .set({ entityCode })
      .where(eq(entities.id, entity.id));

    console.log(`Updated Entity ID ${entity.id} to code ${entityCode}`);
  }

  console.log("4-digit entity code migration completed successfully.");
}

// Execute the migration
migrateEntityCodesTo4Digit()
  .catch(error => {
    console.error("Error during migration:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Migration script execution completed.");
    process.exit(0);
  });