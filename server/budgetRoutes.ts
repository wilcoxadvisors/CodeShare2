import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import { asyncHandler, throwNotFound, throwBadRequest } from './errorHandling';
import { BudgetStatus, BudgetPeriodType, insertBudgetSchema, insertBudgetItemSchema } from '../shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../shared/validation';

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

export function registerBudgetRoutes(app: Express, storage: IStorage) {
  /**
   * Get all budgets for an entity
   */
  app.get('/api/entities/:entityId/budgets', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const status = req.query.status as BudgetStatus | undefined;
    
    let budgets;
    if (status) {
      budgets = await storage.getBudgetsByStatus(entityId, status);
    } else {
      budgets = await storage.getBudgets(entityId);
    }
    
    res.json(budgets);
  }));
  
  /**
   * Get a specific budget
   */
  app.get('/api/entities/:entityId/budgets/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const budget = await storage.getBudget(id);
    
    if (!budget) {
      throwNotFound('Budget');
    }
    
    res.json(budget);
  }));
  
  /**
   * Create a new budget
   */
  app.post('/api/entities/:entityId/budgets', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const user = req.user as AuthUser;
    
    try {
      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        entityId,
        createdBy: user.id
      });
      
      const budget = await storage.createBudget(budgetData);
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Update a budget
   */
  app.put('/api/entities/:entityId/budgets/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.user as AuthUser;
    
    // Check if the budget exists
    const existingBudget = await storage.getBudget(id);
    if (!existingBudget) {
      throwNotFound('Budget');
    }
    
    // Block updates if budget is in approved status (unless it's changing status)
    if (existingBudget.status === BudgetStatus.APPROVED && 
        req.body.status !== BudgetStatus.ARCHIVED && 
        req.body.status !== undefined) {
      throwBadRequest('Cannot modify an approved budget. Archive it first.');
    }
    
    // Handle approval status change
    if (req.body.status === BudgetStatus.APPROVED && existingBudget.status !== BudgetStatus.APPROVED) {
      req.body.approvedById = user.id;
      req.body.approvedAt = new Date();
    }
    
    const updatedBudget = await storage.updateBudget(id, {
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json(updatedBudget);
  }));
  
  /**
   * Delete a budget
   */
  app.delete('/api/entities/:entityId/budgets/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    // Verify budget exists
    const budget = await storage.getBudget(id);
    if (!budget) {
      throwNotFound('Budget');
    }
    
    // Block deletion of approved budgets
    if (budget.status === BudgetStatus.APPROVED) {
      throwBadRequest('Cannot delete an approved budget. Archive it first.');
    }
    
    await storage.deleteBudget(id);
    res.status(204).send();
  }));
  
  /**
   * Get budget items for a budget
   */
  app.get('/api/entities/:entityId/budgets/:budgetId/items', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const budgetId = parseInt(req.params.budgetId);
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    
    let items;
    if (accountId) {
      items = await storage.getBudgetItemsByAccount(budgetId, accountId);
    } else {
      items = await storage.getBudgetItems(budgetId);
    }
    
    res.json(items);
  }));
  
  /**
   * Create a budget item
   */
  app.post('/api/entities/:entityId/budgets/:budgetId/items', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const budgetId = parseInt(req.params.budgetId);
    
    // Check if the budget exists
    const budget = await storage.getBudget(budgetId);
    if (!budget) {
      throwNotFound('Budget');
    }
    
    // Block adding items to approved budgets
    if (budget.status === BudgetStatus.APPROVED) {
      throwBadRequest('Cannot add items to an approved budget');
    }
    
    try {
      const itemData = insertBudgetItemSchema.parse({
        ...req.body,
        budgetId
      });
      
      const item = await storage.createBudgetItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Update a budget item
   */
  app.put('/api/entities/:entityId/budgets/:budgetId/items/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const budgetId = parseInt(req.params.budgetId);
    
    // Check if the item exists
    const item = await storage.getBudgetItem(id);
    if (!item) {
      throwNotFound('Budget item');
    }
    
    // Check if the budget exists
    const budget = await storage.getBudget(budgetId);
    if (!budget) {
      throwNotFound('Budget');
    }
    
    // Block updating items in approved budgets
    if (budget.status === BudgetStatus.APPROVED) {
      throwBadRequest('Cannot update items in an approved budget');
    }
    
    const updatedItem = await storage.updateBudgetItem(id, {
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json(updatedItem);
  }));
  
  /**
   * Delete a budget item
   */
  app.delete('/api/entities/:entityId/budgets/:budgetId/items/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const budgetId = parseInt(req.params.budgetId);
    
    // Check if the item exists
    const item = await storage.getBudgetItem(id);
    if (!item) {
      throwNotFound('Budget item');
    }
    
    // Check if the budget exists
    const budget = await storage.getBudget(budgetId);
    if (!budget) {
      throwNotFound('Budget');
    }
    
    // Block deleting items from approved budgets
    if (budget.status === BudgetStatus.APPROVED) {
      throwBadRequest('Cannot delete items from an approved budget');
    }
    
    await storage.deleteBudgetItem(id);
    res.status(204).send();
  }));
}