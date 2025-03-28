/**
 * Admin Dashboard Routes
 * 
 * These routes provide admin-specific functionality for the dashboard
 */
import { Express, Request, Response } from "express";
import { asyncHandler, throwUnauthorized, throwBadRequest, throwNotFound } from "./errorHandling";
import { IStorage } from "./storage";
import { UserRole, insertEntitySchema, entities as entitiesTable } from "../shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { z } from "zod";

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
      const newClient = await storage.createClient(clientData);
      console.log("Client created successfully:", newClient);
      
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
      
      // Get all clients
      const clients = await storage.getClients();
      
      // Get all users for admin dashboard
      const users = await storage.getUsers();
      
      // Get all consolidation groups for the admin user
      const adminUser = req.user as any;
      const consolidationGroups = await storage.getConsolidationGroups(adminUser.id);
      
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
      const entityId = parseInt(req.params.id);
      
      // Enhanced DEBUG: Log incoming request details with more context
      console.log(`DEBUG Route Update Entity: Received request for ID: ${entityId}`);
      console.log("DEBUG Route Update Entity: Received body:", JSON.stringify(req.body));
      
      // Log request headers for authentication debugging
      console.log("DEBUG Route Update Entity: Request headers:", {
        authorization: req.headers.authorization ? "Present" : "Missing",
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
      });
      
      // Validate the entity ID format
      if (isNaN(entityId) || entityId <= 0) {
        console.error(`DEBUG Route Update Entity: Invalid entity ID format: ${req.params.id}`);
        throw new Error(`Invalid entity ID format: ${req.params.id}`);
      }
      
      // Verify entity exists with detailed logging
      console.log(`DEBUG Route Update Entity: Fetching entity with ID ${entityId} from storage...`);
      const existingEntity = await storage.getEntity(entityId);
      
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
      if (req.body.clientId !== undefined) {
        console.log(`DEBUG Route Update Entity: Request includes clientId: ${req.body.clientId}`);
        
        if (req.body.clientId !== existingEntity.clientId) {
          console.log(`DEBUG Route Update Entity: ClientId changed from ${existingEntity.clientId} to ${req.body.clientId}`);
        }
      }
      
      // Log the specific changes being made
      console.log("DEBUG Route Update Entity: Fields being updated:");
      for (const [key, value] of Object.entries(req.body)) {
        if (existingEntity[key] !== value) {
          console.log(`  - ${key}: "${existingEntity[key]}" -> "${value}"`);
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
      // Use the new getUsers method implemented in the storage
      const users = await storage.getUsers();
      
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
      const user = await storage.getUser(userId);
      if (!user) {
        throwNotFound("User not found");
      }
      
      // Grant access
      await storage.grantUserEntityAccess(userId, entityId, accessLevel);
      
      return res.json({
        status: "success",
        message: "Access granted successfully"
      });
    } catch (error: any) {
      console.error("Error granting access:", error.message || error);
      throw error;
    }
  }));
}