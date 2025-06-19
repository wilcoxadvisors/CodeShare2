import { Express, Request, Response } from 'express';
import { asyncHandler, throwNotFound, throwBadRequest, throwForbidden } from './errorHandling';
import { 
  insertJournalEntrySchema, 
  insertJournalEntryLineSchema,
  JournalEntryStatus
} from '../shared/schema';
import { ZodError, z } from 'zod';
import { 
  formatZodError, 
  createJournalEntrySchema, 
  updateJournalEntrySchema,
  listJournalEntriesFiltersSchema,
  ListJournalEntriesFilters 
} from '../shared/validation';
import { journalEntryStorage } from './storage/journalEntryStorage';

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

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

/**
 * Register all journal entry routes with hierarchical structure
 */
export function registerJournalEntryRoutes(app: Express) {
  console.log('DEBUG: Registering hierarchical journal entry routes...');
  
  // List journal entries for a specific entity
  app.get('/api/clients/:clientId/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid entity ID or client ID provided');
    }
    
    const { startDate, endDate, status } = req.query;
    const filters: ListJournalEntriesFilters = {
      entityId,
      clientId
    };
    
    if (startDate && typeof startDate === 'string') {
      const startDateStr = startDate.trim();
      if (startDateStr) filters.startDate = startDateStr;
    }
    
    if (endDate && typeof endDate === 'string') {
      const endDateStr = endDate.trim();
      if (endDateStr) filters.endDate = endDateStr;
    }
    
    if (status && typeof status === 'string' && ['draft', 'posted', 'void'].includes(status)) {
      filters.status = status as JournalEntryStatus;
    }
    
    const entries = await journalEntryStorage.listJournalEntries(filters);
    res.json(entries);
  }));
  
  // Create a journal entry for a specific entity
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid entity ID or client ID provided');
    }
    
    try {
      console.log('--- BACKEND ROUTE: RAW BODY ---', req.body);
      
      const requestData = {
        ...req.body,
        entityId,
        clientId,
        createdBy: user.id
      };
      
      const validatedData = createJournalEntrySchema.parse(requestData);
      console.log('--- BACKEND ROUTE: VALIDATED DATA ---', validatedData);
      
      const { lines, ...journalEntryData } = validatedData;
      
      // ARCHITECT'S SURGICAL FIX: Auto-generate unique reference numbers instead of blocking
      if (journalEntryData.referenceNumber) {
        journalEntryData.referenceNumber = await ensureUniqueReference(
          journalEntryData.referenceNumber, 
          journalEntryData.entityId
        );
      }
      
      const journalEntry = await journalEntryStorage.createJournalEntry(
        journalEntryData.clientId,
        journalEntryData.createdBy,
        journalEntryData
      );
      
      if (lines && lines.length > 0) {
        for (const line of lines) {
          console.log(`CREATION DEBUG: Creating line with tags:`, JSON.stringify(line.tags || [], null, 2));
          
          const { tags, ...lineData } = line;
          const createdLine = await journalEntryStorage.createJournalEntryLine({
            ...lineData,
            journalEntryId: journalEntry.id
          });
          
          if (tags && tags.length > 0) {
            console.log(`CREATION DEBUG: Creating ${tags.length} dimension tags for line ${createdLine.id}`);
            await journalEntryStorage.createDimensionTags(createdLine.id, tags);
          } else {
            console.log(`CREATION DEBUG: No dimension tags to create for line ${createdLine.id}`);
          }
        }
      }
      
      const completeEntry = await journalEntryStorage.getJournalEntry(journalEntry.id);
      res.status(201).json(completeEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));

  // Get a specific journal entry by ID
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
    
    if (entry.entityId !== entityId || entry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    res.json(entry);
  }));

  // Update a journal entry
  app.patch('/api/clients/:clientId/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(id) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid ID, entity ID, or client ID provided');
    }
    
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${id} not found`);
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    try {
      const updateData = updateJournalEntrySchema.parse(req.body);
      console.log('--- UPDATE REQUEST DATA ---', updateData);
      
      const { lines, files, ...entryData } = updateData;
      
      // ARCHITECT'S SURGICAL FIX: Auto-generate unique reference numbers instead of blocking
      if (entryData.referenceNumber && entryData.referenceNumber !== existingEntry.referenceNumber) {
        entryData.referenceNumber = await ensureUniqueReference(
          entryData.referenceNumber, 
          entityId
        );
      }
      
      const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(
        id, 
        entryData, 
        lines as any[], 
        files as any[]
      );
      
      if (!updatedEntry) {
        throwNotFound(`Journal entry with ID ${id} not found after update`);
      }
      
      // ARCHITECT'S AUTOMATIC ACCRUAL REVERSAL FIX: Create reversal entry when posting accrual entries
      if (entryData.status === 'posted' && existingEntry.status !== 'posted' && 
          updatedEntry.isAccrual && updatedEntry.reversalDate) {
        console.log(`ARCHITECT_ACCRUAL_REVERSAL: Creating automatic reversal for accrual entry ${id}`);
        try {
          const reversalEntry = await journalEntryStorage.reverseJournalEntry(id, {
            date: new Date(updatedEntry.reversalDate),
            description: `Automatic reversal of ${updatedEntry.referenceNumber}`,
            createdBy: (req.user as { id: number }).id,
            postAutomatically: true
          });
          
          if (reversalEntry) {
            console.log(`ARCHITECT_ACCRUAL_REVERSAL: Successfully created and posted reversal entry ${reversalEntry.id} for accrual ${id}`);
          }
        } catch (error) {
          console.error(`ARCHITECT_ACCRUAL_REVERSAL: Failed to create reversal for accrual entry ${id}:`, error);
          // Don't fail the main operation if reversal creation fails
        }
      }
      
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));

  // Copy a journal entry
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries/:id/copy', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const originalEntryId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(originalEntryId) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid entry ID, entity ID, or client ID provided');
    }
    
    const existingEntry = await journalEntryStorage.getJournalEntry(originalEntryId);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${originalEntryId} not found`);
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    const copiedEntry = await journalEntryStorage.copyJournalEntry(originalEntryId, user.id);
    res.status(201).json(copiedEntry);
  }));

  // Void a journal entry
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries/:id/void', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const journalEntryId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(journalEntryId) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid journal entry ID, entity ID, or client ID provided');
    }
    
    const existingEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${journalEntryId} not found`);
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
    }
    
    if (existingEntry.status !== 'posted') {
      throwBadRequest('Only posted journal entries can be voided');
    }
    
    try {
      const { voidReason } = req.body;
      
      const voidedEntry = await journalEntryStorage.updateJournalEntry(journalEntryId, {
        status: 'void',
        description: existingEntry.description + (voidReason ? ` [VOIDED: ${voidReason}]` : ' [VOIDED]'),
        updatedAt: new Date()
      });
      
      res.json(voidedEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));

  // Reverse a journal entry
  app.post('/api/clients/:clientId/entities/:entityId/journal-entries/:id/reverse', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const journalEntryId = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const clientId = parseInt(req.params.clientId);
    const user = req.user as { id: number };
    
    if (isNaN(journalEntryId) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid journal entry ID, entity ID, or client ID provided');
    }
    
    const existingEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    if (!existingEntry) {
      throwNotFound(`Journal entry with ID ${journalEntryId} not found`);
    }
    
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

  console.log('✅ Hierarchical journal entry routes registered');
}
