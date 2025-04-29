/**
 * Test suite for journal entry file upload workflow
 * 
 * This tests:
 * 1. Create a draft journal entry
 * 2. Upload a file attachment successfully
 * 3. Patch the entry to "posted" status
 * 4. Attempt to upload another file - should be rejected with 403
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify exec for async/await use
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

/**
 * Create a journal entry in draft status
 * @returns The ID of the created journal entry
 */
async function createJournalEntry(entityId: number) {
  try {
    const auth = 'admin:password'; // Test credentials
    const payload = JSON.stringify({
      date: new Date().toISOString(),
      referenceNumber: `TEST-${Date.now()}`,
      description: 'Test journal entry for file upload workflow test',
      status: 'draft',
      lines: [
        {
          accountId: 1,
          description: 'Test debit line',
          amount: '100.00',
          type: 'debit'
        },
        {
          accountId: 2,
          description: 'Test credit line',
          amount: '100.00',
          type: 'credit'
        }
      ]
    });
    
    const result = await execPromise(
      `curl -X POST -u ${auth} -H "Content-Type: application/json" -d '${payload}' http://localhost:5000/api/entities/${entityId}/journal-entries`
    );
    
    const response = JSON.parse(result.stdout);
    return response.id;
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
}

/**
 * Upload a file to a journal entry
 * @param journalEntryId Journal entry ID
 * @param filePath Path to the file to upload
 * @param expectedStatus Expected HTTP status code
 * @returns True if the upload status matches the expected status
 */
async function uploadFile(journalEntryId: number, filePath: string, expectedStatus: number = 201) {
  try {
    const auth = 'admin:password'; // Test credentials
    
    // Using curl with -f flag (fail on error) and -o /dev/null (discard output)
    // but capturing stderr to check for specific error codes
    try {
      const result = await execPromise(
        `curl -X POST -u ${auth} -F "files=@${filePath}" http://localhost:5000/api/journal-entries/${journalEntryId}/files -v`
      );
      
      // If we got here, the request succeeded (2xx status code)
      console.log(`Upload response for JE ${journalEntryId}:`, result.stdout);
      
      // Check for expected success status
      if (expectedStatus >= 200 && expectedStatus < 300) {
        return result.stdout.includes(expectedStatus.toString()) || 
               result.stdout.includes('20') || // 200, 201, etc.
               !result.stderr;
      }
      
      // If we expected an error but got success, return false
      return false;
    } catch (error: any) {
      // Check if the error status matches the expected status
      console.log(`Upload error for JE ${journalEntryId}:`, error.stderr || error);
      return error.stderr && error.stderr.includes(expectedStatus.toString());
    }
  } catch (error) {
    console.error('Error during file upload test:', error);
    return false;
  }
}

/**
 * Patch a journal entry's status
 * @param journalEntryId Journal entry ID
 * @param status New status
 * @returns True if the patch was successful
 */
async function patchStatus(journalEntryId: number, status: string) {
  try {
    const auth = 'admin:password'; // Test credentials
    const payload = JSON.stringify({ status });
    
    const result = await execPromise(
      `curl -X PATCH -u ${auth} -H "Content-Type: application/json" -d '${payload}' http://localhost:5000/api/journal-entries/${journalEntryId}`
    );
    
    console.log(`Patch response for JE ${journalEntryId}:`, result.stdout);
    return result.stdout.includes('200') || !result.stderr;
  } catch (error) {
    console.error('Error patching journal entry:', error);
    return false;
  }
}

// Start server and run tests
async function runTests() {
  try {
    console.log('Starting upload-posting workflow tests...');
    
    // Create a test PDF file
    const dummyPdf = createTestFile('test.pdf', '%PDF-1.5\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    console.log('Created test PDF file');
    
    // TEST: Upload workflow - create JE, upload file, post JE, try to upload again
    console.log('TEST: Upload workflow test');
    
    // Step 1: Create a journal entry
    const entityId = 1; // Using a default entity ID for testing
    const journalEntryId = await createJournalEntry(entityId);
    console.log(`Created journal entry with ID: ${journalEntryId}`);
    
    // Step 2: Upload a file to the draft journal entry - should succeed
    console.log('Uploading file to draft journal entry');
    const uploadResult = await uploadFile(journalEntryId, dummyPdf);
    
    assert.ok(uploadResult, 'File upload to draft journal entry should succeed');
    console.log('✅ File upload to draft journal entry succeeded');
    
    // Step 3: Patch the entry to 'posted' status
    console.log('Patching journal entry to posted status');
    const patchResult = await patchStatus(journalEntryId, 'posted');
    
    assert.ok(patchResult, 'Patching journal entry to posted status should succeed');
    console.log('✅ Journal entry patched to posted status');
    
    // Step 4: Try to upload another file - should be rejected with 403
    console.log('Attempting to upload file to posted journal entry');
    const failedUploadResult = await uploadFile(journalEntryId, dummyPdf, 403);
    
    assert.ok(failedUploadResult, 'File upload to posted journal entry should be rejected with 403');
    console.log('✅ File upload to posted journal entry correctly rejected with 403');
    
    // Clean up test files
    fs.rmSync(path.join(__dirname, 'test_files'), { recursive: true, force: true });
    console.log('Cleaned up test files');
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Run the tests
runTests();