/**
 * Test Script for Entity Creation and Chart of Accounts Seeding
 * 
 * This script:
 * 1. Creates a test client
 * 2. Verifies that an entity was automatically created with the client
 * 3. Verifies that the Chart of Accounts was properly seeded
 * 
 * Usage: node scripts/test-entity-coa-fix.js
 */

import fetch from 'node-fetch';
const baseUrl = 'http://localhost:5000';

// Run the test as an async function
async function runTest() {
  try {
    console.log('Starting entity creation and CoA seeding test');
    
    // Step 1: Create a test client
    const testClientName = `Test Entity Creation Client ${Date.now()}`;
    console.log(`Creating test client: ${testClientName}`);
    
    const clientResponse = await fetch(`${baseUrl}/api/clients`, {
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
    
    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      throw new Error(`Failed to create client: ${clientResponse.status} ${clientResponse.statusText}\n${errorText}`);
    }
    
    const client = await clientResponse.json();
    console.log(`✅ Test client created successfully with ID ${client.id}`);
    
    // Step 2: Check if an entity was automatically created
    const entitiesResponse = await fetch(`${baseUrl}/api/test/entities-by-client/${client.id}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!entitiesResponse.ok) {
      const errorText = await entitiesResponse.text();
      throw new Error(`Failed to fetch entities: ${entitiesResponse.status} ${entitiesResponse.statusText}\n${errorText}`);
    }
    
    const entitiesData = await entitiesResponse.json();
    console.log(`Found ${entitiesData.data.entities.length} entities for client ${client.id}`);
    
    if (entitiesData.data.entities.length === 0) {
      console.log('❌ No entities were automatically created for the client');
      
      // Attempt to create an entity using our special admin route
      console.log('Attempting to create entity and seed CoA using the special admin route...');
      const seedResponse = await fetch(`${baseUrl}/api/admin/clients/${client.id}/seed-coa-special`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Handle special case - Vite might be intercepting the API route and returning HTML
      // Try to determine if response is HTML or JSON
      const responseText = await seedResponse.text();
      if (responseText.trim().startsWith('<!DOCTYPE html>')) {
        console.log('⚠️ WARNING: Received HTML response instead of JSON. This likely means the API route is being intercepted by Vite.');
        console.log('Continuing with the test to check if the operation succeeded despite the incorrect response format...');
      } else {
        try {
          // Try to parse as JSON
          const seedResult = JSON.parse(responseText);
          console.log('Seed CoA response:', seedResult);
        } catch (e) {
          console.log('Response could not be parsed as JSON:', responseText.substring(0, 200) + '...');
        }
      }
      
      // Check again for entities after attempted fix
      const entitiesAfterFixResponse = await fetch(`${baseUrl}/api/test/entities-by-client/${client.id}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!entitiesAfterFixResponse.ok) {
        const errorText = await entitiesAfterFixResponse.text();
        throw new Error(`Failed to fetch entities after fix: ${entitiesAfterFixResponse.status} ${entitiesAfterFixResponse.statusText}\n${errorText}`);
      }
      
      const entitiesAfterFixData = await entitiesAfterFixResponse.json();
      console.log(`Found ${entitiesAfterFixData.data.entities.length} entities for client ${client.id} after fix attempt`);
      
      if (entitiesAfterFixData.data.entities.length > 0) {
        console.log('✅ Successfully created entity using the special admin route');
        entitiesAfterFixData.data.entities.forEach(entity => {
          console.log(`   - Entity ID: ${entity.id}, Name: ${entity.name}`);
        });
      } else {
        console.log('❌ Still no entities found after fix attempt');
      }
    } else {
      console.log('✅ Entities were automatically created for the client:');
      entitiesData.data.entities.forEach(entity => {
        console.log(`   - Entity ID: ${entity.id}, Name: ${entity.name}`);
      });
    }
    
    // Step 3: Check if Chart of Accounts was seeded
    console.log(`Checking for accounts for client ${client.id}...`);
    const accountsResponse = await fetch(`${baseUrl}/api/test/accounts-by-client/${client.id}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error(`Failed to fetch accounts: ${accountsResponse.status} ${accountsResponse.statusText}\n${errorText}`);
    } else {
      const accountsData = await accountsResponse.json();
      console.log(`Found ${accountsData.data.accountCount} accounts for client ${client.id}`);
      
      if (accountsData.data.accountCount === 0) {
        console.log('❌ No Chart of Accounts was seeded for the client');
        
        // Attempt to seed CoA using our special admin route
        console.log('Attempting to seed CoA using the special admin route...');
        const seedResponse = await fetch(`${baseUrl}/api/admin/clients/${client.id}/seed-coa-special`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        // Handle special case - Vite might be intercepting the API route and returning HTML
        const responseText = await seedResponse.text();
        if (responseText.trim().startsWith('<!DOCTYPE html>')) {
          console.log('⚠️ WARNING: Received HTML response instead of JSON. This likely means the API route is being intercepted by Vite.');
          console.log('Continuing with the test to check if the operation succeeded despite the incorrect response format...');
        } else {
          try {
            // Try to parse as JSON
            const seedResult = JSON.parse(responseText);
            console.log('Seed CoA response:', seedResult);
          } catch (e) {
            console.log('Response could not be parsed as JSON:', responseText.substring(0, 200) + '...');
          }
        }
        
        // Check again for accounts after attempted fix
        const accountsAfterFixResponse = await fetch(`${baseUrl}/api/test/accounts-by-client/${client.id}`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!accountsAfterFixResponse.ok) {
          const errorText = await accountsAfterFixResponse.text();
          console.error(`Failed to fetch accounts after fix: ${accountsAfterFixResponse.status} ${accountsAfterFixResponse.statusText}\n${errorText}`);
        } else {
          const accountsAfterFixData = await accountsAfterFixResponse.json();
          console.log(`Found ${accountsAfterFixData.data.accountCount} accounts for client ${client.id} after fix attempt`);
          
          if (accountsAfterFixData.data.accountCount > 0) {
            console.log('✅ Successfully seeded Chart of Accounts using the special admin route');
          } else {
            console.log('❌ Still no accounts found after fix attempt');
          }
        }
      } else {
        console.log('✅ Chart of Accounts was automatically seeded for the client');
      }
    }
    
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest().then(() => {
  console.log('Test script execution completed');
}).catch(err => {
  console.error('Unhandled error in test script:', err);
});