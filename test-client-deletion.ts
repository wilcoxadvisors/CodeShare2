/**
 * Test script to verify client soft deletion and audit logging
 */
import { clientStorage } from "./server/storage/clientStorage";
import { auditLogStorage } from "./server/storage/auditLogStorage";

async function testClientDeletion() {
  try {
    console.log("Creating test client for deletion test...");
    
    // Create a test client
    const newClient = await clientStorage.createClient({
      name: "Test Client for Deletion",
      userId: 1,
      active: true
    });
    
    console.log(`Client created with ID: ${newClient.id}, Code: ${newClient.clientCode}`);
    
    // Perform soft delete with admin ID 1
    const adminId = 1; // Assume admin user with ID 1 exists
    console.log(`Soft deleting client with ID: ${newClient.id} by admin ID: ${adminId}...`);
    
    const deleteResult = await clientStorage.deleteClient(newClient.id, adminId);
    console.log(`Deletion result: ${deleteResult ? "Success" : "Failed"}`);
    
    // Check the client after deletion
    const deletedClient = await clientStorage.getClient(newClient.id);
    console.log("Client after deletion:", deletedClient);
    console.log(`Client deletedAt timestamp: ${deletedClient?.deletedAt}`);
    
    // Verify audit log was created
    console.log("\nChecking audit logs...");
    const auditLogs = await auditLogStorage.getAuditLogs();
    
    console.log(`Found ${auditLogs.length} audit logs in total`);
    
    // Find any logs related to this client deletion
    const clientDeletionLogs = auditLogs.filter(log => 
      log.details.includes(newClient.id.toString()) && 
      log.action.toLowerCase().includes("delete")
    );
    
    console.log(`Found ${clientDeletionLogs.length} logs related to this client deletion`);
    
    if (clientDeletionLogs.length > 0) {
      console.log("\nClient deletion audit log details:");
      clientDeletionLogs.forEach(log => {
        console.log(`- ID: ${log.id}`);
        console.log(`  Action: ${log.action}`);
        console.log(`  Performed by: User ID ${log.performedBy}`);
        console.log(`  Details: ${log.details}`);
        console.log(`  Timestamp: ${log.createdAt}`);
        console.log("---");
      });
    }
    
  } catch (error) {
    console.error("Error during client deletion test:", error);
  }
}

// Run the test
testClientDeletion().catch(console.error).finally(() => process.exit());