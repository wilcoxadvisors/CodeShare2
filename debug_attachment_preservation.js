import axios from 'axios';
import FormData from 'form-data';

async function debugAttachmentIssue() {
  console.log('=== DEBUGGING ATTACHMENT PRESERVATION ===');
  
  // Login
  const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'admin',
    password: 'password123'
  }, { withCredentials: true });
  
  const cookies = loginResponse.headers['set-cookie'];
  const cookieString = cookies ? cookies.join('; ') : '';
  
  // Create entry with attachment
  const createData = {
    date: '2025-06-17',
    description: 'Debug Test Entry',
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
  
  // Upload attachment
  const formData = new FormData();
  formData.append('file', 'Test content', { filename: 'test.txt' });
  
  const uploadResponse = await axios.post(
    `http://localhost:5000/api/clients/235/entities/376/journal-entries/${entryId}/files`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Cookie: cookieString
      }
    }
  );
  
  console.log('Uploaded attachment ID:', uploadResponse.data.id);
  
  // Check attachments before edit
  const beforeEdit = await axios.get(
    `http://localhost:5000/api/clients/235/entities/376/journal-entries/${entryId}/files`,
    { headers: { Cookie: cookieString } }
  );
  console.log('Attachments before edit:', beforeEdit.data.length);
  
  // Edit entry (without files array)
  const editData = {
    description: 'UPDATED: Debug Test Entry',
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
  
  console.log('Edit response status:', editResponse.status);
  
  // Check attachments after edit
  const afterEdit = await axios.get(
    `http://localhost:5000/api/clients/235/entities/376/journal-entries/${entryId}/files`,
    { headers: { Cookie: cookieString } }
  );
  console.log('Attachments after edit:', afterEdit.data.length);
  
  console.log('=== ATTACHMENT PRESERVATION RESULT ===');
  console.log('Before:', beforeEdit.data.length, 'After:', afterEdit.data.length);
  console.log('Preserved:', beforeEdit.data.length === afterEdit.data.length);
}

debugAttachmentIssue().catch(console.error);