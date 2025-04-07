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
import { eq, and, asc, inArray, like, isNull, SQL, sql } from "drizzle-orm";
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
  setEntityActive(id: number): Promise<Entity | undefined>;
  setEntityInactive(id: number): Promise<Entity | null>;
  
  // Soft deletion and restoration
  deleteEntity(id: number): Promise<Entity | null>;
  restoreEntity(id: number): Promise<Entity | null>;
  
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
        // First, try to use direct SQL to verify the entity exists
        const directCheckResult = await db.execute(`SELECT * FROM entities WHERE id = ${id}`);
        console.log(`Direct SQL check result (${directCheckResult.rows.length} rows):`, JSON.stringify(directCheckResult.rows));
        
        // If we find a row with this ID, the entity exists and we should be able to retrieve it
        if (directCheckResult.rows.length > 0) {
          const rawRow = directCheckResult.rows[0];
          console.log('Raw entity data:', JSON.stringify(rawRow));
          console.log('Entity deletedAt from raw query:', rawRow.deleted_at);
          
          // The issue might be in the ORM mapping or in the fields not matching - construct entity manually
          if (directCheckResult.rows.length > 0 && includeDeleted) {
            // Convert raw DB result to Entity type
            // This is a last resort solution in case ORM mapping fails
            const manualEntity: Entity = {
              id: rawRow.id,
              name: rawRow.name,
              code: rawRow.code,
              entityCode: rawRow.entity_code,
              ownerId: rawRow.owner_id,
              clientId: rawRow.client_id,
              active: rawRow.active,
              fiscalYearStart: rawRow.fiscal_year_start,
              fiscalYearEnd: rawRow.fiscal_year_end,
              taxId: rawRow.tax_id,
              address: rawRow.address,
              city: rawRow.city,
              state: rawRow.state,
              country: rawRow.country,
              postalCode: rawRow.postal_code,
              phone: rawRow.phone,
              email: rawRow.email,
              website: rawRow.website,
              industry: rawRow.industry,
              subIndustry: rawRow.sub_industry,
              employeeCount: rawRow.employee_count,
              foundedYear: rawRow.founded_year,
              annualRevenue: rawRow.annual_revenue,
              businessType: rawRow.business_type,
              publiclyTraded: rawRow.publicly_traded,
              stockSymbol: rawRow.stock_symbol,
              currency: rawRow.currency,
              timezone: rawRow.timezone,
              dataCollectionConsent: rawRow.data_collection_consent,
              lastAuditDate: rawRow.last_audit_date ? new Date(rawRow.last_audit_date) : null,
              createdAt: new Date(rawRow.created_at),
              updatedAt: rawRow.updated_at ? new Date(rawRow.updated_at) : null,
              deletedAt: rawRow.deleted_at ? new Date(rawRow.deleted_at) : null
            };
            
            console.log('MANUALLY CONSTRUCTED ENTITY:', JSON.stringify(manualEntity));
            return manualEntity;
          }
        }
        
        // The normal ORM approach (this should work, but we have fallback above)
        const query = db
          .select()
          .from(entities)
          .where(eq(entities.id, id))
          .limit(1);
        
        console.log(`EntityStorage.getEntity: Query with includeDeleted=true:`, JSON.stringify(query));
        
        const [entity] = await query;
        console.log(`EntityStorage.getEntity: Found entity with includeDeleted=true: ${entity ? 'Yes' : 'No'}`);
        if (entity) {
          console.log(`EntityStorage.getEntity: deletedAt=${entity.deletedAt}, active=${entity.active}`);
        } else {
          console.log('EntityStorage.getEntity: No entity found with ORM query. This indicates a mapping issue.');
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
        
        console.log(`EntityStorage.getEntity: Executing query with includeDeleted=false for entity ID ${id}`);
        
        const result = await query.execute();
        const [entity] = result;
        const foundStatus = entity ? 'Yes' : 'No';
        console.log(`EntityStorage.getEntity: Found entity with includeDeleted=false: ${foundStatus}`);
        return entity || undefined;
      }
    } catch (error) {
      console.error('Error in getEntity method:', error);
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
      
      if (!insertEntity) {
        console.error("ERROR EntityStorage.createEntity: Received null or undefined entity data");
        throw new Error("Cannot create entity with null or undefined data");
      }
      
      if (!insertEntity.clientId) {
        console.error("ERROR EntityStorage.createEntity: Missing clientId in entity data");
        throw new Error("Client ID is required to create an entity");
      }
      
      if (!insertEntity.name) {
        console.error("ERROR EntityStorage.createEntity: Missing name in entity data");
        throw new Error("Entity name is required");
      }
      
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
      try {
        entityCode = await generateUniqueEntityCode(insertEntity.clientId);
        console.log(`DEBUG EntityStorage.createEntity: Generated unique entity code: ${entityCode}`);
      } catch (codeError) {
        console.error("ERROR EntityStorage.createEntity: Failed to generate entity code", codeError);
        // Log error but continue - entity code is helpful but not critical
        entityCode = `MANUAL-${Date.now().toString(36).toUpperCase()}`;
        console.log(`DEBUG EntityStorage.createEntity: Using fallback entity code: ${entityCode}`);
      }
      
      // Insert with processed values
      const entityToInsert = {
        ...insertEntity,
        industry: industryValue,
        entityCode, // Include the generated entity code
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        active: insertEntity.active !== undefined ? insertEntity.active : true
      };
      
      console.log("DEBUG EntityStorage.createEntity: Inserting entity with final data:", JSON.stringify(entityToInsert, null, 2));
      
      try {
        const result = await db.insert(entities).values(entityToInsert).returning();
        
        if (!result || result.length === 0) {
          console.error("ERROR EntityStorage.createEntity: Insert query returned empty result");
          throw new Error("Entity creation failed - database query returned no result");
        }
        
        const newEntity = result[0];
        
        if (!newEntity || !newEntity.id) {
          console.error("ERROR EntityStorage.createEntity: Created entity missing ID:", newEntity);
          throw new Error("Entity creation failed - invalid entity returned from database");
        }
        
        console.log(`DEBUG EntityStorage.createEntity: Entity created successfully with ID ${newEntity.id}:`, JSON.stringify(newEntity, null, 2));
        
        return newEntity;
      } catch (insertError) {
        console.error("ERROR EntityStorage.createEntity: Database insert failed:", insertError);
        
        // Try to get more details about the error
        if (insertError instanceof Error) {
          console.error("ERROR EntityStorage.createEntity: Insert error details:", insertError.message);
          console.error("ERROR EntityStorage.createEntity: Insert error stack:", insertError.stack);
        }
        
        // Attempt a direct SQL insert to diagnose issues
        try {
          console.log("DEBUG EntityStorage.createEntity: Attempting direct SQL insert as diagnostic");
          
          // Create field and value lists for the SQL query
          const fields = Object.keys(entityToInsert).filter(k => entityToInsert[k] !== undefined);
          const values = fields.map(f => {
            const val = entityToInsert[f];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            return String(val);
          });
          
          // Build the SQL statement
          const sql = `
            INSERT INTO entities (${fields.join(', ')})
            VALUES (${values.join(', ')})
            RETURNING *
          `;
          
          const sqlResult = await db.execute(sql);
          console.log("DEBUG EntityStorage.createEntity: Direct SQL result:", sqlResult);
          
          if (sqlResult.rows && sqlResult.rows.length > 0) {
            const rawEntity = sqlResult.rows[0];
            console.log("DEBUG EntityStorage.createEntity: Direct SQL created entity:", rawEntity);
            
            // Manually construct entity from raw DB result
            const entity: Entity = {
              id: rawEntity.id,
              name: rawEntity.name,
              code: rawEntity.code,
              entityCode: rawEntity.entity_code,
              ownerId: rawEntity.owner_id,
              clientId: rawEntity.client_id,
              active: rawEntity.active,
              fiscalYearStart: rawEntity.fiscal_year_start,
              fiscalYearEnd: rawEntity.fiscal_year_end,
              industry: rawEntity.industry,
              currency: rawEntity.currency,
              timezone: rawEntity.timezone,
              ein: rawEntity.ein,
              businessType: rawEntity.business_type,
              legalName: rawEntity.legal_name,
              dba: rawEntity.dba,
              website: rawEntity.website,
              phone: rawEntity.phone,
              fax: rawEntity.fax,
              address: rawEntity.address,
              city: rawEntity.city,
              state: rawEntity.state,
              postalCode: rawEntity.postal_code,
              country: rawEntity.country,
              notes: rawEntity.notes,
              createdAt: rawEntity.created_at ? new Date(rawEntity.created_at) : new Date(),
              updatedAt: rawEntity.updated_at ? new Date(rawEntity.updated_at) : new Date(),
              deletedAt: rawEntity.deleted_at ? new Date(rawEntity.deleted_at) : null,
              corporationSettings: rawEntity.corporation_settings,
              createdBy: rawEntity.created_by
            };
            
            return entity;
          } else {
            throw new Error("Direct SQL insert failed to create entity");
          }
        } catch (directSqlError) {
          console.error("ERROR EntityStorage.createEntity: Direct SQL insert also failed:", directSqlError);
          throw new Error(`Entity creation failed with both ORM and direct SQL: ${directSqlError.message || String(directSqlError)}`);
        }
      }
    } catch (error) {
      console.error("ERROR EntityStorage.createEntity: Creation failed with error:", error);
      console.error("ERROR EntityStorage.createEntity: Error stack:", error instanceof Error ? error.stack : "Unknown");
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
   * @returns The updated entity or null if not found
   */
  async setEntityInactive(id: number): Promise<Entity | null> {
    try {
      // First check if the entity exists
      const entityQuery = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .execute();
        
      if (!entityQuery || entityQuery.length === 0) {
        console.error(`EntityStorage.setEntityInactive: Entity with ID ${id} not found`);
        return null;
      }
      
      // Update the entity - ensure we set deletedAt to null (not undefined)
      const result = await db
        .update(entities)
        .set({ 
          active: false, 
          deletedAt: null,
          updatedAt: new Date() 
        })
        .where(eq(entities.id, id))
        .returning()
        .execute();
      
      // Debug the result
      console.log(`EntityStorage.setEntityInactive: Update result for entity ${id}:`, 
        result ? `Result count: ${result.length}` : "No result");
      
      if (!result || result.length === 0) {
        console.error(`EntityStorage.setEntityInactive: No entity returned after update for ${id}`);
        return null;
      }
      
      const updatedEntity = result[0];
      console.log(`EntityStorage.setEntityInactive: Entity ${id} set inactive, active=${updatedEntity.active}, deletedAt=${updatedEntity.deletedAt}`);
      
      return updatedEntity;
    } catch (error) {
      console.error(`EntityStorage.setEntityInactive: Error setting entity ${id} as inactive:`, error);
      throw error;
    }
  }
  
  /**
   * Explicitly set an entity as active
   * This marks an inactive entity as active again
   * 
   * @param id - The ID of the entity to mark as active
   * @returns The updated entity or undefined if not found
   */
  async setEntityActive(id: number): Promise<Entity | undefined> {
    try {
      console.log(`DEBUG EntityStorage.setEntityActive: Setting entity ${id} as active`);
      
      // First check if the entity exists
      const entityQuery = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .execute();
        
      if (!entityQuery || entityQuery.length === 0) {
        console.error(`EntityStorage.setEntityActive: Entity with ID ${id} not found`);
        return undefined;
      }
      
      // Extract entity data directly
      const existingEntity = entityQuery[0];
      
      // Make sure this isn't a deleted entity
      if (existingEntity.deletedAt) {
        console.error(`EntityStorage.setEntityActive: Entity with ID ${id} is deleted, cannot modify; use restoreEntity instead`);
        return undefined;
      }
      
      // Update the entity
      const result = await db
        .update(entities)
        .set({ 
          active: true, 
          deletedAt: null,
          updatedAt: new Date() 
        })
        .where(eq(entities.id, id))
        .returning()
        .execute();
      
      if (!result || result.length === 0) {
        return undefined;
      }
      
      return result[0];
    } catch (error) {
      handleDbError(error, "Error setting entity as active");
      return undefined;
    }
  }

  /**
   * Soft delete an entity by setting deletedAt timestamp
   * 
   * @param id - The ID of the entity to delete
   * @returns The updated entity or null if not found
   */
  async deleteEntity(id: number): Promise<Entity | null> {
    try {
      // First check if the entity exists
      const entityQuery = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .execute();
        
      if (!entityQuery || entityQuery.length === 0) {
        console.error(`EntityStorage.deleteEntity: Entity with ID ${id} not found`);
        return null;
      }
      
      // Update the entity
      const result = await db
        .update(entities)
        .set({ 
          active: false, 
          deletedAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(entities.id, id))
        .returning()
        .execute();
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error) {
      console.error(`EntityStorage.deleteEntity: Error deleting entity ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Restore a soft-deleted entity by clearing the deletedAt timestamp
   * and setting active back to true
   * 
   * @param id - The ID of the entity to restore
   * @returns The restored entity or null if not found
   */
  async restoreEntity(id: number): Promise<Entity | null> {
    try {
      // First check if the entity exists (include deleted entities)
      const entityQuery = await db
        .select()
        .from(entities)
        .where(eq(entities.id, id))
        .execute();
        
      if (!entityQuery || entityQuery.length === 0) {
        console.error(`EntityStorage.restoreEntity: Entity with ID ${id} not found`);
        return null;
      }
      
      // Update the entity
      const result = await db
        .update(entities)
        .set({ 
          active: true, 
          deletedAt: null,
          updatedAt: new Date() 
        })
        .where(eq(entities.id, id))
        .returning()
        .execute();
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error) {
      console.error(`EntityStorage.restoreEntity: Error restoring entity ${id}:`, error);
      throw error;
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
    console.log(`MemEntityStorage.getEntity: Getting entity ${id} with includeDeleted=${includeDeleted}`);
    
    const entity = this.entities.get(id);
    
    // Return undefined if entity doesn't exist
    if (!entity) {
      console.log(`MemEntityStorage.getEntity: Entity ${id} not found`);
      return undefined;
    }
    
    // If includeDeleted=true, return the entity regardless of deletion status
    if (includeDeleted) {
      console.log(`MemEntityStorage.getEntity: Returning entity (includeDeleted=true), active=${entity.active}, deletedAt=${entity.deletedAt}`);
      return entity;
    }
    
    // If includeDeleted=false, return undefined for deleted entities
    if (entity.deletedAt) {
      console.log(`MemEntityStorage.getEntity: Entity ${id} is deleted, not returning (includeDeleted=false)`);
      return undefined;
    }
    
    console.log(`MemEntityStorage.getEntity: Returning non-deleted entity, active=${entity.active}, deletedAt=${entity.deletedAt}`);
    return entity;
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
   * @returns The updated entity or null if not found
   */
  async setEntityInactive(id: number): Promise<Entity | null> {
    console.log(`DEBUG MemEntityStorage.setEntityInactive: Setting entity ${id} as inactive`);
    
    // First, get the entity to verify it exists
    const entity = this.entities.get(id);
    if (!entity) {
      console.log(`DEBUG MemEntityStorage.setEntityInactive: Entity ${id} not found`);
      return null;
    }
    
    // Update entity to set active=false but explicitly keep deletedAt=null
    const inactiveEntity: Entity = {
      ...entity,
      active: false,
      deletedAt: null, // Explicitly set to null to distinguish from deleted entities
      updatedAt: new Date()
    };
    
    console.log(`DEBUG MemEntityStorage.setEntityInactive: Entity ${id} updated to inactive state, active=${inactiveEntity.active}, deletedAt=${inactiveEntity.deletedAt}`);
    
    // Update in map
    this.entities.set(id, inactiveEntity);
    return inactiveEntity;
  }
  
  /**
   * Explicitly set an entity as active
   * This marks an inactive entity as active again
   * 
   * @param id - The ID of the entity to mark as active
   * @returns The updated entity or undefined if not found
   */
  async setEntityActive(id: number): Promise<Entity | undefined> {
    console.log(`DEBUG MemEntityStorage.setEntityActive: Setting entity ${id} as active`);
    
    // Validate ID
    if (isNaN(id) || id <= 0) {
      console.log(`DEBUG MemEntityStorage.setEntityActive: Invalid ID ${id}`);
      return undefined;
    }
    
    // First, get the entity to verify it exists
    const entity = this.entities.get(id);
    if (!entity) {
      console.log(`DEBUG MemEntityStorage.setEntityActive: Entity ${id} not found`);
      return undefined;
    }
    
    // Make sure this isn't a deleted entity
    if (entity.deletedAt) {
      console.log(`DEBUG MemEntityStorage.setEntityActive: Entity ${id} is deleted, cannot set active`);
      return undefined;
    }
    
    // Update entity to set active=true and ensure deletedAt=null
    const activeEntity: Entity = {
      ...entity,
      active: true,
      deletedAt: null, // Explicitly set to null to ensure consistency
      updatedAt: new Date()
    };
    
    console.log(`DEBUG MemEntityStorage.setEntityActive: Entity ${id} updated to active state, active=${activeEntity.active}, deletedAt=${activeEntity.deletedAt}`);
    
    // Update in map
    this.entities.set(id, activeEntity);
    
    return activeEntity;
  }
  
  /**
   * Soft delete an entity by setting deletedAt timestamp and marking as inactive
   * 
   * @param id - The ID of the entity to delete
   * @returns The deleted entity or null if not found
   */
  async deleteEntity(id: number): Promise<Entity | null> {
    console.log(`DEBUG MemEntityStorage.deleteEntity: Soft-deleting entity ${id}`);
    
    // First, get the entity to verify it exists
    const entity = this.entities.get(id);
    if (!entity) {
      console.log(`DEBUG MemEntityStorage.deleteEntity: Entity ${id} not found`);
      return null;
    }
    
    // Update entity to set deletedAt and active to false
    const updatedEntity: Entity = {
      ...entity,
      deletedAt: new Date(),
      updatedAt: new Date(),
      active: false
    };
    
    console.log(`DEBUG MemEntityStorage.deleteEntity: Entity ${id} soft-deleted, active=${updatedEntity.active}, deletedAt=${updatedEntity.deletedAt}`);
    
    this.entities.set(id, updatedEntity);
    
    return updatedEntity;
  }
  
  /**
   * Restore a soft-deleted entity by clearing the deletedAt timestamp
   * and setting active back to true
   * 
   * @param id - The ID of the entity to restore
   * @returns The restored entity or null if not found
   */
  async restoreEntity(id: number): Promise<Entity | null> {
    console.log(`DEBUG MemEntityStorage.restoreEntity: Restoring entity ${id}`);
    
    // First, get the entity to verify it exists
    const entity = this.entities.get(id);
    if (!entity) {
      console.log(`DEBUG MemEntityStorage.restoreEntity: Entity ${id} not found`);
      return null;
    }
    
    // Perform restore by clearing deletedAt timestamp and setting active back to true
    const restoredEntity: Entity = {
      ...entity,
      deletedAt: null,
      updatedAt: new Date(),
      active: true // Mark as active again
    };
    
    console.log(`DEBUG MemEntityStorage.restoreEntity: Entity ${id} restored, active=${restoredEntity.active}, deletedAt=${restoredEntity.deletedAt}`);
    
    this.entities.set(id, restoredEntity);
    
    return restoredEntity;
  }
}

// Export singleton instances
export const entityStorage = new EntityStorage();
export const memEntityStorage = new MemEntityStorage();