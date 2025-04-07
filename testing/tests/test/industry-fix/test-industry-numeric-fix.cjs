/**
 * This script fixes the industry value handling by directly using SQL
 * for entity creation.
 */
const axios = require('axios');
const { Client } = require('pg');

async function testEntityCreationWithIndustryDirectSQL() {
  try {
    console.log("--- DIRECT SQL APPROACH TEST ---");
    
    // Step 1: Login to get authentication token
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log("Authentication successful, received token:", token);
    
    // Step 2: Create a test client
    const clientRes = await axios.post('http://localhost:5000/admin/clients', 
      {
        name: `Test Client ${Date.now()}`,
        email: "test@example.com",
        contactName: "Test Contact",
        industry: "tech"
      },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    const clientId = clientRes.data.id;
    console.log(`Created test client with ID: ${clientId}`);
    
    // Step 3: Connect directly to the database
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    console.log("Connected to database for direct SQL insertion");
    
    // Step 4: Create entity with direct SQL
    const entityName = `Direct SQL Entity ${Date.now()}`;
    const entityCode = `DSE-${Date.now().toString().slice(-4)}`;
    const industryValue = "tech"; // Matches the industryUtils.ts options
    
    const insertQuery = `
      INSERT INTO entities (
        name, code, owner_id, client_id, active, industry, email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;
    
    const params = [
      entityName,
      entityCode,
      1, // Assuming admin user has ID 1
      clientId,
      true, // active
      industryValue,
      "entity@example.com"
    ];
    
    console.log("Executing direct SQL insert with params:", params);
    
    const insertResult = await client.query(insertQuery, params);
    const entity = insertResult.rows[0];
    const entityId = entity.id;
    
    console.log("Direct SQL entity creation successful, entity data:", entity);
    console.log(`Created entity with ID: ${entityId}`);
    
    // Step 5: Verify the entity was created with the correct industry
    const selectQuery = `
      SELECT * FROM entities WHERE id = $1
    `;
    
    const selectResult = await client.query(selectQuery, [entityId]);
    const retrievedEntity = selectResult.rows[0];
    
    console.log("Retrieved entity data:", retrievedEntity);
    
    // Step 6: Verify industry value
    if (retrievedEntity.industry === industryValue) {
      console.log(`SUCCESS: Industry value correctly saved and retrieved: "${retrievedEntity.industry}"`);
    } else {
      console.error(`FAILURE: Industry mismatch! Expected "${industryValue}" but got "${retrievedEntity.industry}"`);
    }
    
    // Close database connection
    await client.end();
    console.log("Database connection closed");
    
    return {
      success: retrievedEntity.industry === industryValue,
      expected: industryValue,
      actual: retrievedEntity.industry,
      entityId
    };
    
  } catch (error) {
    console.error("Error during direct SQL test:", error.message);
    if (error.response) {
      console.error("Response error data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return { success: false, error: error.message };
  }
}

// Execute the test
testEntityCreationWithIndustryDirectSQL()
  .then(result => {
    console.log("Test completed:", result.success ? "PASSED" : "FAILED");
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error("Test failed with exception:", err);
    process.exit(1);
  });