// server/batchUploadRoutes.ts
import { Express, Request, Response } from 'express';
import { db } from './db';
import { IStorage } from './storage';
import { asyncHandler, throwBadRequest, throwUnauthorized } from './errorHandling';
import { JournalEntryStatus } from '../shared/schema';
import { batchUploadSchema } from '../shared/validation';
import { z } from 'zod';

type BatchUploadRequest = z.infer<typeof batchUploadSchema>;

// Interface for authentication middleware
interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // Use Passport's isAuthenticated method
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export function registerBatchUploadRoutes(app: Express, storage: IStorage) {
  /**
   * Batch create journal entries
   * Optimized for performance with larger datasets
   */
  app.post('/api/entities/:entityId/journal-entries/batch', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const userId = (req.user as AuthUser).id;
    
    // Get entity to validate existence and user access
    const entity = await storage.getEntity(entityId);
    if (!entity) {
      throwBadRequest(`Entity with ID ${entityId} not found`);
    }
    
    // Get client ID for the entity
    const client = await storage.getClient(entity.clientId);
    if (!client) {
      throwBadRequest(`Client with ID ${entity.clientId} not found`);
    }
    const clientId = client.id;
    
    // Verify user has access to this entity
    const accessLevel = await storage.getUserEntityAccess(userId, entityId);
    if (!accessLevel) {
      throwUnauthorized("You don't have access to this entity");
    }
    
    // Validate request body
    const validation = batchUploadSchema.safeParse(req.body);
    if (!validation.success) {
      throwBadRequest("Invalid request body", validation.error.format());
    }
    
    // Safely access entries with type checking
    if (!validation.data || !('entries' in validation.data) || !Array.isArray(validation.data.entries)) {
      throwBadRequest("Invalid request body: 'entries' array is required");
    }
    
    const { entries } = validation.data;
    
    if (entries.length === 0) {
      throwBadRequest("No entries provided");
    }
    
    // Transform the batch upload format to the format expected by createBatchJournalEntries
    const journalEntries = entries.map(entry => {
      // Convert lines from the batch format to the storage format
      const lines = entry.lines.map(line => {
        // Convert from debit/credit string fields to type/amount fields
        let type: 'debit' | 'credit' = 'debit';
        let amount = '0';
        
        // Parse the debit and credit values, defaulting to 0 if empty or invalid
        const debitValue = parseFloat(line.debit || '0') || 0;
        const creditValue = parseFloat(line.credit || '0') || 0;
        
        // Determine type and amount based on which is greater (debit or credit)
        if (debitValue > 0 && creditValue === 0) {
          type = 'debit';
          amount = line.debit;
        } else if (creditValue > 0 && debitValue === 0) {
          type = 'credit';
          amount = line.credit;
        } else if (debitValue > creditValue) {
          type = 'debit';
          amount = line.debit;
        } else {
          type = 'credit';
          amount = line.credit;
        }
        
        return {
          accountId: line.accountId,
          description: line.description || null,
          type,
          amount
        };
      });
      
      return {
        date: new Date(entry.date),
        entityId,
        referenceNumber: entry.reference,
        description: entry.description || null,
        journalType: 'JE', // Default to general journal entry
        status: JournalEntryStatus.DRAFT,
        lines
      };
    });
    
    try {
      // Use the new batch creation method
      const result = await storage.createBatchJournalEntries(
        clientId,
        userId,
        journalEntries
      );
      
      // Log activity
      if (result.successCount > 0) {
        await storage.logUserActivity({
          userId,
          entityId,
          action: 'batch_create',
          resourceType: 'journal_entry',
          resourceId: null,
          details: `Batch created ${result.successCount} journal entries`
        });
      }
      
      // Return results
      res.status(201).json({
        success: true,
        message: `Successfully processed ${entries.length} journal entries`,
        created: result.successCount,
        failed: result.errors.length,
        errors: result.errors.map(error => ({
          entryIndex: error.entryIndex,
          message: error.error
        }))
      });
    } catch (error: any) {
      throwBadRequest(
        `Failed to process batch of journal entries: ${error.message}`,
        { error: error.message }
      );
    }
  }));
  
  /**
   * Add an alternative API endpoint for flexibility
   */
  app.post('/api/journal-entries/batch', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as AuthUser).id;
    
    // Extract the client ID from the request body
    const { clientId, entries } = req.body;
    
    if (!clientId || !Number.isInteger(parseInt(clientId))) {
      throwBadRequest("clientId is required and must be an integer");
    }
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      throwBadRequest("entries array is required and must not be empty");
    }
    
    try {
      // Direct access to the batch creation function
      const result = await storage.createBatchJournalEntries(
        parseInt(clientId),
        userId,
        entries
      );
      
      // Return results
      res.status(201).json({
        success: true,
        message: `Successfully processed ${entries.length} journal entries`,
        created: result.successCount,
        failed: result.errors.length,
        errors: result.errors
      });
    } catch (error: any) {
      throwBadRequest(
        `Failed to process batch of journal entries: ${error.message}`,
        { error: error.message }
      );
    }
  }));
}