// Test script to verify our fix for industry handling
const axios = require('axios');

async function testEntityCreationWithIndustry() {
  try {
    console.log("Starting test for entity creation with industry value...");
    
    // Step 1: Login to get auth token (admin credentials)
    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log("Successfully authenticated");
    
    // Step 2: Create a test client
    const clientData = {
      name: `Test Client ${Date.now()}`,
      active: true,
      industry: "technology",
      contactName: "Test Contact",
      contactEmail: "test@example.com",
      contactPhone: "123-456-7890"
    };
    
    const clientRes = await axios.post('http://localhost:5000/admin/clients', 
      clientData,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    console.log("Client creation response:", JSON.stringify(clientRes.data, null, 2));
    const clientId = clientRes.data.id;
    console.log(`Created test client with ID: ${clientId}`);
    
    // Step 3: Create a test entity with industry
    const entityData = {
      name: `Test Entity ${Date.now()}`,
      code: `TE-${Date.now()}`,
      ownerId: 1, // Assuming admin user has ID 1
      clientId: clientId,
      industry: "tech", // Using tech as a test value (matching the industryUtils.ts options)
      email: "entity@example.com"
    };
    
    console.log("About to create entity with data:", JSON.stringify(entityData, null, 2));
    
    const entityRes = await axios.post('http://localhost:5000/admin/entities', 
      entityData,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    console.log("Entity creation API response status:", entityRes.status);
    console.log("Entity creation full API response:", JSON.stringify(entityRes.data, null, 2));
    
    const entityId = entityRes.data.id;
    console.log(`Created entity with ID: ${entityId}`);
    
    // Step 4: Retrieve entity to verify industry was saved
    const retrieveRes = await axios.get(`http://localhost:5000/admin/entities/${entityId}`, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    const retrievedEntity = retrieveRes.data;
    console.log("Retrieved entity data:", JSON.stringify(retrievedEntity, null, 2));
    
    // Step 5: Verify industry value
    if (retrievedEntity.industry === entityData.industry) {
      console.log(`SUCCESS: Industry value correctly saved and retrieved: "${retrievedEntity.industry}"`);
    } else {
      console.error(`FAILURE: Industry mismatch! Expected "${entityData.industry}" but got "${retrievedEntity.industry}"`);
    }
    
    return {
      success: retrievedEntity.industry === entityData.industry,
      expected: entityData.industry,
      actual: retrievedEntity.industry,
      entityId
    };
    
  } catch (error) {
    console.error("Error during test:", error.message);
    if (error.response) {
      console.error("Response error data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return { success: false, error: error.message };
  }
}

// Execute the test
testEntityCreationWithIndustry()
  .then(result => {
    console.log("Test completed:", result.success ? "PASSED" : "FAILED");
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error("Test failed with exception:", err);
    process.exit(1);
  });