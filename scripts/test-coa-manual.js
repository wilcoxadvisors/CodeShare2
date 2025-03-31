#!/usr/bin/env node

/**
 * Manual Chart of Accounts Import/Export Test Script
 * 
 * Usage: 
 *   node scripts/test-coa-manual.js import [CLIENT_ID] [FILE_PATH] [--verbose]
 *   node scripts/test-coa-manual.js export [CLIENT_ID] [OUTPUT_PATH] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3000/api';
const VERBOSE = process.argv.includes('--verbose');

// Extract session cookies from the stored cookie file
let cookies = '';
try {
  cookies = fs.readFileSync('./cookies.txt', 'utf8').trim();
} catch (error) {
  console.error('No cookies.txt file found. Please login first and save cookies.');
  process.exit(1);
}

async function importCoa(clientId, filePath) {
  console.log(`Importing Chart of Accounts for Client ID: ${clientId} from file: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  try {
    const response = await fetch(`${API_BASE}/clients/${clientId}/accounts/import`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: formData
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('\nImport successful:');
      console.log(`Total accounts processed: ${responseData.count}`);
      console.log(`Added: ${responseData.added}`);
      console.log(`Updated: ${responseData.updated}`);
      console.log(`Unchanged: ${responseData.unchanged}`);
      console.log(`Skipped: ${responseData.skipped}`);
      console.log(`Inactive: ${responseData.inactive}`);
      
      if (responseData.warnings && responseData.warnings.length > 0) {
        console.log('\nWarnings:');
        responseData.warnings.forEach(warning => console.log(`- ${warning}`));
      }
      
      if (responseData.errors && responseData.errors.length > 0) {
        console.log('\nErrors:');
        responseData.errors.forEach(error => console.log(`- ${error}`));
      }
    } else {
      console.error('Import failed:', responseData.message || responseData.error);
    }
  } catch (error) {
    console.error('Error during import:', error.message);
  }
}

async function exportCoa(clientId, outputPath) {
  console.log(`Exporting Chart of Accounts for Client ID: ${clientId} to file: ${outputPath}`);
  
  try {
    const response = await fetch(`${API_BASE}/clients/${clientId}/accounts/export`, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    if (response.ok) {
      const csvData = await response.text();
      fs.writeFileSync(outputPath, csvData);
      console.log(`Export successful. Saved to ${outputPath}`);
    } else {
      const responseData = await response.json();
      console.error('Export failed:', responseData.message || responseData.error);
    }
  } catch (error) {
    console.error('Error during export:', error.message);
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  const clientId = process.argv[3];
  const filePath = process.argv[4];
  
  if (!command || !clientId) {
    console.error('Missing required arguments.');
    console.log('Usage:');
    console.log('  node scripts/test-coa-manual.js import [CLIENT_ID] [FILE_PATH] [--verbose]');
    console.log('  node scripts/test-coa-manual.js export [CLIENT_ID] [OUTPUT_PATH] [--verbose]');
    process.exit(1);
  }
  
  if (VERBOSE) {
    console.log('Running in verbose mode');
  }
  
  switch (command.toLowerCase()) {
    case 'import':
      if (!filePath) {
        console.error('Missing file path for import');
        process.exit(1);
      }
      await importCoa(clientId, filePath);
      break;
      
    case 'export':
      const outputPath = filePath || `./coa-export-client-${clientId}.csv`;
      await exportCoa(clientId, outputPath);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});