/**
 * Script to test the entity-specific journal entry API endpoints
 * 
 * This script will make direct API calls to test the endpoints
 * rather than trying to use the server code directly
 */

// First we'll check that the server is running
const https = require('https');
const http = require('http');
const { exec } = require('child_process');

// URL for local server
const BASE_URL = 'http://localhost:5000';

// Function to make HTTP requests with Cookie support
function makeRequest(path, method = 'GET', data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    // Determine if URL is HTTP or HTTPS
    const client = BASE_URL.startsWith('https') ? https : http;
    const url = new URL(path, BASE_URL);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse JSON response
          const contentType = res.headers['content-type'] || '';
          const data = contentType.includes('application/json') 
            ? JSON.parse(responseData)
            : responseData;
          
          // Return both data and cookies
          resolve({
            statusCode: res.statusCode,
            data,
            cookies: res.headers['set-cookie']
          });
        } catch (error) {
          console.log('Error parsing response:', error);
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            cookies: res.headers['set-cookie']
          });
        }
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

// Function to get authentication cookie
async function login() {
  console.log('Logging in to get authenticated session...');
  
  const loginData = {
    username: 'admin',
    password: 'adminadmin'
  };
  
  const response = await makeRequest('/api/auth/login', 'POST', loginData);
  
  if (response.statusCode === 200) {
    console.log('Login successful');
    return response.cookies ? response.cookies[0].split(';')[0] : '';
  } else {
    console.error('Login failed with status code:', response.statusCode);
    console.error('Response:', response.data);
    return '';
  }
}

// Main test function
async function testEntityJournalEndpoints() {
  try {
    console.log(`Testing entity-specific journal entry endpoints at ${BASE_URL}`);
    
    // Step 1: Login to get authentication
    const authCookie = await login();
    
    if (!authCookie) {
      console.error('Failed to authenticate, cannot continue tests');
      return;
    }
    
    // Step 2: Get list of entities
    console.log('\nFetching entities...');
    const entitiesResponse = await makeRequest('/api/entities', 'GET', null, authCookie);
    
    if (entitiesResponse.statusCode !== 200) {
      console.error('Failed to get entities:', entitiesResponse.statusCode);
      return;
    }
    
    const entities = entitiesResponse.data;
    console.log(`Found ${entities.length} entities`);
    
    if (entities.length === 0) {
      console.error('No entities found, cannot test entity-specific endpoints');
      return;
    }
    
    // Select the first entity for testing
    const testEntity = entities[0];
    console.log(`Testing with entity: ${testEntity.name} (ID: ${testEntity.id})`);
    
    // Step 3: Test GET /api/entities/:entityId/journal-entries
    console.log('\nTesting GET /api/entities/:entityId/journal-entries');
    const journalEntriesResponse = await makeRequest(
      `/api/entities/${testEntity.id}/journal-entries`, 
      'GET', 
      null, 
      authCookie
    );
    
    console.log(`Status Code: ${journalEntriesResponse.statusCode}`);
    
    if (journalEntriesResponse.statusCode === 200) {
      const entries = journalEntriesResponse.data;
      console.log(`Found ${entries.length} journal entries`);
      
      if (entries.length > 0) {
        console.log('First entry:', {
          id: entries[0].id,
          referenceNumber: entries[0].referenceNumber,
          description: entries[0].description,
          status: entries[0].status
        });
      }
    } else {
      console.error('Failed to get journal entries:', journalEntriesResponse.data);
    }
    
    // Step 4: Test POST /api/entities/:entityId/journal-entries
    console.log('\nTesting POST /api/entities/:entityId/journal-entries');
    const newJournalData = {
      clientId: testEntity.clientId,
      date: new Date().toISOString().split('T')[0],
      referenceNumber: `TEST-${Date.now().toString().substring(8)}`,
      description: 'Test journal entry from API endpoint test',
      status: 'draft',
      lines: [
        {
          type: 'debit',
          accountId: 1001, // This would need to be a valid account ID
          amount: '100.00',
          description: 'Test debit line'
        },
        {
          type: 'credit',
          accountId: 1002, // This would need to be a valid account ID
          amount: '100.00',
          description: 'Test credit line'
        }
      ]
    };
    
    const createResponse = await makeRequest(
      `/api/entities/${testEntity.id}/journal-entries`, 
      'POST', 
      newJournalData, 
      authCookie
    );
    
    console.log(`Create Status Code: ${createResponse.statusCode}`);
    
    if (createResponse.statusCode === 201) {
      const newEntry = createResponse.data;
      console.log('Created journal entry:', {
        id: newEntry.id,
        referenceNumber: newEntry.referenceNumber,
        description: newEntry.description,
        status: newEntry.status
      });
      
      // Step 5: Test PUT /api/entities/:entityId/journal-entries/:id
      console.log('\nTesting PUT /api/entities/:entityId/journal-entries/:id');
      const updateData = {
        description: `${newEntry.description} (Updated)`,
        referenceNumber: `${newEntry.referenceNumber}-U`
      };
      
      const updateResponse = await makeRequest(
        `/api/entities/${testEntity.id}/journal-entries/${newEntry.id}`, 
        'PUT', 
        updateData, 
        authCookie
      );
      
      console.log(`Update Status Code: ${updateResponse.statusCode}`);
      
      if (updateResponse.statusCode === 200) {
        const updatedEntry = updateResponse.data;
        console.log('Updated journal entry:', {
          id: updatedEntry.id,
          referenceNumber: updatedEntry.referenceNumber,
          description: updatedEntry.description,
          status: updatedEntry.status
        });
      } else {
        console.error('Failed to update journal entry:', updateResponse.data);
      }
      
      // Step 6: Test DELETE /api/entities/:entityId/journal-entries/:id
      console.log('\nTesting DELETE /api/entities/:entityId/journal-entries/:id');
      const deleteResponse = await makeRequest(
        `/api/entities/${testEntity.id}/journal-entries/${newEntry.id}`, 
        'DELETE', 
        null, 
        authCookie
      );
      
      console.log(`Delete Status Code: ${deleteResponse.statusCode}`);
      
      if (deleteResponse.statusCode === 204 || deleteResponse.statusCode === 200) {
        console.log('Successfully deleted journal entry');
      } else {
        console.error('Failed to delete journal entry:', deleteResponse.data);
      }
    } else {
      console.error('Failed to create journal entry:', createResponse.data);
    }
    
    console.log('\nAPI Testing Complete!');
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Execute the tests
testEntityJournalEndpoints();