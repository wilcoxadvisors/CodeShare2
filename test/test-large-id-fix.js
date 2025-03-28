/**
 * Test Script for Large Entity ID Fix
 * 
 * This test verifies that our fix for handling large temporary entity IDs works correctly.
 * It tests both the admin and regular entity update endpoints with a large ID 
 * (similar to those created during the setup flow).
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

// Utility function to log with timestamp
function log(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(data);
  }
}

// Main test function
async function testLargeIdFix() {
  log(chalk.blue('====================================='));
  log(chalk.blue('TESTING LARGE ENTITY ID FIX'));
  log(chalk.blue('====================================='));
  
  // Create a large ID similar to what the frontend creates during setup
  const largeId = Date.now(); // e.g., 1743129733460
  log(`Using large ID: ${largeId}`);
  
  // First authenticate to get a session
  log(chalk.yellow('\nAuthenticating as admin...'));
  let sessionCookie = '';
  try {
    const authResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123'
      })
    });
    
    // Extract session cookie
    const setCookieHeader = authResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
      log(`Got session cookie: ${sessionCookie}`);
    } else {
      log(chalk.red('No session cookie returned from authentication'));
    }
  } catch (error) {
    log(chalk.red('Error during authentication:'), error.message);
  }
  
  // Test updating entity with large ID via admin API
  log(chalk.yellow('\nTesting admin API update with large ID...'));
  try {
    const adminResponse = await fetch(`http://localhost:5000/api/admin/entities/${largeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: 'Test Entity',
        code: 'TEST',
        industry: 'technology'
      })
    });
    
    log(`Admin API status: ${adminResponse.status}`);
    const adminData = await adminResponse.json();
    log('Admin API response:', adminData);
    
    if (adminResponse.status === 400 && adminData.message && adminData.message.includes('temporary')) {
      log(chalk.green('✓ Admin API correctly identified large ID as temporary and returned proper error message'));
    } else {
      log(chalk.red('✗ Admin API did not handle large ID as expected'));
    }
  } catch (error) {
    log(chalk.red('Error testing admin API:'), error.message);
  }
  
  // Test updating entity with large ID via regular API
  log(chalk.yellow('\nTesting regular API update with large ID...'));
  try {
    const regularResponse = await fetch(`http://localhost:5000/api/entities/${largeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        name: 'Test Entity',
        code: 'TEST',
        industry: 'technology'
      })
    });
    
    log(`Regular API status: ${regularResponse.status}`);
    const regularData = await regularResponse.json();
    log('Regular API response:', regularData);
    
    if (regularResponse.status === 400 && regularData.message && regularData.message.includes('temporary')) {
      log(chalk.green('✓ Regular API correctly identified large ID as temporary and returned proper error message'));
    } else {
      log(chalk.red('✗ Regular API did not handle large ID as expected'));
    }
  } catch (error) {
    log(chalk.red('Error testing regular API:'), error.message);
  }
  
  log(chalk.blue('\n====================================='));
  log(chalk.blue('TEST COMPLETED'));
  log(chalk.blue('====================================='));
}

// Run the test
testLargeIdFix();