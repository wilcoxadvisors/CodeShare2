/**
 * Admin Dashboard Routes
 * 
 * These routes provide admin-specific functionality for the dashboard
 */
import { Express, Request, Response } from "express";
import { asyncHandler, throwUnauthorized, throwBadRequest, throwNotFound } from "./errorHandling";
import { IStorage } from "./storage";
import { consolidationStorage } from "./storage/consolidationStorage";
import { userStorage } from "./storage/userStorage";
import { clientStorage } from "./storage/clientStorage";
import { UserRole, insertEntitySchema, entities as entitiesTable } from "../shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";
import { cleanupSoftDeletedClients, runAllScheduledTasks } from "./tasks/scheduledTasks";

// Authentication middleware for admin-only routes
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as any;
    if (user && user.role === UserRole.ADMIN) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

export function registerAdminRoutes(app: Express, storage: IStorage) {
  
  /**
   * Restore a soft-deleted client
   * 
   * @route PATCH /api/admin/clients/:id/restore
   * @param {number} id - The ID of the client to restore
   * @returns {Client} - The restored client
   * @throws {401} - If not authenticated
   * @throws {403} - If not an admin
   * @throws {404} - If client not found
   * @throws {400} - If client is not deleted
   */
  app.patch("/api/admin/clients/:id/restore", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const user = req.user as any;
      const adminId = user.id;
      
      // Attempt to restore the client
      const restoredClient = await storage.clients.restoreClient(clientId, adminId);
      
      if (!restoredClient) {
        return res.status(404).json({ message: "Client not found or could not be restored" });
      }
      
      return res.status(200).json({
        message: "Client restored successfully",
        client: restoredClient
      });
    } catch (error) {
      console.error("Error restoring client:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }));
  
  /**
   * Soft delete a client 
   * 
   * @route DELETE /api/admin/clients/:id
   * @param {number} id - The ID of the client to delete
   * @returns {Object} - Success message
   * @throws {401} - If not authenticated
   * @throws {403} - If not an admin
   * @throws {404} - If client not found
   */
  app.delete("/api/admin/clients/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const user = req.user as any;
      const adminId = user.id;
      
      // Check if client exists
      const client = await storage.clients.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if client is already deleted
      if (client.deletedAt) {
        return res.status(400).json({ message: "Client is already deleted" });
      }
      
      // Perform soft deletion
      const success = await storage.clients.deleteClient(clientId, adminId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete client" });
      }
      
      return res.status(200).json({
        message: "Client deleted successfully",
        clientId
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }));
  
  /**
   * Restore a soft-deleted entity
   * 
   * @route PATCH /api/admin/entities/:id/restore
   * @param {number} id - The ID of the entity to restore
   * @returns {Entity} - The restored entity
   * @throws {401} - If not authenticated
   * @throws {403} - If not an admin
   * @throws {404} - If entity not found
   * @throws {400} - If entity is not deleted
   */
  app.patch("/api/admin/entities/:id/restore", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const entityId = parseInt(req.params.id);
      if (isNaN(entityId)) {
        return res.status(400).json({ message: "Invalid entity ID" });
      }
      
      const user = req.user as any;
      const adminId = user.id;
      
      // Attempt to restore the entity
      const restoredEntity = await storage.entities.restoreEntity(entityId, adminId);
      
      if (!restoredEntity) {
        return res.status(404).json({ message: "Entity not found or could not be restored" });
      }
      
      return res.status(200).json({
        message: "Entity restored successfully",
        entity: restoredEntity
      });
    } catch (error) {
      console.error("Error restoring entity:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }));
  
  /**
   * Reactivate an inactive (but not deleted) entity
   * 
   * @route PATCH /api/admin/entities/:id/reactivate
   * @param {number} id - The ID of the entity to reactivate
   * @returns {Entity} - The reactivated entity
   * @throws {401} - If not authenticated
   * @throws {403} - If not an admin
   * @throws {404} - If entity not found
   * @throws {400} - If entity is already active or is deleted
   */
  app.patch("/api/admin/entities/:id/reactivate", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const entityId = parseInt(req.params.id);
      if (isNaN(entityId)) {
        return res.status(400).json({ message: "Invalid entity ID" });
      }
      
      const user = req.user as any;
      const adminId = user.id;
      
      // First check if the entity exists and is inactive but not deleted
      const entity = await storage.entities.getEntity(entityId, true); // includeDeleted=true to check the state
      
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      if (entity.deletedAt) {
        return res.status(400).json({ 
          message: "Cannot reactivate a deleted entity. Use the restore endpoint first."
        });
      }
      
      if (entity.active) {
        return res.status(400).json({ message: "Entity is already active" });
      }
      
      // Attempt to reactivate the entity
      const reactivatedEntity = await storage.entities.setEntityActive(entityId);
      
      if (!reactivatedEntity) {
        return res.status(500).json({ message: "Failed to reactivate entity" });
      }
      
      return res.status(200).json({
        message: "Entity reactivated successfully",
        entity: reactivatedEntity
      });
    } catch (error) {
      console.error("Error reactivating entity:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }));
  
  // Temporary test endpoint for debugging without authentication
  app.get("/api/test/entities-by-client/:clientId", asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      console.log('TEST API: Getting entities for client ID:', clientId);
      
      const client = await storage.getClient(clientId);
      console.log('TEST API: Client found:', client ? 'Yes' : 'No');
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Use direct database query to get entities by client
      const entities = await db
        .select()
        .from(entitiesTable)
        .where(eq(entitiesTable.clientId, clientId))
        .orderBy(entitiesTable.name);
      
      console.log('TEST API: Entities retrieved successfully, count:', entities.length);
      
      return res.json({
        status: "success",
        data: {
          client,
          entities
        }
      });
    } catch (error: any) {
      console.error("TEST API: Error getting entities by client:", error);
      return res.status(500).json({ message: "An error occurred", error: error.message || String(error) });
    }
  }));

  /**
   * Get all clients
   */
  app.get("/api/admin/clients", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      
      return res.json({
        status: "success",
        data: clients
      });
    } catch (error: any) {
      console.error("Error fetching clients:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Create a new client
   * This route was previously protected with isAdmin middleware, but for setup flow
   * it needs to be accessible to users who are setting up their account.
   * Proper authorization is still ensured by checking user ownership.
   */
  app.post("/api/admin/clients", asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("POST /api/admin/clients - Received client data:", req.body);
      console.log("User authenticated status:", req.isAuthenticated ? req.isAuthenticated() : false);
      console.log("User data:", req.user);
      
      // Extract user ID from the authenticated user or from the request body
      let userId = (req.user as any)?.id;
      
      // If no authenticated user, try to get the userId from the request body
      // This is a special case for the initial setup flow
      if (!userId && req.body.userId) {
        userId = req.body.userId;
        console.log("Using userId from request body:", userId);
      }
      
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID is required either in session or request body'
        });
      }
      
      // Create the client with owner information
      const clientData = {
        ...req.body,
        userId: userId, // This is the field for the client table
        ownerId: userId, // For backward compatibility
        createdBy: userId
      };
      
      console.log("Creating client with data:", clientData);
      const newClient = await storage.clients.createClient(clientData);
      console.log(`DEBUG: Admin client created successfully with ID ${newClient.id}`);
      
      // Explicitly create default entity first (to ensure dependencies)
      const defaultEntityData = {
        name: `${newClient.name} Default Entity`,
        code: "DEFAULT",
        entityCode: "DEFAULT",
        ownerId: userId,
        clientId: newClient.id,
        active: true,
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD",
        timezone: "UTC"
      };
      const entity = await storage.entities.createEntity(defaultEntityData);
      console.log(`DEBUG: Admin default entity created with ID ${entity.id} for client ID ${newClient.id}`);
      
      // Explicitly seed the Chart of Accounts after entity creation
      console.log(`DEBUG: Starting Chart of Accounts seeding for admin client ID ${newClient.id}`);
      await storage.accounts.seedClientCoA(newClient.id);
      console.log(`DEBUG: Chart of Accounts seeded successfully for admin client ID ${newClient.id}`);
      
      return res.status(201).json({
        status: "success",
        data: newClient
      });
    } catch (error: any) {
      console.error("Error creating client:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create client',
        error: error.message || String(error)
      });
    }
  }));
  
  /**
   * Get a specific client by ID
   */
  app.get("/api/admin/clients/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('GET /api/admin/clients/:id - Start of handler');
      const clientId = parseInt(req.params.id);
      console.log('Client ID:', clientId);
      
      // Debug storage object BEFORE calling any methods
      console.log('Storage object type:', typeof storage);
      console.log('Storage methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));
      console.log('getEntitiesByClient exists:', typeof storage.getEntitiesByClient === 'function');
      console.log('getClient exists:', typeof storage.getClient === 'function');
      
      const client = await storage.getClient(clientId);
      console.log('Client retrieval result:', client ? 'Found client' : 'Client not found');
      
      if (!client) {
        throwNotFound("Client not found");
      }
      
      console.log('Bypassing storage.getEntitiesByClient and using direct DB access');
      
      // Get client's entities directly from the database to avoid circular dependency
      try {
        // Use direct database query instead of storage method
        const entities = await db
          .select()
          .from(entitiesTable)
          .where(eq(entitiesTable.clientId, clientId))
          .orderBy(entitiesTable.name);
          
        console.log('Entities retrieved successfully, count:', entities.length);
        
        return res.json({
          status: "success",
          data: {
            ...client,
            entities
          }
        });
      } catch (error: any) {
        console.error("Error getting entities by client:", error.message || error);
        throw error;
      }
    } catch (error: any) {
      console.error("Error fetching client:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Update a client
   */
  app.put("/api/admin/clients/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      // Verify client exists
      const existingClient = await storage.getClient(clientId);
      if (!existingClient) {
        throwNotFound("Client not found");
      }
      
      const updatedClient = await storage.updateClient(clientId, req.body);
      
      return res.json({
        status: "success",
        data: updatedClient
      });
    } catch (error: any) {
      console.error("Error updating client:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Soft-delete a client (sets deletedAt timestamp)
   */
  app.delete("/api/admin/clients/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('DELETE /api/admin/clients/:id - Start of handler (soft-delete)');
      const clientId = parseInt(req.params.id);
      console.log('Client ID to soft-delete:', clientId);
      
      // Verify client exists
      const existingClient = await storage.getClient(clientId);
      if (!existingClient) {
        throwNotFound("Client not found");
      }
      
      // Prevent deletion of protected clients
      const protectedClients = ['Admin Client', 'OK', 'ONE1', 'Pepper'];
      if (existingClient && protectedClients.includes(existingClient.name)) {
        return res.status(403).json({
          status: 'error',
          message: `Cannot delete protected client: ${existingClient.name}`
        });
      }
      
      console.log(`Soft-deleting client ${clientId}: ${existingClient.name}`);
      
      // Get admin user ID from request
      const adminUser = req.user as any;
      const adminId = adminUser.id;
      
      // Use the storage interface for soft-deletion
      const deleted = await clientStorage.deleteClient(clientId, adminId);
      
      if (!deleted) {
        return res.status(500).json({
          status: 'error',
          message: `Failed to soft-delete client ${existingClient.name} (ID: ${clientId})`
        });
      }
      
      return res.json({
        status: "success",
        message: `Successfully soft-deleted client ${existingClient.name} (ID: ${clientId})`,
        data: {
          clientId,
          clientName: existingClient.name,
          deletedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error("Error soft-deleting client:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Permanently delete a client and all its related data
   * This can only be done for clients that are already soft-deleted
   */
  app.delete("/api/admin/clients/:id/permanent", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('DELETE /api/admin/clients/:id/permanent - Start of handler');
      const clientId = parseInt(req.params.id);
      console.log('Client ID to permanently delete:', clientId);
      
      // Verify client exists
      const existingClient = await storage.getClient(clientId);
      if (!existingClient) {
        throwNotFound("Client not found");
      }
      
      // Prevent deletion of protected clients
      const protectedClients = ['Admin Client', 'OK', 'ONE1', 'Pepper'];
      if (existingClient && protectedClients.includes(existingClient.name)) {
        return res.status(403).json({
          status: 'error',
          message: `Cannot delete protected client: ${existingClient.name}`
        });
      }
      
      // Ensure client is already soft-deleted
      if (!existingClient.deletedAt) {
        return res.status(400).json({
          status: 'error',
          message: `Client ${existingClient.name} (ID: ${clientId}) must be soft-deleted first before permanent deletion`,
          data: {
            clientId,
            clientName: existingClient.name,
            isDeleted: false
          }
        });
      }
      
      console.log(`Permanently deleting client ${clientId}: ${existingClient.name}`);
      
      // Get admin user ID from request
      const adminUser = req.user as any;
      const adminId = adminUser.id;
      
      // Use the storage interface for permanent deletion
      const deleted = await clientStorage.permanentlyDeleteClient(clientId, adminId);
      
      if (!deleted) {
        return res.status(500).json({
          status: 'error',
          message: `Failed to permanently delete client ${existingClient.name} (ID: ${clientId})`,
          data: {
            clientId,
            clientName: existingClient.name
          }
        });
      }
      
      return res.json({
        status: "success",
        message: `Successfully permanently deleted client ${existingClient.name} (ID: ${clientId})`,
        data: {
          clientId,
          clientName: existingClient.name,
          permanentlyDeleted: true
        }
      });
    } catch (error: any) {
      console.error("Error permanently deleting client:", error.message || error);
      throw error;
    }
  }));
  /**
   * Get admin dashboard data
   * Returns clients, entities and consolidation groups for admin dashboard
   */
  app.get("/api/admin/dashboard", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    console.log("Admin dashboard data requested by:", req.user);
    
    try {
      // Debug storage object
      console.log('Dashboard - Storage object type:', typeof storage);
      console.log('Dashboard - Storage methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));
      console.log('Dashboard - getEntitiesByClient exists:', typeof storage.getEntitiesByClient === 'function');
      
      // Get all entities
      const entities = await storage.getEntities();
      
      // Get all clients, including deleted ones for proper status display
      const clients = await storage.getClients(true); // true = include deleted clients
      
      // Get all users for admin dashboard
      const users = await userStorage.getUsers();
      
      // Get all consolidation groups for the admin user
      const adminUser = req.user as any;
      const consolidationGroups = await consolidationStorage.getConsolidationGroupsByUser(adminUser.id);
      
      // Return structured data for admin dashboard with the expected format
      return res.json({
        status: "success",
        data: {
          clients,
          entities,
          users,
          consolidationGroups
        }
      });
    } catch (error: any) {
      console.error("Error fetching admin dashboard data:", error.message || error);
      throw error;
    }
  }));

  /**
   * Create a new entity
   * This route was previously protected with isAdmin middleware, but for setup flow
   * it needs to be accessible to users who are setting up their account.
   * Proper authorization is still ensured by checking user ownership.
   */
  app.post("/api/admin/entities", asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("POST /api/admin/entities - Received entity data:", req.body);
      console.log("User authenticated status:", req.isAuthenticated ? req.isAuthenticated() : false);
      console.log("User data:", req.user);
      
      const { ownerId, clientId, ...entityData } = req.body;
      
      // Extract user ID from the authenticated user or from the request body
      let finalOwnerId = (req.user as any)?.id;
      
      // If no authenticated user, try to get the ownerId from the request body
      // This is a special case for the initial setup flow
      if (!finalOwnerId && ownerId) {
        finalOwnerId = ownerId;
        console.log("Using ownerId from request body:", ownerId);
      }
      
      if (!finalOwnerId) {
        return res.status(400).json({
          status: 'error',
          message: 'Owner ID is required either in session or request body'
        });
      }
      
      // Make sure clientId is provided and valid
      if (!clientId || clientId <= 0) {
        console.log("WARNING: No valid clientId provided for entity creation");
        return res.status(400).json({
          status: 'error',
          message: 'Valid Client ID is required for entity creation'
        });
      }
      
      // Validate the client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found'
        });
      }
      
      console.log(`Creating entity with owner ID ${finalOwnerId} and client ID ${clientId}`);
      
      // Make sure code is provided or generate a default one
      const entityCode = entityData.code || entityData.name?.substring(0, 3).toUpperCase() || 'ENT';
      
      // If the industry field is present but empty, null, or a non-string value, set it explicitly
      let industryValue = entityData.industry;
      
      // Convert numeric industry values to string to maintain consistency
      if (industryValue !== undefined && industryValue !== null) {
        // Convert to string for consistency
        industryValue = String(industryValue);
      } else if (industryValue === '' || industryValue === null) {
        // Default empty value to "other" for consistency with update logic
        industryValue = "other";
      }
      
      // Validate and create entity
      const validatedData = insertEntitySchema.parse({
        ...entityData,
        code: entityCode,
        ownerId: finalOwnerId,
        clientId: clientId,
        active: true,
        industry: industryValue
      });
      
      console.log("Creating entity with validated data:", validatedData);
      console.log("INDUSTRY VALUE BEING SAVED:", validatedData.industry);
      const entity = await storage.createEntity(validatedData);
      console.log("Entity created successfully:", entity);
      
      return res.status(201).json({
        status: "success",
        data: entity
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Validation error creating entity:", error.errors);
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
      console.error("Error creating entity:", error.message || String(error));
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create entity',
        error: error.message || String(error)
      });
    }
  }));
  
  /**
   * Update an entity
   */
  app.put("/api/admin/entities/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get the raw ID string first
      const rawIdString = req.params.id;
      
      // Enhanced DEBUG: Log incoming request details with more context
      console.log(`DEBUG Route Update Entity: Received request for ID: ${rawIdString}`);
      console.log("DEBUG Route Update Entity: Received body:", JSON.stringify(req.body));
      
      // Log request headers for authentication debugging
      console.log("DEBUG Route Update Entity: Request headers:", {
        authorization: req.headers.authorization ? "Present" : "Missing",
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
      });

      // CRITICAL FIX: First check if the ID exceeds PostgreSQL integer range directly as a string
      // This prevents the parseInt from generating a number that's too large for JS to handle properly
      if (rawIdString.length > 10 || parseInt(rawIdString) > 2147483647) { // PostgreSQL int max is 2147483647 (10 digits)
        console.error(`DEBUG Route Update Entity: ID ${rawIdString} exceeds PostgreSQL integer range - likely a temporary frontend ID`);
        return res.status(400).json({ 
          status: "error", 
          message: "Cannot update entity with temporary ID. Please save the client first." 
        });
      }
      
      // Now safely parse the integer
      const entityId = parseInt(rawIdString);
      
      // Validate the entity ID format
      if (isNaN(entityId)) {
        console.error(`DEBUG Route Update Entity: Invalid entity ID format: ${rawIdString}`);
        return res.status(400).json({ 
          status: "error", 
          message: `Invalid entity ID format: ${rawIdString}` 
        });
      }
      
      if (entityId <= 0) {
        console.error(`DEBUG Route Update Entity: Invalid entity ID (must be positive): ${entityId}`);
        return res.status(400).json({ 
          status: "error", 
          message: `Invalid entity ID (must be positive): ${entityId}` 
        });
      }
      
      let existingEntity;
      
      // CRITICAL FIX: Short-circuit for temporary IDs in step 2 of the setup flow
      // These IDs are typically large numbers like timestamps (e.g., 1743100000000)
      // This pattern indicates they are coming from EntityManagementCard's temporary IDs
      if (entityId > 1740000000000) { // Timestamp-based IDs from January 2025 onwards will be > 1740000000000
        console.error(`DEBUG Route Update Entity: Detected temporary ID pattern: ${entityId}`);
        return res.status(400).json({ 
          status: "error", 
          message: "Cannot update entity with temporary ID. You need to complete the client setup first." 
        });
      }
      
      try {
        // Verify entity exists with detailed logging
        console.log(`DEBUG Route Update Entity: Fetching entity with ID ${entityId} from storage...`);
        existingEntity = await storage.getEntity(entityId);
      } catch (error) {
        // If the error is specifically about the ID being out of range, handle it gracefully
        if (error instanceof Error && error.message.includes("out of range for type integer")) {
          console.error(`DEBUG Route Update Entity ERROR: Large ID handling failed - ${error.message}`);
          return res.status(400).json({ 
            status: "error", 
            message: "Cannot update entity with temporary ID. Please save the client first." 
          });
        }
        // Otherwise rethrow
        console.error(`DEBUG Route Update Entity ERROR: ${error instanceof Error ? error.message : String(error)}`, error);
        return res.status(500).json({ 
          status: "error", 
          message: "Database error occurred" 
        });
      }
      
      if (!existingEntity) {
        console.log(`DEBUG Route Update Entity: Entity with ID ${entityId} not found in database`);
        throwNotFound(`Entity with ID ${entityId} not found`);
      }
      
      console.log(`DEBUG Route Update Entity: Found existing entity:`, JSON.stringify(existingEntity));
      
      // Validate required fields in request body
      if (!req.body.name || req.body.name.trim() === '') {
        console.error("DEBUG Route Update Entity: Missing required field 'name' in request body");
        throw new Error("Entity name is required");
      }
      
      // If the industry field is present, convert it to string for consistency
      if (req.body.industry !== undefined) {
        if (req.body.industry === null || req.body.industry === '') {
          console.log("DEBUG Route Update Entity: Setting empty industry to 'other'");
          req.body.industry = "other";
        } else {
          // Convert numeric industry values to string for consistency
          console.log(`DEBUG Route Update Entity: Converting industry value "${req.body.industry}" (${typeof req.body.industry}) to string`);
          req.body.industry = String(req.body.industry);
        }
      }
      
      // Validate clientId if provided
      if (req.body.clientId !== undefined && existingEntity && 'clientId' in existingEntity) {
        console.log(`DEBUG Route Update Entity: Request includes clientId: ${req.body.clientId}`);
        
        if (req.body.clientId !== existingEntity.clientId) {
          console.log(`DEBUG Route Update Entity: ClientId changed from ${existingEntity.clientId} to ${req.body.clientId}`);
        }
      }
      
      // Log the specific changes being made
      console.log("DEBUG Route Update Entity: Fields being updated:");
      if (existingEntity) {
        for (const [key, value] of Object.entries(req.body)) {
          // Use type safety to access properties 
          if (key in existingEntity && existingEntity[key as keyof typeof existingEntity] !== value) {
            console.log(`  - ${key}: "${existingEntity[key as keyof typeof existingEntity]}" -> "${value}"`);
          }
        }
      }
      
      console.log(`DEBUG Route Update Entity: Calling storage.updateEntity with ID ${entityId}...`);
      
      const updatedEntity = await storage.updateEntity(entityId, req.body);
      
      if (!updatedEntity) {
        console.error(`DEBUG Route Update Entity: Storage returned null/undefined after update for ID ${entityId}`);
        throw new Error(`Failed to update entity with ID ${entityId}`);
      }
      
      console.log(`DEBUG Route Update Entity: Update successful, returning entity:`, JSON.stringify(updatedEntity));
      
      return res.json({
        status: "success",
        data: updatedEntity
      });
    } catch (error: any) {
      console.error(`DEBUG Route Update Entity ERROR: ${error.message}`, error.stack);
      
      if (error instanceof z.ZodError) {
        console.error("DEBUG Route Update Entity: ZodError validation failed", JSON.stringify(error.errors));
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
      console.error("Error updating entity:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Get all users (for entity assignment)
   */
  app.get("/api/admin/users", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      // Use the new getUsers method implemented in the userStorage module
      const users = await userStorage.getUsers();
      
      // Filter out sensitive info
      const safeUsers = users.map((user: any) => ({
        id: user.id,
        username: user.username || '',
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.active !== false // Using active property instead of isActive
      }));
      
      return res.json({
        status: "success",
        data: safeUsers
      });
    } catch (error: any) {
      console.error("Error fetching users:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Grant user access to an entity
   */
  app.post("/api/admin/entities/:entityId/access", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const entityId = parseInt(req.params.entityId);
      const { userId, accessLevel } = req.body;
      
      if (!userId || !accessLevel) {
        throwBadRequest("User ID and access level are required");
      }
      
      // Verify entity exists
      const entity = await storage.getEntity(entityId);
      if (!entity) {
        throwNotFound("Entity not found");
      }
      
      // Verify user exists
      const user = await userStorage.getUser(userId);
      if (!user) {
        throwNotFound("User not found");
      }
      
      // Grant access
      await userStorage.grantUserEntityAccess(userId, entityId, accessLevel);
      
      return res.json({
        status: "success",
        message: "Access granted successfully"
      });
    } catch (error: any) {
      console.error("Error granting access:", error.message || error);
      throw error;
    }
  }));

  /**
   * Manually trigger the scheduled cleanup task to permanently delete
   * soft-deleted clients that have been deleted for more than 90 days
   * 
   * @route POST /api/admin/trigger-cleanup
   * @returns {Object} Result of the cleanup operation
   * @throws {401} - If not authenticated
   * @throws {403} - If not an admin
   */
  app.post("/api/admin/trigger-cleanup", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log('[AdminAPI] Manually triggering soft-deleted client cleanup task');
      
      // Get admin user ID from request for audit logging
      const adminUser = req.user as any;
      const adminId = adminUser.id;
      
      // Execute the cleanup task
      const result = await cleanupSoftDeletedClients();
      
      console.log(`[AdminAPI] Cleanup task completed: ${result.deleted} clients permanently deleted, ${result.errors.length} errors`);
      
      return res.status(200).json({
        status: "success",
        message: "Cleanup task completed successfully",
        result: {
          clientsDeleted: result.deleted,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    } catch (error: any) {
      console.error("[AdminAPI] Error executing cleanup task:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to execute cleanup task",
        error: error.message || String(error)
      });
    }
  }));
}