/**
 * Test script to verify entity and client restoration functionality
 */

import { db } from './server/db';
import { entityStorage } from './server/storage/entityStorage';
import { clientStorage } from './server/storage/clientStorage'; 
import { auditLogStorage } from './server/storage/auditLogStorage';
import { InsertEntity, InsertClient } from './shared/schema';

async function testEntityRestore() {
  console.log("Starting entity and client restore test...");
  
  try {
    // 1. Create test client for this test
    console.log("\nStep 1: Creating test client");
    const testClient: InsertClient = {
      name: "Restore Test Client",
      userId: 1, // Admin user
      active: true
    };
    
    const client = await clientStorage.createClient(testClient);
    console.log(`Created client with ID ${client.id} and code ${client.clientCode}`);
    
    // 2. Create test entity for this test
    console.log("\nStep 2: Creating test entity");
    const testEntityData: InsertEntity = {
      name: "Restore Test Entity",
      code: "TEST",
      ownerId: 1, // Admin user
      clientId: client.id,
      active: true
    };
    
    const entity = await entityStorage.createEntity(testEntityData);
    console.log(`Created entity with ID ${entity.id} and code ${entity.entityCode}`);
    
    // 3. Soft delete the entity
    console.log("\nStep 3: Soft deleting the entity");
    const deleteResult = await entityStorage.deleteEntity(entity.id, 1);
    console.log(`Entity deletion result: ${deleteResult}`);
    
    // 4. Verify entity is deleted (should not be found with standard query)
    console.log("\nStep 4: Verify entity is deleted");
    const deletedEntity = await entityStorage.getEntity(entity.id);
    console.log(`Entity found with standard query: ${!!deletedEntity}`);
    
    // 5. Verify entity can be found with includeDeleted=true
    console.log("\nStep 5: Verify entity can be found with includeDeleted=true");
    const hiddenEntity = await entityStorage.getEntity(entity.id, true);
    console.log(`Entity found with includeDeleted=true: ${!!hiddenEntity}`);
    console.log(`Entity deletedAt: ${hiddenEntity?.deletedAt}`);
    console.log(`Entity active: ${hiddenEntity?.active}`);
    
    // 6. Restore the entity
    console.log("\nStep 6: Restoring the entity");
    const restoredEntity = await entityStorage.restoreEntity(entity.id, 1);
    console.log(`Restored entity: ${!!restoredEntity}`);
    console.log(`Restored entity deletedAt: ${restoredEntity?.deletedAt}`);
    console.log(`Restored entity active: ${restoredEntity?.active}`);
    
    // 7. Verify entity is visible again with standard query
    console.log("\nStep 7: Verify entity is visible again");
    const visibleEntity = await entityStorage.getEntity(entity.id);
    console.log(`Entity found with standard query after restore: ${!!visibleEntity}`);
    
    // 8. Check audit logs for delete and restore actions
    console.log("\nStep 8: Checking audit logs");
    const logs = await auditLogStorage.getAuditLogsByEntity(entity.id);
    console.log(`Found ${logs.length} audit logs for the entity`);
    logs.forEach((log, index) => {
      console.log(`Log ${index + 1}: action=${log.action}, by=${log.performedBy}`);
    });
    
    // 9. Test client delete and restore
    console.log("\nStep 9: Soft deleting the client");
    const clientDeleteResult = await clientStorage.deleteClient(client.id, 1);
    console.log(`Client deletion result: ${clientDeleteResult}`);
    
    // 10. Verify client is not found in standard queries
    console.log("\nStep 10: Verify client is not in standard queries");
    const allClients = await clientStorage.getClients();
    const clientFound = allClients.some(c => c.id === client.id);
    console.log(`Client found in standard query: ${clientFound}`);
    
    // 11. Restore the client
    console.log("\nStep 11: Restoring the client");
    const restoredClient = await clientStorage.restoreClient(client.id, 1);
    console.log(`Restored client: ${!!restoredClient}`);
    console.log(`Restored client deletedAt: ${restoredClient?.deletedAt}`);
    console.log(`Restored client active: ${restoredClient?.active}`);
    
    // 12. Verify client is visible again
    console.log("\nStep 12: Verify client is visible again");
    const clientsAfterRestore = await clientStorage.getClients();
    const clientFoundAfterRestore = clientsAfterRestore.some(c => c.id === client.id);
    console.log(`Client found after restore: ${clientFoundAfterRestore}`);
    
    // 13. Check client audit logs
    console.log("\nStep 13: Checking client audit logs");
    const clientLogs = await auditLogStorage.getAuditLogsByClient(client.id);
    console.log(`Found ${clientLogs.length} audit logs for the client`);
    clientLogs.forEach((log, index) => {
      console.log(`Log ${index + 1}: action=${log.action}, by=${log.performedBy}, details=${log.details}`);
    });
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error in test:", error);
  } finally {
    // No need to explicitly close the Neon database connection
    console.log("Test completed, database connection will be closed automatically.")
  }
}

// Run the test
testEntityRestore();