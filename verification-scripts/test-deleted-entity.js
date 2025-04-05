const axios = require('axios');

const API_URL = 'http://localhost:5000/api/verification';
const ENTITY_ID = 319;  // Use the ID of the entity that we just soft-deleted

async function testEntityRetrieval() {
  console.log(`Testing entity retrieval for ID: ${ENTITY_ID}`);
  
  try {
    // First try without includeDeleted
    console.log('Testing without includeDeleted parameter:');
    try {
      const response = await axios.get(`${API_URL}/entities/${ENTITY_ID}`);
      console.log(`Success! Status: ${response.status}`);
      console.log('Entity data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`Failed. Status: ${error.response?.status}`);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // Then try with includeDeleted=true
    console.log('\nTesting with includeDeleted=true:');
    try {
      const response = await axios.get(`${API_URL}/entities/${ENTITY_ID}?includeDeleted=true`);
      console.log(`Success! Status: ${response.status}`);
      console.log('Entity data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`Failed. Status: ${error.response?.status}`);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('Unhandled error:', error.message);
  }
}

testEntityRetrieval();