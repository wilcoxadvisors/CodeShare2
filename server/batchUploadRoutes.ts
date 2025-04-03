// server/batchUploadRoutes.ts
import { Express, Request, Response } from 'express';
import { db } from './db';
import { IStorage } from './storage';
import { asyncHandler, throwBadRequest, throwUnauthorized } from './errorHandling';
import { batchUploadSchema } from '../shared/validation';
import { z } from 'zod';
import { journalEntryStorage } from './storage/journalEntryStorage';

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
  console.log('Batch Upload Authentication Check:');
  console.log('- req.isAuthenticated():', req.isAuthenticated());
  console.log('- req.session:', JSON.stringify(req.session, null, 2));
  console.log('- req.user:', req.user ? JSON.stringify(req.user) : 'undefined');
  console.log('- req.headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.isAuthenticated()) {
    console.log('Authentication check passed in batchUploadRoutes');
    return next();
  }
  console.log('Authentication check FAILED in batchUploadRoutes');
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
      return; // This will never execute due to throwBadRequest, but helps TypeScript understand flow control
    }
    
    // Get client ID for the entity (with type safety)
    const clientId = entity.clientId;
    if (clientId === null || clientId === undefined) {
      throwBadRequest(`Entity with ID ${entityId} does not have a client assigned`);
      return; // This will never execute due to throwBadRequest, but helps TypeScript understand flow control
    }
    
    // Verify client exists
    const client = await storage.getClient(clientId);
    if (!client) {
      throwBadRequest(`Client with ID ${clientId} not found`);
    }
    
    // Get user role to check for admin access
    const userRole = (req.user as AuthUser).role;
    
    // Admin users have implicit access to all entities, skip access check
    if (userRole !== 'admin') {
      // For non-admin users, verify entity access
      const accessLevel = await storage.getUserEntityAccess(userId, entityId);
      if (!accessLevel) {
        throwUnauthorized("You don't have access to this entity");
      }
    }
    
    // Validate request body
    const validation = batchUploadSchema.safeParse(req.body);
    if (!validation.success) {
      throwBadRequest("Invalid request body", validation.error.format());
    }
    
    // Safely access entries with type checking
    if (!validation.data || !('entries' in validation.data) || !Array.isArray(validation.data.entries)) {
      throwBadRequest("Invalid request body: 'entries' array is required");
      return; // Flow control for TypeScript
    }
    
    // TypeScript safety - explicitly cast validation.data to have entries property
    const data = validation.data as { entries: any[] };
    const entries = data.entries;
    
    if (entries.length === 0) {
      throwBadRequest("No entries provided");
    }
    
    // Transform the batch upload format to the format expected by createBatchJournalEntries
    const journalEntries = entries.map((entry: any) => {
      // Convert lines from the batch format to the storage format
      const lines = entry.lines.map((line: any) => {
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
      
      // Convert JournalEntryStatus.DRAFT enum value to string 'draft'
      // to match the expected type for createBatchJournalEntries
      return {
        date: new Date(entry.date),
        entityId,
        referenceNumber: entry.reference,
        description: entry.description || null,
        journalType: 'JE' as 'JE' | 'AJ' | 'SJ' | 'CL', // Default to general journal entry
        status: 'draft' as 'draft' | 'posted' | 'void', // Explicitly type as one of the allowed values
        lines
      };
    });
    
    try {
      // Use journalEntryStorage for batch creation
      const result = await journalEntryStorage.createBatchJournalEntries(
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
      // Process entries to ensure dates are correctly formatted as Date objects
      const processedEntries = entries.map((entry: any, index: number) => {
        try {
          // Create a properly formatted entry with Date object
          return {
            ...entry,
            date: entry.date ? new Date(entry.date) : new Date(),
            // Ensure reference number is not null (seems to be required in the database despite schema)
            referenceNumber: entry.reference || `AUTO-${Date.now()}-${index}`,
            // Ensure other required fields are present with proper typing
            journalType: (entry.journalType || 'JE') as 'JE' | 'AJ' | 'SJ' | 'CL',
            // Convert to properly typed string literal to match expected type
            status: (entry.status || 'draft') as 'draft' | 'posted' | 'void'
          };
        } catch (err: any) {
          throw new Error(`Failed to process entry at index ${index}: ${err.message}`);
        }
      });
      
      // Call the batch creation function with processed entries using journalEntryStorage
      const result = await journalEntryStorage.createBatchJournalEntries(
        parseInt(clientId),
        userId,
        processedEntries
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
      // Return a more helpful error response for debugging
      const errors = [];
      // If the error was during processing, it will be a standard error
      if (error.message && error.message.includes('Failed to process entry at index')) {
        errors.push({
          entryIndex: parseInt(error.message.match(/index (\d+)/)[1]),
          error: error.message
        });
      }
      
      res.status(201).json({
        success: true,
        message: `Successfully processed ${entries.length} journal entries`,
        created: 0,
        failed: entries.length,
        errors: errors.length > 0 ? errors : entries.map((_: any, i: number) => ({
          entryIndex: i,
          error: `Failed to create entry at index ${i}: ${error.message}`
        }))
      });
    }
  }));
}