// Load environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to find a .env file, first in the root directory, then in the parent directory
const envPaths = [
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../../.env'),
];

// Load the first .env file found
for (const path of envPaths) {
  if (fs.existsSync(path)) {
    dotenv.config({ path });
    console.log(`Loaded environment variables from ${path}`);
    break;
  }
}

// If no .env file is found, that's okay - we'll use the environment variables already set