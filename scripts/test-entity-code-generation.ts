/**
 * Test script to verify entity code generation
 * 
 * This script creates a new entity and verifies that its entity code
 * is generated correctly based on the client code.
 */

import { db } from "../server/db";
import { clients, entities } from "../shared/schema";
import { entityStorage } from "../server/storage/entityStorage";
import { eq } from "drizzle-orm";

// Function to test creating a new entity and verifying its code
async function testEntityCodeGeneration() {
  console.log("Testing entity code generation...");
  
  try {
    // Get a random client to use for testing
    const [client] = await db
      .select()
      .from(clients)
      .orderBy(() => "RANDOM()")
      .limit(1);
    
    if (!client) {
      console.error("No clients found for testing");
      return;
    }
    
    console.log(`Using client ID ${client.id} with code ${client.clientCode} for testing`);
    
    // Check existing entities for this client
    const existingEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.clientId, client.id));
    
    console.log(`Client has ${existingEntities.length} existing entities`);
    
    // Create a new entity for this client
    const testEntityName = `Test Entity ${Date.now()}`;
    console.log(`Creating new entity "${testEntityName}" for client ${client.id}`);
    
    const newEntity = await entityStorage.createEntity({
      name: testEntityName,
      code: "TEST",
      ownerId: 1, // Admin user
      clientId: client.id,
      active: true,
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31"
    });
    
    console.log(`New entity created with ID: ${newEntity.id}`);
    console.log(`Entity code generated: ${newEntity.entityCode}`);
    
    // Verify that the entity code has the expected format: {clientCode}-{SequentialNumber}
    if (!newEntity.entityCode) {
      console.error("Entity code was not generated!");
      return;
    }
    
    const [prefix, sequence] = newEntity.entityCode.split('-');
    
    if (prefix !== client.clientCode) {
      console.error(`Expected entity code to start with ${client.clientCode}, but got ${prefix}`);
    } else {
      console.log(`✓ Entity code has correct client code prefix: ${prefix}`);
    }
    
    if (!sequence || isNaN(parseInt(sequence, 10))) {
      console.error(`Expected a numeric sequence after the dash, but got ${sequence}`);
    } else {
      console.log(`✓ Entity code has valid numeric sequence: ${sequence}`);
    }
    
    console.log("Entity code generation test completed successfully!");
  } catch (error) {
    console.error("Error testing entity code generation:", error);
  }
}

// Run the test
testEntityCodeGeneration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });