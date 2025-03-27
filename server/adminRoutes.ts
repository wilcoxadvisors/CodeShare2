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
   */
  app.post("/api/admin/clients", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("POST /api/admin/clients - Received client data:", req.body);
      
      // Extract user ID from the authenticated user
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID is required'
        });
      }
      
      // Create the client with owner information
      const clientData = {
        ...req.body,
        ownerId: userId,
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
   * Admins can create entities for any user
   * Entities must be associated with a client
   */
  app.post("/api/admin/entities", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { ownerId, clientId, ...entityData } = req.body;
      
      if (!ownerId) {
        throwBadRequest("Owner ID is required");
      }
      
      // Validate the owner exists
      const owner = await storage.getUser(ownerId);
      if (!owner) {
        throwNotFound("User not found");
      }
      
      // If clientId not provided, find or create a client for the owner
      let finalClientId = clientId;
      if (!finalClientId) {
        // Try to find client for the owner
        const clients = await storage.getClientsByUserId(ownerId);
        if (clients && clients.length > 0) {
          finalClientId = clients[0].id;
        } else if (owner && owner.role === UserRole.CLIENT) {
          // If user is a client but doesn't have a client record, create one
          const newClient = await storage.createClient({
            userId: ownerId,
            name: owner.name || `${owner.username || 'New'}'s Client`,
            active: true
          });
          finalClientId = newClient.id;
        } else {
          // For ADMIN and EMPLOYEE, look up the default admin client
          const adminUser = await storage.findUserByRole(UserRole.ADMIN);
          if (adminUser) {
            const adminClients = await storage.getClientsByUserId(adminUser.id);
            if (adminClients && adminClients.length > 0) {
              finalClientId = adminClients[0].id;
            }
          }
          
          // If still no client found, throw error
          if (!finalClientId) {
            throwBadRequest("Client ID is required and no default client could be found");
          }
        }
      } else {
        // Validate the client exists
        const client = await storage.getClient(finalClientId);
        if (!client) {
          throwNotFound("Client not found");
        }
      }
      
      // Validate and create entity
      const validatedData = insertEntitySchema.parse({
        ...entityData,
        ownerId,
        clientId: finalClientId,
        active: true
      });
      
      const entity = await storage.createEntity(validatedData);
      
      return res.status(201).json({
        status: "success",
        data: entity
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
      console.error("Error creating entity:", error.message || error);
      throw error;
    }
  }));
  
  /**
   * Update an entity
   */
  app.put("/api/admin/entities/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const entityId = parseInt(req.params.id);
      
      // Verify entity exists
      const existingEntity = await storage.getEntity(entityId);
      if (!existingEntity) {
        throwNotFound("Entity not found");
      }
      
      const updatedEntity = await storage.updateEntity(entityId, req.body);
      
      return res.json({
        status: "success",
        data: updatedEntity
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
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