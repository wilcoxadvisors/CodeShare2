/**
 * Test for Client Legal Name Field
 * 
 * This test verifies that the legalName field is properly saved when creating or updating clients.
 */

import { db } from '../server/db.js'; 
import { clientStorage } from '../server/storage/clientStorage.js';
import { eq } from 'drizzle-orm';
import { clients } from '../shared/schema.js';

// Test data
const testClient = {
  userId: 1, // Admin user ID
  name: "Test Legal Name Client",
  legalName: "Legal Entity Name, Inc.",
  contactName: "Test Contact",
  contactEmail: "test@example.com",
  active: true
};

// Clean up function to remove test clients
async function cleanupTestClients() {
  try {
    await db.delete(clients).where(
      eq(clients.name, testClient.name)
    );
    console.log("Test clients cleaned up");
  } catch (error) {
    console.error("Error cleaning up test clients:", error);
  }
}

describe('Client Legal Name Field Tests', () => {
  // Clean up before tests
  beforeAll(async () => {
    await cleanupTestClients();
  });
  
  // Clean up after tests
  afterAll(async () => {
    await cleanupTestClients();
  });

  it('should save legalName when creating a new client', async () => {
    // Create a new client with legalName
    const createdClient = await clientStorage.createClient(testClient);
    
    // Verify the client was created
    expect(createdClient).toBeDefined();
    expect(createdClient.id).toBeDefined();
    
    // Verify the legalName was saved
    expect(createdClient.legalName).toBe(testClient.legalName);
    
    // Verify by retrieving the client from the database
    const retrievedClient = await clientStorage.getClient(createdClient.id);
    expect(retrievedClient).toBeDefined();
    expect(retrievedClient.legalName).toBe(testClient.legalName);
  });

  it('should update legalName when updating a client', async () => {
    // Get the test client
    const clients = await clientStorage.getClients();
    const testClientFromDb = clients.find(c => c.name === testClient.name);
    expect(testClientFromDb).toBeDefined();
    
    // Update the legalName
    const updatedLegalName = "Updated Legal Entity Name, LLC";
    const updatedClient = await clientStorage.updateClient(testClientFromDb.id, {
      legalName: updatedLegalName
    });
    
    // Verify the update
    expect(updatedClient).toBeDefined();
    expect(updatedClient.legalName).toBe(updatedLegalName);
    
    // Verify by retrieving the client from the database
    const retrievedClient = await clientStorage.getClient(testClientFromDb.id);
    expect(retrievedClient).toBeDefined();
    expect(retrievedClient.legalName).toBe(updatedLegalName);
  });
});
