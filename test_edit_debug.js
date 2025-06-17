import axios from 'axios';

async function testEditOperation() {
  console.log('Testing specific edit operation...');
  
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    }, { withCredentials: true });
    
    const cookies = loginResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';
    
    // Create test entry
    const createData = {
      date: '2025-06-17',
      description: 'Test Entry for Edit',
      lines: [
        { type: 'debit', accountId: 7072, amount: '100.00', description: 'Test debit' },
        { type: 'credit', accountId: 7073, amount: '100.00', description: 'Test credit' }
      ]
    };
    
    const createResponse = await axios.post(
      'http://localhost:5000/api/clients/235/entities/376/journal-entries',
      createData,
      { headers: { Cookie: cookieString } }
    );
    
    const entryId = createResponse.data.id;
    console.log('Created entry ID:', entryId);
    
    // Try to edit it
    const editData = {
      description: 'UPDATED: Test Entry for Edit',
      lines: [
        { type: 'debit', accountId: 7072, amount: '200.00', description: 'Updated debit' },
        { type: 'credit', accountId: 7073, amount: '200.00', description: 'Updated credit' }
      ]
    };
    
    const editResponse = await axios.patch(
      `http://localhost:5000/api/clients/235/entities/376/journal-entries/${entryId}`,
      editData,
      { headers: { Cookie: cookieString } }
    );
    console.log('Edit successful:', editResponse.status);
    
  } catch (error) {
    console.log('Edit failed with status:', error.response?.status);
    console.log('Error message:', error.response?.data?.message);
    console.log('Full error:', error.response?.data);
  }
}

testEditOperation().catch(console.error);