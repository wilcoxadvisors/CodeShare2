/**
 * Test Script for Admin Seed CoA Endpoint 
 * 
 * This script tests the admin seeding endpoint that we know works:
 * 1. Creates a test client 
 * 2. Calls the admin seed-coa-special endpoint (unauthenticated)
 * 3. Checks if CoA was properly seeded
 * 
 * Usage: node scripts/test-admin-seed-coa.js
 */

import fetch from 'node-fetch';
const baseUrl = 'http://localhost:5000';

async function testAdminSeedCoA() {
  try {
    console.log('===== ADMIN SEED COA TEST =====');
    console.log('Creating a new test client...');
    
    const testClientName = `TEST-AdminSeedCoA-${Date.now()}`;
    const response = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: testClientName,
        userId: 1, // Assuming user ID 1 exists
        code: `TEST${Date.now()}`,
        industry: 'Technology',
        active: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create client: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    // Parse the response as text first to handle HTML responses
    const responseText = await response.text();
    let client;
    
    try {
      client = JSON.parse(responseText);
      console.log(`Client created with ID ${client.id} and name "${client.name}"`);
    } catch (e) {
      console.error('Failed to parse client creation response as JSON. Response begins with:', 
        responseText.substring(0, 200) + '...');
      throw new Error('Client creation failed or returned invalid JSON');
    }
    
    // Now explicitly call the admin seed-coa-special endpoint
    console.log(`Calling admin seed-coa-special endpoint for client ${client.id}...`);
    const seedResponse = await fetch(`${baseUrl}/api/admin/clients/${client.id}/seed-coa-special`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!seedResponse.ok) {
      const errorText = await seedResponse.text();
      console.error(`Seed CoA API returned error: ${seedResponse.status} ${seedResponse.statusText}`);
      console.error(`Response body: ${errorText.substring(0, 500)}...`);
      throw new Error(`Failed to seed CoA: ${seedResponse.status} ${seedResponse.statusText}`);
    }
    
    // Try to parse the seed response
    const seedResponseText = await seedResponse.text();
    let seedResult;
    
    try {
      seedResult = JSON.parse(seedResponseText);
      console.log('Seed CoA result:', seedResult);
    } catch (e) {
      console.error('Seed CoA response is not valid JSON. Response begins with:', 
        seedResponseText.substring(0, 200) + '...');
    }
    
    // Check for accounts
    console.log(`Checking for accounts for client ${client.id}...`);
    const accountsResponse = await fetch(`${baseUrl}/api/test/accounts-by-client/${client.id}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      throw new Error(`Failed to fetch accounts: ${accountsResponse.status} ${accountsResponse.statusText}\n${errorText}`);
    }
    
    // Handle Vite HTML response interception
    const accountsResponseText = await accountsResponse.text();
    let accountsData;
    
    if (accountsResponseText.trim().startsWith('<!DOCTYPE html>')) {
      console.log('⚠️ WARNING: Received HTML response instead of JSON. This likely means the API route is being intercepted by Vite.');
      console.log('Unable to determine account count accurately.');
      accountsData = { data: { accountCount: 0 } };
    } else {
      try {
        accountsData = JSON.parse(accountsResponseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', accountsResponseText.substring(0, 200) + '...');
        accountsData = { data: { accountCount: 0 } };
      }
    }
    
    console.log(`Found ${accountsData.data.accountCount} accounts for client ${client.id}`);
    
    if (accountsData.data.accountCount === 0) {
      console.error('❌ No Chart of Accounts was seeded for the client, even with admin endpoint');
    } else {
      console.log('✓ Chart of Accounts seeding was successful through admin endpoint');
    }
    
    console.log('===== TEST COMPLETED =====');
  } catch (error) {
    console.error('ERROR DURING TEST:', error);
  }
}

// Run the test
testAdminSeedCoA();