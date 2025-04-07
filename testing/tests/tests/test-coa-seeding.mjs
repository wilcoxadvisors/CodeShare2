/**
 * Direct test for CoA seeding functionality
 */

import axios from 'axios';

// Login to get authentication token
const login = async () => {
  try {
    console.log("Logging in to get authentication token...");
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin', // Default admin credentials 
      password: 'password'
    });
    
    if (!loginResponse.headers['set-cookie']) {
      throw new Error("No authentication cookie returned from login");
    }
    
    const cookies = loginResponse.headers['set-cookie'];
    const authCookie = cookies.find(c => c.startsWith('connect.sid='));
    
    if (!authCookie) {
      throw new Error("Authentication cookie not found in response");
    }
    
    console.log("✅ Successfully authenticated");
    return authCookie;
  } catch (error) {
    console.error("Login error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data));
    }
    throw error;
  }
};

// Test creating a client through the admin route
const adminTest = async (authCookie) => {
  try {
    console.log("Testing /api/admin/clients endpoint for CoA seeding...");
    
    // Create a client via admin endpoint
    const clientResponse = await axios.post('http://localhost:5000/api/admin/clients', {
      name: `Test Admin Client ${Date.now()}`,
      userId: 1,
      active: true
    }, {
      headers: {
        Cookie: authCookie
      }
    });
    
    if (!clientResponse.data || !clientResponse.data.data || !clientResponse.data.data.id) {
      console.error("❌ Failed to create client via admin endpoint");
      return false;
    }
    
    const clientId = clientResponse.data.data.id;
    console.log(`✅ Created client with ID ${clientId} via admin endpoint`);
    
    // Get accounts for the client
    const accountsResponse = await axios.get(`http://localhost:5000/api/accounts/${clientId}`, {
      headers: {
        Cookie: authCookie
      }
    });
    
    if (!accountsResponse.data || !Array.isArray(accountsResponse.data) || accountsResponse.data.length < 10) {
      console.error(`❌ CoA seeding failed for admin client - found only ${accountsResponse.data?.length || 0} accounts`);
      return false;
    }
    
    // Check for essential account types
    const accountTypes = new Set(accountsResponse.data.map(a => a.type));
    const expectedTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const missingTypes = expectedTypes.filter(type => !accountTypes.has(type));
    
    if (missingTypes.length > 0) {
      console.error(`❌ Missing account types: ${missingTypes.join(', ')}`);
      return false;
    }
    
    console.log(`✅ Found ${accountsResponse.data.length} accounts with all required types`);
    
    // Check for parent-child relationships
    const hasParentRelationships = accountsResponse.data.some(a => a.parentId !== null);
    if (!hasParentRelationships) {
      console.error("❌ No parent-child relationships found");
      return false;
    }
    
    console.log("✅ Found parent-child relationships in the account structure");
    
    // Success!
    console.log("✅ Admin client CoA seeding test PASSED");
    return true;
  } catch (error) {
    console.error("Error in admin test:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data));
    }
    return false;
  }
};

// Test creating a client through the regular route
const regularTest = async (authCookie) => {
  try {
    console.log("\nTesting /api/clients endpoint for CoA seeding...");
    
    // Create a client via regular endpoint
    const clientResponse = await axios.post('http://localhost:5000/api/clients', {
      name: `Test Regular Client ${Date.now()}`,
      userId: 1,
      active: true
    }, {
      headers: {
        Cookie: authCookie
      }
    });
    
    if (!clientResponse.data || !clientResponse.data.id) {
      console.error("❌ Failed to create client via regular endpoint");
      return false;
    }
    
    const clientId = clientResponse.data.id;
    console.log(`✅ Created client with ID ${clientId} via regular endpoint`);
    
    // Get accounts for the client
    const accountsResponse = await axios.get(`http://localhost:5000/api/accounts/${clientId}`, {
      headers: {
        Cookie: authCookie
      }
    });
    
    if (!accountsResponse.data || !Array.isArray(accountsResponse.data) || accountsResponse.data.length < 10) {
      console.error(`❌ CoA seeding failed for regular client - found only ${accountsResponse.data?.length || 0} accounts`);
      return false;
    }
    
    // Check for essential account types
    const accountTypes = new Set(accountsResponse.data.map(a => a.type));
    const expectedTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const missingTypes = expectedTypes.filter(type => !accountTypes.has(type));
    
    if (missingTypes.length > 0) {
      console.error(`❌ Missing account types: ${missingTypes.join(', ')}`);
      return false;
    }
    
    console.log(`✅ Found ${accountsResponse.data.length} accounts with all required types`);
    
    // Check for parent-child relationships
    const hasParentRelationships = accountsResponse.data.some(a => a.parentId !== null);
    if (!hasParentRelationships) {
      console.error("❌ No parent-child relationships found");
      return false;
    }
    
    console.log("✅ Found parent-child relationships in the account structure");
    
    // Success!
    console.log("✅ Regular client CoA seeding test PASSED");
    return true;
  } catch (error) {
    console.error("Error in regular test:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data));
    }
    return false;
  }
};

// Run both tests
const runTests = async () => {
  console.log("====== CHART OF ACCOUNTS SEEDING VERIFICATION ======\n");
  
  try {
    // Get authentication cookie
    const authCookie = await login();
    
    // Run tests with authentication
    const adminResult = await adminTest(authCookie);
    const regularResult = await regularTest(authCookie);
    
    console.log("\n====== TEST SUMMARY ======");
    console.log(`Admin client endpoint: ${adminResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Regular client endpoint: ${regularResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Overall result: ${adminResult && regularResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    return adminResult && regularResult;
  } catch (error) {
    console.error(`Test setup error: ${error.message}`);
    return false;
  }
};

// Execute tests
runTests()
  .then(success => {
    console.log(`\nTest script execution ${success ? 'successful' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("\nTest script error:", error.message);
    process.exit(1);
  });