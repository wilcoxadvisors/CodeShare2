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
      
      // Get all users for admin dashboard
      const users = await storage.getUsers();
      
      // Get all consolidation groups for the admin user
      const adminUser = req.user as any;
      const consolidationGroups = await storage.getConsolidationGroups(adminUser.id);
      
      // Return structured data for admin dashboard with the expected format
      return res.json({
        status: "success",
        data: {
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