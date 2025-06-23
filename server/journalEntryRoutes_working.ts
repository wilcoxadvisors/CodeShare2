import { Express, Request, Response } from 'express';
import { asyncHandler, throwNotFound, throwBadRequest, throwForbidden } from './errorHandling';
import { 
  insertJournalEntrySchema, 
  insertJournalEntryLineSchema,
  JournalEntryStatus
} from '../shared/schema';
import { ZodError, z } from 'zod';
import { db } from './db';
import { 
  formatZodError, 
  createJournalEntrySchema, 
  updateJournalEntrySchema,
  listJournalEntriesFiltersSchema,
  ListJournalEntriesFilters 
} from '../shared/validation';
// No longer using date-fns for date parsing
import { journalEntryStorage } from './storage/journalEntryStorage';
import { getFileStorage } from './storage/fileStorage';
import { auditLogStorage } from './storage/auditLogStorage';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import rateLimit from 'express-rate-limit';

// ARCHITECT'S SURGICAL FIX: Utility function to handle duplicate reference numbers
async function ensureUniqueReference(referenceNumber: string, entityId: number): Promise<string> {
  if (!referenceNumber) return referenceNumber;
  
  const existingEntries = await journalEntryStorage.listJournalEntries({
    entityId,
    referenceNumber,
  });
  
  if (existingEntries.length > 0) {
    const uniqueReference = `${referenceNumber}-${Date.now()}`;
    console.log(`DEBUG: Auto-generated unique reference: ${referenceNumber} -> ${uniqueReference}`);
    return uniqueReference;
  }
  
  return referenceNumber;
}

// Authentication middleware - simple check for user in session
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // If user exists in session, they're authenticated
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // If no authentication method available, reject
  res.status(401).json({ message: 'Unauthorized' });
};

// Rate limiting for journal entry operations
const journalEntryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many journal entry requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-outlook',
      'message/rfc822'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

/**
 * Register all journal entry routes with hierarchical structure
 */
export function registerJournalEntryRoutes(app: Express) {
  console.log('DEBUG: Registering hierarchical journal entry routes...');
  
  /**
   * List journal entries for a specific entity
   */
  app.get('/api/clients/:clientId/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid entity ID or client ID provided');
    }
    
    // Parse query parameters for filtering
    const { startDate, endDate, status } = req.query;
    
    const filters: ListJournalEntriesFilters = {
      entityId,
      clientId
    };
    
    // Add date filters if provided
    if (startDate && typeof startDate === 'string') {
      const startDateStr = startDate.trim();
      if (startDateStr) {
        filters.startDate = startDateStr;
      }
    }
    
    if (endDate && typeof endDate === 'string') {
      const endDateStr = endDate.trim();
      if (endDateStr) {
        filters.endDate = endDateStr;
      }
    }
    
    // Add status filter if provided
    if (status && typeof status === 'string') {
      if (['draft', 'posted', 'void'].includes(status)) {
        filters.status = status as JournalEntryStatus;
      }
    }
    
    // Get journal entries for this entity
    const entries = await journalEntryStorage.listJournalEntries(filters);
    
    res.json(entries);
  }));
  
  /**
   * Create a journal entry for a specific entity
   */
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid entity ID or client ID provided');
    }
    
    try {
      console.log('--- BACKEND ROUTE: RAW BODY ---', req.body);
      
      // Add entityId and clientId to the request body
      const requestData = {
        ...req.body,
        entityId,
        clientId,
        createdBy: user.id
      };
      
      // Validate with schema
      const validatedData = createJournalEntrySchema.parse(requestData);
      console.log('--- BACKEND ROUTE: VALIDATED DATA ---', validatedData);
      
      // Extract lines from validated data
      const { lines, ...journalEntryData } = validatedData;
      
      // ARCHITECT'S SURGICAL FIX: Auto-generate unique reference numbers instead of blocking
      if (journalEntryData.referenceNumber) {
        journalEntryData.referenceNumber = await ensureUniqueReference(
          journalEntryData.referenceNumber, 
          journalEntryData.entityId
        );
      }
      
      // Create the journal entry
      const journalEntry = await journalEntryStorage.createJournalEntry(
        journalEntryData.clientId,
        journalEntryData.createdBy,
        journalEntryData
      );
      
      // Add lines to the journal entry with dimension tags
      if (lines && lines.length > 0) {
        for (const line of lines) {
          console.log(`CREATION DEBUG: Creating line with tags:`, JSON.stringify(line.tags || [], null, 2));
          
          // Create the line without the tags property (since it's not part of the line schema)
          const { tags, ...lineData } = line;
          const createdLine = await journalEntryStorage.createJournalEntryLine({
            ...lineData,
            journalEntryId: journalEntry.id
          });
          
          // Create dimension tags for this line if they exist
          if (tags && tags.length > 0) {
            console.log(`CREATION DEBUG: Creating ${tags.length} dimension tags for line ${createdLine.id}`);
            await journalEntryStorage.createDimensionTags(createdLine.id, tags);
          } else {
            console.log(`CREATION DEBUG: No dimension tags to create for line ${createdLine.id}`);
          }
        }
      }
      
      // Fetch the complete journal entry with all related data
      const completeEntry = await journalEntryStorage.getJournalEntry(journalEntry.id);
      
      res.status(201).json(completeEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));

  /**
   * Get a specific journal entry by ID
   */
  app.get('/api/clients/:clientId/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(id) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid ID, entity ID, or client ID provided');
    }
    
    const entry = await journalEntryStorage.getJournalEntry(id);
    
    if (!entry) {
      throwNotFound(`Journal entry with ID ${id} not found`);
    }
    
    // Verify the entry belongs to the specified entity and client
    if (entry.entityId !== entityId || entry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    res.json(entry);
  }));

  /**
   * Update a journal entry
   */
  app.patch('/api/clients/:clientId/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(id) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid ID, entity ID, or client ID provided');
    }
    
    // Get existing entry to verify ownership and status
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${id} not found`);
    }
    
    // Verify the entry belongs to the specified entity and client
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    try {
      console.log('ARCHITECT_DEBUG_RAW_BODY: Raw request body:', JSON.stringify(req.body, null, 2));
      
      // Parse and validate the request body
      const updateData = updateJournalEntrySchema.parse(req.body);
      console.log('--- UPDATE REQUEST DATA ---', updateData);
      console.log('ARCHITECT_DEBUG_FILES_TO_DELETE: filesToDelete in updateData:', updateData.filesToDelete);
      console.log('ARCHITECT_DEBUG_FILES_TO_DELETE: filesToDelete in req.body:', req.body.filesToDelete);
      
      // Extract lines, files, and filesToDelete from the update data
      const { lines, files, filesToDelete, ...entryData } = updateData;
      
      // Add filesToDelete to entryData so it gets passed to the storage layer
      if (filesToDelete && Array.isArray(filesToDelete) && filesToDelete.length > 0) {
        (entryData as any).filesToDelete = filesToDelete;
        console.log('ARCHITECT_DEBUG_FILES_TO_DELETE: Added filesToDelete to entryData:', filesToDelete);
      }
      
      // ARCHITECT'S SURGICAL FIX: Auto-generate unique reference numbers instead of blocking
      if (entryData.referenceNumber && entryData.referenceNumber !== existingEntry.referenceNumber) {
        entryData.referenceNumber = await ensureUniqueReference(
          entryData.referenceNumber, 
          entityId
        );
      }
      
      // Update the journal entry with lines and files
      const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(
        id, 
        entryData, 
        lines as any[], 
        files as any[]
      );
      
      if (!updatedEntry) {
        throwNotFound(`Journal entry with ID ${id} not found after update`);
      }
      
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));

  /**
   * Delete a journal entry
   */
  app.delete('/api/clients/:clientId/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(id) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid ID, entity ID, or client ID provided');
    }
    
    // Get existing entry to verify ownership
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${id} not found`);
    }
    
    // Verify the entry belongs to the specified entity and client
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    const deleted = await journalEntryStorage.deleteJournalEntry(id);
    
    if (!deleted) {
      throwNotFound(`Journal entry with ID ${id} not found`);
    }
    
    res.status(204).send();
  }));

  /**
   * Copy a journal entry
   */
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries/:id/copy', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const originalEntryId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(originalEntryId) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid entry ID, entity ID, or client ID provided');
    }
    
    // Get existing entry to verify ownership
    const existingEntry = await journalEntryStorage.getJournalEntry(originalEntryId);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${originalEntryId} not found`);
    }
    
    // Verify the entry belongs to the specified entity and client
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    const copiedEntry = await journalEntryStorage.copyJournalEntry(originalEntryId, user.id);
    
    res.status(201).json(copiedEntry);
  }));

  /**
   * Reverse a journal entry
   */
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries/:id/reverse', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const journalEntryId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(journalEntryId) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid journal entry ID, entity ID, or client ID provided');
    }
    
    // Get existing entry to verify ownership
    const existingEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${journalEntryId} not found`);
    }
    
    // Verify the entry belongs to the specified entity and client
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    try {
      const { date, description, referenceNumber } = req.body;
      
      const reversalEntry = await journalEntryStorage.reverseJournalEntry(journalEntryId, {
        date: date ? new Date(date) : undefined,
        description: description || `Reversal of ${existingEntry.referenceNumber}`,
        createdBy: user.id,
        referenceNumber: referenceNumber
      });
      
      res.status(201).json(reversalEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));

  /**
   * Post a journal entry (change status from draft/approved to posted)
   */
  app.put('/api/clients/:clientId/entities/:entityId/journal-entries/:id/post', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };

    if (isNaN(id) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid ID, entity ID, or client ID provided');
    }

    // Get existing entry to verify ownership and status
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${id} not found`);
    }

    // Verify the entry belongs to the specified entity and client
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }

    // Only allow posting of draft or approved entries
    if (existingEntry.status !== 'draft' && existingEntry.status !== 'approved') {
      throwBadRequest(`Cannot post journal entry with status '${existingEntry.status}'. Only draft or approved entries can be posted.`);
    }

    try {
      console.log(`POST ENDPOINT: Attempting to post journal entry ${id} by user ${user.id}`);
      
      // Post the journal entry using the storage method
      const postedEntry = await journalEntryStorage.postJournalEntry(id, user.id);
      
      if (!postedEntry) {
        throw new ApiError(500, `Failed to post journal entry ${id}`);
      }
      
      console.log(`POST ENDPOINT: Successfully posted journal entry ${id} by user ${user.id}`);
      
      // Return the updated entry in the same format as other endpoints
      res.json(postedEntry);
    } catch (error) {
      console.error('POST ENDPOINT: Error posting journal entry:', error);
      
      // Ensure proper error response format
      if (error instanceof ApiError) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error during journal entry posting' });
      }
    }
  }));

  console.log('✅ Hierarchical journal entry routes registered');
}