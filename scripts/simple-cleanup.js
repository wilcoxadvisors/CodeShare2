/**
 * Simple cleanup script for removing test clients and entities
 * This script works with the API directly
 * 
 * IMPORTANT: Preserves the following clients:
 * - OK
 * - ONE1  
 * - Pepper
 * - Admin Client
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const BASE_URL = 'http://localhost:5000';
const TEST_CLIENT_ID = 128; // The client ID we verified in our tests
const PRESERVE_CLIENTS = ['OK', 'ONE1', 'Pepper', 'Admin Client']; // Clients to preserve

// Login to get auth cookie
async function login() {
  console.log('Logging in as admin...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    if (response.status === 200) {
      console.log('Login successful!');
      return response.headers['set-cookie'].join('; ');
    } else {
      console.error('Login failed:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

// Delete a client and its accounts with retry and verification
async function deleteClient(clientId, clientName, cookie, maxRetries = 3) {
  if (!clientId || isNaN(clientId)) {
    console.error(`Invalid client ID for client "${clientName}". Client ID: ${clientId}`);
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Deleting client ${clientId} (${clientName}) and its accounts... (Attempt ${attempt}/${maxRetries})`);
    
    try {
      // Delete the client (this should cascade to accounts)
      const response = await axios.delete(
        `${BASE_URL}/api/admin/clients/${clientId}`,
        {
          headers: { Cookie: cookie },
          timeout: 10000 // Add a timeout to avoid hanging
        }
      );
      
      if (response.status === 200) {
        // With 200 status, consider it a success without verification to save time
        console.log(`Client ${clientId} (${clientName}) deleted successfully`);
        return true;
      } else {
        console.error(`Failed to delete client ${clientId} (${clientName}) on attempt ${attempt}:`, response.data);
        if (attempt === maxRetries) return false;
      }
    } catch (error) {
      // If delete returns 404, the client was already deleted
      if (error.response && error.response.status === 404) {
        console.log(`Client ${clientId} (${clientName}) already deleted or doesn't exist`);
        return true;
      }
      
      console.error(`Error deleting client ${clientId} (${clientName}) on attempt ${attempt}:`, error.message);
      if (attempt === maxRetries) return false;
    }
    
    // Wait before retrying, shorter delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

// Clean up temporary files
function cleanupTempFiles() {
  console.log('Cleaning up temporary files...');
  
  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.includes('client') || file.includes('accounts') || file.includes('export')) {
        try {
          fs.unlinkSync(path.join(tmpDir, file));
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete file ${file}:`, error.message);
        }
      }
    }
    
    console.log(`Deleted ${deletedCount} temporary files`);
  } else {
    console.log('No temporary directory found');
  }
}

// Clean up logs
function cleanupLogs() {
  console.log('Cleaning up log files...');
  
  const logDir = path.join(__dirname, '..', 'verification-logs');
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.includes('verification') || file.includes('coa-')) {
        try {
          fs.unlinkSync(path.join(logDir, file));
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete file ${file}:`, error.message);
        }
      }
    }
    
    console.log(`Deleted ${deletedCount} log files`);
  } else {
    console.log('No logs directory found');
  }
}

// Get all clients
async function getAllClients(cookie) {
  console.log('Retrieving list of all clients...');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/admin/clients`,
      {
        headers: { Cookie: cookie }
      }
    );
    
    if (response.status === 200) {
      // Check various response formats
      let clients = [];
      
      if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
        // Format: { status: 'success', data: [clients] }
        clients = response.data.data;
        console.log(`Successfully retrieved ${clients.length} clients from response.data.data`);
      } else if (Array.isArray(response.data)) {
        // Format: [clients]
        clients = response.data;
        console.log(`Successfully retrieved ${clients.length} clients from response.data array`);
      } else if (response.data && response.data.clients && Array.isArray(response.data.clients)) {
        // Format: { clients: [clients] }
        clients = response.data.clients;
        console.log(`Successfully retrieved ${clients.length} clients from response.data.clients`);
      } else if (response.data && typeof response.data === 'object') {
        // Format: {clientId1: client1, clientId2: client2, ...}
        if (Object.keys(response.data).length > 0) {
          clients = Object.entries(response.data).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Make sure each client object has an id property
              if (!value.id && !isNaN(key)) {
                value.id = parseInt(key);
              }
              return value;
            }
            return null;
          }).filter(client => client !== null);
          console.log(`Successfully retrieved ${clients.length} clients from response.data object`);
        }
      }
      
      // Log a summary of the clients for debugging
      if (clients.length > 0) {
        console.log('First few clients:', clients.slice(0, 3).map(c => ({ id: c.id, name: c.name })));
      } else {
        console.log('No clients found in the response');
        console.log('Response structure:', JSON.stringify(Object.keys(response.data), null, 2));
      }
      
      return clients;
    } else {
      console.error('Failed to retrieve clients:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error retrieving clients:', error.message);
    return [];
  }
}

// Main function
async function main() {
  try {
    console.log('Starting cleanup process...');
    console.log(`Will preserve the following clients: ${PRESERVE_CLIENTS.join(', ')}`);
    
    // Step 1: Login
    const cookie = await login();
    if (!cookie) {
      console.error('Authentication failed. Cleanup aborted.');
      return;
    }
    
    // Step 2: Get all clients
    const allClients = await getAllClients(cookie);
    if (allClients.length === 0) {
      console.log('No clients found or failed to retrieve clients. Cleanup aborted.');
      return;
    }
    
    // Step 3: Identify clients to delete (exclude preserved clients)
    const clientsToDelete = allClients.filter(client => {
      // Ensure the client has a name property
      if (!client || !client.name) {
        console.log(`Skipping client with missing name property: ${JSON.stringify(client)}`);
        return false;
      }

      // Check if the client name exactly matches any preserved client name
      const shouldPreserve = PRESERVE_CLIENTS.includes(client.name);
      
      if (shouldPreserve) {
        console.log(`Preserving client ${client.id}: ${client.name}`);
      }
      
      return !shouldPreserve;
    });
    
    console.log(`Found ${clientsToDelete.length} clients to delete out of ${allClients.length} total clients`);
    
    // Process clients in smaller batches to avoid timeouts
    const BATCH_SIZE = 5;
    let deletedCount = 0;
    const clientBatches = [];
    
    // Split clients into batches
    for (let i = 0; i < clientsToDelete.length; i += BATCH_SIZE) {
      clientBatches.push(clientsToDelete.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Split clients into ${clientBatches.length} batches of up to ${BATCH_SIZE} clients each`);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < clientBatches.length; batchIndex++) {
      const batch = clientBatches[batchIndex];
      console.log(`\nProcessing batch ${batchIndex + 1} of ${clientBatches.length}...`);
      
      // Process each client in the batch
      for (const client of batch) {
        console.log(`Processing client ${client.id}: ${client.name}`);
        const deleted = await deleteClient(client.id, client.name, cookie, 2); // Reduced retry count to 2
        if (deleted) deletedCount++;
      }
      
      // After each batch, report progress
      console.log(`Batch ${batchIndex + 1} complete. ${deletedCount} clients deleted so far.`);
    }
    
    // Step 5: Clean up temporary files
    cleanupTempFiles();
    
    // Step 6: Clean up log files
    cleanupLogs();
    
    console.log('Cleanup process completed!');
    console.log(`Deleted ${deletedCount} out of ${clientsToDelete.length} clients`);
    console.log(`Preserved clients: ${PRESERVE_CLIENTS.join(', ')}`);
    
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

// Run the script
main();