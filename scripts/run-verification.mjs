/**
 * Script to run the client Chart of Accounts seeding verification
 * This script sets up and runs the verification test
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directory for verification logs if it doesn't exist
const logDir = path.join(__dirname, '..', 'verification-logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

console.log('Starting Client CoA Seeding verification test...');

try {
  // Run the verification script
  const output = execSync('node verification-scripts/verify-client-coa-seeding.mjs', { 
    stdio: 'inherit'
  });
  
  console.log('Verification test completed successfully.');
  process.exit(0);
} catch (error) {
  console.error('Verification test failed with error:', error.message);
  process.exit(1);
}