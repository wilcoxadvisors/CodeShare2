/**
 * Simple runner for Chart of Accounts seeding test
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log("Starting CoA seeding verification test...");

(async () => {
  try {
    // Wait for server to be fully running (5 seconds)
    console.log("Waiting for server to be ready...");
    await setTimeout(5000);
    
    // Run the test
    console.log("Running test script...");
    const test = spawn('node', ['tests/test-coa-seeding.mjs'], {
      stdio: 'inherit'
    });
    
    // Handle test completion
    test.on('close', (code) => {
      if (code === 0) {
        console.log("\n✅ CoA Seeding Verification PASSED");
      } else {
        console.log("\n❌ CoA Seeding Verification FAILED");
      }
      process.exit(code);
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
})();