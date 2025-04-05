/**
 * Test script to verify entity soft deletion and audit logging
 */
import { entityStorage } from "./server/storage/entityStorage";
import { auditLogStorage } from "./server/storage/auditLogStorage";
import { clientStorage } from "./server/storage/clientStorage";
import { InsertEntity } from "./shared/schema";

async function testEntityDeletion() {
  try {
    // First get a valid client to associate with our test entity
    const clients = await clientStorage.getClients();
    
    if (clients.length === 0) {
      console.error("No clients found in the database. Please create a client first.");
      return;
    }
    
    const testClient = clients[0];
    console.log(`Using client: ${testClient.name} (ID: ${testClient.id}, Code: ${testClient.clientCode})`);
    
    // Create a test entity
    console.log("\nCreating test entity for deletion test...");
    
    const entityData: InsertEntity = {
      name: "Test Entity for Deletion",
      code: `TD${Date.now().toString().slice(-6)}`,
      clientId: testClient.id,
      ownerId: testClient.userId,
      active: true,
      currency: "USD",
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31"
    };
    
    const newEntity = await entityStorage.createEntity(entityData);
    console.log(`Entity created with ID: ${newEntity.id}, Entity Code: ${newEntity.entityCode}`);
    
    // Perform soft delete with admin ID 1
    const adminId = 1; // Assume admin user with ID 1 exists
    console.log(`\nSoft deleting entity with ID: ${newEntity.id} by admin ID: ${adminId}...`);
    
    const deleteResult = await entityStorage.deleteEntity(newEntity.id, adminId);
    console.log(`Deletion result: ${deleteResult ? "Success" : "Failed"}`);
    
    // Check the entity after deletion
    const deletedEntity = await entityStorage.getEntity(newEntity.id);
    console.log("\nEntity after deletion:", deletedEntity);
    console.log(`Entity deletedAt timestamp: ${deletedEntity?.deletedAt}`);
    
    // Verify audit log was created
    console.log("\nChecking audit logs...");
    const auditLogs = await auditLogStorage.getAuditLogs();
    
    console.log(`Found ${auditLogs.length} audit logs in total`);
    
    // Find logs related to entity deletion (newest logs first)
    const entityDeletionLogs = auditLogs
      .filter(log => 
        log.details.includes(newEntity.id.toString()) && 
        log.action.toLowerCase().includes("entity") &&
        log.action.toLowerCase().includes("delete")
      )
      .sort((a, b) => b.id - a.id);
    
    console.log(`Found ${entityDeletionLogs.length} logs related to this entity deletion`);
    
    if (entityDeletionLogs.length > 0) {
      console.log("\nEntity deletion audit log details:");
      entityDeletionLogs.forEach(log => {
        console.log(`- ID: ${log.id}`);
        console.log(`  Action: ${log.action}`);
        console.log(`  Performed by: User ID ${log.performedBy}`);
        console.log(`  Details: ${log.details}`);
        console.log(`  Timestamp: ${log.createdAt}`);
        console.log("---");
      });
    }
    
  } catch (error) {
    console.error("Error during entity deletion test:", error);
  }
}

// Run the test
testEntityDeletion().catch(console.error).finally(() => process.exit());