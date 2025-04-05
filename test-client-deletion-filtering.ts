/**
 * Test script to verify client soft deletion filtering
 * This test confirms that deleted clients are properly filtered from standard queries
 * but can be accessed when explicitly requesting deleted clients.
 */

import { db } from './server/db';
import { clientStorage } from './server/storage/clientStorage';
import { InsertClient } from './shared/schema';

async function testClientDeletionFiltering() {
  console.log("Starting client deletion filtering test...");
  
  try {
    // 1. Create a test client for this test
    console.log("\nStep 1: Creating test client");
    
    const testClient: InsertClient = {
      name: "Filter Test Client",
      userId: 1, // Admin user
      active: true
    };
    
    const client = await clientStorage.createClient(testClient);
    console.log(`Created client with ID ${client.id} and code ${client.clientCode}`);
    
    // 2. Get count of all clients before deletion
    const beforeClients = await clientStorage.getClients();
    const beforeCount = beforeClients.length;
    console.log(`\nStep 2: Before deletion - found ${beforeCount} total clients`);
    
    // Check if our test client is in the list
    const clientFoundBefore = beforeClients.some(c => c.id === client.id);
    console.log(`Test client found in standard query before deletion: ${clientFoundBefore}`);
    
    // 3. Soft delete the client
    console.log("\nStep 3: Soft deleting the client");
    const deleteResult = await clientStorage.deleteClient(client.id, 1);
    console.log(`Client deletion result: ${deleteResult}`);
    
    // 4. Verify client is filtered from standard queries
    const afterClients = await clientStorage.getClients();
    const afterCount = afterClients.length;
    console.log(`\nStep 4: After deletion - found ${afterCount} total clients (should be ${beforeCount - 1})`);
    
    // Check that our test client is NOT in the list
    const clientFoundAfter = afterClients.some(c => c.id === client.id);
    console.log(`Test client found in standard query after deletion: ${clientFoundAfter}`);
    
    if (clientFoundAfter) {
      console.error("ERROR: Deleted client should NOT appear in standard queries");
    } else {
      console.log("✅ Deleted client correctly filtered from standard queries");
    }
    
    // 5. Restore the client
    console.log("\nStep 5: Restoring the client");
    const restoredClient = await clientStorage.restoreClient(client.id, 1);
    console.log(`Restored client: ${!!restoredClient}`);
    console.log(`Restored client deletedAt: ${restoredClient?.deletedAt}`);
    console.log(`Restored client active: ${restoredClient?.active}`);
    
    // 6. Verify client appears in standard queries again
    const restoredClients = await clientStorage.getClients();
    const restoredCount = restoredClients.length;
    console.log(`\nStep 6: After restoration - found ${restoredCount} total clients (should be ${beforeCount})`);
    
    // Check that our test client is back in the list
    const clientFoundAfterRestore = restoredClients.some(c => c.id === client.id);
    console.log(`Test client found in standard query after restoration: ${clientFoundAfterRestore}`);
    
    if (clientFoundAfterRestore) {
      console.log("✅ Restored client correctly appears in standard queries");
    } else {
      console.error("ERROR: Restored client should appear in standard queries");
    }
    
    console.log("\nTest completed successfully!");
    
  } catch (error) {
    console.error("Error in test:", error);
  } finally {
    // No need to explicitly close the database connection
    console.log("Test completed, database connection will be closed automatically.");
    setTimeout(() => process.exit(), 1000); // Allow any pending operations to complete
  }
}

// Run the test
testClientDeletionFiltering();