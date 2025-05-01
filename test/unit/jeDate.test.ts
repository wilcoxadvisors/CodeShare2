/**
 * Journal Entry Date Format Tests
 * 
 * This test suite validates that journal entry dates are properly handled
 * across create, update, and retrieve operations without timezone issues.
 */

import { server } from '../../server/index';
import { jest } from '@jest/globals';
import request from 'supertest';
import { db } from '../../server/db';
import { journalEntries } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Mock user ID for authentication
const TEST_USER_ID = 1;

// Mock authentication middleware 
jest.mock('../../server/authMiddleware', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = { id: TEST_USER_ID, isAdmin: true };
    next();
  }
}));

describe('Journal Entry Date Handling', () => {
  const testDate = '2025-05-15'; // May 15, 2025
  let createdJournalEntryId: number;

  afterAll(async () => {
    // Clean up test data and close server
    if (createdJournalEntryId) {
      await db.delete(journalEntries).where(eq(journalEntries.id, createdJournalEntryId));
    }
    server.close();
  });

  test('Should store and retrieve journal entry date in YYYY-MM-DD format', async () => {
    // 1. Create a journal entry with a specific date
    const createRes = await request(server)
      .post('/api/entities/1/journal-entries')
      .send({
        date: testDate,
        clientId: 1,
        entityId: 1,
        description: 'Test date format',
        journalType: 'JE',
        status: 'draft',
        lines: [
          {
            type: 'debit',
            accountId: 1,
            amount: '100.00',
            description: 'Test debit'
          },
          {
            type: 'credit',
            accountId: 2,
            amount: '100.00',
            description: 'Test credit'
          }
        ]
      });

    expect(createRes.status).toBe(201);
    createdJournalEntryId = createRes.body.id;
    
    // 2. Retrieve the journal entry
    const getRes = await request(server)
      .get(`/api/entities/1/journal-entries/${createdJournalEntryId}`);
    
    expect(getRes.status).toBe(200);
    expect(getRes.body.date).toBe(testDate);
    
    // 3. Update the journal entry (without changing the date)
    const updateRes = await request(server)
      .put(`/api/entities/1/journal-entries/${createdJournalEntryId}`)
      .send({
        description: 'Updated description',
        lines: [
          {
            type: 'debit',
            accountId: 1,
            amount: '100.00',
            description: 'Updated debit'
          },
          {
            type: 'credit',
            accountId: 2,
            amount: '100.00',
            description: 'Updated credit'
          }
        ]
      });
    
    expect(updateRes.status).toBe(200);
    
    // 4. Retrieve the updated journal entry and verify date is unchanged
    const getUpdatedRes = await request(server)
      .get(`/api/entities/1/journal-entries/${createdJournalEntryId}`);
    
    expect(getUpdatedRes.status).toBe(200);
    expect(getUpdatedRes.body.date).toBe(testDate);
    
    // 5. Verify date in database directly 
    const [dbEntry] = await db.select({ date: journalEntries.date })
      .from(journalEntries)
      .where(eq(journalEntries.id, createdJournalEntryId));
    
    // Format the date to YYYY-MM-DD for comparison
    const dbDate = dbEntry?.date instanceof Date 
      ? dbEntry.date.toISOString().split('T')[0] 
      : String(dbEntry?.date);
    
    expect(dbDate).toBe(testDate);
  });

  test('Should filter journal entries by date range correctly', async () => {
    // Test date filtering with string dates
    const filteredRes = await request(server)
      .get('/api/entities/1/journal-entries')
      .query({ 
        startDate: '2025-05-01', 
        endDate: '2025-05-31'
      });
    
    expect(filteredRes.status).toBe(200);
    
    // If our test entry exists, it should be in the results
    const found = filteredRes.body.find((entry: any) => entry.id === createdJournalEntryId);
    expect(found).toBeTruthy();
  });
});