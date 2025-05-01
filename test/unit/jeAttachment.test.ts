/**
 * Journal Entry File Attachment Tests
 * 
 * This test suite validates that file attachments can be added and deleted
 * for journal entries in both 'draft' and 'pending_approval' statuses.
 */

import { server } from '../../server/index';
import { jest } from '@jest/globals';
import request from 'supertest';
import { db } from '../../server/db';
import { journalEntries, journalEntryFiles } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Mock user ID for authentication
const TEST_USER_ID = 1;

// Mock authentication middleware 
jest.mock('../../server/authMiddleware', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = { id: TEST_USER_ID, isAdmin: true };
    next();
  }
}));

describe('Journal Entry File Permissions', () => {
  let draftJournalEntryId: number;
  let pendingApprovalJournalEntryId: number;
  let postedJournalEntryId: number;
  
  // Create sample PDF file for testing
  const testPdfContent = Buffer.from(
    '%PDF-1.3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF'
  );
  const testFilePath = path.join(__dirname, 'test-file.pdf');

  beforeAll(async () => {
    // Write test file
    fs.writeFileSync(testFilePath, testPdfContent);
    
    // Create journal entries with different statuses
    const createDraftRes = await request(server)
      .post('/api/entities/1/journal-entries')
      .send({
        date: '2025-05-15',
        clientId: 1,
        entityId: 1,
        description: 'Draft entry for file test',
        journalType: 'JE',
        status: 'draft',
        lines: [
          { type: 'debit', accountId: 1, amount: '100.00', description: 'Test debit' },
          { type: 'credit', accountId: 2, amount: '100.00', description: 'Test credit' }
        ]
      });
    
    draftJournalEntryId = createDraftRes.body.id;
    
    const createPendingRes = await request(server)
      .post('/api/entities/1/journal-entries')
      .send({
        date: '2025-05-15',
        clientId: 1,
        entityId: 1,
        description: 'Pending approval entry for file test',
        journalType: 'JE',
        status: 'pending_approval',
        lines: [
          { type: 'debit', accountId: 1, amount: '100.00', description: 'Test debit' },
          { type: 'credit', accountId: 2, amount: '100.00', description: 'Test credit' }
        ]
      });
    
    pendingApprovalJournalEntryId = createPendingRes.body.id;
    
    const createPostedRes = await request(server)
      .post('/api/entities/1/journal-entries')
      .send({
        date: '2025-05-15',
        clientId: 1,
        entityId: 1,
        description: 'Posted entry for file test',
        journalType: 'JE',
        status: 'posted',
        lines: [
          { type: 'debit', accountId: 1, amount: '100.00', description: 'Test debit' },
          { type: 'credit', accountId: 2, amount: '100.00', description: 'Test credit' }
        ]
      });
    
    postedJournalEntryId = createPostedRes.body.id;
  });

  afterAll(async () => {
    // Clean up test data and close server
    if (draftJournalEntryId) {
      await db.delete(journalEntries).where(eq(journalEntries.id, draftJournalEntryId));
    }
    
    if (pendingApprovalJournalEntryId) {
      await db.delete(journalEntries).where(eq(journalEntries.id, pendingApprovalJournalEntryId));
    }
    
    if (postedJournalEntryId) {
      await db.delete(journalEntries).where(eq(journalEntries.id, postedJournalEntryId));
    }
    
    // Delete test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    server.close();
  });

  test('Should allow file upload and deletion for draft journal entries', async () => {
    // 1. Upload file to draft journal entry
    const uploadRes = await request(server)
      .post(`/api/journal-entries/${draftJournalEntryId}/files`)
      .attach('files', testFilePath);
    
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.files).toHaveLength(1);
    
    const fileId = uploadRes.body.files[0].id;
    
    // 2. Verify file exists in database
    const [dbFile] = await db.select()
      .from(journalEntryFiles)
      .where(
        and(
          eq(journalEntryFiles.journalEntryId, draftJournalEntryId),
          eq(journalEntryFiles.id, fileId)
        )
      );
    
    expect(dbFile).toBeTruthy();
    
    // 3. Delete the file
    const deleteRes = await request(server)
      .delete(`/api/journal-entries/${draftJournalEntryId}/files/${fileId}`);
    
    expect(deleteRes.status).toBe(200);
    
    // 4. Verify file is deleted
    const [deletedDbFile] = await db.select()
      .from(journalEntryFiles)
      .where(
        and(
          eq(journalEntryFiles.journalEntryId, draftJournalEntryId),
          eq(journalEntryFiles.id, fileId)
        )
      );
    
    expect(deletedDbFile).toBeUndefined();
  });

  test('Should allow file upload and deletion for pending approval journal entries', async () => {
    // 1. Upload file to pending approval journal entry
    const uploadRes = await request(server)
      .post(`/api/journal-entries/${pendingApprovalJournalEntryId}/files`)
      .attach('files', testFilePath);
    
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.files).toHaveLength(1);
    
    const fileId = uploadRes.body.files[0].id;
    
    // 2. Verify file exists in database
    const [dbFile] = await db.select()
      .from(journalEntryFiles)
      .where(
        and(
          eq(journalEntryFiles.journalEntryId, pendingApprovalJournalEntryId),
          eq(journalEntryFiles.id, fileId)
        )
      );
    
    expect(dbFile).toBeTruthy();
    
    // 3. Delete the file
    const deleteRes = await request(server)
      .delete(`/api/journal-entries/${pendingApprovalJournalEntryId}/files/${fileId}`);
    
    expect(deleteRes.status).toBe(200);
    
    // 4. Verify file is deleted
    const [deletedDbFile] = await db.select()
      .from(journalEntryFiles)
      .where(
        and(
          eq(journalEntryFiles.journalEntryId, pendingApprovalJournalEntryId),
          eq(journalEntryFiles.id, fileId)
        )
      );
    
    expect(deletedDbFile).toBeUndefined();
  });

  test('Should not allow file upload for posted journal entries', async () => {
    // Try to upload file to posted journal entry
    const uploadRes = await request(server)
      .post(`/api/journal-entries/${postedJournalEntryId}/files`)
      .attach('files', testFilePath);
    
    // Should return 403 Forbidden
    expect(uploadRes.status).toBe(403);
  });
});