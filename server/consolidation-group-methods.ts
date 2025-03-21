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

import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { consolidationGroups, consolidationGroupEntities, entities } from "../shared/schema";
import { ConsolidationGroup, InsertConsolidationGroup, ReportType, BudgetPeriodType } from "../shared/schema";
import { z } from "zod";
import { logEntityIdsDeprecation, logEntityIdsFallback, logEntityIdsUpdate } from "../shared/deprecation-logger";

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
 * Uses both array-based approach and junction table for compatibility
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
      
      // Log usage of entity_ids in creation
      if (validatedData.entity_ids) {
        logEntityIdsDeprecation('createConsolidationGroup', { 
          entityCount: validatedData.entity_ids.length 
        });
      }
      
      // Insert the consolidation group with entity_ids (array-based approach for backward compatibility)
      // We log this even if entityIds was used instead of entity_ids
      logEntityIdsUpdate('createConsolidationGroup');
      
      const [newGroup] = await tx.insert(consolidationGroups)
        .values({
          name: validatedData.name,
          description: validatedData.description || null,
          ownerId: validatedData.ownerId,
          entity_ids: entityIds, // Store entity IDs in array field for backward compatibility
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
      
      // Now that we have the junction table, also create relationships there
      if (entityIds.length > 0) {
        try {
          // Create entries in the junction table for each entity
          const junctionRecords = entityIds.map(entityId => ({
            groupId: newGroup.id,
            entityId: entityId
          }));
          
          // Insert all records into the junction table
          await tx.insert(consolidationGroupEntities)
            .values(junctionRecords)
            .onConflictDoNothing(); // Prevent duplicate entries
        } catch (junctionError) {
          // Log the error but don't fail the transaction
          // This allows the group to be created even if junction table insertion fails
          console.error('Error inserting into junction table:', junctionError);
        }
      }
      
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
    
    // Check if entity_ids is being updated directly (should be using junction table instead)
    if ('entity_ids' in data) {
      // Log direct modification of entity_ids field as high-priority deprecation warning
      logEntityIdsDeprecation('updateConsolidationGroup', { 
        id,
        directModification: true,
        entityCount: Array.isArray(data.entity_ids) ? data.entity_ids.length : 0
      });
    }
    
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
 * Note: We don't delete the junction table records to maintain relationship history
 */
export async function deleteConsolidationGroup(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    // Check if the group exists
    const group = await tx.query.consolidationGroups.findFirst({
      where: eq(consolidationGroups.id, id)
    });
    
    if (!group) {
      throw new NotFoundError(`Consolidation group ${id} not found`);
    }
    
    // Implement soft delete instead of hard delete
    await tx.update(consolidationGroups)
      .set({ 
        isActive: false, 
        updatedAt: new Date() 
      })
      .where(eq(consolidationGroups.id, id));
      
    // We intentionally do NOT delete the junction table records
    // This preserves the relationship history for potential undeletion
    // and for audit/history purposes
  });
}

/**
 * Adds an entity to a consolidation group using both approaches for compatibility
 * - Adds to junction table (primary approach now that it exists)
 * - Also maintains the entity_ids array for backward compatibility
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
    
    try {
      // First approach: Add to junction table (this is now the primary approach)
      await tx.insert(consolidationGroupEntities)
        .values({
          groupId,
          entityId
        })
        .onConflictDoNothing(); // Prevent duplicate entries
      
      // Second approach: Also update the array field for backward compatibility
      const currentEntityIds = group.entity_ids || [];
      if (!currentEntityIds.includes(entityId)) {
        // Log the update to entity_ids array for tracking usage
        logEntityIdsUpdate('addEntityToConsolidationGroup', groupId);
        
        await tx.update(consolidationGroups)
          .set({ 
            entity_ids: [...currentEntityIds, entityId], 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId));
      }
    } catch (error) {
      console.error('Error adding entity to consolidation group:', error);
      throw error;
    }
  });
}

/**
 * Removes an entity from a consolidation group using both approaches for compatibility
 * - Removes from junction table (primary approach now that it exists)
 * - Also updates the entity_ids array for backward compatibility
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
    
    try {
      // First approach: Remove from junction table (primary approach)
      await tx.delete(consolidationGroupEntities)
        .where(
          and(
            eq(consolidationGroupEntities.groupId, groupId),
            eq(consolidationGroupEntities.entityId, entityId)
          )
        );
      
      // Second approach: Also update the array field for backward compatibility
      const currentEntityIds = group.entity_ids || [];
      if (currentEntityIds.includes(entityId)) {
        // Log the update to entity_ids array for tracking usage
        logEntityIdsUpdate('removeEntityFromConsolidationGroup', groupId);
        
        await tx.update(consolidationGroups)
          .set({ 
            entity_ids: currentEntityIds.filter(id => id !== entityId), 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId));
      }
    } catch (error) {
      console.error('Error removing entity from consolidation group:', error);
      throw error;
    }
  });
}

/**
 * Generates a consolidated report for a group, using transactions
 * to ensure consistency between fetches and updates
 * Uses both the junction table and entity_ids array to get associated entities
 */
export async function generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
  try {
    return await db.transaction(async (tx) => {
      // Get the consolidation group
      const groupResult = await tx
        .select()
        .from(consolidationGroups)
        .where(
          and(
            eq(consolidationGroups.id, groupId),
            eq(consolidationGroups.isActive, true)
          )
        )
        .limit(1);
        
      if (!groupResult || groupResult.length === 0) {
        throw new NotFoundError(`Consolidation group ${groupId} not found`);
      }
      
      const group = groupResult[0];
      
      // Priority 1: Get entity IDs from the junction table (primary approach)
      const junctionEntities = await tx
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
      
      let entityIds: number[] = junctionEntities.map(je => je.entityId);
      
      // Priority 2: If no entities found in junction table, fall back to legacy array approach
      if (entityIds.length === 0) {
        // Log the fallback to entity_ids array
        logEntityIdsFallback('generateConsolidatedReport', groupId);
        
        // Fall back to entity_ids array for backward compatibility
        entityIds = group.entity_ids || [];
      }
      
      if (entityIds.length === 0) {
        throw new ValidationError('No entities associated with this consolidation group');
      }
      
      // Get detailed entity information including only active entities
      const entitiesDetails = await tx
        .select()
        .from(entities)
        .where(
          and(
            inArray(entities.id, entityIds),
            eq(entities.active, true)
          )
        );
      
      // Extract active entity IDs only
      const activeEntityIds = entitiesDetails.map(entity => entity.id);
      
      if (activeEntityIds.length === 0) {
        throw new ValidationError('No active entities found in this consolidation group');
      }
      
      // Effective date handling
      const effectiveStartDate = startDate || group.startDate;
      const effectiveEndDate = endDate || group.endDate || new Date();
      
      // Generate individual entity reports
      // Here we would call separate report generation functions based on reportType
      const entityReports = await Promise.all(
        activeEntityIds.map(async (entityId) => {
          // This would be replaced with actual report generation logic
          // Placeholder for demonstration
          return {
            entityId,
            report: { /* report data would go here */ }
          };
        })
      );
      
      // Consolidate the reports based on report type
      let consolidatedReport = {};
      
      // Update last run timestamp
      await tx.update(consolidationGroups)
        .set({ lastRun: new Date(), updatedAt: new Date() })
        .where(eq(consolidationGroups.id, groupId));
        
      return {
        groupId,
        groupName: group.name,
        reportType,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        generatedAt: new Date(),
        currency: group.currency,
        entityInfo: entitiesDetails,
        consolidatedData: consolidatedReport,
        entities: activeEntityIds
      };
    });
  } catch (err) {
    console.error('Error generating consolidated report:', err);
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    throw new Error('Failed to generate consolidated report');
  }
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
 * Gets all entities associated with a consolidation group
 * Primarily uses the junction table, falls back to entity_ids array if needed
 */
export async function getConsolidationGroupEntities(groupId: number): Promise<number[]> {
  return await db.transaction(async (tx) => {
    // Check if the group exists
    const group = await tx.query.consolidationGroups.findFirst({
      where: eq(consolidationGroups.id, groupId)
    });
    
    if (!group) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }
    
    // Priority 1: Get entity IDs from the junction table (primary approach)
    const junctionEntities = await tx
      .select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, groupId));
    
    let entityIds: number[] = junctionEntities.map(je => je.entityId);
    
    // Priority 2: If no entities found in junction table, fall back to legacy array approach
    if (entityIds.length === 0) {
      // Log the fallback to entity_ids array
      logEntityIdsFallback('getConsolidationGroupEntities', groupId);
      
      // Fall back to entity_ids array for backward compatibility
      entityIds = group.entity_ids || [];
    }
    
    return entityIds;
  });
}

/**
 * Gets all consolidation groups that an entity belongs to
 * Primarily uses the junction table, falls back to filtering on entity_ids array if needed
 */
export async function getEntityConsolidationGroups(entityId: number): Promise<ConsolidationGroup[]> {
  try {
    return await db.transaction(async (tx) => {
      // Validate that the entity exists
      const entityExists = await tx.query.entities.findFirst({
        where: eq(entities.id, entityId)
      });
      
      if (!entityExists) {
        throw new NotFoundError(`Entity ${entityId} not found`);
      }
      
      // Priority 1: Get groups from the junction table (primary approach)
      const junctionGroups = await tx
        .select({
          groupId: consolidationGroupEntities.groupId
        })
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.entityId, entityId));
      
      const groupIds = junctionGroups.map(jg => jg.groupId);
      
      // Get groups by IDs from the junction table results
      let groups: ConsolidationGroup[] = [];
      
      if (groupIds.length > 0) {
        groups = await tx
          .select()
          .from(consolidationGroups)
          .where(
            and(
              inArray(consolidationGroups.id, groupIds),
              eq(consolidationGroups.isActive, true)
            )
          );
      } else {
        // Priority 2: If no groups found in junction table, fall back to legacy array approach
        // Log the fallback to entity_ids array
        logEntityIdsFallback('getEntityConsolidationGroups', entityId);
        
        // Use raw SQL for the ANY operation with proper type safety
        const rawResult = await tx.execute(
          sql`SELECT * FROM consolidation_groups 
              WHERE ${entityId} = ANY(entity_ids) 
              AND is_active = true`
        );
        
        // Convert raw result to ConsolidationGroup objects
        groups = rawResult.rows as unknown as ConsolidationGroup[];
      }
      
      return groups;
    });
  } catch (err) {
    console.error('Error getting consolidation groups for entity:', err);
    if (err instanceof NotFoundError) {
      throw err;
    }
    throw new Error('Failed to get consolidation groups for entity');
  }
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