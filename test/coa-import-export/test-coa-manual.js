import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function authenticate() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password123',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to authenticate: ${response.statusText}`);
    }

    // Extract cookies from response
    const cookies = response.headers.raw()['set-cookie'];
    return cookies ? cookies.join('; ') : '';
  } catch (error) {
    console.error('Authentication error:', error.message);
    process.exit(1);
  }
}

async function importAccounts(clientId, filePath, options = {}) {
  const { verbose = false, removeStrategy = 'inactive' } = options;
  
  try {
    // Authenticate first
    const cookies = await authenticate();
    console.log('Authentication successful');

    // Create multipart form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    // Add import selections
    const selections = {
      updateStrategy: 'all',
      removeStrategy: removeStrategy
    };
    form.append('selections', JSON.stringify(selections));

    if (verbose) {
      console.log(`Starting import for client ID: ${clientId}`);
      console.log(`Import file: ${filePath}`);
      console.log(`Import selections: ${JSON.stringify(selections, null, 2)}`);
    }

    // Send import request
    const importResponse = await fetch(`http://localhost:5000/api/clients/${clientId}/accounts/import`, {
      method: 'POST',
      headers: {
        Cookie: cookies,
      },
      body: form,
    });

    const result = await importResponse.json();

    if (!importResponse.ok) {
      console.error('Import failed:', result.error || importResponse.statusText);
      process.exit(1);
    }

    console.log('Import successful:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Import error:', error.message);
    process.exit(1);
  }
}

async function exportAccounts(clientId) {
  try {
    // Authenticate first
    const cookies = await authenticate();
    console.log('Authentication successful');

    // Send export request
    const exportResponse = await fetch(`http://localhost:5000/api/clients/${clientId}/accounts/export`, {
      method: 'GET',
      headers: {
        Cookie: cookies,
      },
    });

    if (!exportResponse.ok) {
      throw new Error(`Export failed: ${exportResponse.statusText}`);
    }

    const csv = await exportResponse.text();
    console.log('Export successful, data:');
    console.log(csv);
    
    return csv;
  } catch (error) {
    console.error('Export error:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.error('Please specify a command: import or export');
    process.exit(1);
  }

  if (command === 'import') {
    // Format: node test-coa-manual.js import CLIENT_ID FILE_PATH [--verbose] [--remove=[inactive|delete|none]]
    if (args.length < 3) {
      console.error('Usage: node test-coa-manual.js import CLIENT_ID FILE_PATH [--verbose] [--remove=strategy]');
      process.exit(1);
    }

    const clientId = args[1];
    const filePath = args[2];
    const options = {
      verbose: args.includes('--verbose'),
      removeStrategy: 'inactive' // default
    };

    // Check for removal strategy option
    const removeArg = args.find(arg => arg.startsWith('--remove='));
    if (removeArg) {
      const strategy = removeArg.split('=')[1];
      if (['inactive', 'delete', 'none'].includes(strategy)) {
        options.removeStrategy = strategy;
      } else {
        console.error('Invalid remove strategy. Must be inactive, delete, or none');
        process.exit(1);
      }
    }

    await importAccounts(clientId, filePath, options);
  } else if (command === 'export') {
    // Format: node test-coa-manual.js export CLIENT_ID
    if (args.length < 2) {
      console.error('Usage: node test-coa-manual.js export CLIENT_ID');
      process.exit(1);
    }

    const clientId = args[1];
    await exportAccounts(clientId);
  } else {
    console.error('Unknown command. Use import or export');
    process.exit(1);
  }
}

main();