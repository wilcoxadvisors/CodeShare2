/**
 * Budget Storage Tests
 * 
 * Tests for the budget storage module implementation
 */

import { budgetStorage, IBudgetStorage } from '../../server/storage/budgetStorage';
import { db } from '../../server/db';

// Mock the database dependency
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }
}));

describe('BudgetStorage', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getBudget', () => {
    it('should fetch a budget by ID', async () => {
      const mockBudget = { id: 1, name: 'Test Budget', entityId: 1 };
      (db.returning as jest.Mock).mockResolvedValueOnce([mockBudget]);
      
      const result = await budgetStorage.getBudget(1);
      
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(result).toEqual(mockBudget);
    });
    
    it('should handle errors properly', async () => {
      (db.returning as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      
      await expect(budgetStorage.getBudget(1)).rejects.toThrow();
    });
  });

  describe('getBudgets', () => {
    it('should fetch all budgets for an entity', async () => {
      const mockBudgets = [
        { id: 1, name: 'Budget 1', entityId: 1 },
        { id: 2, name: 'Budget 2', entityId: 1 }
      ];
      (db.returning as jest.Mock).mockResolvedValueOnce(mockBudgets);
      
      const result = await budgetStorage.getBudgets(1);
      
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.orderBy).toHaveBeenCalled();
      expect(result).toEqual(mockBudgets);
    });
  });

  describe('createBudget', () => {
    it('should create a new budget', async () => {
      const mockBudget = { id: 1, name: 'New Budget', entityId: 1 };
      (db.returning as jest.Mock).mockResolvedValueOnce([mockBudget]);
      
      const result = await budgetStorage.createBudget({ name: 'New Budget', entityId: 1 } as any);
      
      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalled();
      expect(db.returning).toHaveBeenCalled();
      expect(result).toEqual(mockBudget);
    });
  });

  describe('updateBudget', () => {
    it('should update a budget', async () => {
      const mockBudget = { id: 1, name: 'Updated Budget', entityId: 1 };
      (db.returning as jest.Mock).mockResolvedValueOnce([mockBudget]);
      
      const result = await budgetStorage.updateBudget(1, { name: 'Updated Budget' } as any);
      
      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.returning).toHaveBeenCalled();
      expect(result).toEqual(mockBudget);
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget and its related items', async () => {
      (db.returning as jest.Mock).mockResolvedValueOnce([]);
      
      await budgetStorage.deleteBudget(1);
      
      expect(db.delete).toHaveBeenCalledTimes(3); // Delete items, documents, then budget
    });
  });
});