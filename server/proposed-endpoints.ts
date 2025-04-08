/**
 * Proposed New and Updated Journal Entry API Endpoints
 * 
 * This file contains proposed implementations for the required journal entry endpoints
 * from the roadmap, focusing on:
 * 
 * 1. Missing DELETE endpoint
 * 2. Improved validation using enhanced schemas
 * 3. Intercompany validation
 * 
 * Implementation notes:
 * - All endpoints are specifically for entity-scoped journal entries
 * - Validation uses schemas from shared/validation.ts
 * - Error handling is consistent across endpoints
 */

import { Express, Request, Response } from 'express';
import { isAuthenticated, hasRole } from './auth';
import { asyncHandler, throwNotFound, throwBadRequest } from './errorHandling';
import { 
  createJournalEntrySchema, 
  updateJournalEntrySchema,
  formatZodError
} from '../shared/validation';
import { ZodError } from 'zod';
import { AuthUser } from '../shared/types';

interface IStorage {
  journalEntry: {
    getJournalEntry: (id: number) => Promise<any>;
    getJournalEntryLines: (journalEntryId: number) => Promise<any[]>;
    createJournalEntry: (clientId: number, createdBy: number, data: any) => Promise<any>;
    createJournalEntryLine: (data: any) => Promise<any>;
    updateJournalEntry: (id: number, data: any, lines?: any[]) => Promise<any>;
    deleteJournalEntry: (id: number) => Promise<void>;
  };
}

export function registerEnhancedJournalEntryRoutes(app: Express, storage: IStorage) {
  /**
   * GET /api/entities/:entityId/journal-entries
   * List all journal entries for an entity with filtering
   */
  app.get('/api/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    if (isNaN(entityId)) {
      throwBadRequest('Invalid entity ID');
    }
    
    // Extract query parameters for filtering
    const { status, startDate, endDate } = req.query;
    
    // Build filter object
    const filters: Record<string, any> = { entityId };
    
    if (status && typeof status === 'string') {
      filters.status = status;
    }
    
    if (startDate && typeof startDate === 'string') {
      const parsedDate = new Date(startDate);
      if (!isNaN(parsedDate.getTime())) {
        filters.startDate = parsedDate;
      }
    }
    
    if (endDate && typeof endDate === 'string') {
      const parsedDate = new Date(endDate);
      if (!isNaN(parsedDate.getTime())) {
        filters.endDate = parsedDate;
      }
    }
    
    // Get journal entries with filters
    const entries = await storage.journalEntry.getJournalEntries(filters);
    
    // Load lines for each entry
    const entriesWithLines = await Promise.all(
      entries.map(async (entry) => {
        const lines = await storage.journalEntry.getJournalEntryLines(entry.id);
        return {
          ...entry,
          lines
        };
      })
    );
    
    res.json(entriesWithLines);
  }));

  /**
   * GET /api/entities/:entityId/journal-entries/:id
   * Get a specific journal entry with its lines
   */
  app.get('/api/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const id = parseInt(req.params.id);
    
    if (isNaN(entityId) || isNaN(id)) {
      throwBadRequest('Invalid ID parameters');
    }
    
    const entry = await storage.journalEntry.getJournalEntry(id);
    
    if (!entry || entry.entityId !== entityId) {
      throwNotFound('Journal Entry');
    }
    
    // Get lines and attach to journal entry
    const lines = await storage.journalEntry.getJournalEntryLines(id);
    
    res.json({
      ...entry,
      lines
    });
  }));

  /**
   * POST /api/entities/:entityId/journal-entries
   * Create a new journal entry with its lines
   * Uses enhanced validation from shared/validation.ts
   */
  app.post('/api/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const userId = (req.user as AuthUser).id;
    
    if (isNaN(entityId)) {
      throwBadRequest('Invalid entity ID');
    }
    
    try {
      // Prepare input for validation
      const validationInput = {
        ...req.body,
        entityId, // Ensure entityId from URL is used
        createdBy: userId // Add the current user as creator
      };
      
      // Validate with enhanced schema that includes:
      // 1. Field validation
      // 2. Cross-field validation (debit = credit)
      // 3. Intercompany balance validation
      const validatedData = createJournalEntrySchema.parse(validationInput);
      
      // Extract lines for separate insertion
      const { lines, ...journalEntryData } = validatedData;
      
      // Create journal entry
      const journalEntry = await storage.journalEntry.createJournalEntry(
        journalEntryData.clientId,
        journalEntryData.createdBy,
        journalEntryData
      );
      
      // Add lines to the journal entry
      if (lines && lines.length > 0) {
        for (const line of lines) {
          await storage.journalEntry.createJournalEntryLine({
            ...line,
            journalEntryId: journalEntry.id
          });
        }
      }
      
      // Get the created entry with lines
      const createdEntryWithLines = {
        ...journalEntry,
        lines: await storage.journalEntry.getJournalEntryLines(journalEntry.id)
      };
      
      res.status(201).json(createdEntryWithLines);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error',
          errors: formatZodError(error) 
        });
      }
      throw error;
    }
  }));

  /**
   * PUT /api/entities/:entityId/journal-entries/:id
   * Update a journal entry and its lines
   * Uses enhanced validation from shared/validation.ts
   */
  app.put('/api/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const userId = (req.user as AuthUser).id;
    
    if (isNaN(id) || isNaN(entityId)) {
      throwBadRequest('Invalid ID parameters');
    }
    
    // Get existing entry
    const existingEntry = await storage.journalEntry.getJournalEntry(id);
    if (!existingEntry || existingEntry.entityId !== entityId) {
      throwNotFound('Journal Entry');
    }
    
    // Only allow updates to draft entries
    if (existingEntry.status !== 'draft') {
      throwBadRequest(`Cannot update journal entry with status '${existingEntry.status}'`);
    }
    
    try {
      // Prepare input for validation
      const validationInput = {
        ...req.body,
        entityId, // Ensure entityId from URL is used
        updatedBy: userId // Add the current user as updater
      };
      
      // Validate with enhanced schema (same validation as create)
      const validatedData = updateJournalEntrySchema.parse(validationInput);
      
      // Extract lines
      const { lines, ...entryData } = validatedData;
      
      // Update the journal entry
      const updatedEntry = await storage.journalEntry.updateJournalEntry(id, {
        ...entryData,
        updatedAt: new Date()
      }, lines);
      
      // Get the updated entry with lines
      const updatedEntryWithLines = {
        ...updatedEntry,
        lines: await storage.journalEntry.getJournalEntryLines(id)
      };
      
      res.json(updatedEntryWithLines);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error',
          errors: formatZodError(error) 
        });
      }
      throw error;
    }
  }));

  /**
   * DELETE /api/entities/:entityId/journal-entries/:id
   * Delete a journal entry if it's a draft, or void it if it's posted (admin only)
   */
  app.delete('/api/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const userId = (req.user as AuthUser).id;
    const userRole = (req.user as AuthUser).role;
    
    if (isNaN(id) || isNaN(entityId)) {
      throwBadRequest('Invalid ID parameters');
    }
    
    // Get existing entry
    const existingEntry = await storage.journalEntry.getJournalEntry(id);
    if (!existingEntry || existingEntry.entityId !== entityId) {
      throwNotFound('Journal Entry');
    }
    
    // Handle based on status
    if (existingEntry.status === 'posted') {
      // Only admins can void posted entries
      if (userRole !== 'admin') {
        return res.status(403).json({ 
          message: 'Only administrators can void posted journal entries' 
        });
      }
      
      // Need a void reason for posted entries
      const { voidReason } = req.body;
      if (!voidReason) {
        throwBadRequest('Void reason is required when voiding posted journal entries');
      }
      
      // Void instead of delete
      const updatedEntry = await storage.journalEntry.updateJournalEntry(id, {
        status: 'void',
        voidedBy: userId,
        voidedAt: new Date(),
        voidReason: voidReason,
        updatedAt: new Date()
      });
      
      return res.json({
        message: 'Journal entry voided successfully',
        entry: updatedEntry
      });
    } else if (existingEntry.status === 'draft') {
      // Actually delete draft entries
      await storage.journalEntry.deleteJournalEntry(id);
      return res.json({ 
        message: 'Journal entry deleted successfully' 
      });
    } else {
      // Other statuses (pending_approval, approved, rejected, voided) can't be deleted
      throwBadRequest(`Journal entries with status '${existingEntry.status}' cannot be deleted`);
    }
  }));
}