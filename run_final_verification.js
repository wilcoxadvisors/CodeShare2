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
 * 7. Reverse a Posted Entry
 * 8. Copy an Entry
 * 9. Test Accrual Reversal
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const CLIENT_ID = 235;
const ENTITY_ID = 376;

// Test credentials
const credentials = {
  username: 'admin',
  password: 'password123'
};

// Global state
let authCookies = '';
let testData = {
  draftJeId: null,
  postedJeId: null,
  voidedJeId: null,
  copiedJeId: null,
  accrualJeId: null,
  reversalJeId: null,
  attachmentId: null
};

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
  console.log(`✅ PASSED: ${message}`);
}

function logFailure(message) {
  console.log(`❌ FAILED: ${message}`);
}

function createTestFile() {
  const testContent = 'This is a test file for journal entry attachment verification.';
  const filePath = path.join(__dirname, 'test-attachment.txt');
  fs.writeFileSync(filePath, testContent);
  return filePath;
}

function cleanupTestFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log('Cleaned up test file');
    }
  } catch (error) {
    log(`Error cleaning up test file: ${error.message}`, 'WARN');
  }
}

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Cookie': authCookies,
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

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function step1_authenticate() {
  logStep(1, 'Authenticate as admin user');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    
    if (response.headers['set-cookie']) {
      authCookies = response.headers['set-cookie'].join('; ');
      log('Authentication successful');
      logSuccess('Authentication completed');
      return true;
    } else {
      logFailure('No cookies received from authentication');
      return false;
    }
  } catch (error) {
    logFailure(`Authentication failed: ${error.message}`);
    return false;
  }
}

async function step2_createDraftWithAttachment() {
  logStep(2, 'Create Draft JE with Attachment');
  
  try {
    // First, create the journal entry
    const jeData = {
      date: new Date().toISOString().split('T')[0],
      referenceNumber: `TEST-${Date.now()}`,
      description: 'Test Journal Entry with Attachment',
      journalType: 'JE',
      status: 'draft',
      lines: [
        {
          type: 'debit',
          accountId: 7072,
          amount: '1000.00',
          description: 'Test debit line'
        },
        {
          type: 'credit',
          accountId: 7073,
          amount: '1000.00',
          description: 'Test credit line'
        }
      ]
    };

    const jeResponse = await makeRequest('POST', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries`, jeData);
    testData.draftJeId = jeResponse.id;
    log(`Created draft JE with ID: ${testData.draftJeId}`);

    // Now upload an attachment
    const testFilePath = createTestFile();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));

    const attachmentResponse = await makeRequest('POST', 
      `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}/attachments`, 
      formData
    );
    
    // Handle different response formats from attachment endpoint
    testData.attachmentId = attachmentResponse.id || (attachmentResponse.files && attachmentResponse.files[0] && attachmentResponse.files[0].id);
    log(`Uploaded attachment with ID: ${testData.attachmentId}`);
    cleanupTestFile(testFilePath);

    logSuccess('Draft JE with attachment created successfully');
    return true;
  } catch (error) {
    logFailure(`Failed to create draft JE with attachment: ${error.message}`);
    return false;
  }
}

async function step3_editDraft() {
  logStep(3, 'Edit Draft and verify attachment preservation');
  
  try {
    // First get existing attachments to preserve them
    const existingAttachments = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}/attachments`);
    const attachmentList = Array.isArray(existingAttachments) ? existingAttachments : (existingAttachments.files || []);
    
    // Update the journal entry description with attachment preservation
    const updateData = {
      description: 'UPDATED: Test Journal Entry with Attachment',
      lines: [
        {
          type: 'debit',
          accountId: 7072,
          amount: '1500.00',
          description: 'Updated debit line'
        },
        {
          type: 'credit',
          accountId: 7073,
          amount: '1500.00',
          description: 'Updated credit line'
        }
      ],
      files: attachmentList.map(file => ({ 
        id: file.id, 
        filename: file.filename, 
        mimeType: file.mimeType, 
        size: file.size 
      }))
    };

    await makeRequest('PATCH', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}`, updateData);
    log('Updated journal entry description and amounts');

    // Verify the update and attachment preservation
    const updatedJe = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}`);
    
    if (updatedJe.description.includes('UPDATED:')) {
      log('Description update verified');
    } else {
      throw new Error('Description was not updated');
    }

    // Check attachments
    const attachments = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}/attachments`);
    
    // Handle different response formats
    const attachmentList = Array.isArray(attachments) ? attachments : (attachments.files || []);
    
    if (attachmentList.length > 0 && attachmentList.some(att => att.id === testData.attachmentId)) {
      log('Attachment preservation verified');
      logSuccess('Draft edit with attachment preservation completed');
      return true;
    } else {
      throw new Error('Attachment was not preserved during edit');
    }
  } catch (error) {
    logFailure(`Failed to edit draft: ${error.message}`);
    return false;
  }
}

async function step4_postEntry() {
  logStep(4, 'Post the Entry');
  
  try {
    await makeRequest('PATCH', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}`, {
      status: 'posted'
    });
    
    // Verify status change
    const postedJe = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.draftJeId}`);
    
    if (postedJe.status === 'posted') {
      testData.postedJeId = testData.draftJeId;
      log(`Journal entry ${testData.postedJeId} successfully posted`);
      logSuccess('Entry posting completed');
      return true;
    } else {
      throw new Error(`Expected status 'posted', got '${postedJe.status}'`);
    }
  } catch (error) {
    logFailure(`Failed to post entry: ${error.message}`);
    return false;
  }
}

async function step5_attemptEditPosted() {
  logStep(5, 'Attempt to Edit Posted Entry (should fail)');
  
  try {
    await makeRequest('PATCH', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.postedJeId}`, {
      description: 'This should fail'
    });
    
    logFailure('Posted entry edit should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.message.includes('400') || error.message.includes('403') || error.message.includes('Cannot edit')) {
      log('Edit attempt correctly rejected');
      logSuccess('Posted entry edit protection working');
      return true;
    } else {
      logFailure(`Unexpected error: ${error.message}`);
      return false;
    }
  }
}

async function step6_voidEntry() {
  logStep(6, 'Void the Entry');
  
  try {
    await makeRequest('PATCH', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.postedJeId}`, {
      status: 'voided'
    });
    
    // Verify status change
    const voidedJe = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.postedJeId}`);
    
    if (voidedJe.status === 'voided') {
      testData.voidedJeId = testData.postedJeId;
      log(`Journal entry ${testData.voidedJeId} successfully voided`);
      logSuccess('Entry voiding completed');
      return true;
    } else {
      throw new Error(`Expected status 'voided', got '${voidedJe.status}'`);
    }
  } catch (error) {
    logFailure(`Failed to void entry: ${error.message}`);
    return false;
  }
}

async function step7_reverseEntry() {
  logStep(7, 'Reverse a Posted Entry');
  
  try {
    // First create a new entry to reverse
    const jeData = {
      date: new Date().toISOString().split('T')[0],
      referenceNumber: `REVERSE-TEST-${Date.now()}`,
      description: 'Entry to be reversed',
      journalType: 'JE',
      status: 'posted',
      lines: [
        {
          type: 'debit',
          accountId: 7072,
          amount: '500.00',
          description: 'Amount to reverse'
        },
        {
          type: 'credit',
          accountId: 7073,
          amount: '500.00',
          description: 'Amount to reverse'
        }
      ]
    };

    const originalJe = await makeRequest('POST', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries`, jeData);
    log(`Created entry to reverse with ID: ${originalJe.id}`);

    // Now reverse it
    const reversalData = await makeRequest('POST', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${originalJe.id}/reverse`);
    
    log(`Created reversal entry with ID: ${reversalData.id}`);
    logSuccess('Entry reversal completed');
    return true;
  } catch (error) {
    logFailure(`Failed to reverse entry: ${error.message}`);
    return false;
  }
}

async function step8_copyEntry() {
  logStep(8, 'Copy an Entry');
  
  try {
    // Use the voided entry for copying
    const copiedData = await makeRequest('POST', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.voidedJeId}/copy`);
    
    testData.copiedJeId = copiedData.id;
    log(`Created copy with ID: ${testData.copiedJeId}`);

    // Verify the copy
    const copiedJe = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.copiedJeId}`);
    
    if (copiedJe.status === 'draft' && copiedJe.referenceNumber.includes('Copy of')) {
      log('Copy verification successful');
      logSuccess('Entry copying completed');
      return true;
    } else {
      throw new Error('Copy does not have expected properties');
    }
  } catch (error) {
    logFailure(`Failed to copy entry: ${error.message}`);
    return false;
  }
}

async function step9_testAccrualReversal() {
  logStep(9, 'Test Accrual Reversal');
  
  try {
    // Create an accrual entry
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const accrualData = {
      date: new Date().toISOString().split('T')[0],
      referenceNumber: `ACCRUAL-TEST-${Date.now()}`,
      description: 'Test Accrual Entry',
      journalType: 'JE',
      status: 'draft',
      isAccrual: true,
      reversalDate: futureDate.toISOString().split('T')[0],
      lines: [
        {
          type: 'debit',
          accountId: 7072,
          amount: '2000.00',
          description: 'Accrual debit'
        },
        {
          type: 'credit',
          accountId: 7073,
          amount: '2000.00',
          description: 'Accrual credit'
        }
      ]
    };

    const accrualJe = await makeRequest('POST', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries`, accrualData);
    testData.accrualJeId = accrualJe.id;
    log(`Created accrual entry with ID: ${testData.accrualJeId}`);

    // Post the accrual entry (this should trigger reversal creation)
    await makeRequest('PATCH', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries/${testData.accrualJeId}`, {
      status: 'posted'
    });
    
    log('Posted accrual entry');

    // Check if reversal entry was created
    const journalEntries = await makeRequest('GET', `/api/clients/${CLIENT_ID}/entities/${ENTITY_ID}/journal-entries?limit=20`);
    
    const reversalEntry = journalEntries.find(je => 
      je.reversedEntryId === testData.accrualJeId && 
      je.status === 'posted'
    );

    if (reversalEntry) {
      testData.reversalJeId = reversalEntry.id;
      log(`Found auto-created reversal entry with ID: ${testData.reversalJeId}`);
      logSuccess('Accrual reversal system working correctly');
      return true;
    } else {
      throw new Error('Automatic reversal entry was not created');
    }
  } catch (error) {
    logFailure(`Failed accrual reversal test: ${error.message}`);
    return false;
  }
}

async function runVerification() {
  console.log('🚀 Starting Comprehensive E2E API Verification');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Client ID: ${CLIENT_ID}, Entity ID: ${ENTITY_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  const results = [];
  
  try {
    results.push(await step1_authenticate());
    results.push(await step2_createDraftWithAttachment());
    results.push(await step3_editDraft());
    results.push(await step4_postEntry());
    results.push(await step5_attemptEditPosted());
    results.push(await step6_voidEntry());
    results.push(await step7_reverseEntry());
    results.push(await step8_copyEntry());
    results.push(await step9_testAccrualReversal());
    
  } catch (error) {
    log(`Verification failed with error: ${error.message}`, 'ERROR');
  }

  // Final Results
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL VERIFICATION RESULTS');
  console.log(`${'='.repeat(60)}`);
  
  const passedTests = results.filter(Boolean).length;
  const totalTests = results.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
  console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - JOURNAL ENTRY MODULE IS STABLE');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
  }

  console.log('\nTest Data Summary:');
  console.log(`- Draft JE ID: ${testData.draftJeId}`);
  console.log(`- Posted JE ID: ${testData.postedJeId}`);
  console.log(`- Voided JE ID: ${testData.voidedJeId}`);
  console.log(`- Copied JE ID: ${testData.copiedJeId}`);
  console.log(`- Accrual JE ID: ${testData.accrualJeId}`);
  console.log(`- Reversal JE ID: ${testData.reversalJeId}`);
  console.log(`- Attachment ID: ${testData.attachmentId}`);
}

// Execute the verification
runVerification().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});