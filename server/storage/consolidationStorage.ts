/**
 * Consolidation Storage Module
 * 
 * This module contains the storage interface and implementation for consolidation group operations.
 */

import { 
  consolidationGroups, ConsolidationGroup, InsertConsolidationGroup,
  consolidationGroupEntities, InsertConsolidationGroupEntity,
  entities, ReportType
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, asc, gte, lte, sql, count, sum, isNull, not, ne, inArray, gt, like } from "drizzle-orm";
import { ApiError } from "../errorHandling";

/**
 * Handle database errors consistently
 */
function handleDbError(error: unknown, operation: string): Error {
  console.error(`Database error during ${operation}:`, error);
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError(500, `Database error during ${operation}`);
}

/**
 * Interface for consolidation group storage operations
 */
export interface IConsolidationStorage {
  // Consolidation Group methods
  getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined>;
  getConsolidationGroups(userId: number): Promise<ConsolidationGroup[]>;
  getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]>;
  createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup>;
  updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined>;
  deleteConsolidationGroup(id: number): Promise<void>;
  addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup>;
  removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup>;
  generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any>;
  getConsolidationGroupEntities(groupId: number): Promise<number[]>;
}

/**
 * Implementation of consolidation group storage operations using Drizzle ORM
 */
export class ConsolidationStorage implements IConsolidationStorage {
  /**
   * Get a consolidation group by ID
   */
  async getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined> {
    try {
      // Get the consolidation group data
      const result = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, id))
        .limit(1);
      
      if (!result || result.length === 0) return undefined;
      
      // Get all associated entities from the junction table
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, id));
      
      // Extract entity IDs from the junction table
      const entities = entityRelations.map(relation => relation.entityId);
      
      // Create a ConsolidationGroup object with the entities property
      // populated from the junction table relationships
      return {
        ...result[0],
        entities: entities
      } as ConsolidationGroup;
    } catch (error) {
      throw handleDbError(error, 'getConsolidationGroup');
    }
  }

  /**
   * Get consolidation groups by user ID
   */
  async getConsolidationGroups(userId: number): Promise<ConsolidationGroup[]> {
    try {
      // Get all active consolidation groups
      const groups = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.createdBy, userId));
      
      // Get entity relationships for all groups
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities);
      
      // Group entity relationships by group ID
      const entityRelationsByGroup = entityRelations.reduce((acc, relation) => {
        if (!acc[relation.groupId]) {
          acc[relation.groupId] = [];
        }
        acc[relation.groupId].push(relation.entityId);
        return acc;
      }, {} as Record<number, number[]>);
      
      // Attach entity IDs to each group
      return groups.map(group => ({
        ...group,
        entities: entityRelationsByGroup[group.id] || []
      })) as ConsolidationGroup[];
    } catch (error) {
      throw handleDbError(error, 'getConsolidationGroups');
    }
  }

  /**
   * Get consolidation groups by entity ID
   */
  async getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]> {
    try {
      // Find all group-entity relationships for this entity
      const relations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.entityId, entityId));
      
      // If no relations found, return empty array
      if (relations.length === 0) return [];
      
      // Get the group IDs
      const groupIds = relations.map(relation => relation.groupId);
      
      // Fetch the groups
      const groups = await db
        .select()
        .from(consolidationGroups)
        .where(and(
          inArray(consolidationGroups.id, groupIds),
          eq(consolidationGroups.isActive, true)
        ));
      
      // Get all entity relationships for these groups
      const allRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.groupId, groupIds));
      
      // Group entity relationships by group ID
      const entityRelationsByGroup = allRelations.reduce((acc, relation) => {
        if (!acc[relation.groupId]) {
          acc[relation.groupId] = [];
        }
        acc[relation.groupId].push(relation.entityId);
        return acc;
      }, {} as Record<number, number[]>);
      
      // Attach entity IDs to each group
      return groups.map(group => ({
        ...group,
        entities: entityRelationsByGroup[group.id] || []
      })) as ConsolidationGroup[];
    } catch (error) {
      throw handleDbError(error, 'getConsolidationGroupsByEntity');
    }
  }

  /**
   * Get entities associated with a consolidation group
   */
  async getConsolidationGroupEntities(groupId: number): Promise<number[]> {
    try {
      const relations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
      
      return relations.map(relation => relation.entityId);
    } catch (error) {
      throw handleDbError(error, 'getConsolidationGroupEntities');
    }
  }

  /**
   * Create a new consolidation group
   */
  async createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
    try {
      // Begin a transaction
      return await db.transaction(async (tx) => {
        // Insert the consolidation group
        const [createdGroup] = await tx
          .insert(consolidationGroups)
          .values({
            name: group.name,
            description: group.description || null,
            createdBy: group.createdBy,
            ownerId: group.ownerId, 
            currency: group.currency || 'USD',
            startDate: group.startDate,
            endDate: group.endDate,
            isActive: group.isActive !== undefined ? group.isActive : true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        // Add the initial entity if provided
        if (group.initialEntityId) {
          await tx
            .insert(consolidationGroupEntities)
            .values({
              groupId: createdGroup.id,
              entityId: group.initialEntityId,
              createdAt: new Date()
            })
            .returning();
        }
        
        // Return complete group with entities
        return {
          ...createdGroup,
          entities: group.initialEntityId ? [group.initialEntityId] : []
        } as ConsolidationGroup;
      });
    } catch (error) {
      throw handleDbError(error, 'createConsolidationGroup');
    }
  }

  /**
   * Update a consolidation group
   */
  async updateConsolidationGroup(id: number, groupData: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
    try {
      // Verify the group exists
      const existingGroup = await this.getConsolidationGroup(id);
      if (!existingGroup) {
        return undefined;
      }
      
      // Prepare update data, excluding entities field which is handled separately
      const { entities, ...updateData } = groupData;
      
      // Perform the update
      const [updatedGroup] = await db
        .update(consolidationGroups)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(consolidationGroups.id, id))
        .returning();
      
      // Get current entities for the group
      const currentEntities = await this.getConsolidationGroupEntities(id);
      
      // Return the updated group with associated entities
      return {
        ...updatedGroup,
        entities: currentEntities
      } as ConsolidationGroup;
    } catch (error) {
      throw handleDbError(error, 'updateConsolidationGroup');
    }
  }

  /**
   * Delete a consolidation group
   */
  async deleteConsolidationGroup(id: number): Promise<void> {
    try {
      // Begin a transaction
      await db.transaction(async (tx) => {
        // First delete all entity associations
        await tx
          .delete(consolidationGroupEntities)
          .where(eq(consolidationGroupEntities.groupId, id));
        
        // Then delete the group
        await tx
          .delete(consolidationGroups)
          .where(eq(consolidationGroups.id, id));
      });
    } catch (error) {
      throw handleDbError(error, 'deleteConsolidationGroup');
    }
  }

  /**
   * Add an entity to a consolidation group
   */
  async addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    try {
      // Verify the group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new ApiError(404, `Consolidation group with ID ${groupId} not found`);
      }
      
      // Verify the entity exists
      const [entity] = await db
        .select()
        .from(entities)
        .where(eq(entities.id, entityId))
        .limit(1);
      
      if (!entity) {
        throw new ApiError(404, `Entity with ID ${entityId} not found`);
      }
      
      // Check if the entity is already in the group
      const existingRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(and(
          eq(consolidationGroupEntities.groupId, groupId),
          eq(consolidationGroupEntities.entityId, entityId)
        ));
      
      // If the entity is not already in the group, add it
      if (existingRelations.length === 0) {
        await db
          .insert(consolidationGroupEntities)
          .values({
            groupId,
            entityId,
            createdAt: new Date()
          });
      }
      
      // Return the updated group with entities
      return this.getConsolidationGroup(groupId) as Promise<ConsolidationGroup>;
    } catch (error) {
      throw handleDbError(error, 'addEntityToConsolidationGroup');
    }
  }

  /**
   * Remove an entity from a consolidation group
   */
  async removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    try {
      // Verify the group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new ApiError(404, `Consolidation group with ID ${groupId} not found`);
      }
      
      // Remove the entity from the group
      await db
        .delete(consolidationGroupEntities)
        .where(and(
          eq(consolidationGroupEntities.groupId, groupId),
          eq(consolidationGroupEntities.entityId, entityId)
        ));
      
      // Return the updated group with entities
      return this.getConsolidationGroup(groupId) as Promise<ConsolidationGroup>;
    } catch (error) {
      throw handleDbError(error, 'removeEntityFromConsolidationGroup');
    }
  }

  /**
   * Generate a consolidated report for a group
   */
  async generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      // Verify the group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new ApiError(404, `Consolidation group with ID ${groupId} not found`);
      }
      
      // Get entity IDs from the consolidation group
      const entityIds = await this.getConsolidationGroupEntities(groupId);
      
      if (entityIds.length === 0) {
        throw new ApiError(400, 'Cannot generate consolidated report for an empty group');
      }
      
      // Set default dates if not provided
      const effectiveEndDate = endDate || new Date();
      let effectiveStartDate = startDate;
      
      if (!effectiveStartDate) {
        // Default to beginning of fiscal year
        // Use the first entity in the group's entities as the primary entity
        const primaryEntityResult = await db
          .select()
          .from(entities)
          .where(eq(entities.id, entityIds[0]))
          .limit(1);
        
        const primaryEntity = primaryEntityResult.length > 0 ? primaryEntityResult[0] : null;
        
        if (primaryEntity) {
          const fiscalYearStart = primaryEntity.fiscalYearStart || '01-01'; // Default to Jan 1
          const [month, day] = fiscalYearStart.split('-').map(Number);
          
          effectiveStartDate = new Date(effectiveEndDate.getFullYear(), month - 1, day);
          if (effectiveStartDate > effectiveEndDate) {
            // If fiscal year start is after the end date, use previous year
            effectiveStartDate.setFullYear(effectiveStartDate.getFullYear() - 1);
          }
        } else {
          // Default to 1 year ago
          effectiveStartDate = new Date(effectiveEndDate);
          effectiveStartDate.setFullYear(effectiveStartDate.getFullYear() - 1);
        }
      }
      
      // Here we would normally call storage methods to generate individual reports for each entity
      // For now we'll use placeholder data since we don't have access to the actual report generation methods yet
      // In a real implementation, you would import and use storage.generateBalanceSheet etc.
      
      // Generate reports for each entity in the group using a placeholder function
      const entityReports = await Promise.all(entityIds.map(async (entityId) => {
        // Generate placeholder report based on report type
        let report;
        
        // In a real implementation, we would call:
        // case ReportType.BALANCE_SHEET: report = await storage.generateBalanceSheet(entityId, effectiveEndDate);
        // etc.
        
        switch (reportType) {
          case ReportType.BALANCE_SHEET:
            report = this.generatePlaceholderBalanceSheet(entityId);
            break;
          case ReportType.INCOME_STATEMENT:
            report = this.generatePlaceholderIncomeStatement(entityId);
            break;
          case ReportType.CASH_FLOW:
            report = this.generatePlaceholderCashFlow(entityId);
            break;
          case ReportType.TRIAL_BALANCE:
            report = this.generatePlaceholderTrialBalance(entityId);
            break;
          default:
            throw new ApiError(400, `Unsupported report type: ${reportType}`);
        }
        
        return { entityId, report };
      }));
      
      // Consolidate the reports based on report type
      let consolidatedReport;
      
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          consolidatedReport = this.consolidateBalanceSheets(entityReports.map(er => er.report));
          break;
        case ReportType.INCOME_STATEMENT:
          consolidatedReport = this.consolidateIncomeStatements(entityReports.map(er => er.report));
          break;
        case ReportType.CASH_FLOW:
          consolidatedReport = this.consolidateCashFlows(entityReports.map(er => er.report));
          break;
        case ReportType.TRIAL_BALANCE:
          consolidatedReport = this.consolidateTrialBalances(entityReports.map(er => er.report));
          break;
        default:
          throw new ApiError(400, `Unsupported report type: ${reportType}`);
      }
      
      // Update last run timestamp
      await this.updateConsolidationGroup(groupId, { lastRun: new Date() });
      
      return {
        ...consolidatedReport,
        entities: entityIds,
        groupName: group.name,
        groupId: group.id,
        reportType,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        generatedAt: new Date()
      };
    } catch (error) {
      throw handleDbError(error, 'generateConsolidatedReport');
    }
  }
  
  // Placeholder methods for report generation - in a real implementation these would call the storage methods
  
  private generatePlaceholderBalanceSheet(entityId: number): any {
    return {
      assets: [
        { accountId: 1, accountName: 'Cash', accountCode: '1000', balance: 10000 * entityId },
        { accountId: 2, accountName: 'Accounts Receivable', accountCode: '1100', balance: 5000 * entityId }
      ],
      liabilities: [
        { accountId: 3, accountName: 'Accounts Payable', accountCode: '2000', balance: 3000 * entityId }
      ],
      equity: [
        { accountId: 4, accountName: 'Retained Earnings', accountCode: '3000', balance: 12000 * entityId }
      ],
      totalAssets: 15000 * entityId,
      totalLiabilities: 3000 * entityId,
      totalEquity: 12000 * entityId,
      liabilitiesAndEquity: 15000 * entityId
    };
  }
  
  private generatePlaceholderIncomeStatement(entityId: number): any {
    return {
      revenue: [
        { accountId: 5, accountName: 'Sales', accountCode: '4000', balance: 20000 * entityId }
      ],
      expenses: [
        { accountId: 6, accountName: 'Cost of Goods Sold', accountCode: '5000', balance: 10000 * entityId },
        { accountId: 7, accountName: 'Operating Expenses', accountCode: '6000', balance: 5000 * entityId }
      ],
      totalRevenue: 20000 * entityId,
      totalExpenses: 15000 * entityId,
      netIncome: 5000 * entityId
    };
  }
  
  private generatePlaceholderCashFlow(entityId: number): any {
    return {
      cashFlows: [
        {
          category: 'Operating Activities',
          items: [
            { accountName: 'Net Income', balance: 5000 * entityId },
            { accountName: 'Depreciation', balance: 1000 * entityId }
          ],
          total: 6000 * entityId
        },
        {
          category: 'Investing Activities',
          items: [
            { accountName: 'Capital Expenditures', balance: -2000 * entityId }
          ],
          total: -2000 * entityId
        }
      ],
      netCashFlow: 4000 * entityId
    };
  }
  
  private generatePlaceholderTrialBalance(entityId: number): any {
    return {
      items: [
        { accountId: 1, accountName: 'Cash', accountCode: '1000', debit: 10000 * entityId, credit: 0, balance: 10000 * entityId },
        { accountId: 2, accountName: 'Accounts Receivable', accountCode: '1100', debit: 5000 * entityId, credit: 0, balance: 5000 * entityId },
        { accountId: 3, accountName: 'Accounts Payable', accountCode: '2000', debit: 0, credit: 3000 * entityId, balance: -3000 * entityId }
      ],
      totalDebits: 15000 * entityId,
      totalCredits: 3000 * entityId
    };
  }
  /**
   * Consolidate multiple balance sheets into one
   * @private
   */
  private consolidateBalanceSheets(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      assets: [] as any[],
      liabilities: [] as any[],
      equity: [] as any[],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      liabilitiesAndEquity: 0
    };
    
    // Mapping to track accounts across entities by code
    const accountMap: {[code: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      // Process assets
      if (report.assets) {
        report.assets.forEach((asset: any) => {
          const key = `${asset.accountCode || ''}-${asset.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: asset.accountId,
              accountName: asset.accountName,
              accountCode: asset.accountCode,
              balance: 0
            };
            consolidated.assets.push(accountMap[key]);
          }
          accountMap[key].balance += asset.balance;
        });
      }
      
      // Process liabilities
      if (report.liabilities) {
        report.liabilities.forEach((liability: any) => {
          const key = `${liability.accountCode || ''}-${liability.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: liability.accountId,
              accountName: liability.accountName,
              accountCode: liability.accountCode,
              balance: 0
            };
            consolidated.liabilities.push(accountMap[key]);
          }
          accountMap[key].balance += liability.balance;
        });
      }
      
      // Process equity
      if (report.equity) {
        report.equity.forEach((equity: any) => {
          const key = `${equity.accountCode || ''}-${equity.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: equity.accountId,
              accountName: equity.accountName,
              accountCode: equity.accountCode,
              balance: 0
            };
            consolidated.equity.push(accountMap[key]);
          }
          accountMap[key].balance += equity.balance;
        });
      }
    });
    
    // Calculate totals
    consolidated.totalAssets = consolidated.assets.reduce((sum, asset) => sum + asset.balance, 0);
    consolidated.totalLiabilities = consolidated.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
    consolidated.totalEquity = consolidated.equity.reduce((sum, equity) => sum + equity.balance, 0);
    consolidated.liabilitiesAndEquity = consolidated.totalLiabilities + consolidated.totalEquity;
    
    return consolidated;
  }
  
  /**
   * Consolidate multiple income statements into one
   * @private
   */
  private consolidateIncomeStatements(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      revenue: [] as any[],
      expenses: [] as any[],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    };
    
    // Mapping to track accounts across entities by code
    const accountMap: {[code: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      // Process revenue
      if (report.revenue) {
        report.revenue.forEach((rev: any) => {
          const key = `${rev.accountCode || ''}-${rev.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: rev.accountId,
              accountName: rev.accountName,
              accountCode: rev.accountCode,
              balance: 0
            };
            consolidated.revenue.push(accountMap[key]);
          }
          accountMap[key].balance += rev.balance;
        });
      }
      
      // Process expenses
      if (report.expenses) {
        report.expenses.forEach((expense: any) => {
          const key = `${expense.accountCode || ''}-${expense.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: expense.accountId,
              accountName: expense.accountName,
              accountCode: expense.accountCode,
              balance: 0
            };
            consolidated.expenses.push(accountMap[key]);
          }
          accountMap[key].balance += expense.balance;
        });
      }
    });
    
    // Calculate totals
    consolidated.totalRevenue = consolidated.revenue.reduce((sum, rev) => sum + rev.balance, 0);
    consolidated.totalExpenses = consolidated.expenses.reduce((sum, expense) => sum + expense.balance, 0);
    consolidated.netIncome = consolidated.totalRevenue - consolidated.totalExpenses;
    
    return consolidated;
  }
  
  /**
   * Consolidate multiple cash flow statements into one
   * @private
   */
  private consolidateCashFlows(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      cashFlows: [] as any[],
      netCashFlow: 0
    };
    
    // Track cash flow categories and items
    const categories: {[category: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      if (report.cashFlows) {
        report.cashFlows.forEach((cf: any) => {
          if (!categories[cf.category]) {
            categories[cf.category] = {
              category: cf.category,
              items: [],
              total: 0
            };
            consolidated.cashFlows.push(categories[cf.category]);
          }
          
          // Map items by name
          if (cf.items) {
            cf.items.forEach((item: any) => {
              const existingItem = categories[cf.category].items.find(
                (i: any) => i.accountName === item.accountName
              );
              
              if (existingItem) {
                existingItem.balance += item.balance;
              } else {
                categories[cf.category].items.push({...item});
              }
            });
          }
          
          // Update category total
          categories[cf.category].total += cf.total;
        });
      }
    });
    
    // Calculate net cash flow
    consolidated.netCashFlow = consolidated.cashFlows.reduce((sum, cf) => sum + cf.total, 0);
    
    return consolidated;
  }
  
  /**
   * Consolidate multiple trial balances into one
   * @private
   */
  private consolidateTrialBalances(reports: any[]): any {
    // Initialize consolidated structure
    const consolidated = {
      items: [] as any[],
      totalDebits: 0,
      totalCredits: 0
    };
    
    // Mapping to track accounts across entities by code
    const accountMap: {[code: string]: any} = {};
    
    // Process each entity's report
    reports.forEach(report => {
      if (report.items) {
        report.items.forEach((item: any) => {
          const key = `${item.accountCode || ''}-${item.accountName}`;
          if (!accountMap[key]) {
            accountMap[key] = {
              accountId: item.accountId,
              accountName: item.accountName,
              accountCode: item.accountCode,
              debit: 0,
              credit: 0,
              balance: 0
            };
            consolidated.items.push(accountMap[key]);
          }
          accountMap[key].debit += item.debit;
          accountMap[key].credit += item.credit;
          accountMap[key].balance = accountMap[key].debit - accountMap[key].credit;
        });
      }
    });
    
    // Calculate totals
    consolidated.totalDebits = consolidated.items.reduce((sum, item) => sum + item.debit, 0);
    consolidated.totalCredits = consolidated.items.reduce((sum, item) => sum + item.credit, 0);
    
    return consolidated;
  }
}

// Export a singleton instance
export const consolidationStorage = new ConsolidationStorage();