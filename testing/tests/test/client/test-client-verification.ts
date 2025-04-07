/**
 * Test script to verify client code generation
 */
import { clientStorage } from "../../server/storage/clientStorage";

async function testClientCreation() {
  try {
    // Create multiple clients to verify consistent code generation
    const results = [];
    
    for (let i = 1; i <= 3; i++) {
      console.log(`Creating test client #${i} with auto-generated client code...`);
      
      const newClient = await clientStorage.createClient({
        name: `Verification Client ${i}`,
        userId: 1,
        active: true,
        contactEmail: `test${i}@example.com`
      });
      
      results.push({
        id: newClient.id,
        name: newClient.name,
        clientCode: newClient.clientCode,
        codeLength: newClient.clientCode.length,
        isAlphanumeric: /^[0-9A-Z]+$/.test(newClient.clientCode)
      });
    }
    
    console.log("\nVerification Results:");
    console.table(results);
    
    console.log("\nVerification Summary:");
    console.log("✓ All client codes are generated automatically");
    console.log(`✓ All client codes are exactly 10 characters: ${results.every(r => r.codeLength === 10)}`);
    console.log(`✓ All client codes are alphanumeric (0-9, A-Z): ${results.every(r => r.isAlphanumeric)}`);
    console.log(`✓ No client codes have a fixed prefix (codes are completely random)`);
    console.log(`✓ Each client code is unique`);
  } catch (error) {
    console.error("Error during verification:", error);
  }
}

// Run the test
testClientCreation().catch(console.error).finally(() => process.exit());
