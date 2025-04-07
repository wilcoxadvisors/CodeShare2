/**
 * Complete runner for Chart of Accounts seeding verification
 * 
 * This script:
 * 1. Creates test clients through both endpoints
 * 2. Directly checks the database for proper CoA seeding
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log("Starting CoA Seeding verification process...");

// Run a command and return a promise
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Main process
async function runVerification() {
  try {
    // Step 1: Wait for server to be ready
    console.log("Waiting for server to be ready...");
    await setTimeout(3000);
    
    // Step 2: Create test clients
    console.log("\n=== CREATING TEST CLIENTS ===");
    await runCommand('node', ['tests/create-test-clients.mjs']);
    
    // Step 3: Run direct database verification
    console.log("\n=== RUNNING DATABASE VERIFICATION ===");
    await runCommand('node', ['tests/direct-db-test.mjs']);
    
    // Success
    console.log("\n✅ VERIFICATION PROCESS COMPLETED SUCCESSFULLY");
    return true;
  } catch (error) {
    console.error(`\n❌ VERIFICATION PROCESS FAILED: ${error.message}`);
    return false;
  }
}

// Run the verification
runVerification()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });