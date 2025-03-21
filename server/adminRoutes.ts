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
   * Get admin dashboard data
   * Returns entities and consolidation groups for admin dashboard
   */
  app.get("/api/admin/dashboard", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    console.log("Admin dashboard data requested by:", req.user);
    
    try {
      // Get all entities
      const entities = await storage.getEntities();
      
      // Get all consolidation groups for the admin user
      const adminUser = req.user as any;
      const consolidationGroups = await storage.getConsolidationGroups(adminUser.id);
      
      // Return structured data for admin dashboard
      return res.json({
        status: "success",
        data: {
          entities,
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
   */
  app.post("/api/admin/entities", isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { ownerId, ...entityData } = req.body;
      
      if (!ownerId) {
        throwBadRequest("Owner ID is required");
      }
      
      // Validate the owner exists
      const owner = await storage.getUser(ownerId);
      if (!owner) {
        throwNotFound("User not found");
      }
      
      // Validate and create entity
      const validatedData = insertEntitySchema.parse({
        ...entityData,
        ownerId,
        isActive: true
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
      // For now, we'll use a simplified approach since we don't have a direct getUsers method
      // This is a workaround until we implement a full getUsers method in the storage interface
      
      // Get users who own entities
      const entities = await storage.getEntities();
      const userIds = new Set(entities.map(entity => entity.ownerId));
      
      // Create a list of unique users
      const users: any[] = [];
      const userIdsArray = Array.from(userIds);
      for (const userId of userIdsArray) {
        const user = await storage.getUser(userId);
        if (user) {
          users.push(user);
        }
      }
      
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