/**
 * Simple script to run Jest tests since we can't modify package.json directly
 */

import { exec } from 'child_process';

// Run jest command
exec('npx jest', (error, stdout, stderr) => {
  console.log(stdout);
  if (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
  }
});