import axios from 'axios';
import fs from 'fs';

async function testSecondClient() {
  console.log("Starting second client test...");

  // Create axios instance  
  const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Enable cookie handling for axios
  const cookieJar = {
    cookies: {}
  };

  // Set interceptor to save cookies
  axiosInstance.interceptors.response.use(
    (response) => {
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          const cookiePart = cookie.split(';')[0];
          const [name, value] = cookiePart.split('=');
          cookieJar.cookies[name] = value;
        });
      }
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Set interceptor to send cookies
  axiosInstance.interceptors.request.use(
    (config) => {
      let cookieString = '';
      for (const [name, value] of Object.entries(cookieJar.cookies)) {
        cookieString += `${name}=${value}; `;
      }
      if (cookieString) {
        config.headers.Cookie = cookieString.trim();
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  
  try {
    // Login to get session
    console.log("Logging in...");
    const loginResponse = await axiosInstance.post('/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    console.log("Login successful:", loginResponse.status === 200);
    
    // Get client count before test
    console.log("Fetching existing clients...");
    const clientsBeforeResponse = await axiosInstance.get('/api/admin/clients');
    const clientsBefore = clientsBeforeResponse.data.data;
    console.log(`Number of clients before test: ${clientsBefore.length}`);
    
    // Create a second test client
    const secondClient = {
      name: "Second Test Client",
      industry: "technology",
      address: "789 Tech Blvd, Silicon Valley, CA 94043",
      phone: "555-999-8888",
      email: "tech@example.com",
      website: "https://techexample.com",
      notes: "This is a second test client to verify multiple clients can be created",
    };
    
    console.log("Creating second client...");
    const createResponse = await axiosInstance.post('/api/admin/clients', secondClient);
    console.log(`Second client created:`, createResponse.status === 201);
    
    if (createResponse.status === 201) {
      const newClientId = createResponse.data.data.id;
      console.log(`New client ID: ${newClientId}`);
      
      // Create an entity for the second client
      const entityData = {
        name: "Second Test Entity",
        code: "STE1",
        taxId: "11-2233445",
        address: "789 Entity Lane, Tech City, TC 54321",
        phone: "555-111-2222",
        email: "entity@techexample.com",
        clientId: newClientId
      };
      
      console.log("Creating entity for second client...");
      const entityResponse = await axiosInstance.post('/api/admin/entities', entityData);
      console.log(`Entity created:`, entityResponse.status === 201);
      
      if (entityResponse.status === 201) {
        console.log(`Entity ID: ${entityResponse.data.data.id}`);
      }
    }
    
    // Verify all clients still exist
    console.log("Fetching final client list...");
    const clientsAfterResponse = await axiosInstance.get('/api/admin/clients');
    const clientsAfter = clientsAfterResponse.data.data;
    console.log(`Number of clients after test: ${clientsAfter.length}`);
    
    // Check if client count increased by 1
    console.log(`Client count increased by: ${clientsAfter.length - clientsBefore.length}`);
    
    // Check if all previous clients still exist
    const allPreviousClientsExist = clientsBefore.every(beforeClient => 
      clientsAfter.some(afterClient => afterClient.id === beforeClient.id)
    );
    
    console.log(`All previous clients still exist: ${allPreviousClientsExist}`);
    
    // Summary
    console.log("\nTest Summary:");
    console.log(`1. Clients before: ${clientsBefore.length}`);
    console.log(`2. Clients after: ${clientsAfter.length}`);
    console.log(`3. All previous clients still exist: ${allPreviousClientsExist}`);
    console.log(`4. Test ${allPreviousClientsExist && clientsAfter.length > clientsBefore.length ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.error("Test failed with error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
  }
}

testSecondClient();
