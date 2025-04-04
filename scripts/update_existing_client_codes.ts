/**
 * Script to update existing clients to have newly generated alphanumeric client codes
 * 
 * This script:
 * 1. Retrieves all existing clients
 * 2. Generates a new alphanumeric code for each client
 * 3. Updates the client record with the new code
 * 4. Logs the changes for verification
 */

import { db } from "../server/db";
import { clients } from "../shared/schema";
import { eq } from "drizzle-orm";
import { customAlphabet } from 'nanoid';

/**
 * Generate a unique client code
 * @returns Promise<string> A unique 10-character alphanumeric code
 */
async function generateUniqueClientCode(): Promise<string> {
  // Define alphanumeric alphabet (0-9, A-Z)
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const generateCode = customAlphabet(alphabet, 10);
  
  try {
    let unique = false;
    let clientCode = '';
    
    while (!unique) {
      clientCode = generateCode();
      
      // Check if this code already exists
      const existing = await db
        .select()
        .from(clients)
        .where(eq(clients.clientCode, clientCode))
        .limit(1);
      
      unique = existing.length === 0;
    }
    
    return clientCode;
  } catch (error) {
    console.error("Error generating unique client code:", error);
    // Fallback to timestamp-based code if error occurs
    const timestamp = Date.now().toString(36).toUpperCase() + 
                     Math.random().toString(36).substring(2, 6).toUpperCase();
    return timestamp.padEnd(10, '0').substring(0, 10);
  }
}

/**
 * Update existing client codes to alphanumeric format
 */
async function updateClientCodes() {
  console.log("Starting client code update process...");

  try {
    // Get all clients
    const allClients = await db
      .select()
      .from(clients);

    console.log(`Found ${allClients.length} clients to update`);

    // Track success and failure counts
    let successCount = 0;
    let failureCount = 0;

    // Update each client with a new alphanumeric code
    for (const client of allClients) {
      try {
        // Generate a new unique alphanumeric code
        const newCode = await generateUniqueClientCode();
        
        // Update the client record
        await db
          .update(clients)
          .set({ clientCode: newCode })
          .where(eq(clients.id, client.id));
        
        console.log(`Updated client ID ${client.id} from ${client.clientCode} to ${newCode}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to update client ID ${client.id}:`, error);
        failureCount++;
      }
    }

    console.log(`Client code update completed successfully! Updated ${successCount} clients.`);
    if (failureCount > 0) {
      console.warn(`Warning: Failed to update ${failureCount} clients. Check logs for details.`);
    }
  } catch (error) {
    console.error("Error updating client codes:", error);
  }

  console.log("Update script completed. Exiting...");
}

// Run the update function
updateClientCodes().catch(error => {
  console.error("Unhandled error in update script:", error);
  process.exit(1);
});