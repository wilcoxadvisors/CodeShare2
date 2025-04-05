/**
 * Test script to verify entity soft deletion and proper filtering of deleted entities
 */
import { entityStorage } from '../../server/storage/entityStorage';
import { clientStorage } from '../../server/storage/clientStorage';
import { auditLogStorage } from '../../server/storage/auditLogStorage';
import { InsertEntity } from '../../shared/schema';

/**
 * This test verifies that:
 * 1. Entities can be soft-deleted (setting deletedAt timestamp)
 * 2. Standard entity retrieval methods correctly filter out deleted entities
 * 3. Entity retrieval methods include deleted entities when includeDeleted=true is passed
 */
async function testEntityDeletionFiltering() {
  try {
    console.log("===== TESTING ENTITY DELETION FILTERING =====");
    
    // 1. First create a test client
    console.log("Creating test client...");
    const adminId = 1; // Admin user ID
    const testClient = await clientStorage.createClient({
      name: "Entity Deletion Test Client",
      legalName: "Entity Deletion Test Legal Name",
      email: "deletion-test@example.com",
      userId: adminId // Set the client owner to admin user
    });
    
    console.log(`Created test client with ID ${testClient.id} and code ${testClient.code}`);
    
    // 2. Create some test entities for the client
    console.log("Creating test entities...");
    
    const entityData: InsertEntity = {
      name: "Entity To Delete",
      code: "TEST_ENTITY", // Required code
      ownerId: 1, // Admin user
      clientId: testClient.id,
      active: true,
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31"
    };
    
    const entity1 = await entityStorage.createEntity(entityData);
    console.log(`Created entity 1 with ID ${entity1.id} and code ${entity1.entityCode}`);
    
    const entity2 = await entityStorage.createEntity({
      ...entityData,
      name: "Entity To Keep"
    });
    console.log(`Created entity 2 with ID ${entity2.id} and code ${entity2.entityCode}`);
    
    // 3. Verify both entities are returned in standard queries
    let clientEntities = await entityStorage.getEntitiesByClient(testClient.id);
    console.log(`Found ${clientEntities.length} entities for client before deletion`);
    
    if (clientEntities.length !== 2) {
      throw new Error(`Expected 2 entities for client, found ${clientEntities.length}`);
    }
    
    // 4. Soft delete one of the entities
    console.log(`Soft deleting entity with ID ${entity1.id}...`);
    const deleteResult = await entityStorage.deleteEntity(entity1.id);
    
    if (!deleteResult) {
      throw new Error(`Failed to delete entity with ID ${entity1.id}`);
    }
    
    console.log("Entity soft deleted successfully");
    
    // 5. Verify that standard queries now exclude the deleted entity
    console.log("Checking entity filtering in standard queries...");
    
    // 5.1 Test getEntitiesByClient
    clientEntities = await entityStorage.getEntitiesByClient(testClient.id);
    console.log(`Found ${clientEntities.length} entities for client after deletion (standard query)`);
    
    if (clientEntities.length !== 1) {
      throw new Error(`Expected 1 entity after deletion, found ${clientEntities.length}`);
    }
    
    // 5.2 Test getEntity
    const deletedEntityCheck = await entityStorage.getEntity(entity1.id);
    if (deletedEntityCheck) {
      throw new Error(`Deleted entity ${entity1.id} was returned in standard getEntity query`);
    }
    console.log(`getEntity correctly returned undefined for deleted entity ID ${entity1.id}`);
    
    // 5.3 Test getEntities
    const allEntities = await entityStorage.getEntities();
    const filteredDeleted = allEntities.some(e => e.id === entity1.id);
    if (filteredDeleted) {
      throw new Error(`Deleted entity ${entity1.id} was included in standard getEntities query`);
    }
    console.log("getEntities correctly filtered out the deleted entity");
    
    // 6. Verify that includeDeleted=true includes the deleted entity
    console.log("Checking entity retrieval with includeDeleted=true...");
    
    // 6.1 Test getEntitiesByClient with includeDeleted=true
    const clientEntitiesWithDeleted = await entityStorage.getEntitiesByClient(testClient.id, true);
    console.log(`Found ${clientEntitiesWithDeleted.length} entities for client with includeDeleted=true`);
    
    if (clientEntitiesWithDeleted.length !== 2) {
      throw new Error(`Expected 2 entities with includeDeleted=true, found ${clientEntitiesWithDeleted.length}`);
    }
    
    // 6.2 Test getEntity with includeDeleted=true
    const deletedEntityWithFlag = await entityStorage.getEntity(entity1.id, true);
    if (!deletedEntityWithFlag) {
      throw new Error(`Deleted entity ${entity1.id} was not returned with includeDeleted=true`);
    }
    console.log(`getEntity with includeDeleted=true correctly returned entity ID ${entity1.id}`);
    
    // 6.3 Test getEntities with includeDeleted=true
    const allEntitiesWithDeleted = await entityStorage.getEntities(true);
    const includesDeleted = allEntitiesWithDeleted.some(e => e.id === entity1.id);
    if (!includesDeleted) {
      throw new Error(`Deleted entity ${entity1.id} was not included with includeDeleted=true`);
    }
    console.log("getEntities with includeDeleted=true correctly included the deleted entity");
    
    // 7. Check that audit logs were created
    console.log("Checking audit logs for deletion record...");
    const auditLogs = await auditLogStorage.getAuditLogsByAction('entity_delete', 10);
    
    const deletionLog = auditLogs.find(log => 
      log.action === 'entity_delete' && 
      log.details && JSON.parse(log.details as string).entityId === entity1.id
    );
    
    if (!deletionLog) {
      throw new Error(`No audit log found for entity deletion (ID: ${entity1.id})`);
    }
    
    console.log("Found audit log for entity deletion:");
    console.log(JSON.stringify(deletionLog, null, 2));
    
    console.log("\n===== ENTITY DELETION FILTERING TEST SUCCESSFUL =====");
    
    // 8. Clean up - delete the client (which is also a soft delete)
    console.log("Cleaning up test data...");
    await clientStorage.deleteClient(testClient.id, adminId);
    console.log("Test client deleted");
    
  } catch (error) {
    console.error("ERROR during entity deletion filtering test:", error);
    throw error;
  }
}

// Run the test
testEntityDeletionFiltering()
  .then(() => console.log("Test completed successfully"))
  .catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  });