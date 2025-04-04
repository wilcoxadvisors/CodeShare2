/**
 * Runner for comprehensive verification script
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting verification process...');

try {
  // Create verification-logs directory if it doesn't exist
  if (!fs.existsSync('verification-logs')) {
    fs.mkdirSync('verification-logs', { recursive: true });
  }
  
  // Run the verification script
  console.log('Running comprehensive verification script...');
  execSync('node verification-scripts/comprehensive-verification-p2-p3.js', { stdio: 'inherit' });
  
  console.log('Verification completed successfully.');
} catch (error) {
  console.error(`Verification process failed: ${error.message}`);
  process.exit(1);
}