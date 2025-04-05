/**
 * Special routes for verification testing
 */
import express from 'express';
import { Request, Response } from 'express';
import { IStorage } from '../storage';
import bcrypt from 'bcryptjs';
import { users, UserRole } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Helper function for async request handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: Function) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to hash passwords
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verificationRouter = express.Router();

/**
 * Register a test admin user for verification purposes
 * This route is only for development/testing and would be disabled in production
 */
verificationRouter.post('/register-test-admin', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  
  // Check if admin already exists
  const existingAdmin = await storage.users.getUserByUsername('admin');
  
  if (existingAdmin) {
    return res.status(200).json({ 
      message: 'Test admin already exists', 
      user: {
        id: existingAdmin.id,
        username: existingAdmin.username,
        email: existingAdmin.email,
        role: existingAdmin.role
      }
    });
  }
  
  // Create admin user for testing
  const hashedPassword = await hashPassword('password123');
  
  const [newAdmin] = await storage.db
    .insert(users)
    .values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'admin',
      name: 'Admin User',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!newAdmin) {
    return res.status(500).json({ message: 'Failed to create test admin' });
  }
  
  return res.status(201).json({
    message: 'Test admin created successfully',
    user: {
      id: newAdmin.id,
      username: newAdmin.username,
      email: newAdmin.email,
      role: newAdmin.role
    }
  });
}));

/**
 * Get a list of all clients (Non-admin version for verification scripts)
 */
verificationRouter.get('/clients', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  console.log("GET /api/verification/clients - storage:", storage);
  // Use clients.getClients() instead of storage.getClients()
  const clients = await storage.clients.getClients();
  return res.json(clients);
}));

/**
 * Create a new client (Non-admin version for verification scripts)
 */
verificationRouter.post('/clients', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const clientData = req.body;
  
  const newClient = await storage.clients.createClient(clientData);
  return res.status(201).json(newClient);
}));

/**
 * Get a specific client by ID (Non-admin version for verification scripts)
 */
verificationRouter.get('/clients/:id', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const clientId = parseInt(req.params.id);
  
  const client = await storage.clients.getClient(clientId);
  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }
  
  return res.json(client);
}));

/**
 * Update a client (Non-admin version for verification scripts)
 */
verificationRouter.put('/clients/:id', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const clientId = parseInt(req.params.id);
  const clientData = req.body;
  
  const updatedClient = await storage.clients.updateClient(clientId, clientData);
  if (!updatedClient) {
    return res.status(404).json({ message: 'Client not found' });
  }
  
  return res.json(updatedClient);
}));

/**
 * Get a list of all entities (Non-admin version for verification scripts)
 */
verificationRouter.get('/entities', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  
  // Get all entities with both active and inactive, but not deleted
  const entities = await storage.entities.getEntities(false, true);
  return res.json(entities);
}));

/**
 * Create a new entity (Non-admin version for verification scripts)
 */
verificationRouter.post('/entities', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const entityData = req.body;
  
  const newEntity = await storage.entities.createEntity(entityData);
  return res.status(201).json(newEntity);
}));

/**
 * Get a specific entity by ID (Non-admin version for verification scripts)
 */
verificationRouter.get('/entities/:id', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const entityId = parseInt(req.params.id);
  
  const entity = await storage.entities.getEntity(entityId);
  if (!entity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(entity);
}));

/**
 * Update an entity (Non-admin version for verification scripts)
 */
verificationRouter.put('/entities/:id', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const entityId = parseInt(req.params.id);
  const entityData = req.body;
  
  const updatedEntity = await storage.entities.updateEntity(entityId, entityData);
  if (!updatedEntity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(updatedEntity);
}));

/**
 * Set an entity as inactive (Non-admin version for verification scripts)
 */
verificationRouter.post('/entities/:id/set-inactive', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const entityId = parseInt(req.params.id);
  
  const updatedEntity = await storage.entities.updateEntity(entityId, { active: false, deletedAt: null });
  if (!updatedEntity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(updatedEntity);
}));

/**
 * Soft delete an entity (Non-admin version for verification scripts)
 */
verificationRouter.delete('/entities/:id', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const entityId = parseInt(req.params.id);
  
  const updatedEntity = await storage.entities.updateEntity(entityId, { active: false, deletedAt: new Date() });
  if (!updatedEntity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(updatedEntity);
}));

/**
 * Restore a soft-deleted entity (Non-admin version for verification scripts)
 */
verificationRouter.post('/entities/:id/restore', asyncHandler(async (req: Request, res: Response) => {
  const { storage } = req.app.locals;
  const entityId = parseInt(req.params.id);
  
  const updatedEntity = await storage.entities.updateEntity(entityId, { active: true, deletedAt: null });
  if (!updatedEntity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(updatedEntity);
}));