/**
 * Test script to verify client code generation
 */
import { clientStorage } from "../../server/storage/clientStorage";

async function testClientCreation() {
  try {
    console.log("Creating test client with auto-generated client code...");
    
    const newClient = await clientStorage.createClient({
      name: "Verification Test Client",
      userId: 1,
      active: true
    });
    
    console.log("Client created successfully:");
    console.log(`ID: ${newClient.id}`);
    console.log(`Name: ${newClient.name}`);
    console.log(`Client Code: ${newClient.clientCode}`);
    console.log(`Code Length: ${newClient.clientCode.length}`);
    console.log(`Is Alphanumeric: ${/^[0-9A-Z]+$/.test(newClient.clientCode)}`);
    
  } catch (error) {
    console.error("Error creating client:", error);
  }
}

// Run the test
testClientCreation().catch(console.error).finally(() => process.exit());
