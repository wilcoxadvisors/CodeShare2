/**
 * Admin Dashboard Routes
 * 
 * These routes provide admin-specific functionality for the dashboard
 */
import { Express, Request, Response } from "express";
import { asyncHandler, throwUnauthorized, throwBadRequest, throwNotFound } from "./errorHandling";
import { IStorage } from "./storage";
import { UserRole, insertEntitySchema } from "../shared/schema";
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
    } catch (error) {
      console.error("Error fetching clients:", error);
      throw error;
    }
  }));
  
  /**
   * Get a specific client by ID
   */
  app.get("/api/admin/clients/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        throwNotFound("Client not found");
      }
      
      // Get client's entities
      const entities = await storage.getEntitiesByClient(clientId);
      
      return res.json({
        status: "success",
        data: {
          ...client,
          entities
        }
      });
    } catch (error) {
      console.error("Error fetching client:", error);
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
    } catch (error) {
      console.error("Error updating client:", error);
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
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid entity data", 
          errors: error.errors 
        });
      }
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
    } catch (error) {
      console.error("Error fetching users:", error);
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
    } catch (error) {
      console.error("Error granting access:", error);
      throw error;
    }
  }));
}