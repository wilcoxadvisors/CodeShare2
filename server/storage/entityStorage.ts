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
import { eq, and, asc, inArray, like } from "drizzle-orm";
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
  getEntity(id: number): Promise<Entity | undefined>;
  getEntities(): Promise<Entity[]>;
  getEntitiesByUser(userId: number): Promise<Entity[]>;
  getEntitiesByClient(clientId: number): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<Entity>): Promise<Entity | undefined>;
  deleteEntity(id: number, adminId: number): Promise<boolean>;
  
  // Note: User Entity Access methods have been moved to userStorage.ts
}

/**
 * Implementation of entity storage operations using Drizzle ORM
 */
export class EntityStorage implements IEntityStorage {
  /**
   * Get an entity by ID
   */
  async getEntity(id: number): Promise<Entity | undefined> {
    try {
      // Validate ID
      if (isNaN(id) || id <= 0) {
        console.error(`EntityStorage.getEntity: Invalid entity ID: ${id}`);
        return undefined;
      }
      
      const [entity] = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .limit(1);
      
      return entity || undefined;
    } catch (error) {
      handleDbError(error, "Error retrieving entity");
      return undefined;
    }
  }

  /**
   * Get all entities
   */
  async getEntities(): Promise<Entity[]> {
    try {
      return await db.select().from(entities);
    } catch (error) {
      handleDbError(error, "Error retrieving entities");
      return [];
    }
  }

  /**
   * Get entities by user ID
   * This includes entities owned by the user and entities the user has access to
   */
  async getEntitiesByUser(userId: number): Promise<Entity[]> {
    try {
      // First, get all entities owned by the user
      const ownedEntities = await db
        .select()
        .from(entities)
        .where(eq(entities.ownerId, userId));
      
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
      const accessEntities = await db
        .select()
        .from(entities)
        .where(inArray(entities.id, accessEntityIds));
      
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
   */
  async getEntitiesByClient(clientId: number): Promise<Entity[]> {
    try {
      return await db
        .select()
        .from(entities)
        .where(eq(entities.clientId, clientId))
        .orderBy(asc(entities.name));
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
          deletedAt: now,
          updatedAt: now,
          active: false
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
   */
  async getEntity(id: number): Promise<Entity | undefined> {
    return this.entities.get(id);
  }

  /**
   * Get all entities
   */
  async getEntities(): Promise<Entity[]> {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities by user ID
   * This includes entities owned by the user and entities the user has access to
   */
  async getEntitiesByUser(userId: number): Promise<Entity[]> {
    // In memory implementation, we'll just return entities owned by the user
    // Access control is handled separately in UserEntityStorage
    return Array.from(this.entities.values())
      .filter(entity => entity.ownerId === userId);
  }

  /**
   * Get entities by client ID
   */
  async getEntitiesByClient(clientId: number): Promise<Entity[]> {
    return Array.from(this.entities.values())
      .filter(entity => entity.clientId === clientId)
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort by name
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
}

// Export singleton instances
export const entityStorage = new EntityStorage();
export const memEntityStorage = new MemEntityStorage();