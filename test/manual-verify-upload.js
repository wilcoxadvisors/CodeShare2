/**
 * Manual verification script for file uploads
 * This script tests the file upload functionality in isolation
 * 
 * To run:
 * 1. Make sure the application is running
 * 2. node test/manual-verify-upload.js
 */

import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import path from 'path';

// Constants
const API_URL = 'http://localhost:5000/api/journal-entries';
const TEST_JOURNAL_ENTRY_ID = 1; // Replace with an actual journal entry ID from your database
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');

// Create a test file if it doesn't exist
if (!fs.existsSync(TEST_FILE_PATH)) {
  fs.writeFileSync(TEST_FILE_PATH, 'This is a test file for upload verification.');
  console.log(`Created test file at ${TEST_FILE_PATH}`);
}

async function testFileUpload() {
  try {
    // Create a FormData instance
    const formData = new FormData();
    
    // Add test file to the form data
    formData.append('files', fs.createReadStream(TEST_FILE_PATH));
    
    console.log('Starting file upload test...');
    
    // Track upload progress
    let lastProgress = 0;
    
    // Make the upload request - Note: NOT specifying Content-Type header
    const response = await axios.post(
      `${API_URL}/${TEST_JOURNAL_ENTRY_ID}/files`,
      formData,
      {
        // Progress tracking
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (percentCompleted > lastProgress) {
            console.log(`Upload progress: ${percentCompleted}%`);
            lastProgress = percentCompleted;
          }
        }
      }
    );
    
    // Check the response
    console.log('✅ Upload successful!');
    console.log('Response:', response.data);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    // Log detailed error information
    console.error('❌ Upload failed!');
    console.error('Error:', error.message);
    
    // Show response details if available
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    
    return {
      success: false,
      error
    };
  }
}

// Execute the test
console.log('=== File Upload Verification ===');
testFileUpload()
  .then(result => {
    if (result.success) {
      console.log('\n✅ File upload verification PASSED');
    } else {
      console.log('\n❌ File upload verification FAILED');
    }
  })
  .catch(error => {
    console.error('Test execution error:', error);
  });