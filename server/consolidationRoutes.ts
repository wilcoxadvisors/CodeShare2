import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import { asyncHandler, throwBadRequest, throwNotFound, throwUnauthorized } from './errorHandling';
import { ReportType } from '@shared/schema';
import { enhancedEntitySchema } from '@shared/validation';

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

export function registerConsolidationRoutes(app: Express, storage: IStorage) {
  /**
   * Get all consolidation groups for the current user
   */
  app.get('/api/consolidation-groups', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const authUser = req.user as AuthUser;
    const groups = await storage.getConsolidationGroups(authUser.id);
    res.json({
      status: "success",
      data: groups
    });
  }));

  /**
   * Get a specific consolidation group
   */
  app.get('/api/consolidation-groups/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.id);
    const group = await storage.getConsolidationGroup(groupId);
    
    if (!group) {
      throwNotFound('Consolidation Group');
    }

    // Check if user has access to this group
    const authUser = req.user as AuthUser;
    if (group.createdBy !== authUser.id && authUser.role !== 'admin') {
      throwUnauthorized('You do not have access to this consolidation group');
    }

    res.json({
      status: "success",
      data: group
    });
  }));

  /**
   * Create a new consolidation group
   */
  app.post('/api/consolidation-groups', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const authUser = req.user as AuthUser;
    
    // Add the current user as the creator
    const groupData = {
      ...req.body,
      createdBy: authUser.id
    };
    
    const newGroup = await storage.createConsolidationGroup(groupData);
    res.status(201).json({
      status: "success",
      data: newGroup
    });
  }));

  /**
   * Update a consolidation group
   */
  app.put('/api/consolidation-groups/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.id);
    const group = await storage.getConsolidationGroup(groupId);
    
    if (!group) {
      throwNotFound('Consolidation Group');
    }

    // Check if user has access to this group
    const authUser = req.user as AuthUser;
    if (group.createdBy !== authUser.id && authUser.role !== 'admin') {
      throwUnauthorized('You do not have permission to update this consolidation group');
    }

    const updatedGroup = await storage.updateConsolidationGroup(groupId, req.body);
    res.json({
      status: "success",
      data: updatedGroup
    });
  }));

  /**
   * Delete a consolidation group
   */
  app.delete('/api/consolidation-groups/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.id);
    const group = await storage.getConsolidationGroup(groupId);
    
    if (!group) {
      throwNotFound('Consolidation Group');
    }

    // Check if user has access to this group
    const authUser = req.user as AuthUser;
    if (group.createdBy !== authUser.id && authUser.role !== 'admin') {
      throwUnauthorized('You do not have permission to delete this consolidation group');
    }

    await storage.deleteConsolidationGroup(groupId);
    res.status(204).send();
  }));

  /**
   * Add entity to a consolidation group
   */
  app.post('/api/consolidation-groups/:id/entities/:entityId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    
    const group = await storage.getConsolidationGroup(groupId);
    if (!group) {
      throwNotFound('Consolidation Group');
    }

    // Check if user has access to this group
    const authUser = req.user as AuthUser;
    if (group.createdBy !== authUser.id && authUser.role !== 'admin') {
      throwUnauthorized('You do not have permission to modify this consolidation group');
    }

    // Check if entity exists
    const entity = await storage.getEntity(entityId);
    if (!entity) {
      throwNotFound('Entity');
    }

    await storage.addEntityToConsolidationGroup(groupId, entityId);
    
    // Return the updated group
    const updatedGroup = await storage.getConsolidationGroup(groupId);
    res.json({
      status: "success",
      data: updatedGroup
    });
  }));

  /**
   * Remove entity from a consolidation group
   */
  app.delete('/api/consolidation-groups/:id/entities/:entityId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    
    const group = await storage.getConsolidationGroup(groupId);
    if (!group) {
      throwNotFound('Consolidation Group');
    }

    // Check if user has access to this group
    const authUser = req.user as AuthUser;
    if (group.createdBy !== authUser.id && authUser.role !== 'admin') {
      throwUnauthorized('You do not have permission to modify this consolidation group');
    }

    await storage.removeEntityFromConsolidationGroup(groupId, entityId);
    
    // Return the updated group
    const updatedGroup = await storage.getConsolidationGroup(groupId);
    res.json({
      status: "success",
      data: updatedGroup
    });
  }));

  /**
   * Generate a consolidated report for a group
   */
  app.get('/api/consolidation-groups/:id/reports/:reportType', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.id);
    const reportType = req.params.reportType as ReportType;
    
    const group = await storage.getConsolidationGroup(groupId);
    if (!group) {
      throwNotFound('Consolidation Group');
    }

    // Check if user has access to this group
    const authUser = req.user as AuthUser;
    if (group.createdBy !== authUser.id && authUser.role !== 'admin') {
      throwUnauthorized('You do not have permission to access reports for this consolidation group');
    }

    // Get optional date parameters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }

    const report = await storage.generateConsolidatedReport(groupId, reportType, startDate, endDate);
    res.json({
      status: "success",
      data: report
    });
  }));

  /**
   * Get consolidation groups that include a specific entity
   */
  app.get('/api/entities/:entityId/consolidation-groups', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    
    // Check if entity exists
    const entity = await storage.getEntity(entityId);
    if (!entity) {
      throwNotFound('Entity');
    }
    
    // Check if user has access to this entity
    const authUser = req.user as AuthUser;
    const accessLevel = await storage.getUserEntityAccess(authUser.id, entityId);
    
    if (!accessLevel && authUser.role !== 'admin') {
      throwUnauthorized('You do not have access to this entity');
    }
    
    const groups = await storage.getConsolidationGroupsByEntity(entityId);
    res.json({
      status: "success",
      data: groups
    });
  }));
}