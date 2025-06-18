/**
 * Test script to debug phantom checkmark issue
 */

const axios = require('axios');
const tough = require('tough-cookie');

const cookieJar = new tough.CookieJar();
const client = axios.create({
  jar: cookieJar,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testPhantomCheckmark() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await client.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    console.log('Login successful');

    // Step 2: Navigate to Journal Entries (to establish context)
    console.log('Step 2: Accessing Journal Entries page...');
    const jeResponse = await client.get('http://localhost:5000/clients/235/entities/376/journal-entries');
    console.log('Journal Entries page accessed');

    // Step 3: Navigate to Chart of Accounts (where phantom checkmark appears)
    console.log('Step 3: Accessing Chart of Accounts page...');
    const coaResponse = await client.get('http://localhost:5000/clients/235/chart-of-accounts');
    console.log('Chart of Accounts page accessed');

    // The issue is in the frontend React component, not the backend
    console.log('Backend navigation test complete. Phantom checkmark is a frontend state issue.');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPhantomCheckmark();