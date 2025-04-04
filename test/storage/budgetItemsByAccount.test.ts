/**
 * Test for getBudgetItemsByAccount in budgetStorage module
 */
import { budgetStorage } from '../../server/storage/budgetStorage';
import { db } from '../../server/db';
import { budgets, budgetItems } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Budget Storage - getBudgetItemsByAccount', () => {
  // Test data to be used and cleaned up
  let testBudgetId;
  let testAccountId1 = 1001; // Just using a test ID
  let testAccountId2 = 1002; // Just using a test ID

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(budgetItems).where(eq(budgetItems.accountId, testAccountId1));
    await db.delete(budgetItems).where(eq(budgetItems.accountId, testAccountId2));
    
    // Create a test budget
    const [budget] = await db.insert(budgets).values({
      name: 'Test Budget for Account Items',
      entityId: 1, // Assuming entity 1 exists
      fiscalYear: 2025,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      createdBy: 1, // Assuming user 1 exists
      status: 'draft',
      periodType: 'monthly'
    }).returning();
    
    testBudgetId = budget.id;
    
    // Create test budget items for different accounts
    await db.insert(budgetItems).values([
      {
        budgetId: testBudgetId,
        accountId: testAccountId1,
        amount: '1000.00',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        notes: 'Account 1 - January',
        createdBy: 1
      },
      {
        budgetId: testBudgetId,
        accountId: testAccountId1,
        amount: '1200.00',
        periodStart: new Date('2025-02-01'),
        periodEnd: new Date('2025-02-28'),
        notes: 'Account 1 - February',
        createdBy: 1
      },
      {
        budgetId: testBudgetId,
        accountId: testAccountId2,
        amount: '500.00',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        notes: 'Account 2 - January',
        createdBy: 1
      }
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(budgetItems).where(eq(budgetItems.budgetId, testBudgetId));
    await db.delete(budgets).where(eq(budgets.id, testBudgetId));
  });

  test('should retrieve budget items for a specific account', async () => {
    // Test getting items for account 1
    const account1Items = await budgetStorage.getBudgetItemsByAccount(testBudgetId, testAccountId1);
    
    // Verify results
    expect(account1Items).toHaveLength(2);
    expect(account1Items[0].accountId).toBe(testAccountId1);
    expect(account1Items[1].accountId).toBe(testAccountId1);
    
    // Verify they are ordered by ID (ascending)
    expect(account1Items[0].id).toBeLessThan(account1Items[1].id);
    
    // Verify data integrity
    expect(account1Items[0].notes).toBe('Account 1 - January');
    expect(account1Items[1].notes).toBe('Account 1 - February');
  });

  test('should retrieve budget items for another account', async () => {
    // Test getting items for account 2
    const account2Items = await budgetStorage.getBudgetItemsByAccount(testBudgetId, testAccountId2);
    
    // Verify results
    expect(account2Items).toHaveLength(1);
    expect(account2Items[0].accountId).toBe(testAccountId2);
    expect(account2Items[0].notes).toBe('Account 2 - January');
  });

  test('should return empty array for non-existent account', async () => {
    // Test getting items for non-existent account
    const nonExistentAccountItems = await budgetStorage.getBudgetItemsByAccount(testBudgetId, 9999);
    
    // Verify results
    expect(nonExistentAccountItems).toHaveLength(0);
  });
});