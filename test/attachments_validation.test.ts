/**
 * Test suite for journal entry file attachment validation
 * 
 * This tests:
 * 1. Allowed file types validation (.msg, .eml, etc.)
 * 2. Rate limiting functionality (50 uploads per 10 min window)
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';

const execPromise = promisify(exec);

// Utility to create temporary test files
function createTestFile(name: string, content: string = 'test content') {
  const testDir = path.join(__dirname, 'test_files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const filePath = path.join(testDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// Start server and run tests
async function runTests() {
  try {
    console.log('Starting validation tests...');
    
    // Create test files with proper MIME type information
    const msgFile = createTestFile('test.msg', 'Outlook message content');
    const emlFile = createTestFile('test.eml', 'From: sender@example.com\nTo: recipient@example.com\nSubject: Test Email\n\nThis is a test email message content.');
    const exeFile = createTestFile('test.exe', 'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF'); // EXE header
    const smallFile = createTestFile('small.txt', 'Small text file content for testing');
    
    console.log('Created test files');
    
    // Configure authentication for API requests
    const auth = 'admin:password'; // Replace with your test credentials
    
    // TEST 1: Upload .msg file - should succeed
    console.log('TEST 1: Upload .msg file');
    try {
      const msgResult = await execPromise(`curl -X POST -u ${auth} -F "files=@${msgFile}" http://localhost:5000/api/journal-entries/1/files`);
      console.log('MSG file upload response:', msgResult.stdout);
      assert.ok(!msgResult.stderr, 'MSG file upload should not have errors');
      assert.ok(msgResult.stdout.includes('200') || msgResult.stdout.includes('201'), 'MSG file upload should return success status code');
      console.log('✅ TEST 1 PASSED: MSG file upload allowed');
    } catch (error) {
      console.error('❌ TEST 1 FAILED: MSG file upload', error);
    }
    
    // TEST 2: Upload .eml file - should succeed
    console.log('TEST 2: Upload .eml file');
    try {
      const emlResult = await execPromise(`curl -X POST -u ${auth} -F "files=@${emlFile}" http://localhost:5000/api/journal-entries/1/files`);
      console.log('EML file upload response:', emlResult.stdout);
      assert.ok(!emlResult.stderr, 'EML file upload should not have errors');
      assert.ok(emlResult.stdout.includes('200') || emlResult.stdout.includes('201'), 'EML file upload should return success status code');
      console.log('✅ TEST 2 PASSED: EML file upload allowed');
    } catch (error) {
      console.error('❌ TEST 2 FAILED: EML file upload', error);
    }
    
    // TEST 3: Upload .exe file - should fail with 400
    console.log('TEST 3: Upload .exe file');
    try {
      const exeResult = await execPromise(`curl -X POST -u ${auth} -F "files=@${exeFile}" http://localhost:5000/api/journal-entries/1/files`);
      console.log('EXE file upload response:', exeResult.stdout);
      assert.ok(exeResult.stdout.includes('400'), 'EXE file upload should return 400 status code');
      console.log('✅ TEST 3 PASSED: EXE file upload rejected');
    } catch (error) {
      console.error('❌ TEST 3 FAILED: EXE file upload', error);
    }
    
    // TEST 4: Rate limit test - upload 51 files, the 51st should be rejected
    console.log('TEST 4: Rate limit test (51 uploads)');
    try {
      // Actual test with 51 uploads - the 51st should be rejected with 429
      const uploadPromises = [];
      const lastUploadPromise = { response: '', isRateLimited: false };
      
      // Upload files 1-50 (within limit)
      for (let i = 1; i <= 50; i++) {
        console.log(`Uploading file ${i}/51`);
        uploadPromises.push(execPromise(`curl -X POST -u ${auth} -F "files=@${smallFile}" http://localhost:5000/api/journal-entries/1/files`));
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      console.log(`Completed 50/51 uploads`);
      
      // Try the 51st upload - should be rate limited
      console.log(`Attempting upload 51/51 (should be rate limited)`);
      try {
        const result = await execPromise(`curl -X POST -u ${auth} -F "files=@${smallFile}" http://localhost:5000/api/journal-entries/1/files -v`);
        lastUploadPromise.response = result.stdout;
        console.log('Upload 51 response:', result.stdout);
      } catch (error: any) {
        // Check if it's a 429 response
        lastUploadPromise.response = error.stdout || '';
        lastUploadPromise.isRateLimited = error.stdout.includes('429');
        console.log('Upload 51 error response:', error.stdout);
      }
      
      // Verify the 51st upload was rejected with a 429 response
      assert.ok(
        lastUploadPromise.isRateLimited || 
        lastUploadPromise.response.includes('429') || 
        lastUploadPromise.response.includes('Too many file uploads'),
        'The 51st upload should be rate limited with a 429 response'
      );
      
      console.log('✅ TEST 4 PASSED: Rate limit test - 51st upload was properly rate limited');
    } catch (error) {
      console.error('❌ TEST 4 FAILED: Rate limit test', error);
    }
    
    // Clean up test files
    fs.rmSync(path.join(__dirname, 'test_files'), { recursive: true, force: true });
    console.log('Cleaned up test files');
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Run the tests
runTests();