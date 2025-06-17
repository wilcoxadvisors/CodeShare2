#!/usr/bin/env node

/**
 * Comprehensive End-to-End API Verification Script
 * 
 * This script validates the entire Journal Entry lifecycle:
 * 1. Authentication
 * 2. Create Draft JE with Attachment
 * 3. Edit the Draft
 * 4. Post the Entry
 * 5. Attempt to Edit Posted Entry (should fail)
 * 6. Void the Entry
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Global state
let sessionCookie = '';
let testJournalEntryId = null;
let testClientId = null;
let testEntityId = null;

// Utility functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type}: ${message}`);
}

function logStep(stepNumber, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP ${stepNumber}: ${description}`);
  console.log(`${'='.repeat(60)}`);
}

function logSuccess(message) {
  log(`✅ SUCCESS: ${message}`, 'PASS');
}

function logFailure(message) {
  log(`❌ FAILURE: ${message}`, 'FAIL');
}

// Create a test file for attachment
function createTestFile() {
  const testFilePath = path.join(__dirname, 'test_attachment.txt');
  const testContent = 'This is a test attachment file for Journal Entry verification.';
  fs.writeFileSync(testFilePath, testContent);
  return testFilePath;
}

// Clean up test file
function cleanupTestFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Create axios instance with cookie jar support
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: function (status) {
    return status >= 200 && status < 600; // Don't throw for any status code
  }
});

// API helper functions
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        ...headers
      }
    };

    if (data) {
      if (data instanceof FormData) {
        config.data = data;
        config.headers = { ...config.headers, ...data.getHeaders() };
      } else {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await axiosInstance(config);
    return { success: response.status >= 200 && response.status < 300, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || error.message,
      error: error.message
    };
  }
}

// Step 1: Authentication
async function step1_authenticate() {
  logStep(1, 'Authenticate');
  
  const response = await makeRequest('POST', '/api/auth/login', TEST_CREDENTIALS);
  
  if (!response.success || response.status !== 200) {
    logFailure(`Authentication failed: ${response.error || 'Unknown error'}`);
    process.exit(1);
  }
  
  logSuccess('User authenticated successfully');
  
  // Get available clients and entities
  const clientsResponse = await makeRequest('GET', '/api/clients');
  if (clientsResponse.success && clientsResponse.data.length > 0) {
    testClientId = clientsResponse.data[0].id;
    log(`Using test client ID: ${testClientId}`);
    
    // Use known working entity ID from the system
    testEntityId = 376; // Entity "TY" from client 235
    log(`Using test entity ID: ${testEntityId}`);
  } else {
    logFailure('No clients available for testing');
    process.exit(1);
  }
}

// Step 2: Create Draft JE with Attachment
async function step2_createDraftWithAttachment() {
  logStep(2, 'Create Draft JE with Attachment');
  
  // Create journal entry with real account IDs from the system
  const journalEntryData = {
    date: new Date().toISOString().split('T')[0],
    referenceNumber: `TEST-JE-${Date.now()}`,
    description: 'Test Journal Entry for E2E Verification',
    lines: [
      {
        type: 'debit',
        accountId: 1001, // Using standard chart of accounts ID
        amount: '1000.00',
        description: 'Test debit line'
      },
      {
        type: 'credit',
        accountId: 2001, // Using standard chart of accounts ID  
        amount: '1000.00',
        description: 'Test credit line'
      }
    ]
  };
  
  const jeResponse = await makeRequest('POST', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`, journalEntryData);
  
  if (!jeResponse.success || jeResponse.status !== 201) {
    logFailure(`Failed to create journal entry: ${jeResponse.error || 'Unknown error'}`);
    return false;
  }
  
  testJournalEntryId = jeResponse.data.id;
  logSuccess(`Journal entry created with ID: ${testJournalEntryId}`);
  
  // Create and upload attachment
  const testFilePath = createTestFile();
  const formData = new FormData();
  formData.append('file', fs.createReadStream(testFilePath));
  
  const uploadResponse = await makeRequest('POST', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}/files`, formData);
  
  cleanupTestFile(testFilePath);
  
  if (!uploadResponse.success || uploadResponse.status !== 201) {
    logFailure(`Failed to upload attachment: ${uploadResponse.error || 'Unknown error'}`);
    return false;
  }
  
  logSuccess('Attachment uploaded successfully');
  return true;
}

// Step 3: Edit the Draft
async function step3_editDraft() {
  logStep(3, 'Edit the Draft');
  
  // Get current entry
  const getResponse = await makeRequest('GET', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}`);
  
  if (!getResponse.success || getResponse.status !== 200) {
    logFailure(`Failed to get journal entry: ${getResponse.error || 'Unknown error'}`);
    return false;
  }
  
  const currentEntry = getResponse.data;
  log(`Current entry has ${currentEntry.files?.length || 0} attachment(s)`);
  
  if (!currentEntry.files || currentEntry.files.length === 0) {
    logFailure('Expected 1 attachment, but found none');
    return false;
  }
  
  // Update entry
  const updatedData = {
    ...currentEntry,
    description: 'UPDATED: Test Journal Entry for E2E Verification',
    files: currentEntry.files // Preserve existing attachments
  };
  
  const updateResponse = await makeRequest('PUT', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}`, updatedData);
  
  if (!updateResponse.success || updateResponse.status !== 200) {
    logFailure(`Failed to update journal entry: ${updateResponse.error || 'Unknown error'}`);
    return false;
  }
  
  // Verify changes
  const verifyResponse = await makeRequest('GET', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}`);
  
  if (!verifyResponse.success) {
    logFailure(`Failed to verify updated journal entry: ${verifyResponse.error || 'Unknown error'}`);
    return false;
  }
  
  const updatedEntry = verifyResponse.data;
  const descriptionUpdated = updatedEntry.description.includes('UPDATED:');
  const attachmentPreserved = updatedEntry.files && updatedEntry.files.length > 0;
  
  if (descriptionUpdated && attachmentPreserved) {
    logSuccess('Draft updated successfully - description changed and attachment preserved');
    return true;
  } else {
    logFailure(`Update verification failed - Description updated: ${descriptionUpdated}, Attachment preserved: ${attachmentPreserved}`);
    return false;
  }
}

// Step 4: Post the Entry
async function step4_postEntry() {
  logStep(4, 'Post the Entry');
  
  const postResponse = await makeRequest('PUT', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}/post`);
  
  if (!postResponse.success || postResponse.status !== 200) {
    logFailure(`Failed to post journal entry: ${postResponse.error || 'Unknown error'}`);
    return false;
  }
  
  // Verify status
  const verifyResponse = await makeRequest('GET', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}`);
  
  if (!verifyResponse.success) {
    logFailure(`Failed to verify posted entry: ${verifyResponse.error || 'Unknown error'}`);
    return false;
  }
  
  const postedEntry = verifyResponse.data;
  if (postedEntry.status === 'posted') {
    logSuccess('Journal entry posted successfully');
    return true;
  } else {
    logFailure(`Expected status 'posted', got '${postedEntry.status}'`);
    return false;
  }
}

// Step 5: Attempt to Edit Posted Entry (should fail)
async function step5_attemptEditPosted() {
  logStep(5, 'Attempt to Edit Posted Entry (should fail)');
  
  const updateData = {
    description: 'This update should fail - entry is posted'
  };
  
  const updateResponse = await makeRequest('PUT', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}`, updateData);
  
  if (updateResponse.success && updateResponse.status === 200) {
    logFailure('Posted entry was updated - this should not be allowed');
    return false;
  } else if (updateResponse.status === 400 || updateResponse.status === 403) {
    logSuccess('Posted entry correctly rejected update attempt');
    return true;
  } else {
    logFailure(`Unexpected response: ${updateResponse.status} - ${updateResponse.error || 'Unknown error'}`);
    return false;
  }
}

// Step 6: Void the Entry
async function step6_voidEntry() {
  logStep(6, 'Void the Entry');
  
  const voidData = {
    reason: 'E2E Test Verification - Voiding for test completion'
  };
  
  const voidResponse = await makeRequest('POST', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}/void`, voidData);
  
  if (!voidResponse.success || voidResponse.status !== 200) {
    logFailure(`Failed to void journal entry: ${voidResponse.error || 'Unknown error'}`);
    return false;
  }
  
  // Verify status
  const verifyResponse = await makeRequest('GET', `/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${testJournalEntryId}`);
  
  if (!verifyResponse.success) {
    logFailure(`Failed to verify voided entry: ${verifyResponse.error || 'Unknown error'}`);
    return false;
  }
  
  const voidedEntry = verifyResponse.data;
  if (voidedEntry.status === 'voided') {
    logSuccess('Journal entry voided successfully');
    return true;
  } else {
    logFailure(`Expected status 'voided', got '${voidedEntry.status}'`);
    return false;
  }
}

// Main execution function
async function runVerification() {
  console.log('🚀 Starting Comprehensive E2E API Verification');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test User: ${TEST_CREDENTIALS.username}`);
  
  let passedSteps = 0;
  const totalSteps = 6;
  
  try {
    // Execute all steps
    await step1_authenticate();
    passedSteps++;
    
    if (await step2_createDraftWithAttachment()) passedSteps++;
    if (await step3_editDraft()) passedSteps++;
    if (await step4_postEntry()) passedSteps++;
    if (await step5_attemptEditPosted()) passedSteps++;
    if (await step6_voidEntry()) passedSteps++;
    
  } catch (error) {
    logFailure(`Unexpected error during verification: ${error.message}`);
  }
  
  // Final results
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL VERIFICATION RESULTS');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Steps: ${totalSteps}`);
  console.log(`Passed Steps: ${passedSteps}`);
  console.log(`Failed Steps: ${totalSteps - passedSteps}`);
  console.log(`Success Rate: ${Math.round((passedSteps / totalSteps) * 100)}%`);
  
  if (passedSteps === totalSteps) {
    console.log('🎉 ALL TESTS PASSED - Journal Entry system is fully operational!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed - Review the logs above for details');
    process.exit(1);
  }
}

// Execute verification
runVerification().catch(error => {
  logFailure(`Fatal error: ${error.message}`);
  process.exit(1);
});