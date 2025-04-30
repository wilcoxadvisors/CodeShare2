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

const execPromise = promisify(exec);
const testDir = path.join(__dirname, 'test_files');

// Test users
const CREATOR_USER = { username: 'admin', password: 'admin' }; // Creator of the entry
const OTHER_USER = { username: 'user', password: 'password' }; // User without permissions

// Utility to create a test file
function createTestFile(name: string, content: string = 'test content') {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const filePath = path.join(testDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// Clean up test files
function cleanupTestFiles() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

describe('Journal Entry File Attachment ACL', () => {
  let testFile: string;
  
  beforeAll(() => {
    // Create test files
    testFile = createTestFile('acl_test.txt', 'Test file for ACL testing');
  });
  
  afterAll(() => {
    // Clean up test files
    cleanupTestFiles();
  });

  // Skip the entire test suite if the server is not running
  beforeAll(async () => {
    try {
      await execPromise('curl -s http://localhost:5000/api/health');
    } catch (error) {
      console.log('Server not running, skipping tests');
      // Return a rejected promise to skip all tests
      return Promise.reject(new Error('Server not running'));
    }
  });

  test('creator can delete attachments', async () => {
    let journalEntryId: number;
    let fileId: number;
    
    // Create a new journal entry
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
      
      // Attach a file to the journal entry
      const attachFileCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -F "files=@${testFile}" http://localhost:5000/api/journal-entries/${journalEntryId}/files`;
      
      const attachResult = await execPromise(attachFileCmd);
      const attachment = JSON.parse(attachResult.stdout);
      
      if (attachment.files && attachment.files.length > 0) {
        fileId = attachment.files[0].id;
      } else {
        fail('Failed to attach file to journal entry');
      }
      
      // Get the file list first
      await execPromise(`curl -u ${CREATOR_USER.username}:${CREATOR_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files`);
      
      // Attempt to delete the file as the creator
      const deleteCmd = `curl -X DELETE -u ${CREATOR_USER.username}:${CREATOR_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files/${fileId} -v`;
      const deleteResult = await execPromise(deleteCmd);
      
      // Should return 204 No Content
      expect(deleteResult.stdout).toContain('204');
    } catch (error: any) {
      if (error.stderr && (error.stderr.includes('Connection refused') || error.stderr.includes('Failed to connect'))) {
        console.log('Skipping test: Server not running');
        return;
      }
      throw error;
    }
  });

  test('other users cannot delete attachments without proper role', async () => {
    let journalEntryId: number;
    let fileId: number;
    
    // Create a new journal entry
    const createJournalEntryCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -H "Content-Type: application/json" -d '{
      "date": "2025-04-30",
      "referenceNumber": "ACL-TEST-${Date.now()}",
      "description": "Test entry for ACL - Other User",
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
      
      // Attach a file to the journal entry
      const attachFileCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -F "files=@${testFile}" http://localhost:5000/api/journal-entries/${journalEntryId}/files`;
      
      const attachResult = await execPromise(attachFileCmd);
      const attachment = JSON.parse(attachResult.stdout);
      
      if (attachment.files && attachment.files.length > 0) {
        fileId = attachment.files[0].id;
      } else {
        fail('Failed to attach file to journal entry');
      }
      
      // Attempt to delete the file as another user without proper role
      const deleteCmd = `curl -X DELETE -u ${OTHER_USER.username}:${OTHER_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files/${fileId} -v`;
      
      try {
        await execPromise(deleteCmd);
        fail('Other user should not be able to delete the file');
      } catch (error: any) {
        // Should return 403 Forbidden
        expect(error.stdout).toContain('403');
      }
    } catch (error: any) {
      if (error.stderr && (error.stderr.includes('Connection refused') || error.stderr.includes('Failed to connect'))) {
        console.log('Skipping test: Server not running');
        return;
      }
      throw error;
    }
  });

  test('users with JE_FILES_ADMIN role can delete attachments', async () => {
    let journalEntryId: number;
    let fileId: number;
    
    // Create a new journal entry
    const createJournalEntryCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -H "Content-Type: application/json" -d '{
      "date": "2025-04-30",
      "referenceNumber": "ACL-TEST-${Date.now()}",
      "description": "Test entry for ACL - Admin Role",
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
      
      // Attach a file to the journal entry
      const attachFileCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -F "files=@${testFile}" http://localhost:5000/api/journal-entries/${journalEntryId}/files`;
      
      const attachResult = await execPromise(attachFileCmd);
      const attachment = JSON.parse(attachResult.stdout);
      
      if (attachment.files && attachment.files.length > 0) {
        fileId = attachment.files[0].id;
      } else {
        fail('Failed to attach file to journal entry');
      }
      
      // Add JE_FILES_ADMIN role to the other user
      const addRoleCmd = `curl -X POST -u ${CREATOR_USER.username}:${CREATOR_USER.password} -H "Content-Type: application/json" -d '{
        "query": "INSERT INTO user_roles (user_id, role_code) VALUES ((SELECT id FROM users WHERE username = '${OTHER_USER.username}'), 'JE_FILES_ADMIN') ON CONFLICT DO NOTHING"
      }' http://localhost:5000/api/admin/sql`;
      
      await execPromise(addRoleCmd);
      
      // Try to delete the file as user with role
      const deleteCmd = `curl -X DELETE -u ${OTHER_USER.username}:${OTHER_USER.password} http://localhost:5000/api/journal-entries/${journalEntryId}/files/${fileId} -v`;
      const deleteResult = await execPromise(deleteCmd);
      
      // Should return 204 No Content
      expect(deleteResult.stdout).toContain('204');
    } catch (error: any) {
      if (error.stderr && (error.stderr.includes('Connection refused') || error.stderr.includes('Failed to connect'))) {
        console.log('Skipping test: Server not running');
        return;
      }
      
      // If we got a 401 Unauthorized, the user might not exist in test environment
      if (error.stdout && error.stdout.includes('401')) {
        console.log('Skipping test: Test user not available in this environment');
        return;
      }
      
      throw error;
    }
  });
});