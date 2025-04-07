/**
 * Script to fix clients with missing client codes
 * 
 * This script:
 * 1. Identifies all clients without client codes
 * 2. Generates a unique alphanumeric code for each one
 * 3. Updates the client records
 */

import { db } from "../server/db";
import { clients } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";
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
 * Main function to fix all clients with missing codes
 */
async function fixMissingClientCodes() {
  try {
    console.log("Finding clients with missing client codes...");
    
    // Find all clients with null or empty client codes
    const clientsWithoutCodes = await db
      .select()
      .from(clients)
      .where(isNull(clients.clientCode));
    
    console.log(`Found ${clientsWithoutCodes.length} clients with missing client codes.`);
    
    if (clientsWithoutCodes.length === 0) {
      console.log("All clients have codes. No action needed.");
      return;
    }
    
    // Update each client with a new unique code
    for (const client of clientsWithoutCodes) {
      const newCode = await generateUniqueClientCode();
      console.log(`Updating client ID ${client.id} (${client.name}) with new code: ${newCode}`);
      
      await db
        .update(clients)
        .set({ clientCode: newCode, updatedAt: new Date() })
        .where(eq(clients.id, client.id));
    }
    
    console.log("Successfully updated all clients with new client codes.");
  } catch (error) {
    console.error("Error updating client codes:", error);
  }
}

// Run the function
fixMissingClientCodes()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });