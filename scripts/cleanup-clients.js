/**
 * Cleanup script to remove all clients except the specified ones
 * Keeps: OK, ONE1, Pepper
 */
import { db } from "../server/db.ts";
import { clients } from "../shared/schema.ts";
import { eq, and, not, inArray } from "drizzle-orm";

async function main() {
  console.log("Starting cleanup script...");
  
  // Get the list of clients to keep (by name)
  const clientsToKeep = ["OK", "ONE1", "Pepper"];
  
  // Find the IDs of clients to keep
  const keepClientRecords = await db.select({
    id: clients.id,
    name: clients.name
  })
  .from(clients)
  .where(inArray(clients.name, clientsToKeep));
  
  const keepClientIds = keepClientRecords.map(c => c.id);
  console.log(`Found ${keepClientIds.length} clients to keep:`, 
    keepClientRecords.map(c => `${c.name} (ID: ${c.id})`).join(", "));
  
  if (keepClientIds.length !== clientsToKeep.length) {
    console.warn(`Warning: Not all clients to keep were found. Expected ${clientsToKeep.length}, found ${keepClientIds.length}`);
  }
  
  // Get the list of clients to delete
  const deleteClientRecords = await db.select({
    id: clients.id,
    name: clients.name
  })
  .from(clients)
  .where(not(inArray(clients.id, keepClientIds)));
  
  console.log(`Found ${deleteClientRecords.length} clients to delete:`, 
    deleteClientRecords.map(c => `${c.name} (ID: ${c.id})`).join(", "));
  
  // Confirm before proceeding
  if (deleteClientRecords.length === 0) {
    console.log("No clients to delete. Exiting.");
    return;
  }
  
  const deleteClientIds = deleteClientRecords.map(c => c.id);
  
  // First, delete all entities belonging to these clients
  try {
    const result = await db.execute(
      `DELETE FROM entities WHERE "clientId" IN (${deleteClientIds.join(',')})`
    );
    console.log(`Deleted entities for clients: ${result.rowCount || 'unknown'} rows affected`);
  } catch (error) {
    console.error("Error deleting client entities:", error);
    return;
  }
  
  // Also delete any accounts for these clients
  try {
    const result = await db.execute(
      `DELETE FROM accounts WHERE "clientId" IN (${deleteClientIds.join(',')})`
    );
    console.log(`Deleted accounts for clients: ${result.rowCount || 'unknown'} rows affected`);
  } catch (error) {
    console.error("Error deleting client accounts:", error);
    return;
  }
  
  // Now delete the clients themselves
  try {
    const result = await db.delete(clients)
      .where(inArray(clients.id, deleteClientIds));
    
    console.log(`Successfully deleted ${deleteClientIds.length} clients!`);
  } catch (error) {
    console.error("Error deleting clients:", error);
  }
  
  console.log("Cleanup completed!");
}

// Execute the script
main().catch(console.error);