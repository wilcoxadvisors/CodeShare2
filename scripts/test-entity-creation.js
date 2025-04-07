/**
 * Test Script for Entity Creation - ES Module Version
 * 
 * This script tests the entity creation process by:
 * 1. Creating a new client with explicit DEBUG mode
 * 2. Verifying entity was created
 * 3. Verifying CoA was seeded
 * 
 * Usage: node scripts/test-entity-creation.js
 */

import fetch from 'node-fetch';
const baseUrl = 'http://localhost:5000';

async function testEntityCreation() {
  try {
    console.log('===== ENTITY CREATION TEST =====');
    console.log('Creating a new test client with DEBUG_ENTITY_CREATION flag...');
    
    const testClientName = `TEST-EntityCreation-${Date.now()}`;
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
        active: true,
        DEBUG_ENTITY_CREATION: true // Special flag for debugging
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create client: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const client = await response.json();
    console.log(`Client created with ID ${client.id} and name "${client.name}"`);
    
    // Check for entities
    console.log(`Checking for entities for client ${client.id}...`);
    const entitiesResponse = await fetch(`${baseUrl}/api/test/entities-by-client/${client.id}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!entitiesResponse.ok) {
      const errorText = await entitiesResponse.text();
      throw new Error(`Failed to fetch entities: ${entitiesResponse.status} ${entitiesResponse.statusText}\n${errorText}`);
    }
    
    // Handle Vite HTML response interception
    const entitiesResponseText = await entitiesResponse.text();
    let entitiesData;
    
    if (entitiesResponseText.trim().startsWith('<!DOCTYPE html>')) {
      console.log('⚠️ WARNING: Received HTML response instead of JSON. This likely means the API route is being intercepted by Vite.');
      console.log('Unable to determine entities count accurately.');
      entitiesData = { data: { entities: [] } };
    } else {
      try {
        entitiesData = JSON.parse(entitiesResponseText);
      } catch (e) {
        console.error('Failed to parse entities response as JSON:', entitiesResponseText.substring(0, 200) + '...');
        entitiesData = { data: { entities: [] } };
      }
    }
    console.log(`Found ${entitiesData.data.entities.length} entities for client ${client.id}`);
    
    if (entitiesData.data.entities.length === 0) {
      console.error('❌ No entities were created for the client');
    } else {
      console.log('✓ Entity creation was successful:');
      entitiesData.data.entities.forEach(entity => {
        console.log(`  - Entity ID: ${entity.id}, Name: ${entity.name}`);
      });
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
    const responseText = await accountsResponse.text();
    let accountsData;
    
    if (responseText.trim().startsWith('<!DOCTYPE html>')) {
      console.log('⚠️ WARNING: Received HTML response instead of JSON. This likely means the API route is being intercepted by Vite.');
      console.log('Unable to determine account count accurately.');
      accountsData = { data: { accountCount: 0 } };
    } else {
      try {
        accountsData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText.substring(0, 200) + '...');
        accountsData = { data: { accountCount: 0 } };
      }
    }
    console.log(`Found ${accountsData.data.accountCount} accounts for client ${client.id}`);
    
    if (accountsData.data.accountCount === 0) {
      console.error('❌ No Chart of Accounts was seeded for the client');
    } else {
      console.log('✓ Chart of Accounts seeding was successful');
    }
    
    console.log('===== TEST COMPLETED =====');
  } catch (error) {
    console.error('ERROR DURING TEST:', error);
  }
}

// Run the test
testEntityCreation();