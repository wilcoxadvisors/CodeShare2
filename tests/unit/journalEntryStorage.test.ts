import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JournalEntryStorage } from '../../server/storage/journalEntryStorage';
import { db } from '../../server/db';
import { journalEntries, journalEntryLines, accounts, entities, clients, users, dimensionValues, dimensions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

describe('JournalEntryStorage', () => {
  let storage: JournalEntryStorage;
  let testClientId: number;
  let testEntityId: number;
  let testUserId: number;
  let testAccountDebit: number;
  let testAccountCredit: number;

  beforeAll(async () => {
    storage = new JournalEntryStorage();
    
    // Create test client
    const [client] = await db.insert(clients).values({
      name: 'Test Client',
      code: 'TEST_CLIENT',
      industry: 'testing',
      active: true
    }).returning();
    testClientId = client.id;

    // Create test entity
    const [entity] = await db.insert(entities).values({
      name: 'Test Entity',
      code: 'TEST_ENT',
      entityCode: 'TEST-001',
      clientId: testClientId,
      ownerId: 1,
      active: true
    }).returning();
    testEntityId = entity.id;

    // Create test user
    const [user] = await db.insert(users).values({
      username: 'testuser',
      passwordHash: 'hash',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    }).returning();
    testUserId = user.id;

    // Create test accounts
    const [debitAccount] = await db.insert(accounts).values({
      name: 'Test Debit Account',
      code: 'TEST_DR',
      type: 'asset',
      clientId: testClientId,
      entityId: testEntityId,
      active: true
    }).returning();
    testAccountDebit = debitAccount.id;

    const [creditAccount] = await db.insert(accounts).values({
      name: 'Test Credit Account', 
      code: 'TEST_CR',
      type: 'liability',
      clientId: testClientId,
      entityId: testEntityId,
      active: true
    }).returning();
    testAccountCredit = creditAccount.id;
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
    // Clean up any journal entries created in tests
    await db.delete(journalEntryLines).where(
      and(
        eq(journalEntryLines.accountId, testAccountDebit)
      )
    );
    await db.delete(journalEntryLines).where(
      and(
        eq(journalEntryLines.accountId, testAccountCredit)
      )
    );
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId));
  });

  describe('createJournalEntry', () => {
    it('should create a new journal entry with draft status', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Test Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Test debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00', 
            description: 'Test credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const result = await storage.createJournalEntry(testClientId, testUserId, entryData);

      expect(result).toBeDefined();
      expect(result.status).toBe('draft');
      expect(result.description).toBe('Test Entry');
      expect(result.clientId).toBe(testClientId);
      expect(result.entityId).toBe(testEntityId);
      expect(result.referenceNumber).toBeDefined();
      expect(result.referenceNumber).toContain(`JE-${testClientId}-${testEntityId}`);
    });

    it('should correctly save all lines with amounts, types, and descriptions', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Test Entry with Lines',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '250.50',
            description: 'Detailed debit line',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '250.50',
            description: 'Detailed credit line', 
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const lines = await storage.getJournalEntryLines(journal.id);

      expect(lines).toHaveLength(2);
      
      const debitLine = lines.find(l => l.type === 'debit');
      const creditLine = lines.find(l => l.type === 'credit');

      expect(debitLine).toBeDefined();
      expect(debitLine!.amount).toBe('250.5000');
      expect(debitLine!.description).toBe('Detailed debit line');
      expect(debitLine!.accountId).toBe(testAccountDebit);

      expect(creditLine).toBeDefined();
      expect(creditLine!.amount).toBe('250.5000');
      expect(creditLine!.description).toBe('Detailed credit line');
      expect(creditLine!.accountId).toBe(testAccountCredit);
    });

    it('should create journal entry with accrual fields', async () => {
      const futureDate = '2025-12-31';
      const entryData = {
        date: '2025-06-14',
        description: 'Accrual Test Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        isAccrual: true,
        reversalDate: futureDate,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Accrual debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '500.00',
            description: 'Accrual credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const result = await storage.createJournalEntry(testClientId, testUserId, entryData);

      expect(result.isAccrual).toBe(true);
      expect(result.reversalDate).toBe(futureDate);
    });

    it('should generate unique reference numbers', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Reference Test',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Test',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00',
            description: 'Test',
            entityCode: 'TEST-001'
          }
        ]
      };

      const entry1 = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const entry2 = await storage.createJournalEntry(testClientId, testUserId, entryData);

      expect(entry1.referenceNumber).toBeDefined();
      expect(entry2.referenceNumber).toBeDefined();
      expect(entry1.referenceNumber).not.toBe(entry2.referenceNumber);
    });
  });

  describe('updateJournalEntry', () => {
    let testJournalId: number;

    beforeEach(async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Original Description',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Original debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00',
            description: 'Original credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      testJournalId = journal.id;
    });

    it('should successfully update header fields', async () => {
      const updateData = {
        description: 'Updated Description',
        date: '2025-06-15'
      };

      const result = await storage.updateJournalEntry(testJournalId, updateData);

      expect(result).toBeDefined();
      expect(result!.description).toBe('Updated Description');
      expect(result!.date).toBe('2025-06-15');
    });

    it('should handle complex transaction updates', async () => {
      // Get original lines
      const originalLines = await storage.getJournalEntryLines(testJournalId);
      expect(originalLines).toHaveLength(2);
      
      const debitLine = originalLines.find(l => l.type === 'debit')!;
      const creditLine = originalLines.find(l => l.type === 'credit')!;

      // Complex update: modify header, update one line, delete one line, add new line
      const updateData = {
        description: 'Complex Update Description',
        lines: [
          // Update existing debit line
          {
            id: debitLine.id,
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '150.00',
            description: 'Updated debit line',
            entityCode: 'TEST-001'
          },
          // Delete credit line by omitting it
          // Add new line
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '150.00', 
            description: 'New credit line',
            entityCode: 'TEST-001'
          }
        ]
      };

      const result = await storage.updateJournalEntryWithLines(testJournalId, updateData, updateData.lines);

      expect(result).toBeDefined();
      expect(result!.description).toBe('Complex Update Description');

      const updatedLines = await storage.getJournalEntryLines(testJournalId);
      expect(updatedLines).toHaveLength(2);

      const updatedDebitLine = updatedLines.find(l => l.id === debitLine.id);
      expect(updatedDebitLine).toBeDefined();
      expect(updatedDebitLine!.amount).toBe('150.0000');
      expect(updatedDebitLine!.description).toBe('Updated debit line');

      // Original credit line should be gone, new one should exist
      const newCreditLine = updatedLines.find(l => l.id !== debitLine.id);
      expect(newCreditLine).toBeDefined();
      expect(newCreditLine!.description).toBe('New credit line');
      expect(newCreditLine!.id).not.toBe(creditLine.id);
    });
  });

  describe('copyJournalEntry', () => {
    let testJournalId: number;

    beforeEach(async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Original Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        status: 'posted' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '300.00',
            description: 'Original debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '300.00',
            description: 'Original credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      // Manually update to posted status for testing
      await db.update(journalEntries)
        .set({ status: 'posted' })
        .where(eq(journalEntries.id, journal.id));
      testJournalId = journal.id;
    });

    it('should create a copy with draft status and "Copy of:" prefix', async () => {
      const copiedEntry = await storage.copyJournalEntry(testJournalId, testUserId);

      expect(copiedEntry).toBeDefined();
      expect(copiedEntry.status).toBe('draft');
      expect(copiedEntry.description).toBe('Copy of: Original Entry');
      expect(copiedEntry.referenceNumber).toContain('Copy of');
      expect(copiedEntry.id).not.toBe(testJournalId);
    });

    it('should perfectly duplicate all lines', async () => {
      const originalLines = await storage.getJournalEntryLines(testJournalId);
      const copiedEntry = await storage.copyJournalEntry(testJournalId, testUserId);
      const copiedLines = await storage.getJournalEntryLines(copiedEntry.id);

      expect(copiedLines).toHaveLength(originalLines.length);

      // Check each line is duplicated correctly
      for (const originalLine of originalLines) {
        const matchingCopiedLine = copiedLines.find(
          cl => cl.accountId === originalLine.accountId && 
                cl.type === originalLine.type &&
                cl.amount === originalLine.amount
        );

        expect(matchingCopiedLine).toBeDefined();
        expect(matchingCopiedLine!.description).toBe(originalLine.description);
        expect(matchingCopiedLine!.journalEntryId).toBe(copiedEntry.id);
        expect(matchingCopiedLine!.id).not.toBe(originalLine.id);
      }
    });

    it('should fail to copy a non-posted journal entry', async () => {
      // Create a draft entry
      const draftData = {
        date: '2025-06-14',
        description: 'Draft Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Draft debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00',
            description: 'Draft credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const draftEntry = await storage.createJournalEntry(testClientId, testUserId, draftData);

      await expect(storage.copyJournalEntry(draftEntry.id, testUserId))
        .rejects
        .toThrow('Cannot copy a non-posted journal entry');
    });
  });

  describe('validateJournalEntryBalance', () => {
    it('should validate balanced entries', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Balanced Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Debit line',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '500.00',
            description: 'Credit line',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const isBalanced = await storage.validateJournalEntryBalance(journal.id);

      expect(isBalanced).toBe(true);
    });

    it('should detect unbalanced entries', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Unbalanced Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Debit line',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '300.00',
            description: 'Credit line',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const isBalanced = await storage.validateJournalEntryBalance(journal.id);

      expect(isBalanced).toBe(false);
    });
  });

  describe('reverseJournalEntry', () => {
    let testJournalId: number;

    beforeEach(async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Entry to Reverse',
        entityId: testEntityId,
        journalType: 'JE' as const,
        status: 'posted' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '400.00',
            description: 'Original debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '400.00',
            description: 'Original credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      await db.update(journalEntries)
        .set({ status: 'posted' })
        .where(eq(journalEntries.id, journal.id));
      testJournalId = journal.id;
    });

    it('should create reversal entry with reversed amounts', async () => {
      const reversalOptions = {
        date: new Date('2025-06-15'),
        description: 'Reversal of original entry',
        createdBy: testUserId,
        referenceNumber: 'REV-001'
      };

      const reversalEntry = await storage.reverseJournalEntry(testJournalId, reversalOptions);

      expect(reversalEntry).toBeDefined();
      expect(reversalEntry!.description).toBe('Reversal of original entry');
      expect(reversalEntry!.status).toBe('posted');
      expect(reversalEntry!.reversedEntryId).toBe(testJournalId);

      const reversalLines = await storage.getJournalEntryLines(reversalEntry!.id);
      expect(reversalLines).toHaveLength(2);

      // Check that amounts are reversed (debit becomes credit, credit becomes debit)
      const originalLines = await storage.getJournalEntryLines(testJournalId);
      for (const originalLine of originalLines) {
        const correspondingReversalLine = reversalLines.find(
          rl => rl.accountId === originalLine.accountId
        );
        
        expect(correspondingReversalLine).toBeDefined();
        expect(correspondingReversalLine!.amount).toBe(originalLine.amount);
        expect(correspondingReversalLine!.type).toBe(
          originalLine.type === 'debit' ? 'credit' : 'debit'
        );
      }
    });

    it('should fail to reverse a non-posted journal entry', async () => {
      // Create a draft entry
      const draftData = {
        date: '2025-06-14',
        description: 'Draft Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Draft debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00',
            description: 'Draft credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const draftEntry = await storage.createJournalEntry(testClientId, testUserId, draftData);

      const reversalOptions = {
        date: new Date('2025-06-15'),
        description: 'Attempted reversal',
        createdBy: testUserId,
        referenceNumber: 'REV-FAIL'
      };

      await expect(storage.reverseJournalEntry(draftEntry.id, reversalOptions))
        .rejects
        .toThrow();
    });
  });

  // Enhanced Data Integrity Tests for Architect's Strategy
  describe('Data Integrity - updateJournalEntryWithLines', () => {
    let testJournalId: number;
    let dimensionValueId: number;

    beforeEach(async () => {
      // Create test dimension first
      const [dimension] = await db.insert(dimensions).values({
        name: 'Department',
        code: 'DEPT',
        clientId: testClientId,
        active: true
      }).returning();
      
      // Create test dimension value for testing
      const [dimValue] = await db.insert(dimensionValues).values({
        name: 'Test Department',
        code: 'TEST_DEPT',
        dimensionId: dimension.id,
        clientId: testClientId,
        active: true
      }).returning();
      dimensionValueId = dimValue.id;

      const entryData = {
        date: '2025-06-14',
        description: 'Data Integrity Test Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Original debit with dimension',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '500.00',
            description: 'Original credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      testJournalId = journal.id;
    });

    it('should preserve existing lines while adding new ones in atomic transaction', async () => {
      const originalLines = await storage.getJournalEntryLines(testJournalId);
      expect(originalLines).toHaveLength(2);

      const updateData = {
        description: 'Updated with additional line',
        lines: [
          // Keep first line unchanged
          {
            id: originalLines[0].id,
            accountId: originalLines[0].accountId,
            type: originalLines[0].type,
            amount: originalLines[0].amount,
            description: originalLines[0].description,
            entityCode: originalLines[0].entityCode
          },
          // Keep second line unchanged
          {
            id: originalLines[1].id,
            accountId: originalLines[1].accountId,
            type: originalLines[1].type,
            amount: originalLines[1].amount,
            description: originalLines[1].description,
            entityCode: originalLines[1].entityCode
          },
          // Add new debit line
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '200.00',
            description: 'Additional debit',
            entityCode: 'TEST-001'
          },
          // Add new credit line to balance
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '200.00',
            description: 'Additional credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const result = await storage.updateJournalEntryWithLines(testJournalId, updateData, updateData.lines);

      expect(result).toBeDefined();
      expect(result!.description).toBe('Updated with additional line');

      const updatedLines = await storage.getJournalEntryLines(testJournalId);
      expect(updatedLines).toHaveLength(4);

      // Verify original lines are preserved
      const preservedLine1 = updatedLines.find(l => l.id === originalLines[0].id);
      const preservedLine2 = updatedLines.find(l => l.id === originalLines[1].id);
      
      expect(preservedLine1).toBeDefined();
      expect(preservedLine2).toBeDefined();
      expect(preservedLine1!.description).toBe(originalLines[0].description);
      expect(preservedLine2!.description).toBe(originalLines[1].description);

      // Verify new lines exist
      const newLines = updatedLines.filter(l => !originalLines.some(ol => ol.id === l.id));
      expect(newLines).toHaveLength(2);
    });

    it('should properly delete lines within transaction', async () => {
      const originalLines = await storage.getJournalEntryLines(testJournalId);
      expect(originalLines).toHaveLength(2);

      const updateData = {
        description: 'Updated with line deletion',
        lines: [
          // Keep only one line, effectively deleting the other
          {
            id: originalLines[0].id,
            accountId: originalLines[0].accountId,
            type: originalLines[0].type,
            amount: '300.00', // Also modify amount
            description: 'Modified and preserved line',
            entityCode: originalLines[0].entityCode
          },
          // Add a new balancing credit line
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '300.00',
            description: 'New balancing credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const result = await storage.updateJournalEntryWithLines(testJournalId, updateData, updateData.lines);

      expect(result).toBeDefined();
      
      const updatedLines = await storage.getJournalEntryLines(testJournalId);
      expect(updatedLines).toHaveLength(2);

      // Verify the preserved line was modified
      const modifiedLine = updatedLines.find(l => l.id === originalLines[0].id);
      expect(modifiedLine).toBeDefined();
      expect(modifiedLine!.amount).toBe('300.0000');
      expect(modifiedLine!.description).toBe('Modified and preserved line');

      // Verify the original second line was deleted
      const deletedLine = updatedLines.find(l => l.id === originalLines[1].id);
      expect(deletedLine).toBeUndefined();

      // Verify new line exists
      const newLine = updatedLines.find(l => l.description === 'New balancing credit');
      expect(newLine).toBeDefined();
    });

    it('should handle dimension tag updates correctly', async () => {
      const originalLines = await storage.getJournalEntryLines(testJournalId);
      const lineToUpdate = originalLines[0];

      const updateData = {
        description: 'Entry with dimension tags',
        lines: [
          {
            id: lineToUpdate.id,
            accountId: lineToUpdate.accountId,
            type: lineToUpdate.type,
            amount: lineToUpdate.amount,
            description: lineToUpdate.description,
            entityCode: lineToUpdate.entityCode,
            dimensionTags: [
              {
                dimensionValueId: dimensionValueId,
                amount: lineToUpdate.amount
              }
            ]
          },
          // Keep second line as is
          {
            id: originalLines[1].id,
            accountId: originalLines[1].accountId,
            type: originalLines[1].type,
            amount: originalLines[1].amount,
            description: originalLines[1].description,
            entityCode: originalLines[1].entityCode
          }
        ]
      };

      const result = await storage.updateJournalEntryWithLines(testJournalId, updateData, updateData.lines);

      expect(result).toBeDefined();

      // Verify dimension tags were properly saved
      const linesWithTags = await storage.getJournalEntryLinesWithDimensions(testJournalId);
      const lineWithTag = linesWithTags.find(l => l.id === lineToUpdate.id);
      
      expect(lineWithTag).toBeDefined();
      expect(lineWithTag!.dimensionTags).toHaveLength(1);
      expect(lineWithTag!.dimensionTags[0].dimensionValueId).toBe(dimensionValueId);
    });
  });

  describe('Edge Cases and Business Rules', () => {
    it('should reject unbalanced journal entry creation', async () => {
      const unbalancedEntryData = {
        date: '2025-06-14',
        description: 'Unbalanced Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Debit line',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '300.00', // Unbalanced!
            description: 'Credit line',
            entityCode: 'TEST-001'
          }
        ]
      };

      await expect(storage.createJournalEntry(testClientId, testUserId, unbalancedEntryData))
        .rejects
        .toThrow();
    });

    it('should prevent modification of posted entries', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Posted Entry',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00',
            description: 'Credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      
      // Update to posted status
      await db.update(journalEntries)
        .set({ status: 'posted' })
        .where(eq(journalEntries.id, journal.id));

      const updateData = {
        description: 'Attempted update to posted entry'
      };

      await expect(storage.updateJournalEntry(journal.id, updateData))
        .rejects
        .toThrow();
    });

    it('should maintain referential integrity across all related tables', async () => {
      const entryData = {
        date: '2025-06-14',
        description: 'Referential Integrity Test',
        entityId: testEntityId,
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '750.00',
            description: 'Integrity test debit',
            entityCode: 'TEST-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '750.00',
            description: 'Integrity test credit',
            entityCode: 'TEST-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      
      // Verify all related records exist
      const journalRecord = await storage.getJournalEntry(journal.id);
      const lines = await storage.getJournalEntryLines(journal.id);
      
      expect(journalRecord).toBeDefined();
      expect(lines).toHaveLength(2);
      
      // Verify foreign key relationships
      expect(journalRecord!.clientId).toBe(testClientId);
      expect(journalRecord!.entityId).toBe(testEntityId);
      expect(journalRecord!.createdBy).toBe(testUserId);
      
      for (const line of lines) {
        expect(line.journalEntryId).toBe(journal.id);
        expect([testAccountDebit, testAccountCredit]).toContain(line.accountId);
      }
    });
  });
});