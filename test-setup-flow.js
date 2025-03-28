// Setup flow test script using axios

import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Create an instance of axios that maintains cookies between requests
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true
});

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

// Test data
const testClientData = {
  name: "Test Client March 28",
  legalName: "Test Client Legal Name LLC",
  taxId: "12-3456789",
  industry: "accounting",
  address: "123 Test Street, Testville, TS 12345",
  phone: "555-123-4567",
  email: "test@example.com",
  website: "https://example.com",
  notes: "This is a test client created by the automated test script"
};

// Get current timestamp for unique IDs
const timestamp = Date.now();

// Test entities
const testEntities = [
  {
    id: -1 * timestamp, // Using negative ID for frontend tracking
    name: "Test Entity 1",
    legalName: "Test Entity 1 Legal LLC",
    taxId: "98-7654321",
    entityType: "llc",
    industry: "accounting",
    address: "123 Entity St, Entityville, EN 54321",
    phone: "555-987-6543",
    email: "entity1@example.com",
    code: "TENT1"
  },
  {
    id: -2 * timestamp, // Using negative ID for frontend tracking
    name: "Test Entity 2",
    legalName: "Test Entity 2 Corp",
    taxId: "45-6789123",
    entityType: "corporation",
    industry: "technology",
    address: "456 Corp Ave, Corpville, CV 98765",
    phone: "555-456-7890",
    email: "entity2@example.com",
    code: "TENT2"
  }
];

// Main test function
async function runSetupTest() {
  try {
    console.log("Starting setup flow test...");
    console.log("Step 1: Create client in Step 1");
    console.log("Client data:", testClientData);

    // Log entities data for Step 2
    console.log("Step 2: Add entities");
    testEntities.forEach((entity, index) => {
      console.log(`Entity ${index + 1}:`, entity.name);
    });

    // Step 3: Submit data - first create client
    console.log("Step 3: Submit data - Creating client");
    
    // Login directly to get a fresh session
    console.log("Logging in to get a fresh session...");
    const loginResponse = await axiosInstance.post('/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    console.log("Login successful, session established");
    console.log("User data:", loginResponse.data.user);
    
    // Create client with the authenticated session
    const clientResponse = await axiosInstance.post('/api/admin/clients', testClientData);
    
    const clientResponseBody = clientResponse.data;
    console.log("Client creation response status:", clientResponse.status);
    console.log("Client creation response body:", JSON.stringify(clientResponseBody, null, 2));
    
    if (clientResponse.status !== 200 && clientResponse.status !== 201) {
      throw new Error(`Failed to create client: ${clientResponse.status}`);
    }
    
    // Extract the new client ID
    const newClientId = clientResponseBody.data.id;
    console.log("New client created with ID:", newClientId);
    
    // Create entities for the client
    console.log("Creating entities for client ID:", newClientId);
    
    const entityCreatePromises = testEntities.map(async (entity) => {
      // Prepare entity data with client ID
      const entityData = {
        ...entity,
        clientId: newClientId
      };
      
      // Remove local ID used for frontend tracking
      delete entityData.id;
      
      // Use the axiosInstance with cookie handling
      const entityResponse = await axiosInstance.post('/api/admin/entities', entityData);
      
      const entityResponseBody = entityResponse.data;
      console.log(`Entity creation response status for ${entity.name}:`, entityResponse.status);
      console.log(`Entity creation response body for ${entity.name}:`, JSON.stringify(entityResponseBody, null, 2));
      
      if (entityResponse.status !== 200 && entityResponse.status !== 201) {
        throw new Error(`Failed to create entity ${entity.name}: ${entityResponse.status}`);
      }
      
      return entityResponseBody;
    });
    
    const entityResults = await Promise.all(entityCreatePromises);
    console.log("All entities created successfully");
    
    // Invalidate dashboard data cache by fetching it again
    console.log("Fetching dashboard data to verify refresh");
    const dashboardResponse = await axiosInstance.get('/api/admin/dashboard');
    
    console.log("Dashboard data fetch status:", dashboardResponse.status);
    
    if (dashboardResponse.status !== 200) {
      throw new Error(`Failed to fetch dashboard data: ${dashboardResponse.status}`);
    }
    
    const dashboardData = dashboardResponse.data;
    
    // Check if our new client is in the dashboard data
    const foundClient = dashboardData.data.clients.find(c => c.id === newClientId);
    console.log("New client found in dashboard data:", !!foundClient);
    
    if (foundClient) {
      console.log("Setup flow test completed successfully");
      console.log("Results:");
      console.log("1. Client created with ID:", newClientId);
      console.log("2. Entities created:", entityResults.length);
      console.log("3. Dashboard data refreshed and includes new client:", !!foundClient);
      
      // Optionally, clean up the test data when CLEANUP=true is set
      if (process.env.CLEANUP === 'true') {
        console.log("\nCleaning up test data...");
        
        // Delete entities first (due to foreign key constraints)
        for (const entityResult of entityResults) {
          const entityId = entityResult.data.id;
          console.log(`Deleting entity ID ${entityId}...`);
          try {
            await axiosInstance.delete(`/api/admin/entities/${entityId}`);
            console.log(`Entity ${entityId} deleted successfully`);
          } catch (error) {
            console.log(`Warning: Failed to delete entity ${entityId}: ${error.message}`);
          }
        }
        
        // Then delete the client
        console.log(`Deleting client ID ${newClientId}...`);
        try {
          await axiosInstance.delete(`/api/admin/clients/${newClientId}`);
          console.log(`Client ${newClientId} deleted successfully`);
        } catch (error) {
          console.log(`Warning: Failed to delete client ${newClientId}: ${error.message}`);
        }
      }
    } else {
      console.log("Setup flow test partially successful, but new client not found in dashboard data");
    }
  } catch (error) {
    console.error("Error in setup flow test:", error);
  }
}

// Run the test
runSetupTest().catch(console.error);