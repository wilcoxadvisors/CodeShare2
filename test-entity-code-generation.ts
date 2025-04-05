/**
 * Test script to verify entity code generation with 4-digit format
 */

import { db } from './server/db';
import { clients, entities, InsertEntity } from './shared/schema';
import { eq } from 'drizzle-orm';
import { entityStorage } from './server/storage/entityStorage';

async function testEntityCodeGeneration() {
  try {
    console.log("Starting entity code generation test...");
    
    // Find a client to use for testing 
    const testClients = await db.query.clients.findMany({
      limit: 1
    });
    
    if (testClients.length === 0) {
      console.error("No clients found for testing. Please create a client first.");
      return;
    }
    
    const testClient = testClients[0];
    console.log(`Using client: ${testClient.name} (ID: ${testClient.id}, Code: ${testClient.clientCode})`);
    
    // Create a test entity
    const testEntityData: InsertEntity = {
      name: `Test Entity ${Date.now()}`,
      code: `TE${Date.now().toString().slice(-6)}`, // Generate a test code
      clientId: testClient.id,
      ownerId: testClient.userId, // Use userId from client as entity owner
      active: true,
      currency: 'USD',
      fiscalYearStart: '01-01',
      fiscalYearEnd: '12-31'
    };
    
    // Create the entity using the storage layer
    const newEntity = await entityStorage.createEntity(testEntityData);
    
    console.log(`Created new entity: ${newEntity.name} (ID: ${newEntity.id})`);
    console.log(`Entity code: ${newEntity.entityCode}`);
    
    // Verify the entity code format
    if (!newEntity.entityCode) {
      console.error("Entity code was not generated!");
      return;
    }
    
    const parts = newEntity.entityCode.split('-');
    if (parts.length !== 2) {
      console.error(`Invalid entity code format: ${newEntity.entityCode}`);
      return;
    }
    
    const [clientCodePart, sequencePart] = parts;
    
    if (clientCodePart !== testClient.clientCode) {
      console.error(`Client code mismatch: Expected ${testClient.clientCode}, got ${clientCodePart}`);
      return;
    }
    
    if (sequencePart.length !== 4) {
      console.error(`Sequence part should be 4 digits: Got ${sequencePart.length} digits`);
      return;
    }
    
    if (!/^\d{4}$/.test(sequencePart)) {
      console.error(`Sequence part should contain only digits: ${sequencePart}`);
      return;
    }
    
    console.log("✅ Entity code format verified successfully!");
    console.log(`- Client code part: ${clientCodePart}`);
    console.log(`- Sequence part: ${sequencePart} (${sequencePart.length} digits)`);
    
    // Clean up - uncomment if you want to delete the test entity
    // await db.delete(entities).where(eq(entities.id, newEntity.id));
    // console.log(`Deleted test entity with ID ${newEntity.id}`);
    
  } catch (error) {
    console.error("Error during entity code generation test:", error);
  } finally {
    process.exit(0);
  }
}

testEntityCodeGeneration();