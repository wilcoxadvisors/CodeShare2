/**
 * Budget Storage Module
 * 
 * This module contains the storage interface and implementation for budget and forecast operations.
 */
import { db } from "../db";
import { budgets, Budget, InsertBudget, BudgetStatus, BudgetItem, InsertBudgetItem, budgetItems, 
         budgetDocuments, BudgetDocument, InsertBudgetDocument, forecasts, Forecast, InsertForecast } from "@shared/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { ApiError } from "../errorHandling";

// Helper function to handle database errors consistently
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new Error(`An error occurred during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * Interface for budget storage operations
 */
export interface IBudgetStorage {
  // Budget operations
  getBudget(id: number): Promise<Budget | undefined>;
  getBudgets(entityId: number): Promise<Budget[]>;
  getBudgetsByStatus(entityId: number, status: BudgetStatus): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<Budget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<void>;
  
  // Budget Item operations
  getBudgetItem(id: number): Promise<BudgetItem | undefined>;
  getBudgetItems(budgetId: number): Promise<BudgetItem[]>;
  createBudgetItem(budgetItem: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: number, budgetItem: Partial<BudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: number): Promise<void>;
  
  // Budget Document operations
  getBudgetDocument(id: number): Promise<BudgetDocument | undefined>;
  getBudgetDocuments(budgetId: number): Promise<BudgetDocument[]>;
  createBudgetDocument(document: InsertBudgetDocument): Promise<BudgetDocument>;
  updateBudgetDocument(id: number, document: Partial<BudgetDocument>): Promise<BudgetDocument | undefined>;
  deleteBudgetDocument(id: number): Promise<void>;
  
  // Forecast operations
  getForecast(id: number): Promise<Forecast | undefined>;
  getForecasts(entityId: number): Promise<Forecast[]>;
  createForecast(forecast: InsertForecast): Promise<Forecast>;
  updateForecast(id: number, forecast: Partial<Forecast>): Promise<Forecast | undefined>;
  deleteForecast(id: number): Promise<void>;
  generateForecast(entityId: number, config: any): Promise<any>;
}

/**
 * Implementation of budget storage operations using Drizzle ORM
 */
export class BudgetStorage implements IBudgetStorage {
  /**
   * Get a budget by ID
   */
  async getBudget(id: number): Promise<Budget | undefined> {
    try {
      const result = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, id))
        .limit(1);
        
      return result[0];
    } catch (error) {
      throw handleDbError(error, `getting budget ${id}`);
    }
  }
  
  /**
   * Get all budgets for an entity
   */
  async getBudgets(entityId: number): Promise<Budget[]> {
    try {
      return await db
        .select()
        .from(budgets)
        .where(eq(budgets.entityId, entityId))
        .orderBy(desc(budgets.createdAt));
    } catch (error) {
      throw handleDbError(error, `getting budgets for entity ${entityId}`);
    }
  }
  
  /**
   * Get budgets by status for an entity
   */
  async getBudgetsByStatus(entityId: number, status: BudgetStatus): Promise<Budget[]> {
    try {
      return await db
        .select()
        .from(budgets)
        .where(and(
          eq(budgets.entityId, entityId),
          eq(budgets.status, status)
        ))
        .orderBy(desc(budgets.createdAt));
    } catch (error) {
      throw handleDbError(error, `getting budgets with status ${status} for entity ${entityId}`);
    }
  }
  
  /**
   * Create a new budget
   */
  async createBudget(budget: InsertBudget): Promise<Budget> {
    try {
      const [newBudget] = await db.insert(budgets).values(budget).returning();
      return newBudget;
    } catch (error) {
      throw handleDbError(error, "creating budget");
    }
  }
  
  /**
   * Update a budget
   */
  async updateBudget(id: number, budget: Partial<Budget>): Promise<Budget | undefined> {
    try {
      const [updatedBudget] = await db
        .update(budgets)
        .set({
          ...budget,
          updatedAt: new Date()
        })
        .where(eq(budgets.id, id))
        .returning();
      
      return updatedBudget;
    } catch (error) {
      throw handleDbError(error, `updating budget ${id}`);
    }
  }
  
  /**
   * Delete a budget
   */
  async deleteBudget(id: number): Promise<void> {
    try {
      // First delete related items
      await db.delete(budgetItems).where(eq(budgetItems.budgetId, id));
      
      // Then delete related documents
      await db.delete(budgetDocuments).where(eq(budgetDocuments.budgetId, id));
      
      // Finally delete the budget
      await db.delete(budgets).where(eq(budgets.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting budget ${id}`);
    }
  }
  
  /**
   * Get a budget item by ID
   */
  async getBudgetItem(id: number): Promise<BudgetItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.id, id))
        .limit(1);
      
      return item;
    } catch (error) {
      throw handleDbError(error, `getting budget item ${id}`);
    }
  }
  
  /**
   * Get all budget items for a budget
   */
  async getBudgetItems(budgetId: number): Promise<BudgetItem[]> {
    try {
      return await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.budgetId, budgetId))
        .orderBy(asc(budgetItems.accountId));
    } catch (error) {
      throw handleDbError(error, `getting budget items for budget ${budgetId}`);
    }
  }
  
  /**
   * Create a new budget item
   */
  async createBudgetItem(budgetItem: InsertBudgetItem): Promise<BudgetItem> {
    try {
      const [newItem] = await db.insert(budgetItems).values(budgetItem).returning();
      return newItem;
    } catch (error) {
      throw handleDbError(error, "creating budget item");
    }
  }
  
  /**
   * Update a budget item
   */
  async updateBudgetItem(id: number, budgetItem: Partial<BudgetItem>): Promise<BudgetItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(budgetItems)
        .set({
          ...budgetItem,
          updatedAt: new Date()
        })
        .where(eq(budgetItems.id, id))
        .returning();
      
      return updatedItem;
    } catch (error) {
      throw handleDbError(error, `updating budget item ${id}`);
    }
  }
  
  /**
   * Delete a budget item
   */
  async deleteBudgetItem(id: number): Promise<void> {
    try {
      await db.delete(budgetItems).where(eq(budgetItems.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting budget item ${id}`);
    }
  }
  
  /**
   * Get a budget document by ID
   */
  async getBudgetDocument(id: number): Promise<BudgetDocument | undefined> {
    try {
      const [document] = await db
        .select()
        .from(budgetDocuments)
        .where(eq(budgetDocuments.id, id))
        .limit(1);
      
      return document;
    } catch (error) {
      throw handleDbError(error, `getting budget document ${id}`);
    }
  }
  
  /**
   * Get all documents for a budget
   */
  async getBudgetDocuments(budgetId: number): Promise<BudgetDocument[]> {
    try {
      return await db
        .select()
        .from(budgetDocuments)
        .where(eq(budgetDocuments.budgetId, budgetId))
        .orderBy(desc(budgetDocuments.uploadedAt));
    } catch (error) {
      throw handleDbError(error, `getting budget documents for budget ${budgetId}`);
    }
  }
  
  /**
   * Create a new budget document
   */
  async createBudgetDocument(document: InsertBudgetDocument): Promise<BudgetDocument> {
    try {
      const [newDocument] = await db.insert(budgetDocuments).values(document).returning();
      return newDocument;
    } catch (error) {
      throw handleDbError(error, "creating budget document");
    }
  }
  
  /**
   * Update a budget document
   */
  async updateBudgetDocument(id: number, document: Partial<BudgetDocument>): Promise<BudgetDocument | undefined> {
    try {
      const [updatedDocument] = await db
        .update(budgetDocuments)
        .set({
          ...document,
          updatedAt: new Date()
        })
        .where(eq(budgetDocuments.id, id))
        .returning();
      
      return updatedDocument;
    } catch (error) {
      throw handleDbError(error, `updating budget document ${id}`);
    }
  }
  
  /**
   * Delete a budget document
   */
  async deleteBudgetDocument(id: number): Promise<void> {
    try {
      await db.delete(budgetDocuments).where(eq(budgetDocuments.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting budget document ${id}`);
    }
  }
  
  /**
   * Get a forecast by ID
   */
  async getForecast(id: number): Promise<Forecast | undefined> {
    try {
      const [forecast] = await db
        .select()
        .from(forecasts)
        .where(eq(forecasts.id, id))
        .limit(1);
      
      return forecast;
    } catch (error) {
      throw handleDbError(error, `getting forecast ${id}`);
    }
  }
  
  /**
   * Get all forecasts for an entity
   */
  async getForecasts(entityId: number): Promise<Forecast[]> {
    try {
      return await db
        .select()
        .from(forecasts)
        .where(eq(forecasts.entityId, entityId))
        .orderBy(desc(forecasts.createdAt));
    } catch (error) {
      throw handleDbError(error, `getting forecasts for entity ${entityId}`);
    }
  }
  
  /**
   * Create a new forecast
   */
  async createForecast(forecast: InsertForecast): Promise<Forecast> {
    try {
      const [newForecast] = await db.insert(forecasts).values(forecast).returning();
      return newForecast;
    } catch (error) {
      throw handleDbError(error, "creating forecast");
    }
  }
  
  /**
   * Update a forecast
   */
  async updateForecast(id: number, forecast: Partial<Forecast>): Promise<Forecast | undefined> {
    try {
      const [updatedForecast] = await db
        .update(forecasts)
        .set({
          ...forecast,
          updatedAt: new Date()
        })
        .where(eq(forecasts.id, id))
        .returning();
      
      return updatedForecast;
    } catch (error) {
      throw handleDbError(error, `updating forecast ${id}`);
    }
  }
  
  /**
   * Delete a forecast
   */
  async deleteForecast(id: number): Promise<void> {
    try {
      await db.delete(forecasts).where(eq(forecasts.id, id));
    } catch (error) {
      throw handleDbError(error, `deleting forecast ${id}`);
    }
  }
  
  /**
   * Generate a forecast for an entity using ML service
   */
  async generateForecast(entityId: number, config: any): Promise<any> {
    // This would integrate with the python ML service
    // Placeholder implementation for now
    try {
      // Get historical data for the entity
      // Call ML service for forecasting
      // Store results in a new forecast entry
      return {
        entityId,
        success: true,
        message: "Forecast generated successfully",
        config
      };
    } catch (error) {
      throw handleDbError(error, `generating forecast for entity ${entityId}`);
    }
  }
}

// Export singleton instance
export const budgetStorage = new BudgetStorage();