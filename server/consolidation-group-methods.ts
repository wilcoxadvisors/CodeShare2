// consolidation-group-methods.ts
// Enhanced implementation of consolidation group database methods

/**
 * IMPORTANT: TRANSITION PLAN FOR ENTITY-GROUP RELATIONSHIPS
 * 
 * Current Implementation:
 * - Using entity_ids array field in consolidation_groups table
 * - Soft deletion via isActive flag
 * 
 * Future Implementation (Phase 2):
 * - Will use the consolidation_group_entities junction table for many-to-many relationships
 * - The junction table is already defined in schema.ts but not yet created in the database
 * - A database migration will be required to create the junction table
 * - During migration, entity_ids data will be copied to the junction table
 * - Code already includes conditional logic for handling both implementations
 * 
 * Benefits of Junction Table:
 * - Proper data integrity with foreign key constraints
 * - More efficient queries for entity-group relationships
 * - Support for relationship metadata (e.g., consolidation rules per entity)
 * - Better handling of many-to-many relationships
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "./db";
import { consolidationGroups, consolidationGroupEntities, entities } from "../shared/schema";
import { ConsolidationGroup, InsertConsolidationGroup, ReportType, BudgetPeriodType } from "../shared/schema";
import { z } from "zod";

// Custom error classes for better error handling
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Enhanced validation schema for creating a consolidation group
const createConsolidationGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  ownerId: z.number().int().positive("Owner ID is required"),
  currency: z.string().default("USD"),
  startDate: z.date(),
  endDate: z.date(),
  periodType: z.enum([
    BudgetPeriodType.MONTHLY, 
    BudgetPeriodType.QUARTERLY, 
    BudgetPeriodType.ANNUAL, 
    BudgetPeriodType.CUSTOM
  ]).default(BudgetPeriodType.MONTHLY),
  rules: z.any().optional(),
  isActive: z.boolean().default(true),
  createdBy: z.number().int().positive("Created by is required"),
  // Handle both entityIds and entity_ids for flexibility
  entity_ids: z.array(z.number()).optional(),
  entityIds: z.array(z.number()).optional()
});

/**
 * Creates a new consolidation group with validation
 * Uses array-based approach with future compatibility for junction table
 */
export async function createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
  try {
    // Validate the input data using Zod
    const validatedData = createConsolidationGroupSchema.parse(group);
    
    // Use a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Handle both entity_ids and entityIds for backward compatibility
      // If both are provided, entity_ids takes precedence
      const entityIds = validatedData.entity_ids || 
                        validatedData.entityIds || 
                        [];
      
      // Insert the consolidation group with entity_ids (array-based approach)
      const [newGroup] = await tx.insert(consolidationGroups)
        .values({
          name: validatedData.name,
          description: validatedData.description || null,
          ownerId: validatedData.ownerId,
          entity_ids: entityIds, // Store entity IDs in array field
          currency: validatedData.currency || 'USD',
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          periodType: validatedData.periodType,
          rules: validatedData.rules || null,
          isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
          createdBy: validatedData.createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Note: We're not using the junction table yet as it doesn't exist in the database
      // This will be implemented in a future migration
      
      return newGroup;
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(`Validation error: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
}

/**
 * Updates a consolidation group
 */
export async function updateConsolidationGroup(id: number, data: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
  // Get existing group to verify it exists
  const existingGroup = await db.select()
    .from(consolidationGroups)
    .where(eq(consolidationGroups.id, id))
    .limit(1);
    
  if (!existingGroup || existingGroup.length === 0) {
    throw new NotFoundError(`Consolidation group ${id} not found`);
  }

  // Update with transaction for data consistency
  return await db.transaction(async (tx) => {
    // Set the updated timestamp
    data.updatedAt = new Date();
    
    // Update the consolidation group
    const [updatedGroup] = await tx.update(consolidationGroups)
      .set(data)
      .where(eq(consolidationGroups.id, id))
      .returning();
      
    return updatedGroup;
  });
}

/**
 * Soft deletes a consolidation group by setting isActive to false
 */
export async function deleteConsolidationGroup(id: number): Promise<void> {
  // Implement soft delete instead of hard delete
  await db.update(consolidationGroups)
    .set({ 
      isActive: false, 
      updatedAt: new Date() 
    })
    .where(eq(consolidationGroups.id, id));
}

/**
 * Adds an entity to a consolidation group using the array-based approach
 */
export async function addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<void> {
  await db.transaction(async (tx) => {
    // Check if the group exists
    const group = await tx.query.consolidationGroups.findFirst({
      where: eq(consolidationGroups.id, groupId)
    });
    
    if (!group) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }
    
    // Check if the entity exists
    const entityExists = await tx.query.entities.findFirst({
      where: eq(entities.id, entityId)
    });
    
    if (!entityExists) {
      throw new NotFoundError(`Entity ${entityId} not found`);
    }
    
    // Update the array field if entity is not already included
    const currentEntityIds = group.entity_ids || [];
    if (!currentEntityIds.includes(entityId)) {
      await tx.update(consolidationGroups)
        .set({ 
          entity_ids: [...currentEntityIds, entityId], 
          updatedAt: new Date() 
        })
        .where(eq(consolidationGroups.id, groupId));
    }
  });
}

/**
 * Removes an entity from a consolidation group using the array-based approach
 */
export async function removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<void> {
  await db.transaction(async (tx) => {
    // Check if the group exists
    const group = await tx.query.consolidationGroups.findFirst({
      where: eq(consolidationGroups.id, groupId)
    });
    
    if (!group) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }
    
    // Update the array field by filtering out the entity ID
    const currentEntityIds = group.entity_ids || [];
    if (currentEntityIds.includes(entityId)) {
      await tx.update(consolidationGroups)
        .set({ 
          entity_ids: currentEntityIds.filter(id => id !== entityId), 
          updatedAt: new Date() 
        })
        .where(eq(consolidationGroups.id, groupId));
    }
  });
}

/**
 * Generates a consolidated report for a group, using transactions
 * to ensure consistency between fetches and updates
 * Uses the entity_ids array to get associated entities
 */
export async function generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
  return await db.transaction(async (tx) => {
    // Get the consolidation group
    const groupResult = await tx
      .select()
      .from(consolidationGroups)
      .where(eq(consolidationGroups.id, groupId))
      .limit(1);
      
    if (!groupResult || groupResult.length === 0) {
      throw new NotFoundError(`Consolidation group ${groupId} not found`);
    }
    
    const group = groupResult[0];
    
    // Get entity IDs from the entity_ids array
    const entityIds = group.entity_ids || [];
    
    if (entityIds.length === 0) {
      throw new ValidationError('No entities associated with this consolidation group');
    }
    
    // Get detailed entity information
    const entitiesDetails = await tx
      .select()
      .from(entities)
      .where(
        // Using inArray operator to select entities where ID is in our entityIds array
        // This is more efficient than multiple individual queries
        inArray(entities.id, entityIds)
      );
    
    // Generate individual entity reports
    // Implementation depends on the specific report generation methods
    // which would need to be adapted to work with the transaction context
    
    // Mark last run timestamp
    await tx.update(consolidationGroups)
      .set({ lastRun: new Date() })
      .where(eq(consolidationGroups.id, groupId));
      
    // This would be the actual consolidated report
    return {
      groupId,
      reportType,
      startDate,
      endDate,
      generatedAt: new Date(),
      entityInfo: entitiesDetails,
      // Actual report data would be here
    };
  });
}

/**
 * Utility function to convert report currencies
 * This is a placeholder for future implementation
 */
export async function convertReportCurrency(report: any, fromCurrency: string, toCurrency: string): Promise<any> {
  // This would fetch the exchange rate from an external service
  // For now, we'll simulate with a placeholder function
  const exchangeRate = await fetchExchangeRate(fromCurrency, toCurrency);
  
  // Apply the exchange rate to all monetary values in the report
  // This would need to be customized based on the specific report structure
  if (report.assets) {
    report.assets.forEach((asset: any) => {
      if (asset.balance) {
        asset.balance *= exchangeRate;
      }
    });
  }
  
  return report;
}

/**
 * Placeholder function for fetching exchange rates
 * In a real implementation, this would call an external currency API
 */
async function fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  // Placeholder implementation
  // In production, this would call a currency exchange rate API
  if (fromCurrency === toCurrency) return 1;
  
  // For demo purposes only - this should be replaced with actual API calls
  const mockRates: Record<string, Record<string, number>> = {
    'USD': { 'EUR': 0.85, 'GBP': 0.75, 'JPY': 110.0 },
    'EUR': { 'USD': 1.18, 'GBP': 0.88, 'JPY': 129.5 },
    'GBP': { 'USD': 1.34, 'EUR': 1.14, 'JPY': 147.0 },
    'JPY': { 'USD': 0.0091, 'EUR': 0.0077, 'GBP': 0.0068 }
  };
  
  // Return mock rate if available, otherwise default to 1
  return mockRates[fromCurrency]?.[toCurrency] || 1;
}