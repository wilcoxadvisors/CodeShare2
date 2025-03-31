// Test script for testing the location filtering by active status
import fetch from 'node-fetch';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const CLIENT_ID = 1; // Assuming client ID 1 exists (the admin's client)

// Helper function to format output
const formatResult = (result) => {
  return JSON.stringify(result, null, 2);
};

// Test fetching locations
const testLocationFiltering = async () => {
  console.log(chalk.blue('\n=== Testing Location Filtering ==='));
  try {
    // Login first to get authenticated
    console.log(chalk.yellow('Logging in as admin...'));
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      }),
      redirect: 'manual'
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // Get cookies from login response for session
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Create a new test location that is active
    console.log(chalk.yellow('\nCreating an active test location...'));
    const activeLocationResponse = await fetch(`${API_BASE_URL}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        name: 'Test Active Location',
        code: 'TAL',
        description: 'This is a test active location',
        isActive: true
      })
    });
    
    if (!activeLocationResponse.ok) {
      const errorText = await activeLocationResponse.text();
      throw new Error(`Failed to create active location: ${errorText}`);
    }
    
    const activeLocation = await activeLocationResponse.json();
    console.log(chalk.green('Created active location:'));
    console.log(formatResult(activeLocation));
    
    // Create a new test location that is inactive
    console.log(chalk.yellow('\nCreating an inactive test location...'));
    const inactiveLocationResponse = await fetch(`${API_BASE_URL}/api/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        name: 'Test Inactive Location',
        code: 'TIL',
        description: 'This is a test inactive location',
        isActive: false
      })
    });
    
    if (!inactiveLocationResponse.ok) {
      const errorText = await inactiveLocationResponse.text();
      throw new Error(`Failed to create inactive location: ${errorText}`);
    }
    
    const inactiveLocation = await inactiveLocationResponse.json();
    console.log(chalk.green('Created inactive location:'));
    console.log(formatResult(inactiveLocation));
    
    // Test listing locations - should only include active locations
    console.log(chalk.yellow('\nFetching locations for client...'));
    const locationsResponse = await fetch(`${API_BASE_URL}/api/clients/${CLIENT_ID}/locations`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!locationsResponse.ok) {
      const errorText = await locationsResponse.text();
      throw new Error(`Failed to fetch locations: ${errorText}`);
    }
    
    const locations = await locationsResponse.json();
    console.log(chalk.green('Received locations:'));
    console.log(formatResult(locations));
    
    // Verify that only active locations are returned
    const containsActiveLocation = locations.some(loc => loc.id === activeLocation.id);
    const containsInactiveLocation = locations.some(loc => loc.id === inactiveLocation.id);
    
    console.log(chalk.blue('\n=== Test Results ==='));
    console.log(`Active location included: ${chalk.green(containsActiveLocation ? 'YES' : 'NO')}`);
    console.log(`Inactive location excluded: ${chalk.green(!containsInactiveLocation ? 'YES' : 'NO')}`);
    
    if (containsActiveLocation && !containsInactiveLocation) {
      console.log(chalk.green('\n✅ TEST PASSED: Only active locations are returned by listLocationsByClient'));
    } else {
      console.log(chalk.red('\n❌ TEST FAILED: Location filtering is not working as expected'));
      
      if (!containsActiveLocation) {
        console.log(chalk.red('  - Active location was not returned'));
      }
      
      if (containsInactiveLocation) {
        console.log(chalk.red('  - Inactive location was incorrectly returned'));
      }
    }
    
    // Clean up - deactivate the test location we created
    console.log(chalk.yellow('\nCleaning up test locations...'));
    
    // Delete the active location (actually deactivates it)
    const deleteActiveResponse = await fetch(`${API_BASE_URL}/api/locations/${activeLocation.id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!deleteActiveResponse.ok) {
      console.log(chalk.yellow(`Warning: Could not clean up active test location: ${await deleteActiveResponse.text()}`));
    } else {
      console.log(chalk.green(`Deactivated test location with ID ${activeLocation.id}`));
    }
    
    // The inactive location is already inactive, no need to delete/deactivate it again
    
  } catch (error) {
    console.error(chalk.red(`Error during test: ${error.message}`));
    process.exit(1);
  }
};

// Run the test
testLocationFiltering();