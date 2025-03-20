import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import { asyncHandler, throwNotFound, throwBadRequest } from './errorHandling';
import { insertForecastSchema } from '../shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../shared/validation';
import { MLService } from './mlService';

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Initialize ML Service with storage
import { mlService } from './mlService';

export function registerForecastRoutes(app: Express, storage: IStorage) {
  // Inject storage into ML service
  (mlService as any).storage = storage;
  /**
   * Get all forecasts for an entity
   */
  app.get('/api/entities/:entityId/forecasts', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const forecasts = await storage.getForecasts(entityId);
    
    res.json(forecasts);
  }));
  
  /**
   * Get a specific forecast
   */
  app.get('/api/entities/:entityId/forecasts/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const forecast = await storage.getForecast(id);
    
    if (!forecast) {
      throwNotFound('Forecast');
    }
    
    res.json(forecast);
  }));
  
  /**
   * Create a new forecast
   */
  app.post('/api/entities/:entityId/forecasts', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const user = req.session!.user as AuthUser;
    
    try {
      const forecastData = insertForecastSchema.parse({
        ...req.body,
        entityId,
        createdBy: user.id
      });
      
      const forecast = await storage.createForecast(forecastData);
      res.status(201).json(forecast);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Update a forecast
   */
  app.put('/api/entities/:entityId/forecasts/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.session!.user as AuthUser;
    
    // Check if the forecast exists
    const existingForecast = await storage.getForecast(id);
    if (!existingForecast) {
      throwNotFound('Forecast');
    }
    
    const updatedForecast = await storage.updateForecast(id, {
      ...req.body,
      lastUpdatedBy: user.id,
      lastUpdated: new Date()
    });
    
    res.json(updatedForecast);
  }));
  
  /**
   * Delete a forecast
   */
  app.delete('/api/entities/:entityId/forecasts/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    // Verify forecast exists
    const forecast = await storage.getForecast(id);
    if (!forecast) {
      throwNotFound('Forecast');
    }
    
    await storage.deleteForecast(id);
    res.status(204).send();
  }));
  
  /**
   * Generate forecast data
   */
  app.post('/api/entities/:entityId/forecasts/generate', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    
    const config = {
      periods: req.body.periods || 12,
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      useSeasonality: req.body.useSeasonality !== undefined ? req.body.useSeasonality : true,
      growthFactors: req.body.growthFactors || {},
      basedOnBudgetId: req.body.basedOnBudgetId || null,
      basedOnHistoricalPeriods: req.body.basedOnHistoricalPeriods || 6,
      frequency: req.body.frequency || 'M',
      expenses: req.body.expenses || []
    };
    
    try {
      // Try to use the ML service for advanced forecasting
      const serviceRunning = await mlService.isServiceRunning();
      if (!serviceRunning) {
        // Try to start the service
        const started = await mlService.startService();
        if (!started) {
          // Fall back to the storage implementation if ML service can't be started
          const forecastData = await storage.generateForecast(entityId, config);
          return res.json({ 
            forecastData,
            usingAdvancedML: false,
            message: "Using basic forecasting (ML service unavailable)" 
          });
        }
      }
      
      // ML Service is running, use it for advanced forecasting
      const forecastData = await mlService.generateEntityForecast(entityId, config);
      res.json({ 
        ...forecastData,
        usingAdvancedML: true,
        message: "Using advanced ML forecasting"
      });
    } catch (error) {
      console.error("Error using ML service:", error);
      // Fall back to the storage implementation
      const forecastData = await storage.generateForecast(entityId, config);
      res.json({ 
        forecastData,
        usingAdvancedML: false,
        message: "Using basic forecasting (ML service error)"
      });
    }
  }));
  
  /**
   * Create forecast from generated data
   */
  app.post('/api/entities/:entityId/forecasts/create-from-generated', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const user = req.session!.user as AuthUser;
    const { name, description, startDate, endDate, forecastData, scenarioType } = req.body;
    
    if (!forecastData) {
      throwBadRequest('Forecast data is required');
    }
    
    try {
      const forecast = await storage.createForecast({
        name,
        description,
        entityId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: user.id,
        aiGenerated: true,
        scenarioType: scenarioType || 'base_case',
        forecastData: forecastData
      });
      
      res.status(201).json(forecast);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
}