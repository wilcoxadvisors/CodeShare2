/**
 * Script to run the client Chart of Accounts seeding verification
 * This script sets up and runs the verification test
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create directory for verification logs if it doesn't exist
const logDir = path.join(__dirname, '..', 'verification-logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

console.log('Starting Client CoA Seeding verification test...');

try {
  // Run the verification script
  const output = execSync('node verification-scripts/verify-client-coa-seeding.js', { 
    stdio: 'inherit'
  });
  
  console.log('Verification test completed successfully.');
  process.exit(0);
} catch (error) {
  console.error('Verification test failed with error:', error.message);
  process.exit(1);
}