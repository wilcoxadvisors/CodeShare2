/**
 * Script to update existing entities with hierarchical entity codes
 * 
 * This script will:
 * 1. Find all entities in the database
 * 2. Group them by client
 * 3. For each client, generate sequential entity codes (CLIENT-CODE-001, CLIENT-CODE-002, etc.)
 * 4. Update the entities with the new codes
 */

import { db } from "../server/db";
import { entities, clients } from "../shared/schema";
import { eq, like, asc } from "drizzle-orm";

async function main() {
  console.log("Starting update of entity codes...");
  
  // Get all clients
  const allClients = await db.select().from(clients);
  console.log(`Found ${allClients.length} clients to process`);
  
  for (const client of allClients) {
    if (!client.clientCode) {
      console.log(`Client ID ${client.id} has no client code, skipping...`);
      continue;
    }
    
    console.log(`Processing client ID ${client.id} with code ${client.clientCode}`);
    
    // Get all entities for this client
    const clientEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.clientId, client.id))
      .orderBy(asc(entities.name));
    
    console.log(`Found ${clientEntities.length} entities for client ${client.id}`);
    
    // Check if any existing entities already have codes for this client
    const entitiesWithCodes = await db
      .select({ entityCode: entities.entityCode })
      .from(entities)
      .where(like(entities.entityCode, `${client.clientCode}-%`))
      .orderBy(asc(entities.entityCode));
    
    // Extract the sequence numbers from existing entity codes
    const existingNumbers = entitiesWithCodes
      .map(e => {
        if (!e.entityCode) return 0;
        const parts = e.entityCode.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    // Start with the next available sequence number
    let nextNumber = existingNumbers.length > 0 
      ? Math.max(...existingNumbers) + 1 
      : 1;
    
    // Update each entity with a new code
    for (const entity of clientEntities) {
      // Skip entities that already have a valid entity code
      if (entity.entityCode && entity.entityCode.startsWith(`${client.clientCode}-`)) {
        console.log(`Entity ID ${entity.id} already has a valid code: ${entity.entityCode}, skipping...`);
        continue;
      }
      
      // Generate the new entity code
      const newEntityCode = `${client.clientCode}-${String(nextNumber).padStart(3, '0')}`;
      
      console.log(`Updating entity ID ${entity.id} with new code: ${newEntityCode}`);
      
      // Update the entity in the database
      await db
        .update(entities)
        .set({ entityCode: newEntityCode, updatedAt: new Date() })
        .where(eq(entities.id, entity.id));
      
      nextNumber++;
    }
  }
  
  console.log("Entity code update completed successfully!");
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error updating entity codes:", error);
    process.exit(1);
  });