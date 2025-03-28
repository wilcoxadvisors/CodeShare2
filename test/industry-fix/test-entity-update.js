/**
 * Test script focusing specifically on entity update in Step 2 of the setup flow
 * 
 * Goal: Use detailed logging to trigger and diagnose entity update errors
 * 
 * Instructions:
 * 1. Authenticate programmatically using admin credentials
 * 2. Execute test flow to simulate Add Client -> Step 1 -> Step 2
 * 3. Simulate adding a new entity, then editing it
 * 4. Capture all logs and error details from the process
 * 5. Report findings and error messages
 */
import axios from 'axios';

// Create an instance of axios that maintains cookies between requests
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true
});

// Set up logging for request and response
axiosInstance.interceptors.request.use(request => {
  console.log('NETWORK REQUEST:', request.method.toUpperCase(), request.url);
  if (request.data && typeof request.data === 'object') {
    console.log('REQUEST PAYLOAD:', JSON.stringify(request.data, null, 2));
  }
  return request;
});

axiosInstance.interceptors.response.use(
  response => {
    console.log('NETWORK RESPONSE:', response.status, response.statusText, 'from', response.config.method.toUpperCase(), response.config.url);
    return response;
  },
  error => {
    if (error.response) {
      console.error('NETWORK ERROR:', error.response.status, error.response.statusText, 'from', error.config.method.toUpperCase(), error.config.url);
      console.error('ERROR DATA:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('NETWORK ERROR:', error.message);
    }
    return Promise.reject(error);
  }
);

// Axios doesn't handle cookies automatically in Node.js, so we need to manually manage them
const cookieJar = {};

// Add interceptor to save cookies
axiosInstance.interceptors.response.use(response => {
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    // Parse and store cookies
    setCookieHeader.forEach(cookie => {
      const cookieParts = cookie.split(';')[0].split('=');
      const name = cookieParts[0];
      const value = cookieParts[1];
      cookieJar[name] = value;
    });
  }
  return response;
});

// Add interceptor to send cookies
axiosInstance.interceptors.request.use(config => {
  const cookies = Object.entries(cookieJar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  
  if (cookies) {
    config.headers.Cookie = cookies;
  }
  
  return config;
});

// Test data for client
const testClientData = {
  name: "Test Client Edit Entity Test",
  legalName: "Test Client Legal Name LLC",
  industry: "accounting",
  contactName: "Test Contact",
  contactEmail: "test@example.com",
  address: "123 Test St",
  phone: "555-123-4567"
};

// Get current timestamp for unique IDs for temp entities
const timestamp = Date.now();

// Test entity with a temporary ID (negative)
const tempEntity = {
  id: -1 * timestamp, // Using negative ID for frontend tracking
  name: "Original Entity Name",
  legalName: "Original Legal Name LLC",
  entityType: "llc",
  industry: "tech",
  address: "123 Entity St",
  phone: "555-987-6543",
  email: "entity@example.com",
  code: "ORG123",
  localId: -1 * timestamp // Additional marker to identify local entities
};

// Updated data for the entity
const updatedEntityData = {
  ...tempEntity,
  name: "Updated Entity Name"
};

async function testEntityUpdate() {
  try {
    console.log("Starting entity update test...");
    
    // Step 1: Login
    console.log("Logging in...");
    const loginResponse = await axiosInstance.post('/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    console.log("Login successful, session established");
    console.log("User data:", loginResponse.data.user);
    
    // Step 2: Create test client
    console.log("Creating test client...");
    const clientResponse = await axiosInstance.post('/api/admin/clients', {
      ...testClientData,
      userId: loginResponse.data.user.id
    });
    
    if (clientResponse.status !== 200 && clientResponse.status !== 201) {
      throw new Error(`Failed to create client: ${clientResponse.status}`);
    }
    
    const clientId = clientResponse.data.data.id;
    console.log(`Client created with ID: ${clientId}`);
    
    // Step 3: Create real entity with API
    console.log("Creating entity in database...");
    const entityData = {
      ...tempEntity,
      clientId: clientId,
      ownerId: loginResponse.data.user.id
    };
    delete entityData.id; // Remove temporary ID
    delete entityData.localId; // Remove temporary localId
    
    const entityResponse = await axiosInstance.post('/api/admin/entities', entityData);
    
    if (entityResponse.status !== 200 && entityResponse.status !== 201) {
      throw new Error(`Failed to create entity: ${entityResponse.status}`);
    }
    
    const entityId = entityResponse.data.data.id;
    console.log(`Entity created with ID: ${entityId}`);
    
    // Step 4: Update entity (the critical test)
    console.log("Updating entity name...");
    const updateData = {
      name: "Updated Entity Name",
      legalName: "Original Legal Name LLC",
      entityType: "llc",
      industry: "tech",
      code: "ORG123",
      clientId: clientId,
      id: entityId
    };
    
    try {
      const updateResponse = await axiosInstance.put(`/api/admin/entities/${entityId}`, updateData);
      
      console.log("Entity update response status:", updateResponse.status);
      console.log("Entity update response data:", JSON.stringify(updateResponse.data, null, 2));
      
      if (updateResponse.status === 200) {
        console.log("✅ Entity update SUCCESS");
        console.log(`Entity name changed from "${entityData.name}" to "${updateResponse.data.data.name}"`);
      } else {
        console.log("⚠️ Entity update returned unexpected status:", updateResponse.status);
      }
    } catch (error) {
      console.error("❌ Entity update FAILED");
      console.error("Error:", error.message);
      
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Step 5: Fetch entity to confirm update
    console.log("Fetching entity to confirm update...");
    try {
      // Use the standard entity endpoint instead of admin endpoint
      const getResponse = await axiosInstance.get(`/api/entities/${entityId}`);
      
      console.log("Entity fetch response status:", getResponse.status);
      
      // Only print full data structure if it's not a string (likely HTML)
      if (typeof getResponse.data !== 'string') {
        console.log("Full response data structure:", JSON.stringify(getResponse.data, null, 2));
      } else {
        console.log("Response data is a string (HTML) - truncated for clarity");
      }
      
      // Detailed logging of response structure
      console.log("Response structure details:");
      console.log("- Response keys:", Object.keys(getResponse));
      console.log("- Data type:", typeof getResponse.data);
      console.log("- Data keys:", getResponse.data ? Object.keys(getResponse.data) : "null");
      
      if (getResponse.data && typeof getResponse.data === 'object') {
        if (getResponse.data.data) {
          console.log("- Data.data type:", typeof getResponse.data.data);
          console.log("- Data.data keys:", getResponse.data.data ? Object.keys(getResponse.data.data) : "null");
        }
      }
      
      if (getResponse.status === 200) {
        // Handle different response formats
        let fetchedEntity = null;
        
        // For debugging
        console.log("Raw response data type:", typeof getResponse.data);
        if (typeof getResponse.data === 'string') {
          try {
            console.log("Attempting to parse string response...");
            const parsedData = JSON.parse(getResponse.data);
            console.log("Successfully parsed string response:", parsedData);
            getResponse.data = parsedData;
          } catch (e) {
            console.log("Failed to parse string response:", e.message);
          }
        }
        
        if (getResponse.data && getResponse.data.data) {
          // Standard API response format {status, data}
          fetchedEntity = getResponse.data.data;
          console.log("Using data.data format");
        } else if (getResponse.data && getResponse.data.id) {
          // Direct entity format - this is used in /api/entities/:id endpoint
          fetchedEntity = getResponse.data;
          console.log("Using direct data format");
        } else if (getResponse.data && Array.isArray(getResponse.data) && getResponse.data.length > 0) {
          // Array format, take first item
          fetchedEntity = getResponse.data[0];
          console.log("Using array data format");
        } else if (typeof getResponse.data === 'string') {
          // Try to handle string data directly
          console.log("Handling string data response...");
        }
        
        if (fetchedEntity) {
          console.log("Final entity found:", JSON.stringify(fetchedEntity, null, 2));
          console.log(`Final entity name: "${fetchedEntity.name}"`);
          
          if (fetchedEntity.name === "Updated Entity Name") {
            console.log("✅ VERIFICATION SUCCESS: Entity name was updated correctly");
          } else {
            console.log("❌ VERIFICATION FAILED: Entity name was not updated as expected");
          }
        } else {
          console.log("⚠️ Could not find entity in response");
        }
      }
    } catch (error) {
      console.error("❌ Entity fetch FAILED");
      console.error("Error:", error.message);
      
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log("Entity update test complete");
  } catch (error) {
    console.error("Error in test:", error);
  }
}

testEntityUpdate().catch(console.error);