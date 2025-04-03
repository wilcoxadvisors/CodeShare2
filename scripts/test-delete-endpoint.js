/**
 * Test script for verifying the DELETE client endpoint
 */
import axios from 'axios';

async function testClientDeletion() {
  try {
    // Step 1: Login to get auth cookie
    console.log('Step 1: Logging in as admin...');
    const loginResp = await axios.post('http://localhost:5000/api/auth/login', { 
      username: 'admin', 
      password: 'password123' 
    });
    const cookie = loginResp.headers['set-cookie'].join('; ');
    console.log('Login successful');
    
    // Step 2: Get initial clients count
    console.log('Step 2: Getting initial clients...');
    const initialClientsResp = await axios.get('http://localhost:5000/api/admin/clients', { 
      headers: { Cookie: cookie } 
    });
    const initialClients = initialClientsResp.data.data;
    console.log(`Initial clients count: ${initialClients.length}`);
    
    // Step 3: Create a test client
    console.log('Step 3: Creating test client...');
    const createResp = await axios.post('http://localhost:5000/api/admin/clients', 
      { name: 'Test Delete Client', active: true, status: 'Active' },
      { headers: { Cookie: cookie } }
    );
    const testClient = createResp.data.data;
    console.log(`Created test client with ID: ${testClient.id}`);
    
    // Step 4: Verify client was created
    console.log('Step 4: Verifying client creation...');
    const afterCreateResp = await axios.get('http://localhost:5000/api/admin/clients', { 
      headers: { Cookie: cookie } 
    });
    const clientsAfterCreate = afterCreateResp.data.data;
    console.log(`Clients after creation: ${clientsAfterCreate.length}`);
    
    // Step 5: Delete the test client
    console.log(`Step 5: Deleting test client with ID ${testClient.id}...`);
    const deleteResp = await axios.delete(`http://localhost:5000/api/admin/clients/${testClient.id}`, { 
      headers: { Cookie: cookie } 
    });
    console.log('Delete response:', JSON.stringify(deleteResp.data));
    
    // Step 6: Verify client was deleted
    console.log('Step 6: Verifying client deletion...');
    const afterDeleteResp = await axios.get('http://localhost:5000/api/admin/clients', { 
      headers: { Cookie: cookie } 
    });
    const clientsAfterDelete = afterDeleteResp.data.data;
    console.log(`Clients after deletion: ${clientsAfterDelete.length}`);
    
    // Verification
    if (clientsAfterDelete.length === initialClients.length) {
      console.log('✅ TEST PASSED: Delete endpoint successfully removed the test client');
    } else {
      console.log('❌ TEST FAILED: Client count after deletion does not match initial count');
      console.log(`Initial: ${initialClients.length}, Final: ${clientsAfterDelete.length}`);
      
      // Look for the test client in the final list
      const testClientStillExists = clientsAfterDelete.some(c => c.id === testClient.id);
      if (testClientStillExists) {
        console.log(`❌ Test client with ID ${testClient.id} still exists in the database`);
      }
    }
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response error data:', JSON.stringify(error.response.data));
    }
  }
}

// Run the test
testClientDeletion();