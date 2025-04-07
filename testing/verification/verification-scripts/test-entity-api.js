import fetch from 'node-fetch';
const API_URL = "http://localhost:5000";

async function main() {
  try {
    // Login first
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
    console.log("Login successful, cookies obtained");
    
    // Create a new client
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
      return;
    }
    
    const clientResult = await createClientResponse.json();
    const client = clientResult.data; // Extract client data from the nested 'data' property
    console.log("Created client:", client);
    
    // Create a new entity for this client
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
      return;
    }
    
    const entityResult = await createEntityResponse.json();
    const entity = entityResult.data || entityResult; // Handle different response formats
    console.log("Created entity:", entity);
    
    // Get the entity by ID
    const getEntityResponse = await fetch(`${API_URL}/api/entities/${entity.id}`, {
      headers: { "Cookie": cookies }
    });
    
    if (!getEntityResponse.ok) {
      console.error("Get entity failed:", await getEntityResponse.text());
      return;
    }
    
    const retrievedEntityResult = await getEntityResponse.json();
    const retrievedEntity = retrievedEntityResult.data || retrievedEntityResult;
    console.log("Retrieved entity:", retrievedEntity);
    
    // Get entities for client
    const getEntitiesResponse = await fetch(`${API_URL}/api/clients/${client.id}/entities`, {
      headers: { "Cookie": cookies }
    });
    
    if (!getEntitiesResponse.ok) {
      console.error("Get entities failed:", await getEntitiesResponse.text());
      return;
    }
    
    const entitiesResult = await getEntitiesResponse.json();
    const entities = entitiesResult.data || entitiesResult;
    console.log("Retrieved entities for client:", entities);
    
    console.log("All tests passed successfully!");
  } catch (error) {
    console.error("Test error:", error);
  }
}

main();
