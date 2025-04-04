import fetch from 'node-fetch';
const API_URL = "http://localhost:5000";

async function main() {
  const results = [];
  try {
    // Login first
    console.log("Step 1: Login");
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" })
    });
    
    if (!loginResponse.ok) {
      console.error("Login failed:", await loginResponse.text());
      return;
    }
    
    const cookies = loginResponse.headers.get("set-cookie");
    results.push({ name: "Login", success: true });
    console.log("✅ Login successful");
    
    // Create a new client
    console.log("\nStep 2: Create Client");
    const createClientResponse = await fetch(`${API_URL}/api/admin/clients`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookies 
      },
      body: JSON.stringify({
        name: "Test Client " + Date.now(),
        industry: "Technology",
        contactEmail: "test@example.com",
        contactPhone: "123-456-7890",
        status: "active"
      })
    });
    
    if (!createClientResponse.ok) {
      console.error("Create client failed:", await createClientResponse.text());
      results.push({ name: "Create Client", success: false });
      return;
    }
    
    const clientResult = await createClientResponse.json();
    const client = clientResult.data; // Extract client data from the nested 'data' property
    results.push({ name: "Create Client", success: true, id: client.id });
    console.log(`✅ Client created with ID: ${client.id}`);
    
    // Create a new entity for this client
    console.log("\nStep 3: Create Entity");
    const createEntityResponse = await fetch(`${API_URL}/api/admin/entities`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookies 
      },
      body: JSON.stringify({
        name: "Test Entity " + Date.now(),
        type: "LLC",
        clientId: client.id,
        status: "active"
      })
    });
    
    if (!createEntityResponse.ok) {
      console.error("Create entity failed:", await createEntityResponse.text());
      results.push({ name: "Create Entity", success: false });
      return;
    }
    
    const entityResult = await createEntityResponse.json();
    const entity = entityResult.data || entityResult; // Handle different response formats
    results.push({ name: "Create Entity", success: true, id: entity.id });
    console.log(`✅ Entity created with ID: ${entity.id}`);
    
    // Get the entity by ID
    console.log("\nStep 4: Get Entity by ID");
    const getEntityResponse = await fetch(`${API_URL}/api/entities/${entity.id}`, {
      headers: { "Cookie": cookies }
    });
    
    if (!getEntityResponse.ok) {
      console.error("Get entity failed:", await getEntityResponse.text());
      results.push({ name: "Get Entity by ID", success: false });
      return;
    }
    
    const retrievedEntityResult = await getEntityResponse.json();
    results.push({ name: "Get Entity by ID", success: true });
    console.log(`✅ Successfully retrieved entity with ID: ${entity.id}`);
    
    // Print test summary
    console.log("\n==== VERIFICATION RESULTS ====");
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    
    if (failed === 0) {
      console.log("\n✅ ENTITY OPERATIONS VERIFICATION PASSED");
      console.log("All entity operations are working correctly!");
    } else {
      console.log("\n❌ ENTITY OPERATIONS VERIFICATION FAILED");
      console.log("Please check the logs for more details.");
    }
    
  } catch (error) {
    console.error("Test error:", error);
    console.log("\n❌ ENTITY OPERATIONS VERIFICATION FAILED");
    console.log("An unexpected error occurred during testing.");
  }
}

main();
