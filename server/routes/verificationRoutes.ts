/**
 * Special routes for verification testing
 */
import express from 'express';
import { Request, Response } from 'express';
import { IStorage } from '../storage';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../shared/schema';

// Helper function for async request handlers - Fixed typing
const asyncHandler = (fn: (req: Request, res: Response, next: Function) => Promise<any>) => 
  (req: Request, res: Response, next: Function) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };

// Helper function to hash passwords
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Create a function that returns a new router with the storage object
export const createVerificationRouter = (storage: IStorage) => {
  // Validate storage is provided
  if (!storage) {
    throw new Error('Storage is required for verification routes');
  }
  
  console.log('Creating verification router with storage:', !!storage);
  
  const verificationRouter = express.Router();

/**
 * Register a test admin user for verification purposes
 * This route is only for development/testing and would be disabled in production
 */
verificationRouter.post('/register-test-admin', asyncHandler(async (req: Request, res: Response) => {
  // Use the storage instance passed to the function, not from app.locals
  // // Use directly passed storage instead of app.locals.storage
  
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
  
  // Use the createUser method from storage.users instead of direct DB access
  const newAdmin = await storage.users.createUser({
    username: 'admin',
    password: hashedPassword,
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User',
    active: true
  });
  
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
  // Use directly passed storage instead of app.locals.storage
  console.log("GET /api/verification/clients - storage is available:", !!storage);
  // Use clients.getClients() instead of storage.getClients()
  const clients = await storage.clients.getClients();
  return res.json(clients);
}));

/**
 * Create a new client (Non-admin version for verification scripts)
 */
verificationRouter.post('/clients', asyncHandler(async (req: Request, res: Response) => {
  // Use directly passed storage instead of app.locals.storage
  const clientData = req.body;
  
  // For verification routes, add the admin user ID if not provided
  if (!clientData.userId) {
    // Find the admin user and use their ID
    const adminUser = await storage.users.getUserByUsername('admin');
    
    if (!adminUser) {
      // Create admin user if it doesn't exist
      const newAdmin = await storage.users.createUser({
        username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        active: true
      });
      
      clientData.userId = newAdmin.id;
    } else {
      clientData.userId = adminUser.id;
    }
  }
  
  console.log("Creating client with data (verification route):", JSON.stringify(clientData, null, 2));
  
  const newClient = await storage.clients.createClient(clientData);
  return res.status(201).json(newClient);
}));

/**
 * Get a specific client by ID (Non-admin version for verification scripts)
 */
verificationRouter.get('/clients/:id', asyncHandler(async (req: Request, res: Response) => {
  // Use directly passed storage instead of app.locals.storage
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
  // Use directly passed storage instead of app.locals.storage
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
  // Use directly passed storage instead of app.locals.storage
  
  // Get all entities with both active and inactive, but not deleted
  const entities = await storage.entities.getEntities(false, true);
  return res.json(entities);
}));

/**
 * Create a new entity (Non-admin version for verification scripts)
 */
verificationRouter.post('/entities', asyncHandler(async (req: Request, res: Response) => {
  // Use directly passed storage instead of app.locals.storage
  const entityData = req.body;
  
  const newEntity = await storage.entities.createEntity(entityData);
  return res.status(201).json(newEntity);
}));

/**
 * Get a specific entity by ID (Non-admin version for verification scripts)
 */
verificationRouter.get('/entities/:id', asyncHandler(async (req: Request, res: Response) => {
  // Use directly passed storage instead of app.locals.storage
  const entityId = parseInt(req.params.id);
  
  // For verification routes, we need to optionally include deleted entities
  // Get query param includeDeleted (default: false)
  const includeDeleted = req.query.includeDeleted === 'true';
  
  console.log(`Getting entity ${entityId} with includeDeleted=${includeDeleted}`);
  
  const entity = await storage.entities.getEntity(entityId, includeDeleted);
  if (!entity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(entity);
}));

/**
 * Update an entity (Non-admin version for verification scripts)
 */
verificationRouter.put('/entities/:id', asyncHandler(async (req: Request, res: Response) => {
  // Use directly passed storage instead of app.locals.storage
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
  // Use directly passed storage instead of app.locals.storage
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
  // Use directly passed storage instead of app.locals.storage
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
  // Use the storage instance passed to the function, not from app.locals
  // // Use directly passed storage instead of app.locals.storage
  const entityId = parseInt(req.params.id);
  
  const updatedEntity = await storage.entities.updateEntity(entityId, { active: true, deletedAt: null });
  if (!updatedEntity) {
    return res.status(404).json({ message: 'Entity not found' });
  }
  
  return res.json(updatedEntity);
}));

  // Return the router so it can be used in routes.ts
  return verificationRouter;
};