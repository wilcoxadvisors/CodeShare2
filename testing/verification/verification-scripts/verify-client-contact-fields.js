/**
 * Client Contact Fields Verification Script
 * 
 * This script verifies that all client contact fields (name, email, phone)
 * are correctly saved to the database and can be retrieved.
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Base URL for the API
const API_URL = 'http://localhost:5000/api/verification';

// Create a directory for logs if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const logFile = path.join(logsDir, `client-contact-fields-verification-${Date.now()}.log`);
const errorLogFile = path.join(logsDir, `client-contact-fields-error-${Date.now()}.log`);

// Helper to log to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Helper to log errors
function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorMessage = `${timestamp} - ERROR: ${message}`;
  const errorDetails = error.response 
    ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
    : error.message;
  
  console.error(errorMessage);
  console.error(errorDetails);
  
  fs.appendFileSync(errorLogFile, errorMessage + '\n');
  fs.appendFileSync(errorLogFile, errorDetails + '\n\n');
}

// Verify client contact fields
async function verifyClientContactFields() {
  log('Starting client contact fields verification test');
  
  try {
    // Create a test client with all contact fields
    const clientData = {
      name: "Test Client " + Date.now(),
      contactName: "John Doe",
      contactEmail: "johndoe@example.com",
      contactPhone: "555-123-4567",
      industry: "Technology",
      notes: "This is a test client for verification",
      userId: 1 // Use the admin user ID (created in register-test-admin)
    };
    
    log(`Creating test client with data: ${JSON.stringify(clientData)}`);
    
    // Create the client
    let response = await axios.post(`${API_URL}/clients`, clientData);
    if (response.status !== 201) {
      throw new Error(`Failed to create client. Status: ${response.status}`);
    }
    
    const newClient = response.data.data || response.data;
    const clientId = newClient.id;
    
    log(`Created client with ID: ${clientId}`);
    
    // Retrieve the client to verify fields were saved
    response = await axios.get(`${API_URL}/clients/${clientId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve client. Status: ${response.status}`);
    }
    
    const retrievedClient = response.data.data || response.data;
    
    // Verify all contact fields are present and match
    const fieldsToVerify = [
      { name: 'name', expected: clientData.name, actual: retrievedClient.name },
      { name: 'contactName', expected: clientData.contactName, actual: retrievedClient.contactName },
      { name: 'contactEmail', expected: clientData.contactEmail, actual: retrievedClient.contactEmail },
      { name: 'contactPhone', expected: clientData.contactPhone, actual: retrievedClient.contactPhone },
      { name: 'industry', expected: clientData.industry, actual: retrievedClient.industry },
      { name: 'notes', expected: clientData.notes, actual: retrievedClient.notes }
    ];
    
    let allFieldsVerified = true;
    
    for (const field of fieldsToVerify) {
      if (field.actual === field.expected) {
        log(`✓ Field '${field.name}' verified: ${field.actual}`);
      } else {
        logError(
          `Field '${field.name}' mismatch`,
          { response: { status: 'FIELD_MISMATCH', data: { expected: field.expected, actual: field.actual } } }
        );
        allFieldsVerified = false;
      }
    }
    
    // Update the client
    const updateData = {
      contactName: "Jane Smith",
      contactEmail: "janesmith@example.com",
      contactPhone: "555-987-6543"
    };
    
    log(`Updating client with data: ${JSON.stringify(updateData)}`);
    
    response = await axios.put(`${API_URL}/clients/${clientId}`, updateData);
    if (response.status !== 200) {
      throw new Error(`Failed to update client. Status: ${response.status}`);
    }
    
    // Retrieve updated client
    response = await axios.get(`${API_URL}/clients/${clientId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve updated client. Status: ${response.status}`);
    }
    
    const updatedClient = response.data.data || response.data;
    
    // Verify updated fields
    const updatedFieldsToVerify = [
      { name: 'contactName', expected: updateData.contactName, actual: updatedClient.contactName },
      { name: 'contactEmail', expected: updateData.contactEmail, actual: updatedClient.contactEmail },
      { name: 'contactPhone', expected: updateData.contactPhone, actual: updatedClient.contactPhone },
    ];
    
    for (const field of updatedFieldsToVerify) {
      if (field.actual === field.expected) {
        log(`✓ Updated field '${field.name}' verified: ${field.actual}`);
      } else {
        logError(
          `Updated field '${field.name}' mismatch`,
          { response: { status: 'FIELD_MISMATCH', data: { expected: field.expected, actual: field.actual } } }
        );
        allFieldsVerified = false;
      }
    }
    
    if (allFieldsVerified) {
      log('✓ All client contact fields verified successfully!');
    } else {
      log('❌ Some fields failed verification. Check error log for details.');
    }
    
    return allFieldsVerified;
  } catch (error) {
    logError('Verification test failed', error);
    return false;
  }
}

// Run the verification
verifyClientContactFields().then(success => {
  if (success) {
    log('Verification completed successfully!');
    process.exit(0);
  } else {
    log('Verification failed!');
    process.exit(1);
  }
}).catch(error => {
  logError('Unhandled error in verification script', error);
  process.exit(1);
});