import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JournalEntryStorage } from '../../server/storage/journalEntryStorage';
import { db } from '../../server/db';
import { journalEntries, journalEntryLines, accounts, entities, clients, users, dimensionValues, dimensions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Part 1 of Architect's State-of-the-Art Testing Strategy: Backend Unit & Integration Testing
 * 
 * This test suite focuses on data integrity, edge cases, and critical business logic
 * as specified in the architect's comprehensive testing protocol.
 */
describe('JournalEntry Data Integrity Tests', () => {
  let storage: JournalEntryStorage;
  let testClientId: number;
  let testEntityId: number;
  let testUserId: number;
  let testAccountDebit: number;
  let testAccountCredit: number;
  let dimensionValueId: number;

  beforeAll(async () => {
    storage = new JournalEntryStorage();
    
    // Create test client
    const [client] = await db.insert(clients).values({
      name: 'Test Client - Integrity',
      code: 'TEST_INTEGRITY',
      industry: 'testing',
      active: true
    }).returning();
    testClientId = client.id;

    // Create test entity
    const [entity] = await db.insert(entities).values({
      name: 'Test Entity - Integrity',
      code: 'TEST_INT',
      entityCode: 'INT-001',
      clientId: testClientId,
      ownerId: 1,
      active: true
    }).returning();
    testEntityId = entity.id;

    // Create test user
    const [user] = await db.insert(users).values({
      username: 'integrity_user',
      passwordHash: 'hash',
      name: 'Integrity Test User',
      email: 'integrity@example.com',
      role: 'user'
    }).returning();
    testUserId = user.id;

    // Create test accounts
    const [debitAccount] = await db.insert(accounts).values({
      name: 'Test Debit Account',
      code: 'TEST_DR_INT',
      type: 'asset',
      clientId: testClientId,
      entityId: testEntityId,
      active: true
    }).returning();
    testAccountDebit = debitAccount.id;

    const [creditAccount] = await db.insert(accounts).values({
      name: 'Test Credit Account', 
      code: 'TEST_CR_INT',
      type: 'liability',
      clientId: testClientId,
      entityId: testEntityId,
      active: true
    }).returning();
    testAccountCredit = creditAccount.id;

    // Create test dimension and dimension value
    const [dimension] = await db.insert(dimensions).values({
      name: 'Department',
      code: 'DEPT',
      clientId: testClientId,
      active: true
    }).returning();
    
    const [dimValue] = await db.insert(dimensionValues).values({
      name: 'Test Department',
      code: 'TEST_DEPT',
      dimensionId: dimension.id,
      clientId: testClientId,
      active: true
    }).returning();
    dimensionValueId = dimValue.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountDebit));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.accountId, testAccountCredit));
    await db.delete(journalEntries).where(eq(journalEntries.clientId, testClientId));
    await db.delete(accounts).where(eq(accounts.clientId, testClientId));
    await db.delete(dimensionValues).where(eq(dimensionValues.clientId, testClientId));
    await db.delete(dimensions).where(eq(dimensions.clientId, testClientId));
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

  describe('Critical Data Integrity - updateJournalEntryWithLines', () => {
    it('should preserve existing lines while adding new ones in atomic transaction', async () => {
      // Create initial journal entry
      const entryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Data Integrity Test Entry',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Original debit',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '500.00',
            description: 'Original credit',
            entityCode: 'INT-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const originalLines = await storage.getJournalEntryLines(journal.id);
      expect(originalLines).toHaveLength(2);

      // Update with additional lines while preserving existing ones
      const updateData = {
        description: 'Updated with additional lines',
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
            entityCode: 'INT-001'
          },
          // Add new credit line to balance
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '200.00',
            description: 'Additional credit',
            entityCode: 'INT-001'
          }
        ]
      };

      const result = await storage.updateJournalEntryWithLines(journal.id, updateData, updateData.lines);

      expect(result).toBeDefined();
      expect(result!.description).toBe('Updated with additional lines');

      const updatedLines = await storage.getJournalEntryLines(journal.id);
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
      // Create initial journal entry
      const entryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Line Deletion Test',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '300.00',
            description: 'Line to keep',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '300.00',
            description: 'Line to delete',
            entityCode: 'INT-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const originalLines = await storage.getJournalEntryLines(journal.id);
      expect(originalLines).toHaveLength(2);

      const updateData = {
        description: 'Updated with line deletion',
        lines: [
          // Keep only one line, effectively deleting the other
          {
            id: originalLines[0].id,
            accountId: originalLines[0].accountId,
            type: originalLines[0].type,
            amount: '250.00', // Also modify amount
            description: 'Modified and preserved line',
            entityCode: originalLines[0].entityCode
          },
          // Add a new balancing credit line
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '250.00',
            description: 'New balancing credit',
            entityCode: 'INT-001'
          }
        ]
      };

      const result = await storage.updateJournalEntryWithLines(journal.id, updateData, updateData.lines);

      expect(result).toBeDefined();
      
      const updatedLines = await storage.getJournalEntryLines(journal.id);
      expect(updatedLines).toHaveLength(2);

      // Verify the preserved line was modified
      const modifiedLine = updatedLines.find(l => l.id === originalLines[0].id);
      expect(modifiedLine).toBeDefined();
      expect(modifiedLine!.amount).toBe('250.0000');
      expect(modifiedLine!.description).toBe('Modified and preserved line');

      // Verify the original second line was deleted
      const deletedLine = updatedLines.find(l => l.id === originalLines[1].id);
      expect(deletedLine).toBeUndefined();

      // Verify new line exists
      const newLine = updatedLines.find(l => l.description === 'New balancing credit');
      expect(newLine).toBeDefined();
    });

    it('should handle dimension tag updates correctly within transaction', async () => {
      // Create initial journal entry
      const entryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Dimension Tag Test',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '400.00',
            description: 'Line with dimension tags',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '400.00',
            description: 'Regular line',
            entityCode: 'INT-001'
          }
        ]
      };

      const journal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      const originalLines = await storage.getJournalEntryLines(journal.id);
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

      const result = await storage.updateJournalEntryWithLines(journal.id, updateData, updateData.lines);

      expect(result).toBeDefined();

      // Verify dimension tags were properly saved
      const linesWithTags = await storage.getJournalEntryLinesWithDimensions(journal.id);
      const lineWithTag = linesWithTags.find(l => l.id === lineToUpdate.id);
      
      expect(lineWithTag).toBeDefined();
      expect(lineWithTag!.dimensionTags).toHaveLength(1);
      expect(lineWithTag!.dimensionTags[0].dimensionValueId).toBe(dimensionValueId);
    });
  });

  describe('Edge Cases and Business Rules Validation', () => {
    it('should reject unbalanced journal entry creation', async () => {
      const unbalancedEntryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Unbalanced Entry',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '500.00',
            description: 'Debit line',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '300.00', // Unbalanced!
            description: 'Credit line',
            entityCode: 'INT-001'
          }
        ]
      };

      await expect(storage.createJournalEntry(testClientId, testUserId, unbalancedEntryData))
        .rejects
        .toThrow();
    });

    it('should prevent modification of posted entries', async () => {
      const entryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Posted Entry',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '100.00',
            description: 'Debit',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '100.00',
            description: 'Credit',
            entityCode: 'INT-001'
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
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Referential Integrity Test',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '750.00',
            description: 'Integrity test debit',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '750.00',
            description: 'Integrity test credit',
            entityCode: 'INT-001'
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

  describe('Copy and Reverse Operations - Critical Business Logic', () => {
    it('should create perfect copy with all lines and dimension tags preserved', async () => {
      // Create and post original entry with dimension tags
      const entryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Original Entry for Copy',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '600.00',
            description: 'Original debit with tags',
            entityCode: 'INT-001',
            dimensionTags: [
              {
                dimensionValueId: dimensionValueId,
                amount: '600.00'
              }
            ]
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '600.00',
            description: 'Original credit',
            entityCode: 'INT-001'
          }
        ]
      };

      const originalJournal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      
      // Update to posted status
      await db.update(journalEntries)
        .set({ status: 'posted' })
        .where(eq(journalEntries.id, originalJournal.id));

      const copiedEntry = await storage.copyJournalEntry(originalJournal.id, testUserId);

      // Verify copy properties
      expect(copiedEntry).toBeDefined();
      expect(copiedEntry.status).toBe('draft');
      expect(copiedEntry.description).toBe('Copy of: Original Entry for Copy');
      expect(copiedEntry.id).not.toBe(originalJournal.id);

      // Verify all lines are duplicated with dimension tags
      const originalLines = await storage.getJournalEntryLinesWithDimensions(originalJournal.id);
      const copiedLines = await storage.getJournalEntryLinesWithDimensions(copiedEntry.id);

      expect(copiedLines).toHaveLength(originalLines.length);

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

        // Verify dimension tags are copied
        if (originalLine.dimensionTags.length > 0) {
          expect(matchingCopiedLine!.dimensionTags).toHaveLength(originalLine.dimensionTags.length);
          expect(matchingCopiedLine!.dimensionTags[0].dimensionValueId).toBe(originalLine.dimensionTags[0].dimensionValueId);
        }
      }
    });

    it('should create proper reversal with inverted amounts', async () => {
      // Create and post original entry
      const entryData = {
        date: '2025-06-17',
        clientId: testClientId,
        entityId: testEntityId,
        createdBy: testUserId,
        description: 'Entry to Reverse',
        journalType: 'JE' as const,
        lines: [
          {
            accountId: testAccountDebit,
            type: 'debit' as const,
            amount: '800.00',
            description: 'Original debit',
            entityCode: 'INT-001'
          },
          {
            accountId: testAccountCredit,
            type: 'credit' as const,
            amount: '800.00',
            description: 'Original credit',
            entityCode: 'INT-001'
          }
        ]
      };

      const originalJournal = await storage.createJournalEntry(testClientId, testUserId, entryData);
      
      // Update to posted status
      await db.update(journalEntries)
        .set({ status: 'posted' })
        .where(eq(journalEntries.id, originalJournal.id));

      const reversalOptions = {
        date: new Date('2025-06-18'),
        description: 'Reversal of original entry',
        createdBy: testUserId,
        referenceNumber: 'REV-001'
      };

      const reversalEntry = await storage.reverseJournalEntry(originalJournal.id, reversalOptions);

      expect(reversalEntry).toBeDefined();
      expect(reversalEntry!.description).toBe('Reversal of original entry');
      expect(reversalEntry!.status).toBe('posted');
      expect(reversalEntry!.reversedEntryId).toBe(originalJournal.id);

      const reversalLines = await storage.getJournalEntryLines(reversalEntry!.id);
      expect(reversalLines).toHaveLength(2);

      // Check that amounts are reversed (debit becomes credit, credit becomes debit)
      const originalLines = await storage.getJournalEntryLines(originalJournal.id);
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
  });
});