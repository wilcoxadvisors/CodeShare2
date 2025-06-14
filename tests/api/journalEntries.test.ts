import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../server/app';
import { db } from '../../server/db';
import { journalEntries, journalEntryLines, accounts, entities, clients, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Journal Entries API', () => {
  let testClientId1: number;
  let testClientId2: number;
  let testEntityId1: number;
  let testEntityId2: number;
  let testUserId1: number;
  let testUserId2: number;
  let testAccountDebit1: number;
  let testAccountCredit1: number;
  let testAccountDebit2: number;
  let testAccountCredit2: number;
  let authCookie1: string;
  let authCookie2: string;

  beforeAll(async () => {
    // Create test clients
    const [client1] = await db.insert(clients).values({
      name: 'Test Client 1',
      code: 'TEST_CLIENT_1',
      industry: 'testing',
      active: true
    }).returning();
    testClientId1 = client1.id;

    const [client2] = await db.insert(clients).values({
      name: 'Test Client 2',
      code: 'TEST_CLIENT_2',
      industry: 'testing',
      active: true
    }).returning();
    testClientId2 = client2.id;

    // Create test entities
    const [entity1] = await db.insert(entities).values({
      name: 'Test Entity 1',
      code: 'TEST_ENT_1',
      entityCode: 'TEST-001',
      clientId: testClientId1,
      ownerId: 1,
      active: true
    }).returning();
    testEntityId1 = entity1.id;

    const [entity2] = await db.insert(entities).values({
      name: 'Test Entity 2',
      code: 'TEST_ENT_2',
      entityCode: 'TEST-002',
      clientId: testClientId2,
      ownerId: 1,
      active: true
    }).returning();
    testEntityId2 = entity2.id;

    // Create test users
    const [user1] = await db.insert(users).values({
      username: 'testuser1',
      passwordHash: '$2b$10$hash1',
      name: 'Test User 1',
      email: 'test1@example.com',
      role: 'user'
    }).returning();
    testUserId1 = user1.id;

    const [user2] = await db.insert(users).values({
      username: 'testuser2',
      passwordHash: '$2b$10$hash2',
      name: 'Test User 2',
      email: 'test2@example.com',
      role: 'user'
    }).returning();
    testUserId2 = user2.id;

    // Create test accounts for client 1
    const [debitAccount1] = await db.insert(accounts).values({
      name: 'Test Debit Account 1',
      code: 'TEST_DR_1',
      type: 'asset',
      clientId: testClientId1,
      entityId: testEntityId1,
      active: true
    }).returning();
    testAccountDebit1 = debitAccount1.id;

    const [creditAccount1] = await db.insert(accounts).values({
      name: 'Test Credit Account 1',
      code: 'TEST_CR_1',
      type: 'liability',
      clientId: testClientId1,
      entityId: testEntityId1,
      active: true
    }).returning();
    testAccountCredit1 = creditAccount1.id;

    // Create test accounts for client 2
    const [debitAccount2] = await db.insert(accounts).values({
      name: 'Test Debit Account 2',
      code: 'TEST_DR_2',
      type: 'asset',
      clientId: testClientId2,
      entityId: testEntityId2,
      active: true
    }).returning();
    testAccountDebit2 = debitAccount2.id;

    const [creditAccount2] = await db.insert(accounts).values({
      name: 'Test Credit Account 2',
      code: 'TEST_CR_2',
      type: 'liability',
      clientId: testClientId2,
      entityId: testEntityId2,
      active: true
    }).returning();
    testAccountCredit2 = creditAccount2.id;

    // Login users to get auth cookies
    const loginResponse1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser1', password: 'password' });
    authCookie1 = loginResponse1.headers['set-cookie'][0];

    const loginResponse2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser2', password: 'password' });
    authCookie2 = loginResponse2.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit1));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit1));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit2));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit2));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId1));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId2));
    await db.delete(accounts).where(eq(accounts.clientId, testClientId1));
    await db.delete(accounts).where(eq(accounts.clientId, testClientId2));
    await db.delete(entities).where(eq(entities.id, testEntityId1));
    await db.delete(entities).where(eq(entities.id, testEntityId2));
    await db.delete(clients).where(eq(clients.id, testClientId1));
    await db.delete(clients).where(eq(clients.id, testClientId2));
    await db.delete(users).where(eq(users.id, testUserId1));
    await db.delete(users).where(eq(users.id, testUserId2));
  });

  beforeEach(async () => {
    // Clean up journal entries before each test
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit1));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit1));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit2));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit2));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId1));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId2));
  });

  describe('Authentication Tests', () => {
    it('should return 401 for GET /journal-entries without authentication', async () => {
      const response = await request(app)
        .get(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 for POST /journal-entries without authentication', async () => {
      const response = await request(app)
        .post(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`)
        .send({
          date: '2025-06-14',
          description: 'Test Entry',
          lines: []
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 for POST /journal-entries/:id/copy without authentication', async () => {
      const response = await request(app)
        .post(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries/1/copy`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Input Validation Tests', () => {
    it('should return 400 for unbalanced journal entry creation', async () => {
      const unbalancedEntry = {
        date: '2025-06-14',
        description: 'Unbalanced Entry',
        lines: [
          {
            accountId: testAccountDebit1,
            type: 'debit',
            amount: '100.00',
            description: 'Debit line',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit1,
            type: 'credit',
            amount: '50.00',
            description: 'Credit line',
            entityCode: 'TEST-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`)
        .set('Cookie', authCookie1)
        .send(unbalancedEntry);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('unbalanced');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteEntry = {
        // Missing date
        description: 'Incomplete Entry',
        lines: []
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`)
        .set('Cookie', authCookie1)
        .send(incompleteEntry);

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should create journal entry with valid data and return 201', async () => {
      const validEntry = {
        date: '2025-06-14',
        description: 'Valid Entry',
        journalType: 'JE',
        lines: [
          {
            accountId: testAccountDebit1,
            type: 'debit',
            amount: '150.00',
            description: 'Valid debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit1,
            type: 'credit',
            amount: '150.00',
            description: 'Valid credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`)
        .set('Cookie', authCookie1)
        .send(validEntry);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.description).toBe('Valid Entry');
      expect(response.body.status).toBe('draft');
      expect(response.body.referenceNumber).toBeDefined();
      expect(response.body.lines).toHaveLength(2);
    });

    it('should get journal entries list and return 200', async () => {
      // Create a test entry first
      const entryData = {
        date: '2025-06-14',
        description: 'List Test Entry',
        lines: [
          {
            accountId: testAccountDebit1,
            type: 'debit',
            amount: '100.00',
            description: 'Test debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit1,
            type: 'credit',
            amount: '100.00',
            description: 'Test credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      await request(app)
        .post(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`)
        .set('Cookie', authCookie1)
        .send(entryData);

      const response = await request(app)
        .get(`/api/clients/${testClientId1}/entities/${testEntityId1}/journal-entries`)
        .set('Cookie', authCookie1);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});