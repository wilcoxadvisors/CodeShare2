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

import { eq, and, inArray, sql, not } from "drizzle-orm";
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
  // Only accept entityIds for input, since entity_ids field is deprecated
  entityIds: z.array(z.number()).optional()
});

/**
 * Creates a new consolidation group with validation
 * Temporarily maintains both entity_ids array and junction table for backward compatibility
 * The entity_ids array will be deprecated in the future
 */
export async function createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
  try {
    // Validate the input data using Zod
    const validatedData = createConsolidationGroupSchema.parse({
      ...group,
      // Handle potential entityIds in the input data
      entityIds: group.entityIds || group.entity_ids || []
    });
    
    // Use a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Extract entity IDs from either the entityIds property or entity_ids array
      const entityIds = validatedData.entityIds || [];
      
      // Insert the consolidation group with both entity_ids array and junction table approach
      // This is temporary for backward compatibility during transition period
      const [newGroup] = await tx.insert(consolidationGroups)
        .values({
          name: validatedData.name,
          description: validatedData.description || null,
          ownerId: validatedData.ownerId,
          currency: validatedData.currency || 'USD',
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          periodType: validatedData.periodType,
          rules: validatedData.rules || null,
          isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
          createdBy: validatedData.createdBy,
          entity_ids: entityIds, // Temporarily maintain entity_ids array for backward compatibility
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Log update to entity_ids for backward compatibility
      if (entityIds.length > 0) {
        logEntityIdsUpdate('createConsolidationGroup', newGroup.id);
      }
      
      // Create relationships in the junction table
      if (entityIds.length > 0) {
        try {
          // Create entries in the junction table for each entity
          const junctionRecords = entityIds.map((entityId: number) => ({
            groupId: newGroup.id,
            entityId: entityId
          }));
          
          // Insert all records into the junction table
          await tx.insert(consolidationGroupEntities)
            .values(junctionRecords)
            .onConflictDoNothing({ target: [consolidationGroupEntities.groupId, consolidationGroupEntities.entityId] }); // Prevent duplicate entries
        } catch (junctionError) {
          console.error('Error inserting into junction table:', junctionError);
          throw new Error('Failed to add entities to consolidation group');
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
 * Ignores any direct entity_ids modifications (use junction table methods instead)
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
    
    // Handle any attempts to update entity relationships directly
    // We want to force the use of addEntityToConsolidationGroup/removeEntityFromConsolidationGroup instead
    
    // Handle legacy entity_ids attempts
    if ('entity_ids' in data) {
      // Log direct modification of entity_ids field as high-priority deprecation warning
      logEntityIdsDeprecation('updateConsolidationGroup', { 
        id,
        directModification: true,
        entityCount: Array.isArray(data.entity_ids) ? data.entity_ids.length : 0
      });
      
      // Remove entity_ids from the update data
      const { entity_ids, ...cleanData } = data;
      data = cleanData;
    }
    
    // Also prevent entityIds direct updates (proper way is to use the junction table methods)
    if ('entityIds' in data) {
      console.warn(`Direct entityIds updates are not allowed - use addEntityToConsolidationGroup/removeEntityFromConsolidationGroup instead`);
      
      // Remove entityIds from the update data
      const { entityIds, ...cleanData } = data;
      data = cleanData;
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
 * Adds an entity to a consolidation group
 * Temporarily maintains both entity_ids array and junction table during transition
 * Returns the updated consolidation group
 */
export async function addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
  return await db.transaction(async (tx) => {
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
      // Add to junction table
      await tx.insert(consolidationGroupEntities)
        .values({
          groupId,
          entityId
        })
        .onConflictDoNothing({ target: [consolidationGroupEntities.groupId, consolidationGroupEntities.entityId] }); // Prevent duplicate entries
      
      // Also update entity_ids array for backward compatibility during transition
      // Get current entity_ids array
      const currentEntityIds = group.entity_ids || [];
      
      // Only add if not already in the array
      if (!currentEntityIds.includes(entityId)) {
        // Update entity_ids array  
        const updatedEntityIds = [...currentEntityIds, entityId];
        
        // Update the group with both approaches
        const updatedGroups = await tx.update(consolidationGroups)
          .set({ 
            entity_ids: updatedEntityIds, 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId))
          .returning();
        
        if (updatedGroups.length === 0) {
          throw new Error("Failed to update consolidation group");
        }
        
        // Log that we're updating entity_ids for backward compatibility
        logEntityIdsUpdate('addEntityToConsolidationGroup', groupId);
        
        return updatedGroups[0];
      } else {
        // Entity already in entity_ids array, just update timestamp
        const updatedGroups = await tx.update(consolidationGroups)
          .set({ updatedAt: new Date() })
          .where(eq(consolidationGroups.id, groupId))
          .returning();
        
        if (updatedGroups.length === 0) {
          throw new Error("Failed to update consolidation group");
        }
        
        return updatedGroups[0];
      }
    } catch (error) {
      console.error('Error adding entity to consolidation group:', error);
      throw error;
    }
  });
}

/**
 * Removes an entity from a consolidation group
 * Temporarily maintains both entity_ids array and junction table during transition
 * Returns the updated consolidation group
 */
export async function removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
  return await db.transaction(async (tx) => {
    // Check if the group exists
    const group = await tx.query.consolidationGroups.findFirst({
      where: eq(consolidationGroups.id, groupId)
    });
    
    if (!group) {
      throw new NotFoundError(`Group ${groupId} not found`);
    }
    
    try {
      // Remove from junction table
      await tx.delete(consolidationGroupEntities)
        .where(
          and(
            eq(consolidationGroupEntities.groupId, groupId),
            eq(consolidationGroupEntities.entityId, entityId)
          )
        );
      
      // Also update entity_ids array for backward compatibility during transition
      // Get current entity_ids array
      const currentEntityIds = group.entity_ids || [];
      
      // Only remove if entity exists in the array
      if (currentEntityIds.includes(entityId)) {
        // Filter out the entity from entity_ids array
        const updatedEntityIds = currentEntityIds.filter(id => id !== entityId);
        
        // Update the group with both approaches
        const updatedGroups = await tx.update(consolidationGroups)
          .set({ 
            entity_ids: updatedEntityIds, 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId))
          .returning();
        
        if (updatedGroups.length === 0) {
          throw new Error("Failed to update consolidation group");
        }
        
        // Log that we're updating entity_ids for backward compatibility
        logEntityIdsUpdate('removeEntityFromConsolidationGroup', groupId);
        
        return updatedGroups[0];
      } else {
        // Entity wasn't in entity_ids array, just update timestamp
        const updatedGroups = await tx.update(consolidationGroups)
          .set({ updatedAt: new Date() })
          .where(eq(consolidationGroups.id, groupId))
          .returning();
        
        if (updatedGroups.length === 0) {
          throw new Error("Failed to update consolidation group");
        }
        
        return updatedGroups[0];
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
 * Primarily uses the junction table but falls back to entity_ids array if needed
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
      
      // Get entity IDs from the junction table
      const junctionEntities = await tx
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
      
      let entityIds: number[] = junctionEntities.map(je => je.entityId);
      
      // If no entities found in junction table, fall back to entity_ids array
      if (entityIds.length === 0 && group.entity_ids && group.entity_ids.length > 0) {
        // Log that we're falling back to entity_ids
        logEntityIdsFallback('generateConsolidatedReport', groupId);
        
        entityIds = group.entity_ids;
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
 * Primarily uses the junction table but falls back to entity_ids array if needed
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
    
    // Get entity IDs from the junction table
    const junctionEntities = await tx
      .select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, groupId));
    
    const entityIds: number[] = junctionEntities.map(je => je.entityId);
    
    // If no entities found in junction table, fall back to entity_ids array
    if (entityIds.length === 0 && group.entity_ids && group.entity_ids.length > 0) {
      // Log that we're falling back to entity_ids
      logEntityIdsFallback('getConsolidationGroupEntities', groupId);
      
      return group.entity_ids;
    }
    
    return entityIds;
  });
}

/**
 * Gets all consolidation groups that an entity belongs to
 * Primarily uses the junction table, but also checks entity_ids array
 * for backward compatibility during transition
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
      
      // Get groups from the junction table
      const junctionGroups = await tx
        .select({
          groupId: consolidationGroupEntities.groupId
        })
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.entityId, entityId));
      
      const groupIds = junctionGroups.map(jg => jg.groupId);
      
      // For backward compatibility, check entity_ids arrays in all groups
      // Fetch all active groups that have entity_ids array containing this entityId
      // Note: SQL array contains operator
      const legacyGroups = await tx
        .select()
        .from(consolidationGroups)
        .where(
          and(
            sql`${entityId} = ANY(${consolidationGroups.entity_ids})`,
            eq(consolidationGroups.isActive, true),
            // Exclude groups we already found in the junction table
            groupIds.length > 0 ? not(inArray(consolidationGroups.id, groupIds)) : undefined
          )
        );
        
      if (legacyGroups.length > 0) {
        // Log that we found groups using the legacy approach
        logEntityIdsFallback('getEntityConsolidationGroups', undefined);
        
        // Add the legacy group IDs to our list
        const legacyGroupIds = legacyGroups.map(g => g.id);
        groupIds.push(...legacyGroupIds);
      }
      
      // Get groups by IDs from both junction table and legacy results
      const groups: ConsolidationGroup[] = [];
      
      if (groupIds.length > 0) {
        const activeGroups = await tx
          .select()
          .from(consolidationGroups)
          .where(
            and(
              inArray(consolidationGroups.id, groupIds),
              eq(consolidationGroups.isActive, true)
            )
          );
        
        return activeGroups;
      }
      
      return groups; // Return empty array if no groups found
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