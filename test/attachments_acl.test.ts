/**
 * Test suite for journal entry file attachment ACL (Access Control List)
 * 
 * This tests:
 * 1. Creator of journal entry can delete attachments
 * 2. Users with JE_FILES_ADMIN role can delete attachments
 * 3. Other users cannot delete attachments (403 Forbidden)
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

const execPromise = promisify(exec);

// Test users
const CREATOR_USER = { username: 'admin', password: 'admin' }; // Creator of the entry
const OTHER_USER = { username: 'user', password: 'password' }; // User without permissions

// Utility to create a test file
function createTestFile(name: string, content: string = 'test content') {
  const testDir = path.join(__dirname, 'test_files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const filePath = path.join(testDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function runTests() {
  try {
    console.log('Starting ACL tests for file attachments...');
    let journalEntryId: number;
    let fileId: number;
    
    // Create test file
    const testFile = createTestFile('acl_test.txt', 'Test file for ACL testing');
    
    // 1. Login as the creator and create a journal entry with a file
    console.log('Step 1: Login as the creator user and create a journal entry with a file');
    
    // Create a new journal entry (this would depend on your API endpoints)
    const createJournalEntryCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -H "Content-Type: application/json" -d '{
      "date": "2025-04-30",
      "referenceNumber": "ACL-TEST-${Date.now()}",
      "description": "Test entry for ACL",
      "status": "draft",
      "clientId": 250,
      "entityId": 391,
      "lines": [
        {
          "accountId": 1,
          "type": "debit",
          "amount": "100.00",
          "description": "Test line"
        },
        {
          "accountId": 2,
          "type": "credit",
          "amount": "100.00",
          "description": "Test line"
        }
      ]
    }' http://localhost:5000/api/journal-entries`;
    
    try {
      const createResult = await execPromise(createJournalEntryCmd);
      const entry = JSON.parse(createResult.stdout);
      journalEntryId = entry.id;
      
      console.log(`Created test journal entry with ID: ${journalEntryId}`);
      
      // Attach a file to the journal entry
      const attachFileCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -F "files=@${testFile}" http://localhost:5000/api/journal-entries/${journalEntryId}/files`;
      
      const attachResult = await execPromise(attachFileCmd);
      const attachment = JSON.parse(attachResult.stdout);
      
      if (attachment.files && attachment.files.length > 0) {
        fileId = attachment.files[0].id;
        console.log(`Attached test file with ID: ${fileId}`);
      } else {
        throw new Error('Failed to attach file to journal entry');
      }
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
    
    // 2. Test that creator can delete the file
    console.log('Step 2: Testing that creator can delete the file');
    try {
      // Get the file list first
      const getFilesCmd = `curl -u ${CREATOR_USER.username}:${CREATOR_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files`;
      await execPromise(getFilesCmd);
      
      // First, attempt to delete the file as the creator
      const deleteCmd = `curl -X DELETE -u ${CREATOR_USER.username}:${CREATOR_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files/${fileId} -v`;
      const deleteResult = await execPromise(deleteCmd);
      
      // Should return 204 No Content
      assert.ok(deleteResult.stdout.includes('204'), 'Creator should be able to delete the file (204 status expected)');
      console.log('✅ TEST PASSED: Creator can delete the file');
    } catch (error) {
      console.error('❌ TEST FAILED: Creator cannot delete the file', error);
      throw error;
    }
    
    // Now recreate the file for the next tests
    console.log('Recreating the file for the next tests...');
    const reattachFileCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -F "files=@${testFile}" http://localhost:5000/api/journal-entries/${journalEntryId}/files`;
    const reattachResult = await execPromise(reattachFileCmd);
    const reattachment = JSON.parse(reattachResult.stdout);
    
    if (reattachment.files && reattachment.files.length > 0) {
      fileId = reattachment.files[0].id;
      console.log(`Reattached test file with ID: ${fileId}`);
    } else {
      throw new Error('Failed to reattach file to journal entry');
    }
    
    // 3. Test that other user without role cannot delete the file
    console.log('Step 3: Testing that other user without role cannot delete the file');
    try {
      const deleteCmd = `curl -X DELETE -u ${OTHER_USER.username}:${OTHER_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files/${fileId} -v`;
      try {
        await execPromise(deleteCmd);
        assert.fail('Other user should not be able to delete the file');
      } catch (error: any) {
        // Should return 403 Forbidden
        assert.ok(error.stdout.includes('403'), 'Other user should receive 403 Forbidden');
        console.log('✅ TEST PASSED: Other user cannot delete the file');
      }
    } catch (error) {
      console.error('❌ TEST FAILED: Unexpected result for other user', error);
    }
    
    // 4. Add JE_FILES_ADMIN role to the other user (this would be done through the database)
    console.log('Step 4: Adding JE_FILES_ADMIN role to the other user');
    try {
      // This is a simplified approach - in a real scenario, you'd use your application's role management
      // We're directly adding the role via SQL
      const addRoleCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -H "Content-Type: application/json" -d '{
        "query": "INSERT INTO user_roles (user_id, role_code) VALUES ((SELECT id FROM users WHERE username = '${OTHER_USER.username}'), 'JE_FILES_ADMIN')"
      }' http://localhost:5000/api/admin/sql`;
      
      await execPromise(addRoleCmd);
      console.log('Added JE_FILES_ADMIN role to other user');
    } catch (error) {
      console.error('Error adding role to user:', error);
    }
    
    // 5. Test that other user with role can now delete the file
    console.log('Step 5: Testing that other user with role can now delete the file');
    try {
      const deleteCmd = `curl -X DELETE -u ${OTHER_USER.username}:${OTHER_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files/${fileId} -v`;
      const deleteResult = await execPromise(deleteCmd);
      
      // Should return 204 No Content
      assert.ok(deleteResult.stdout.includes('204'), 'Other user with role should be able to delete the file (204 status expected)');
      console.log('✅ TEST PASSED: Other user with JE_FILES_ADMIN role can delete the file');
    } catch (error) {
      console.error('❌ TEST FAILED: Other user with role cannot delete the file', error);
    }
    
    // Clean up
    console.log('Cleaning up test files...');
    fs.rmSync(path.join(__dirname, 'test_files'), { recursive: true, force: true });
    
    console.log('All ACL tests completed!');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Run the tests
runTests();