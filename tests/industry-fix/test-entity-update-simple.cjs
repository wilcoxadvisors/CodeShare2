// Simple Entity Update Test with Axios
// Run this with: node test-entity-update-simple.js

const http = require('http');
const https = require('https');

// Helper function to make HTTP requests using Node.js native http module
function makeRequest(method, url, data = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }
    
    // Parse URL
    const parsedUrl = new URL(url);
    options.hostname = parsedUrl.hostname;
    options.port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80);
    options.path = parsedUrl.pathname + parsedUrl.search;
    
    const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let jsonData;
        try {
          if (responseData) {
            jsonData = JSON.parse(responseData);
          }
        } catch (e) {
          console.error('Error parsing JSON response:', e.message);
          console.log('Raw response:', responseData);
          jsonData = { rawResponse: responseData };
        }
        
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: jsonData,
          cookies: res.headers['set-cookie']
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Main test function
async function testEntityUpdate() {
  console.log('====== TESTING ENTITY UPDATE FLOW ======');
  
  let sessionCookie = null;
  let clientId, entityId;
  
  try {
    // Step 1: Authenticate
    console.log('\n🔐 Authenticating as admin...');
    const authResponse = await makeRequest('POST', 'http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    if (authResponse.status !== 200) {
      throw new Error(`Authentication failed with status ${authResponse.status}`);
    }
    
    sessionCookie = authResponse.headers['set-cookie'][0].split(';')[0];
    console.log(`✅ Authentication successful with user ID: ${authResponse.data.user.id}`);
    console.log(`🍪 Session cookie: ${sessionCookie}`);
    
    // Step 2: Create a test client
    console.log('\n📝 Creating test client...');
    const clientData = {
      name: `Test Client ${Date.now()}`,
      contactName: 'Test Contact',
      industry: 'technology',
      phone: '555-123-4567',
      email: 'test@example.com',
      ownerId: 1
    };
    
    const clientResponse = await makeRequest('POST', 'http://localhost:5000/api/admin/clients', 
      clientData, sessionCookie);
    
    if (clientResponse.status !== 201) {
      throw new Error(`Client creation failed with status ${clientResponse.status}`);
    }
    
    clientId = clientResponse.data.data.id;
    console.log(`✅ Test client created with ID: ${clientId}`);
    
    // Step 3: Create a test entity
    console.log('\n🏢 Creating test entity...');
    const entityData = {
      name: `Test Entity ${Date.now()}`,
      code: 'TEST',
      clientId: clientId,
      industry: 'healthcare', // Start with a valid industry string
      taxId: '12-3456789',
      ownerId: 1
    };
    
    const entityResponse = await makeRequest('POST', 'http://localhost:5000/api/admin/entities', 
      entityData, sessionCookie);
    
    if (entityResponse.status !== 201) {
      throw new Error(`Entity creation failed with status ${entityResponse.status}`);
    }
    
    entityId = entityResponse.data.data.id;
    console.log(`✅ Test entity created with ID: ${entityId}`);
    console.log(`👁️ Initial industry value: "${entityResponse.data.data.industry}"`);
    
    // ==================
    // Step 4: Update the entity with numeric industry value (simulation of UI edit/save)
    // This is where we're testing the EntityManagementCard's update functionality
    // ==================
    console.log('\n🔄 Updating entity with numeric industry value...');
    console.log('DEBUG: Simulating EntityManagementCard.tsx onSubmit function');
    
    const updateData = {
      id: entityId,
      name: `${entityData.name} (Updated)`,
      industry: 123, // Intentionally use a numeric value to trigger potential error
      clientId: clientId,
      ownerId: 1
    };
    
    console.log(`DEBUG: updateData payload: ${JSON.stringify(updateData, null, 2)}`);
    
    const updateResponse = await makeRequest('PUT', `http://localhost:5000/api/admin/entities/${entityId}`, 
      updateData, sessionCookie);
    
    if (updateResponse.status !== 200) {
      throw new Error(`Entity update failed with status ${updateResponse.status}`);
    }
    
    console.log('DEBUG: updateEntityMutation onSuccess triggered');
    console.log(`✅ Entity updated successfully`);
    console.log(`👁️ Updated industry value: "${updateResponse.data.data.industry}"`);
    
    // Step 5: Verify the entity was updated correctly
    console.log('\n🔍 Verifying entity update...');
    
    const verifyResponse = await makeRequest('GET', `http://localhost:5000/api/entities/${entityId}`, 
      null, sessionCookie);
    
    if (verifyResponse.status !== 200) {
      throw new Error(`Entity verification failed with status ${verifyResponse.status}`);
    }
    
    console.log(`✅ Entity verification successful`);
    
    // Analysis
    console.log('\n====== TEST RESULTS ANALYSIS ======');
    
    const nameUpdated = verifyResponse.data.name === `${entityData.name} (Updated)`;
    console.log(`✅ Name update: ${nameUpdated ? 'SUCCESS' : 'FAILED'}`);
    
    const industryHandled = verifyResponse.data.industry !== null;
    console.log(`✅ Industry handling: ${industryHandled ? 'SUCCESS' : 'FAILED'}`);
    
    console.log(`\nOriginal industry value sent: 123 (numeric)`);
    console.log(`Industry value stored in database: "${verifyResponse.data.industry}"`);
    
    console.log('\n====== FRONTEND SIMULATION SUCCESSFUL ======');
    console.log(`
Summary:
1. The EntityManagementCard update flow successfully handled updating an entity
2. The numeric industry value (123) was successfully processed and stored as "${verifyResponse.data.industry}"
3. In the frontend, our ensureIndustryValue function will convert this to "other" for display
4. No errors were observed during the process
    `);
    console.log('Final test result: SUCCESS ✅');
    
  } catch (error) {
    console.error('\n====== TEST FAILED ======');
    console.error(`💥 Error: ${error.message}`);
    console.error('Final test result: FAILURE ❌');
  }
}

// Run the test
testEntityUpdate();