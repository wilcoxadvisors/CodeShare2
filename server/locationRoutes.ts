import type { Express, Request, Response } from "express";
import { insertLocationSchema } from '@shared/schema';
import { asyncHandler } from "./errorHandling";

// Authentication middleware - simple check for user in session
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // If user exists in session, they're authenticated
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // No authenticated user
  return res.status(401).json({ message: "Unauthorized" });
};

export function registerLocationRoutes(app: Express, storage: any) {
  // GET /api/clients/:clientId/locations - List locations for a client
  app.get('/api/clients/:clientId/locations', isAuthenticated, asyncHandler(async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    const locations = await storage.listLocationsByClient(clientId);
    return res.json(locations);
  }));

  // POST /api/locations - Create a new location
  app.post('/api/locations', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      // Validate request body against schema
      const validatedData = insertLocationSchema.parse(req.body);
      const newLocation = await storage.createLocation(validatedData);
      return res.status(201).json(newLocation);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }));

  // GET /api/locations/:id - Get a single location
  app.get('/api/locations/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const locationId = parseInt(req.params.id);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    
    const location = await storage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    return res.json(location);
  }));

  // PUT /api/locations/:id - Update a location
  app.put('/api/locations/:id', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: 'Invalid location ID' });
      }
      
      // Validate request body against schema
      // We use .partial() to make all fields optional for updates
      const validatedData = insertLocationSchema.partial().parse(req.body);
      
      const updatedLocation = await storage.updateLocation(locationId, validatedData);
      if (!updatedLocation) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      return res.json(updatedLocation);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }));

  // DELETE /api/locations/:id - Deactivate a location (soft delete)
  app.delete('/api/locations/:id', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: 'Invalid location ID' });
      }
      
      const result = await storage.setLocationActiveStatus(locationId, false);
      if (!result) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      return res.json({ success: true, message: 'Location deactivated successfully' });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }));
}