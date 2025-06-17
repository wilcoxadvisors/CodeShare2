import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/app';
import { db } from '../../server/db';
import { journalEntries, journalEntryLines, accounts, entities, clients, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Part 1 Continuation: API Validation Testing
 * 
 * Enhanced API validation tests to ensure endpoints correctly reject invalid data
 * and handle edge cases as specified in the architect's testing strategy.
 */
describe('Journal Entries API - Validation & Edge Cases', () => {
  let testClientId: number;
  let testEntityId: number;
  let testUserId: number;
  let testAccountDebit: number;
  let testAccountCredit: number;
  let authCookie: string;

  beforeAll(async () => {
    // Create test client
    const [client] = await db.insert(clients).values({
      name: 'API Validation Test Client',
      code: 'API_VAL_TEST',
      industry: 'testing',
      active: true
    }).returning();
    testClientId = client.id;

    // Create test entity
    const [entity] = await db.insert(entities).values({
      name: 'API Test Entity',
      code: 'API_TEST',
      entityCode: 'API-001',
      clientId: testClientId,
      ownerId: 1,
      active: true
    }).returning();
    testEntityId = entity.id;

    // Create test user
    const [user] = await db.insert(users).values({
      username: 'api_test_user',
      passwordHash: 'hash',
      name: 'API Test User',
      email: 'api@example.com',
      role: 'user'
    }).returning();
    testUserId = user.id;

    // Create test accounts
    const [debitAccount] = await db.insert(accounts).values({
      name: 'API Test Debit Account',
      code: 'API_DR',
      type: 'asset',
      clientId: testClientId,
      entityId: testEntityId,
      active: true
    }).returning();
    testAccountDebit = debitAccount.id;

    const [creditAccount] = await db.insert(accounts).values({
      name: 'API Test Credit Account',
      code: 'API_CR',
      type: 'liability',
      clientId: testClientId,
      entityId: testEntityId,
      active: true
    }).returning();
    testAccountCredit = creditAccount.id;

    // Authenticate user for API calls
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'api@example.com',
        password: 'hash'
      });
    
    authCookie = loginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId));
    await db.delete(accounts).where(eq(accounts.clientId, testClientId));
    await db.delete(entities).where(eq(entities.id, testEntityId));
    await db.delete(clients).where(eq(clients.id, testClientId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(async () => {
    // Clean up journal entries before each test
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId));
  });

  describe('Unbalanced Entry Validation', () => {
    it('should reject unbalanced journal entry creation with 400 status', async () => {
      const unbalancedEntry = {
        date: '2025-06-17',
        description: 'Unbalanced Entry Test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '500.00',
            description: 'Debit line',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '300.00', // Unbalanced!
            description: 'Credit line',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(unbalancedEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('unbalanced');
      expect(response.body.error).toContain('debits');
      expect(response.body.error).toContain('credits');
    });

    it('should reject empty lines array with 400 status', async () => {
      const entryWithoutLines = {
        date: '2025-06-17',
        description: 'Entry without lines',
        lines: []
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(entryWithoutLines);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('lines');
    });

    it('should reject single line entry with 400 status', async () => {
      const singleLineEntry = {
        date: '2025-06-17',
        description: 'Single line entry',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '500.00',
            description: 'Only line',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(singleLineEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('minimum');
    });
  });

  describe('Posted Entry Modification Prevention', () => {
    let postedEntryId: number;

    beforeEach(async () => {
      // Create and post an entry for testing
      const entryData = {
        date: '2025-06-17',
        description: 'Entry for modification test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '400.00',
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '400.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const createResponse = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(entryData);

      postedEntryId = createResponse.body.id;

      // Post the entry
      await request(app)
        .patch(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}/post`)
        .set('Cookie', authCookie);
    });

    it('should reject modification of posted entry with 403 status', async () => {
      const updateData = {
        description: 'Attempted modification of posted entry'
      };

      const response = await request(app)
        .patch(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}`)
        .set('Cookie', authCookie)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('posted');
      expect(response.body.error).toContain('modify');
    });

    it('should reject adding lines to posted entry with 403 status', async () => {
      const newLines = [
        {
          accountId: testAccountDebit,
          type: 'debit',
          amount: '100.00',
          description: 'Additional line',
          entityCode: 'API-001'
        },
        {
          accountId: testAccountCredit,
          type: 'credit',
          amount: '100.00',
          description: 'Balancing line',
          entityCode: 'API-001'
        }
      ];

      const response = await request(app)
        .patch(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}`)
        .set('Cookie', authCookie)
        .send({ lines: newLines });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('posted');
    });
  });

  describe('Invalid Data Type Validation', () => {
    it('should reject invalid amount format with 400 status', async () => {
      const invalidAmountEntry = {
        date: '2025-06-17',
        description: 'Invalid amount test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: 'invalid_amount', // Invalid format
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '500.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(invalidAmountEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('amount');
    });

    it('should reject negative amounts with 400 status', async () => {
      const negativeAmountEntry = {
        date: '2025-06-17',
        description: 'Negative amount test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '-500.00', // Negative amount
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '500.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(negativeAmountEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive');
    });

    it('should reject invalid account ID with 400 status', async () => {
      const invalidAccountEntry = {
        date: '2025-06-17',
        description: 'Invalid account test',
        lines: [
          {
            accountId: 99999, // Non-existent account
            type: 'debit',
            amount: '500.00',
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '500.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(invalidAccountEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('account');
    });

    it('should reject invalid line type with 400 status', async () => {
      const invalidTypeEntry = {
        date: '2025-06-17',
        description: 'Invalid type test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'invalid_type', // Invalid type
            amount: '500.00',
            description: 'Test line',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '500.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(invalidTypeEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('type');
    });
  });

  describe('Copy and Reverse Operation Validation', () => {
    let draftEntryId: number;
    let postedEntryId: number;

    beforeEach(async () => {
      // Create draft entry
      const draftData = {
        date: '2025-06-17',
        description: 'Draft for copy test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '300.00',
            description: 'Draft debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '300.00',
            description: 'Draft credit',
            entityCode: 'API-001'
          }
        ]
      };

      const draftResponse = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(draftData);

      draftEntryId = draftResponse.body.id;

      // Create and post another entry
      const postedData = {
        date: '2025-06-17',
        description: 'Posted for operations test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '600.00',
            description: 'Posted debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '600.00',
            description: 'Posted credit',
            entityCode: 'API-001'
          }
        ]
      };

      const postedResponse = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(postedData);

      postedEntryId = postedResponse.body.id;

      // Post the entry
      await request(app)
        .patch(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}/post`)
        .set('Cookie', authCookie);
    });

    it('should reject copy of non-posted entry with 400 status', async () => {
      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${draftEntryId}/copy`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('posted');
      expect(response.body.error).toContain('copy');
    });

    it('should reject reverse of non-posted entry with 400 status', async () => {
      const reversalData = {
        date: '2025-06-18',
        description: 'Attempted reversal',
        referenceNumber: 'REV-001'
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${draftEntryId}/reverse`)
        .set('Cookie', authCookie)
        .send(reversalData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('posted');
      expect(response.body.error).toContain('reverse');
    });

    it('should successfully copy posted entry with proper response structure', async () => {
      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}/copy`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.id).not.toBe(postedEntryId);
      expect(response.body.status).toBe('draft');
      expect(response.body.description).toContain('Copy of:');
      expect(response.body.referenceNumber).toContain('Copy of');
    });

    it('should successfully reverse posted entry with inverted amounts', async () => {
      const reversalData = {
        date: '2025-06-18',
        description: 'Proper reversal',
        referenceNumber: 'REV-002'
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}/reverse`)
        .set('Cookie', authCookie)
        .send(reversalData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.id).not.toBe(postedEntryId);
      expect(response.body.status).toBe('posted');
      expect(response.body.description).toBe('Proper reversal');
      expect(response.body.reversedEntryId).toBe(postedEntryId);

      // Verify lines are reversed
      const linesResponse = await request(app)
        .get(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${response.body.id}/lines`)
        .set('Cookie', authCookie);

      expect(linesResponse.status).toBe(200);
      const reversalLines = linesResponse.body;

      // Get original lines for comparison
      const originalLinesResponse = await request(app)
        .get(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries/${postedEntryId}/lines`)
        .set('Cookie', authCookie);

      const originalLines = originalLinesResponse.body;

      // Verify amounts are reversed
      for (const originalLine of originalLines) {
        const correspondingReversalLine = reversalLines.find(
          (rl: any) => rl.accountId === originalLine.accountId
        );
        
        expect(correspondingReversalLine).toBeDefined();
        expect(correspondingReversalLine.amount).toBe(originalLine.amount);
        expect(correspondingReversalLine.type).toBe(
          originalLine.type === 'debit' ? 'credit' : 'debit'
        );
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication with 401 status', async () => {
      const entryData = {
        date: '2025-06-17',
        description: 'Unauthorized request test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '100.00',
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '100.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .send(entryData);

      expect(response.status).toBe(401);
    });

    it('should reject requests to wrong client/entity with 403 status', async () => {
      const wrongEntityId = 99999;
      
      const entryData = {
        date: '2025-06-17',
        description: 'Wrong entity test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '100.00',
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '100.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${wrongEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(entryData);

      expect(response.status).toBe(403);
    });
  });

  describe('Data Type and Format Validation', () => {
    it('should reject invalid date format with 400 status', async () => {
      const invalidDateEntry = {
        date: 'invalid-date-format',
        description: 'Invalid date test',
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '100.00',
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '100.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(invalidDateEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('date');
    });

    it('should reject missing required fields with 400 status', async () => {
      const incompleteEntry = {
        date: '2025-06-17',
        // Missing description
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit',
            amount: '100.00',
            description: 'Test debit',
            entityCode: 'API-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit',
            amount: '100.00',
            description: 'Test credit',
            entityCode: 'API-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId}/entities/${testEntityId}/journal-entries`)
        .set('Cookie', authCookie)
        .send(incompleteEntry);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('description');
    });
  });
});