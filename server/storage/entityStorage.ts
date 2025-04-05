/**
 * entityStorage.ts
 *
 * Purpose:
 *   Centralizes all CRUD operations related to Entities in the Wilcox Advisors system.
 *   This module provides consistent entity management across the application with
 *   implementations for both database and in-memory storage.
 *
 * Methods Included:
 *   - getEntity(id) - Retrieve a single entity by ID
 *   - getEntities() - Retrieve all entities
 *   - getEntitiesByUser(userId) - Get entities owned by or accessible to a user
 *   - getEntitiesByClient(clientId) - Get entities belonging to a specific client
 *   - createEntity(entityData) - Create a new entity
 *   - updateEntity(id, entityData) - Update an existing entity
 *
 * Dependencies:
 *   - Drizzle ORM for database interactions
 *   - Entity schemas from shared/schema.ts
 *   - Database connection from server/db.ts
 */
import { db } from "../db";
import { entities, Entity, InsertEntity, userEntityAccess, clients } from "@shared/schema";
import { eq, and, asc, inArray, like, isNull, SQL } from "drizzle-orm";
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
 * Generate a unique hierarchical entity code based on the client's code
 * Format: {ClientCode}-{SequentialNumber}
 * Example: "ABC123XYZ-001"
 */
async function generateUniqueEntityCode(clientId: number): Promise<string> {
  try {
    // Fetch the client to get its code
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }
    
    const clientCode = client.clientCode;
    
    // Find existing entity codes for this client and determine the next sequential number
    const existingEntities = await db
      .select({ entityCode: entities.entityCode })
      .from(entities)
      .where(like(entities.entityCode, `${clientCode}-%`))
      .orderBy(asc(entities.entityCode));
    
    // Extract the sequence numbers from existing entity codes
    const existingNumbers = existingEntities
      .map(e => {
        if (!e.entityCode) return 0;
        const parts = e.entityCode.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    // Determine the next sequential number
    const nextNumber = existingNumbers.length > 0 
      ? Math.max(...existingNumbers) + 1 
      : 1;
    
    // Format: CLIENT-CODE-0001 (padded to ensure consistent sorting with 4 digits)
    return `${clientCode}-${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error("Error generating unique entity code:", error);
    // Fallback to timestamp-based code if an error occurs
    return `ERR-${Date.now().toString(36).toUpperCase()}`;
  }
}

/**
 * Interface for entity storage operations
 */
export interface IEntityStorage {
  getEntity(id: number, includeDeleted?: boolean): Promise<Entity | undefined>;
  getEntities(includeDeleted?: boolean, includeInactive?: boolean): Promise<Entity[]>;
  getEntitiesByUser(userId: number, includeDeleted?: boolean, includeInactive?: boolean): Promise<Entity[]>;
  getEntitiesByClient(clientId: number, includeDeleted?: boolean, includeInactive?: boolean): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<Entity>): Promise<Entity | undefined>;
  
  // Explicit management of entity states
  setEntityActive(id: number, adminId: number): Promise<Entity | undefined>;
  setEntityInactive(id: number, adminId: number): Promise<Entity | undefined>;
  
  // Soft deletion and restoration
  deleteEntity(id: number, adminId: number): Promise<boolean>;
  restoreEntity(id: number, adminId: number): Promise<Entity | undefined>;
  
  // Note: User Entity Access methods have been moved to userStorage.ts
}

/**
 * Implementation of entity storage operations using Drizzle ORM
 */
export class EntityStorage implements IEntityStorage {
  /**
   * Get an entity by ID
   * 
   * @param id - The ID of the entity to retrieve
   * @param includeDeleted - If true, return the entity even if it has been soft-deleted
   * @returns The entity or undefined if not found
   */
  async getEntity(id: number, includeDeleted: boolean = false): Promise<Entity | undefined> {
    try {
      // Validate ID
      if (isNaN(id) || id <= 0) {
        console.error(`EntityStorage.getEntity: Invalid entity ID: ${id}`);
        return undefined;
      }
      
      console.log(`EntityStorage.getEntity: Getting entity ${id} with includeDeleted=${includeDeleted}`);
      
      // Create query with appropriate filters
      if (includeDeleted) {
        // Just filter by ID if we want to include deleted entities
        const query = db
          .select()
          .from(entities)
          .where(eq(entities.id, id))
          .limit(1);
        
        const [entity] = await query;
        console.log(`EntityStorage.getEntity: Found entity with includeDeleted=true: ${entity ? 'Yes' : 'No'}`);
        if (entity) {
          console.log(`EntityStorage.getEntity: deletedAt=${entity.deletedAt}, active=${entity.active}`);
        }
        return entity || undefined;
      } else {
        // Filter by ID and ensure the entity is not deleted
        const query = db
          .select()
          .from(entities)
          .where(
            and(
              eq(entities.id, id),
              isNull(entities.deletedAt)
            )
          )
          .limit(1);
        
        const [entity] = await query;
        console.log(`EntityStorage.getEntity: Found entity with includeDeleted=false: ${entity ? 'Yes' : 'No'}`);
        return entity || undefined;
      }
    } catch (error) {
      handleDbError(error, "Error retrieving entity");
      return undefined;
    }
  }

  /**
   * Get all entities
   * 
   * @param includeDeleted - If true, include soft-deleted entities in results
   * @param includeInactive - If true, include inactive (but not deleted) entities
   * @returns Array of entities
   */
  async getEntities(includeDeleted: boolean = false, includeInactive: boolean = true): Promise<Entity[]> {
    try {
      // Start with conditions array
      const conditions: SQL<unknown>[] = [];
      
      // Filter out deleted entities unless explicitly included
      if (!includeDeleted) {
        conditions.push(isNull(entities.deletedAt));
      }
      
      // Filter out inactive entities unless explicitly included
      if (!includeInactive) {
        conditions.push(eq(entities.active, true));
      }
      
      // Build the query based on conditions
      let query = db.select().from(entities);
      
      // Apply conditions if any exist
      if (conditions.length > 0) {
        const whereClause = and(...conditions);
        query = query.where(whereClause);
      }
      
      // Execute the query
      return await query;
    } catch (error) {
      handleDbError(error, "Error retrieving entities");
      return [];
    }
  }

  /**
   * Get entities by user ID
   * This includes entities owned by the user and entities the user has access to
   * 
   * @param userId - The ID of the user
   * @param includeDeleted - If true, include soft-deleted entities in results
   * @param includeInactive - If true, include inactive (but not deleted) entities
   * @returns Array of entities owned by or accessible to the user
   */
  async getEntitiesByUser(userId: number, includeDeleted: boolean = false, includeInactive: boolean = true): Promise<Entity[]> {
    try {
      // First, get all entities owned by the user
      // Start with conditions array for owned entities
      const ownedConditions: SQL<unknown>[] = [eq(entities.ownerId, userId)];
      
      // Apply filters based on parameters
      if (!includeDeleted) {
        // Filter out soft-deleted entities
        ownedConditions.push(isNull(entities.deletedAt));
      }
      
      if (!includeInactive) {
        // Filter to only active entities
        ownedConditions.push(eq(entities.active, true));
      }
      
      // Build combined where clause with AND for owned entities
      const ownedWhereClause = and(...ownedConditions);
      
      // Execute query for owned entities
      const ownedEntities = await db
        .select()
        .from(entities)
        .where(ownedWhereClause);
      
      // Next, get all entity IDs the user has access to through userEntityAccess
      const accessResults = await db
        .select({ entityId: userEntityAccess.entityId })
        .from(userEntityAccess)
        .where(eq(userEntityAccess.userId, userId));
      
      const accessEntityIds = accessResults.map(r => r.entityId);
      
      // If there are no access entries, just return owned entities
      if (accessEntityIds.length === 0) {
        return ownedEntities;
      }
      
      // Get the entities the user has access to
      // Start with conditions array for access entities
      const accessConditions: SQL<unknown>[] = [inArray(entities.id, accessEntityIds)];
      
      // Apply the same filters as with owned entities
      if (!includeDeleted) {
        accessConditions.push(isNull(entities.deletedAt));
      }
      
      if (!includeInactive) {
        accessConditions.push(eq(entities.active, true));
      }
      
      // Build combined where clause with AND for access entities
      const accessWhereClause = and(...accessConditions);
      
      // Execute query for access entities
      const accessEntities = await db
        .select()
        .from(entities)
        .where(accessWhereClause);
      
      // Combine and deduplicate
      const combinedEntities = [...ownedEntities];
      
      // Add access entities only if they're not already in the owned list
      for (const accessEntity of accessEntities) {
        if (!combinedEntities.some(e => e.id === accessEntity.id)) {
          combinedEntities.push(accessEntity);
        }
      }
      
      return combinedEntities;
    } catch (error) {
      handleDbError(error, "Error retrieving entities by user");
      return [];
    }
  }

  /**
   * Get entities by client ID
   * 
   * @param clientId - The ID of the client
   * @param includeDeleted - If true, include soft-deleted entities in results
   * @param includeInactive - If true, include inactive (but not deleted) entities
   * @returns Array of entities belonging to the client
   */
  async getEntitiesByClient(clientId: number, includeDeleted: boolean = false, includeInactive: boolean = true): Promise<Entity[]> {
    try {
      // Start with conditions array
      const conditions: SQL<unknown>[] = [eq(entities.clientId, clientId)];
      
      // Apply deletion filter if needed
      if (!includeDeleted) {
        conditions.push(isNull(entities.deletedAt));
      }
      
      // Apply inactive filter if needed
      if (!includeInactive) {
        conditions.push(eq(entities.active, true));
      }
      
      // Build combined where clause with AND
      const whereClause = and(...conditions);
      
      // Execute query with proper filtering
      const results = await db
        .select()
        .from(entities)
        .where(whereClause)
        .orderBy(asc(entities.name));
      
      return results;
    } catch (error) {
      handleDbError(error, "Error retrieving entities by client");
      return [];
    }
  }

  /**
   * Create a new entity
   */
  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    try {
      console.log("DEBUG EntityStorage.createEntity: Creating new entity with data:", JSON.stringify(insertEntity));
      
      // Process industry data for consistency
      let industryValue = insertEntity.industry;
      
      // Convert numeric industry values to string to maintain consistency
      if (industryValue !== undefined && industryValue !== null) {
        if (industryValue === '') {
          // Default empty string to "other" for consistency with update logic
          industryValue = "other";
        } else {
          // Convert any non-empty value to string for consistency
          industryValue = String(industryValue);
        }
      } else {
        // Default null or undefined to "other" for consistency with update logic
        industryValue = "other";
      }
      
      // Generate a unique hierarchical entity code if client ID is provided
      let entityCode = null;
      if (insertEntity.clientId) {
        entityCode = await generateUniqueEntityCode(insertEntity.clientId);
        console.log(`DEBUG EntityStorage.createEntity: Generated unique entity code: ${entityCode}`);
      } else {
        console.log("DEBUG EntityStorage.createEntity: No client ID provided, skipping entity code generation");
      }
      
      // Insert with processed values
      const entityToInsert = {
        ...insertEntity,
        industry: industryValue,
        entityCode // Include the generated entity code
      };
      
      const [newEntity] = await db.insert(entities).values(entityToInsert).returning();
      return newEntity;
    } catch (error) {
      handleDbError(error, "Error creating entity");
      throw error;
    }
  }

  /**
   * Update an entity
   */
  async updateEntity(id: number, entityData: Partial<Entity>): Promise<Entity | undefined> {
    try {
      console.log(`DEBUG EntityStorage.updateEntity: Updating entity with ID ${id}`);
      console.log("DEBUG EntityStorage.updateEntity: Received entity data:", JSON.stringify(entityData));
      
      // Validate ID
      if (isNaN(id) || id <= 0) {
        console.error(`DEBUG EntityStorage.updateEntity: Invalid entity ID: ${id}`);
        return undefined;
      }
      
      // Process industry data for consistency (similar to create logic)
      let entityToUpdate: Partial<Entity> = { ...entityData };
      
      if (entityData.industry !== undefined) {
        if (entityData.industry === '' || entityData.industry === null) {
          entityToUpdate.industry = 'other';
        } else {
          entityToUpdate.industry = String(entityData.industry);
        }
      }
      
      // Add updated timestamp
      entityToUpdate.updatedAt = new Date();
      
      const [updatedEntity] = await db
        .update(entities)
        .set(entityToUpdate)
        .where(eq(entities.id, id))
        .returning();
      
      return updatedEntity;
    } catch (error) {
      handleDbError(error, "Error updating entity");
      return undefined;
    }
  }

  /**
   * Explicitly set an entity as inactive WITHOUT soft-deleting it
   * This keeps the entity in standard queries but marks it as inactive
   * 
   * @param id - The ID of the entity to mark as inactive
   * @param adminId - ID of the admin user performing the action (for audit logging)
   * @returns The updated entity or undefined if not found
   */
  async setEntityInactive(id: number, adminId: number): Promise<Entity | undefined> {
    try {
      console.log(`DEBUG EntityStorage.setEntityInactive: Setting entity ${id} as inactive by admin ID ${adminId}`);
      
      // First, get the entity to verify it exists and to capture its details for audit
      const entity = await this.getEntity(id);
      if (!entity) {
        console.error(`DEBUG EntityStorage.setEntityInactive: Entity with ID ${id} not found`);
        return undefined;
      }
      
      // Make sure this isn't a deleted entity
      if (entity.deletedAt) {
        console.error(`DEBUG EntityStorage.setEntityInactive: Entity with ID ${id} is deleted, cannot modify`);
        return undefined;
      }
      
      // Update entity to set active=false but explicitly keep deletedAt=null
      const now = new Date();
      const [inactiveEntity] = await db
        .update(entities)
        .set({
          active: false,
          deletedAt: null, // Explicitly set to null to distinguish from deleted entities
          updatedAt: now
        })
        .where(eq(entities.id, id))
        .returning();
      
      if (!inactiveEntity) {
        console.error(`DEBUG EntityStorage.setEntityInactive: Failed to set entity ${id} as inactive`);
        return undefined;
      }
      
      console.log(`DEBUG EntityStorage.setEntityInactive: Successfully set entity ${id} as inactive`);
      
      // Log the action to audit_logs
      try {
        const { auditLogStorage } = await import('./auditLogStorage');
        await auditLogStorage.createAuditLog({
          action: 'entity_set_inactive',
          performedBy: adminId,
          details: JSON.stringify({
            entityId: entity.id,
            entityName: entity.name,
            entityCode: entity.entityCode,
            clientId: entity.clientId
          })
        });
        console.log(`DEBUG EntityStorage.setEntityInactive: Created audit log for setting entity as inactive`);
      } catch (auditError) {
        // Log the error but don't fail the operation
        console.error("Error creating audit log for setting entity as inactive:", auditError);
      }
      
      return inactiveEntity;
    } catch (error) {
      handleDbError(error, "Error setting entity as inactive");
      return undefined;
    }
  }
  
  /**
   * Explicitly set an entity as active
   * This marks an inactive entity as active again
   * 
   * @param id - The ID of the entity to mark as active
   * @param adminId - ID of the admin user performing the action (for audit logging)
   * @returns The updated entity or undefined if not found
   */
  async setEntityActive(id: number, adminId: number): Promise<Entity | undefined> {
    try {
      console.log(`DEBUG EntityStorage.setEntityActive: Setting entity ${id} as active by admin ID ${adminId}`);
      
      // First, get the entity to verify it exists and to capture its details for audit
      const entity = await this.getEntity(id);
      if (!entity) {
        console.error(`DEBUG EntityStorage.setEntityActive: Entity with ID ${id} not found`);
        return undefined;
      }
      
      // Make sure this isn't a deleted entity
      if (entity.deletedAt) {
        console.error(`DEBUG EntityStorage.setEntityActive: Entity with ID ${id} is deleted, cannot modify; use restoreEntity instead`);
        return undefined;
      }
      
      // Update entity to set active=true and ensure deletedAt=null
      const now = new Date();
      const [activeEntity] = await db
        .update(entities)
        .set({
          active: true,
          deletedAt: null, // Explicitly set to null to ensure consistency
          updatedAt: now
        })
        .where(eq(entities.id, id))
        .returning();
      
      if (!activeEntity) {
        console.error(`DEBUG EntityStorage.setEntityActive: Failed to set entity ${id} as active`);
        return undefined;
      }
      
      console.log(`DEBUG EntityStorage.setEntityActive: Successfully set entity ${id} as active`);
      
      // Log the action to audit_logs
      try {
        const { auditLogStorage } = await import('./auditLogStorage');
        await auditLogStorage.createAuditLog({
          action: 'entity_set_active',
          performedBy: adminId,
          details: JSON.stringify({
            entityId: entity.id,
            entityName: entity.name,
            entityCode: entity.entityCode,
            clientId: entity.clientId
          })
        });
        console.log(`DEBUG EntityStorage.setEntityActive: Created audit log for setting entity as active`);
      } catch (auditError) {
        // Log the error but don't fail the operation
        console.error("Error creating audit log for setting entity as active:", auditError);
      }
      
      return activeEntity;
    } catch (error) {
      handleDbError(error, "Error setting entity as active");
      return undefined;
    }
  }

  /**
   * Soft delete an entity by setting deletedAt timestamp
   * 
   * @param id - The ID of the entity to delete
   * @param adminId - ID of the admin user performing the deletion (for audit logging)
   * @returns boolean indicating success
   */
  async deleteEntity(id: number, adminId: number): Promise<boolean> {
    try {
      console.log(`DEBUG EntityStorage.deleteEntity: Soft deleting entity with ID ${id} by admin ID ${adminId}`);
      
      // First, get the entity to verify it exists and to capture its details for audit
      const entity = await this.getEntity(id);
      if (!entity) {
        console.error(`DEBUG EntityStorage.deleteEntity: Entity with ID ${id} not found`);
        return false;
      }
      
      // Update entity to set deletedAt and set active to false
      const now = new Date();
      const [deletedEntity] = await db
        .update(entities)
        .set({
          deletedAt: now, // Explicitly set deletedAt timestamp to mark as deleted
          updatedAt: now,
          active: false   // Also set active to false for consistency
        })
        .where(eq(entities.id, id))
        .returning();
      
      if (!deletedEntity) {
        console.error(`DEBUG EntityStorage.deleteEntity: Failed to delete entity with ID ${id}`);
        return false;
      }
      
      console.log(`DEBUG EntityStorage.deleteEntity: Successfully soft deleted entity with ID ${id}`);
      
      // Log the action to audit_logs
      try {
        const { auditLogStorage } = await import('./auditLogStorage');
        await auditLogStorage.createAuditLog({
          action: 'entity_delete',
          performedBy: adminId,
          details: JSON.stringify({
            entityId: entity.id,
            entityName: entity.name,
            entityCode: entity.entityCode,
            clientId: entity.clientId
          })
        });
        console.log(`DEBUG EntityStorage.deleteEntity: Created audit log for entity deletion`);
      } catch (auditError) {
        // Log the error but don't fail the delete operation
        console.error("Error creating audit log for entity deletion:", auditError);
      }
      
      return true;
    } catch (error) {
      handleDbError(error, "Error deleting entity");
      return false;
    }
  }
  
  /**
   * Restore a soft-deleted entity by clearing the deletedAt timestamp
   * 
   * @param id - The ID of the entity to restore
   * @param adminId - ID of the admin user performing the restoration (for audit logging)
   * @returns The restored entity or undefined if not found/restored
   */
  async restoreEntity(id: number, adminId: number): Promise<Entity | undefined> {
    try {
      console.log(`DEBUG EntityStorage.restoreEntity: Restoring entity with ID ${id} by admin ID ${adminId}`);
      
      // First, get the entity to verify it exists and to capture its details for audit
      // We need to include deleted entities in the search
      const entity = await this.getEntity(id, true);
      if (!entity) {
        console.error(`DEBUG EntityStorage.restoreEntity: Entity with ID ${id} not found`);
        return undefined;
      }
      
      // Can only restore if it was previously deleted
      if (!entity.deletedAt) {
        console.warn(`EntityStorage.restoreEntity: Entity with ID ${id} is not deleted, nothing to restore`);
        return entity; // Return existing entity as it's already not deleted
      }
      
      // Perform restore by clearing deletedAt timestamp and setting active back to true
      const now = new Date();
      const [restoredEntity] = await db
        .update(entities)
        .set({
          deletedAt: null,
          updatedAt: now,
          active: true // Mark as active again
        })
        .where(eq(entities.id, id))
        .returning();
      
      if (!restoredEntity) {
        console.error(`DEBUG EntityStorage.restoreEntity: Failed to restore entity with ID ${id}`);
        return undefined;
      }
      
      console.log(`DEBUG EntityStorage.restoreEntity: Successfully restored entity with ID ${id}`);
      
      // Log the action to audit_logs
      try {
        const { auditLogStorage } = await import('./auditLogStorage');
        await auditLogStorage.createAuditLog({
          action: 'entity_restore',
          performedBy: adminId,
          details: JSON.stringify({
            entityId: entity.id,
            entityName: entity.name,
            entityCode: entity.entityCode,
            clientId: entity.clientId
          })
        });
        console.log(`DEBUG EntityStorage.restoreEntity: Created audit log for entity restoration`);
      } catch (auditError) {
        // Log the error but don't fail the restore operation
        console.error("Error creating audit log for entity restoration:", auditError);
      }
      
      return restoredEntity;
    } catch (error) {
      handleDbError(error, "Error restoring entity");
      return undefined;
    }
  }

  // Note: getUserEntityAccess and grantUserEntityAccess methods have been moved to userStorage.ts
}

/**
 * Memory-based implementation of entity storage operations
 * Used for testing and development environments
 */
export class MemEntityStorage implements IEntityStorage {
  private entities: Map<number, Entity>;
  private currentEntityId: number;
  
  constructor() {
    this.entities = new Map();
    this.currentEntityId = 1; // Start IDs at 1
  }
  
  /**
   * Add an entity directly to the map
   * Used for initialization in MemStorage
   */
  addEntityDirectly(entity: Entity): void {
    this.entities.set(entity.id, entity);
    // Update the currentEntityId if needed
    if (entity.id >= this.currentEntityId) {
      this.currentEntityId = entity.id + 1;
    }
  }

  /**
   * Get an entity by ID
   *
   * @param id - The ID of the entity to retrieve
   * @param includeDeleted - If true, return the entity even if it has been soft-deleted
   * @returns The entity or undefined if not found
   */
  async getEntity(id: number, includeDeleted: boolean = false): Promise<Entity | undefined> {
    const entity = this.entities.get(id);
    
    // Return if entity doesn't exist or includeDeleted is true
    if (!entity || includeDeleted) {
      return entity;
    }
    
    // Filter out soft-deleted entities
    return entity.deletedAt ? undefined : entity;
  }

  /**
   * Get all entities
   * 
   * @param includeDeleted - If true, include soft-deleted entities in results
   * @param includeInactive - If true, include inactive (but not deleted) entities
   * @returns Array of entities
   */
  async getEntities(includeDeleted: boolean = false, includeInactive: boolean = true): Promise<Entity[]> {
    const allEntities = Array.from(this.entities.values());
    let result = allEntities;
    
    // Apply deletion filter if needed
    if (!includeDeleted) {
      result = result.filter(entity => !entity.deletedAt);
    }
    
    // Apply inactive filter if needed
    if (!includeInactive) {
      result = result.filter(entity => entity.active);
    }
    
    return result;
  }

  /**
   * Get entities by user ID
   * This includes entities owned by the user and entities the user has access to
   * 
   * @param userId - The ID of the user
   * @param includeDeleted - If true, include soft-deleted entities in results
   * @param includeInactive - If true, include inactive (but not deleted) entities
   * @returns Array of entities owned by or accessible to the user
   */
  async getEntitiesByUser(userId: number, includeDeleted: boolean = false, includeInactive: boolean = true): Promise<Entity[]> {
    // In memory implementation, we'll just return entities owned by the user
    // Access control is handled separately in UserEntityStorage
    let entities = Array.from(this.entities.values())
      .filter(entity => entity.ownerId === userId);
    
    // Apply deletion filter
    if (!includeDeleted) {
      entities = entities.filter(entity => !entity.deletedAt);
    }
    
    // Apply inactive filter
    if (!includeInactive) {
      entities = entities.filter(entity => entity.active);
    }
    
    return entities;
  }

  /**
   * Get entities by client ID
   * 
   * @param clientId - The ID of the client
   * @param includeDeleted - If true, include soft-deleted entities in results
   * @param includeInactive - If true, include inactive (but not deleted) entities
   * @returns Array of entities belonging to the client
   */
  async getEntitiesByClient(clientId: number, includeDeleted: boolean = false, includeInactive: boolean = true): Promise<Entity[]> {
    let entities = Array.from(this.entities.values())
      .filter(entity => entity.clientId === clientId);
    
    // Apply deletion filter
    if (!includeDeleted) {
      entities = entities.filter(entity => !entity.deletedAt);
    }
    
    // Apply inactive filter
    if (!includeInactive) {
      entities = entities.filter(entity => entity.active);
    }
    
    // Sort by name
    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Generate a unique entity code for in-memory storage
   * This is a simplified version of the DB-based function
   */
  private async generateEntityCode(clientId: number): Promise<string> {
    try {
      // For in-memory storage, we'll use a simpler approach
      // Each entity for a client will get a sequential code: CLIENT-001, CLIENT-002, etc.
      
      // First, determine what client codes we have in our entities
      const clientEntities = Array.from(this.entities.values())
        .filter(e => e.clientId === clientId);
      
      // Default client code if we can't find a better one
      let clientCode = `C${clientId}`;
      
      // Try to find an entity with a client code we can extract
      const entitiesWithCodes = clientEntities.filter(e => e.entityCode && e.entityCode.includes('-'));
      if (entitiesWithCodes.length > 0) {
        // Extract client code from existing entity codes
        const parts = entitiesWithCodes[0].entityCode?.split('-') || [];
        if (parts.length > 0) {
          clientCode = parts[0];
        }
      }
      
      // Find existing entity codes for this client
      const existingCodes = clientEntities
        .map(e => e.entityCode)
        .filter(code => code && code.startsWith(`${clientCode}-`));
      
      // Extract sequence numbers from entity codes
      const sequenceNumbers = existingCodes
        .map(code => {
          if (!code) return 0;
          const parts = code.split('-');
          return parts.length > 1 ? parseInt(parts[1], 10) : 0;
        })
        .filter(num => !isNaN(num));
      
      // Determine next sequence number
      const nextNumber = sequenceNumbers.length > 0 
        ? Math.max(...sequenceNumbers) + 1 
        : 1;
      
      return `${clientCode}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error("Error generating entity code in MemEntityStorage:", error);
      return `MEM-${Date.now().toString(36).toUpperCase()}`;
    }
  }

  /**
   * Create a new entity
   */
  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    console.log("DEBUG MemEntityStorage.createEntity: Creating new entity with data:", JSON.stringify(insertEntity));
    
    const id = this.currentEntityId++;
    
    // Process industry data for consistency
    let industryValue = null;
    if (insertEntity.industry !== undefined && insertEntity.industry !== null) {
      if (insertEntity.industry === '') {
        console.log("DEBUG MemEntityStorage.createEntity: Empty industry provided, defaulting to 'other'");
        industryValue = 'other';
      } else {
        // Convert any industry value to string for consistent storage
        console.log(`DEBUG MemEntityStorage.createEntity: Converting industry value "${insertEntity.industry}" (${typeof insertEntity.industry}) to string`);
        industryValue = String(insertEntity.industry);
      }
    }
    
    // Generate entity code if client ID is provided
    let entityCode = null;
    if (insertEntity.clientId) {
      entityCode = await this.generateEntityCode(insertEntity.clientId);
      console.log(`DEBUG MemEntityStorage.createEntity: Generated entity code: ${entityCode}`);
    }
    
    const entity: Entity = { 
      id, 
      name: insertEntity.name,
      code: insertEntity.code,
      entityCode, // Include the generated entity code
      ownerId: insertEntity.ownerId,
      clientId: insertEntity.clientId,
      active: insertEntity.active !== undefined ? insertEntity.active : true,
      fiscalYearStart: insertEntity.fiscalYearStart || '01-01',
      fiscalYearEnd: insertEntity.fiscalYearEnd || '12-31',
      currency: insertEntity.currency || 'USD',
      email: insertEntity.email || null,
      taxId: insertEntity.taxId || null,
      address: insertEntity.address || null,
      phone: insertEntity.phone || null,
      website: insertEntity.website || null,
      createdAt: new Date(),
      updatedAt: null,
      city: insertEntity.city || null,
      state: insertEntity.state || null,
      country: insertEntity.country || null,
      postalCode: insertEntity.postalCode || null,
      industry: industryValue, // Use our processed industry value
      subIndustry: insertEntity.subIndustry || null,
      employeeCount: insertEntity.employeeCount || null,
      foundedYear: insertEntity.foundedYear || null,
      annualRevenue: insertEntity.annualRevenue || null,
      businessType: insertEntity.businessType || null,
      publiclyTraded: insertEntity.publiclyTraded || false,
      stockSymbol: insertEntity.stockSymbol || null,
      timezone: insertEntity.timezone || 'UTC',
      dataCollectionConsent: insertEntity.dataCollectionConsent || false,
      lastAuditDate: insertEntity.lastAuditDate || null
    };
    this.entities.set(id, entity);
    return entity;
  }

  /**
   * Update an entity
   */
  async updateEntity(id: number, entityData: Partial<Entity>): Promise<Entity | undefined> {
    console.log(`DEBUG MemEntityStorage.updateEntity: Updating entity with ID ${id}`);
    console.log("DEBUG MemEntityStorage.updateEntity: Received entity data:", JSON.stringify(entityData));
    
    // Validate ID
    if (isNaN(id) || id <= 0) {
      console.error(`DEBUG MemEntityStorage.updateEntity: Invalid entity ID: ${id}`);
      return undefined;
    }
    
    const entity = this.entities.get(id);
    if (!entity) {
      console.error(`DEBUG MemEntityStorage.updateEntity: Entity with ID ${id} not found`);
      return undefined;
    }
    
    // Process industry field similarly to createEntity
    if (entityData.industry !== undefined) {
      if (entityData.industry === null || entityData.industry === '') {
        entityData.industry = 'other';
      } else {
        entityData.industry = String(entityData.industry);
      }
    }
    
    // Update the entity with new data
    const updatedEntity: Entity = {
      ...entity,
      ...entityData,
      updatedAt: new Date()
    };
    
    this.entities.set(id, updatedEntity);
    return updatedEntity;
  }
  
  /**
   * Explicitly set an entity as inactive WITHOUT soft-deleting it
   * This keeps the entity in standard queries but marks it as inactive
   * 
   * @param id - The ID of the entity to mark as inactive
   * @param adminId - ID of the admin user performing the action (for audit logging)
   * @returns The updated entity or undefined if not found
   */
  async setEntityInactive(id: number, adminId: number): Promise<Entity | undefined> {
    console.log(`DEBUG MemEntityStorage.setEntityInactive: Setting entity ${id} as inactive by admin ID ${adminId}`);
    
    // Validate ID
    if (isNaN(id) || id <= 0) {
      console.error(`DEBUG MemEntityStorage.setEntityInactive: Invalid entity ID: ${id}`);
      return undefined;
    }
    
    // First, get the entity to verify it exists
    const entity = this.entities.get(id);
    if (!entity) {
      console.error(`DEBUG MemEntityStorage.setEntityInactive: Entity with ID ${id} not found`);
      return undefined;
    }
    
    // Make sure this isn't a deleted entity
    if (entity.deletedAt) {
      console.error(`DEBUG MemEntityStorage.setEntityInactive: Entity with ID ${id} is deleted, cannot modify`);
      return undefined;
    }
    
    // Update entity to set active=false but explicitly keep deletedAt=null
    const now = new Date();
    
    const inactiveEntity: Entity = {
      ...entity,
      active: false,
      deletedAt: null, // Explicitly set to null to distinguish from deleted entities
      updatedAt: now
    };
    
    // Update in map
    this.entities.set(id, inactiveEntity);
    
    console.log(`DEBUG MemEntityStorage.setEntityInactive: Successfully set entity ${id} as inactive`);
    
    // Log the action to audit_logs if in a context with audit logging
    try {
      // Dynamic import to avoid circular dependencies
      const { auditLogStorage } = await import('./auditLogStorage');
      await auditLogStorage.createAuditLog({
        action: 'entity_set_inactive',
        performedBy: adminId,
        details: JSON.stringify({
          entityId: entity.id,
          entityName: entity.name,
          entityCode: entity.entityCode,
          clientId: entity.clientId
        })
      });
      console.log(`DEBUG MemEntityStorage.setEntityInactive: Created audit log for setting entity as inactive`);
    } catch (auditError) {
      // Log the error but don't fail the operation
      console.error("Error creating audit log for setting entity as inactive:", auditError);
    }
    
    return inactiveEntity;
  }
  
  /**
   * Explicitly set an entity as active
   * This marks an inactive entity as active again
   * 
   * @param id - The ID of the entity to mark as active
   * @param adminId - ID of the admin user performing the action (for audit logging)
   * @returns The updated entity or undefined if not found
   */
  async setEntityActive(id: number, adminId: number): Promise<Entity | undefined> {
    console.log(`DEBUG MemEntityStorage.setEntityActive: Setting entity ${id} as active by admin ID ${adminId}`);
    
    // Validate ID
    if (isNaN(id) || id <= 0) {
      console.error(`DEBUG MemEntityStorage.setEntityActive: Invalid entity ID: ${id}`);
      return undefined;
    }
    
    // First, get the entity to verify it exists
    const entity = this.entities.get(id);
    if (!entity) {
      console.error(`DEBUG MemEntityStorage.setEntityActive: Entity with ID ${id} not found`);
      return undefined;
    }
    
    // Make sure this isn't a deleted entity
    if (entity.deletedAt) {
      console.error(`DEBUG MemEntityStorage.setEntityActive: Entity with ID ${id} is deleted, cannot modify; use restoreEntity instead`);
      return undefined;
    }
    
    // Update entity to set active=true and ensure deletedAt=null
    const now = new Date();
    
    const activeEntity: Entity = {
      ...entity,
      active: true,
      deletedAt: null, // Explicitly set to null to ensure consistency
      updatedAt: now
    };
    
    // Update in map
    this.entities.set(id, activeEntity);
    
    console.log(`DEBUG MemEntityStorage.setEntityActive: Successfully set entity ${id} as active`);
    
    // Log the action to audit_logs if in a context with audit logging
    try {
      // Dynamic import to avoid circular dependencies
      const { auditLogStorage } = await import('./auditLogStorage');
      await auditLogStorage.createAuditLog({
        action: 'entity_set_active',
        performedBy: adminId,
        details: JSON.stringify({
          entityId: entity.id,
          entityName: entity.name,
          entityCode: entity.entityCode,
          clientId: entity.clientId
        })
      });
      console.log(`DEBUG MemEntityStorage.setEntityActive: Created audit log for setting entity as active`);
    } catch (auditError) {
      // Log the error but don't fail the operation
      console.error("Error creating audit log for setting entity as active:", auditError);
    }
    
    return activeEntity;
  }
  
  /**
   * Soft delete an entity by setting deletedAt timestamp and marking as inactive
   * 
   * @param id - The ID of the entity to delete
   * @param adminId - ID of the admin user performing the deletion (for audit logging)
   * @returns boolean indicating success
   */
  async deleteEntity(id: number, adminId: number): Promise<boolean> {
    console.log(`DEBUG MemEntityStorage.deleteEntity: Soft deleting entity with ID ${id} by admin ID ${adminId}`);
    
    // First, get the entity to verify it exists
    const entity = await this.getEntity(id);
    if (!entity) {
      console.error(`DEBUG MemEntityStorage.deleteEntity: Entity with ID ${id} not found`);
      return false;
    }
    
    // Update entity to set deletedAt and active to false
    const now = new Date();
    const updatedEntity: Entity = {
      ...entity,
      deletedAt: now,
      updatedAt: now,
      active: false
    };
    
    this.entities.set(id, updatedEntity);
    
    console.log(`DEBUG MemEntityStorage.deleteEntity: Successfully soft deleted entity with ID ${id}`);
    
    // Log the action to audit_logs if in a context with audit logging
    try {
      // Dynamic import to avoid circular dependencies
      const { auditLogStorage } = await import('./auditLogStorage');
      await auditLogStorage.createAuditLog({
        action: 'entity_delete',
        performedBy: adminId,
        details: JSON.stringify({
          entityId: entity.id,
          entityName: entity.name,
          entityCode: entity.entityCode,
          clientId: entity.clientId
        })
      });
      console.log(`DEBUG MemEntityStorage.deleteEntity: Created audit log for entity deletion`);
    } catch (auditError) {
      // Log the error but don't fail the delete operation
      console.error("Error creating audit log for entity deletion:", auditError);
    }
    
    return true;
  }
  
  /**
   * Restore a soft-deleted entity by clearing the deletedAt timestamp
   * 
   * @param id - The ID of the entity to restore
   * @param adminId - ID of the admin user performing the restoration (for audit logging)
   * @returns The restored entity or undefined if not found/restored
   */
  async restoreEntity(id: number, adminId: number): Promise<Entity | undefined> {
    console.log(`DEBUG MemEntityStorage.restoreEntity: Restoring entity with ID ${id} by admin ID ${adminId}`);
    
    // First, get the entity to verify it exists (include deleted entities)
    const entity = this.entities.get(id);
    if (!entity) {
      console.error(`DEBUG MemEntityStorage.restoreEntity: Entity with ID ${id} not found`);
      return undefined;
    }
    
    // Can only restore if it was previously deleted
    if (!entity.deletedAt) {
      console.warn(`MemEntityStorage.restoreEntity: Entity with ID ${id} is not deleted, nothing to restore`);
      return entity; // Return existing entity as it's already not deleted
    }
    
    // Perform restore by clearing deletedAt timestamp and setting active back to true
    const restoredEntity: Entity = {
      ...entity,
      deletedAt: null,
      updatedAt: new Date(),
      active: true // Mark as active again
    };
    
    this.entities.set(id, restoredEntity);
    
    console.log(`DEBUG MemEntityStorage.restoreEntity: Successfully restored entity with ID ${id}`);
    
    // Log the action to audit_logs if in a context with audit logging
    try {
      // Dynamic import to avoid circular dependencies
      const { memAuditLogStorage } = await import('./auditLogStorage');
      await memAuditLogStorage.createAuditLog({
        action: 'entity_restore',
        performedBy: adminId,
        details: JSON.stringify({
          entityId: entity.id,
          entityName: entity.name,
          entityCode: entity.entityCode,
          clientId: entity.clientId
        })
      });
      console.log(`DEBUG MemEntityStorage.restoreEntity: Created audit log for entity restoration`);
    } catch (auditError) {
      // Log the error but don't fail the restore operation
      console.error("Error creating audit log for entity restoration:", auditError);
    }
    
    return restoredEntity;
  }
}

// Export singleton instances
export const entityStorage = new EntityStorage();
export const memEntityStorage = new MemEntityStorage();