/**
 * Script to create test clients for CoA seeding verification
 */

import axios from 'axios';

// Create clients without authentication for testing
async function createTestClient(endpoint, name) {
  try {
    const clientData = {
      name,
      userId: 1,
      active: true
    };
    
    console.log(`Creating test client "${name}" via ${endpoint}...`);
    const response = await axios.post(`http://localhost:5000${endpoint}`, clientData);
    
    if (endpoint === '/api/admin/clients') {
      console.log(`✅ Created admin client with ID: ${response.data.data.id}`);
      return response.data.data.id;
    } else {
      console.log(`✅ Created regular client with ID: ${response.data.id}`);
      return response.data.id;
    }
  } catch (error) {
    console.error(`Error creating test client via ${endpoint}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Create test clients via different endpoints
async function createTestClients() {
  console.log("====== CREATING TEST CLIENTS ======\n");
  
  const timestamp = Date.now();
  const adminClientId = await createTestClient(
    '/api/admin/clients', 
    `Admin Test Client ${timestamp}`
  );
  
  const regularClientId = await createTestClient(
    '/api/clients',
    `Regular Test Client ${timestamp}`
  );
  
  console.log('\nTest client creation completed');
  console.log(`- Admin client ID: ${adminClientId || 'Failed'}`);
  console.log(`- Regular client ID: ${regularClientId || 'Failed'}`);
  
  return {
    adminClientId,
    regularClientId
  };
}

// Run the client creation
createTestClients()
  .then(result => {
    if (result.adminClientId || result.regularClientId) {
      console.log('\n✅ Successfully created test clients');
      process.exit(0);
    } else {
      console.error('\n❌ Failed to create any test clients');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\nError creating test clients:', error.message);
    process.exit(1);
  });