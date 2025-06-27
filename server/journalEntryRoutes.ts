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
import { multerMiddleware } from './middleware/multer';
import { BatchParsingService } from './services/BatchParsingService';
import { BatchValidationService } from './services/BatchValidationService';
import { AIAssistanceService } from './services/AIAssistanceService';
import { BatchProcessingService } from './services/BatchProcessingService';
import { authenticateUser } from './authMiddleware';

// ARCHITECT'S SURGICAL FIX: Utility function to handle duplicate reference numbers
async function ensureUniqueReference(referenceNumber: string, entityId: number, excludeEntryId?: number): Promise<string> {
  if (!referenceNumber) return referenceNumber;
  
  const existingEntries = await journalEntryStorage.listJournalEntries({
    entityId,
    referenceNumber,
  });
  
  // Filter out the current entry being edited
  const conflictingEntries = excludeEntryId 
    ? existingEntries.filter(entry => entry.id !== excludeEntryId)
    : existingEntries;
  
  if (conflictingEntries.length > 0) {
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
    
    if (status && typeof status === 'string' && ['draft', 'posted', 'voided', 'pending_approval', 'approved', 'rejected'].includes(status)) {
      filters.status = status as ('draft' | 'posted' | 'pending_approval' | 'approved' | 'rejected' | 'voided');
    }
    
    const entries = await journalEntryStorage.listJournalEntries(filters);
    res.json(entries);
  }));
  
  // Batch analyze uploaded Excel file for journal entries
  app.post('/api/clients/:clientId/journal-entries/batch-analyze', authenticateUser, multerMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId, 10);

      // 1. Validate that a file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded. Please select a file to analyze.',
          },
        });
      }

      // 2. Parse and validate form data from the request
      const formData = {
        importMode: req.body.importMode || 'standard',
        description: req.body.description || '',
        referenceSuffix: req.body.referenceSuffix || '',
        batchDate: req.body.batchDate || new Date().toISOString().split('T')[0],
        isAccrual: req.body.isAccrual === 'true' || req.body.isAccrual === true, // Handle string to boolean conversion
        reversalDate: req.body.reversalDate || ''
      };

      // 3. Validate required fields
      if (!formData.batchDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORM_DATA',
            message: 'Batch date is required.',
          },
        });
      }

      // 4. Validate import mode
      if (!['standard', 'historical'].includes(formData.importMode)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IMPORT_MODE',
            message: 'Import mode must be either "standard" or "historical".',
          },
        });
      }

      // 5. Validate accrual settings
      if (formData.isAccrual && !formData.reversalDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REVERSAL_DATE',
            message: 'Reversal date is required when auto-reversing accrual is enabled.',
          },
        });
      }

      console.log(`ARCHITECT_DEBUG: Starting batch analysis for client ${clientId}, file: ${req.file.originalname}`);
      console.log(`ARCHITECT_DEBUG: Form data received:`, formData);

      // Phase 1 Complete Implementation: Smart Parser + Validation + AI Analysis
      const parsingService = new BatchParsingService();
      const validationService = new BatchValidationService();
      const aiService = new AIAssistanceService();

      // 6. Pass the file buffer to the parser with configuration
      const parsedData = await parsingService.parse(req.file.buffer, formData);

      // 7. Pass the parsed data to the validator with configuration
      const validationResult = await validationService.validate(parsedData, clientId, formData);

      // 4. Get AI suggestions for all valid entry groups
      console.log('ARCHITECT_DEBUG: Getting AI suggestions for validated entry groups');
      const aiSuggestions = await aiService.getSuggestions(validationResult.entryGroups);

      // 5. Integrate AI suggestions into the response
      const enrichedEntryGroups = validationResult.entryGroups.map(group => ({
        ...group,
        aiSuggestions: Array.from(aiSuggestions.entries())
          .filter(([rowNumber, suggestions]) => 
            group.lines.some(line => line.originalRow === rowNumber)
          )
          .reduce((acc, [rowNumber, suggestions]) => {
            acc[rowNumber] = suggestions;
            return acc;
          }, {} as Record<number, any[]>)
      }));

      const enrichedResult = {
        ...validationResult,
        entryGroups: enrichedEntryGroups,
        aiAnalysisSummary: {
          totalSuggestions: Array.from(aiSuggestions.values()).flat().filter(s => s.type === 'SUGGESTION').length,
          totalAnomalies: Array.from(aiSuggestions.values()).flat().filter(s => s.type === 'ANOMALY').length
        },
        configurationData: formData // Include the validated configuration data for frontend use
      };

      // 6. Format the final enriched response with AI analysis
      return res.status(200).json({
        success: true,
        data: enrichedResult, // Send the complete analysis with AI suggestions back to the client
      });

    } catch (error: any) {
      console.error("Batch Analysis Error:", error);

      // Handle specific file type errors from Multer
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FILE_TYPE', message: error.message },
        });
      }

      // Generic internal server error for all other issues
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during file analysis.',
        },
      });
    }
  }));

  // Dynamic template generation endpoint
  app.get('/api/clients/:clientId/journal-entries/batch-template', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId, 10);
      const mode = req.query.mode as 'standard' | 'historical'; // Mode is passed as a query param

      if (!mode) {
        return res.status(400).json({ error: 'Import mode is required.' });
      }

      // Import the template service at the top of the file
      const { BatchTemplateService } = await import('./services/BatchTemplateService');
      
      // Import the storage modules
      const { accountStorage } = await import('./storage/accountStorage');
      const { dimensionStorage } = await import('./storage/dimensionStorage');

      // 1. Fetch all necessary data for the reference sheets
      const accounts = await accountStorage.getAccounts(clientId);
      const dimensions = await dimensionStorage.getDimensionsByClient(clientId);

      // 2. Generate the Excel file buffer using a dedicated service
      const templateService = new BatchTemplateService();
      const fileBuffer = templateService.generateTemplate({ mode, accounts, dimensions });

      const fileName = `Wilcox_JE_Template_${mode}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // 3. Set headers and stream the file to the user for download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(fileBuffer);

    } catch (error: any) {
      console.error("Template Generation Error:", error);
      res.status(500).json({ error: 'Failed to generate template.' });
    }
  }));

  // Batch process approved journal entries
  app.post('/api/clients/:clientId/journal-entries/batch-process', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId, 10);
      const { approvedEntries, entityId, batchSettings } = req.body;

      if (!approvedEntries || !entityId || approvedEntries.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Missing required fields: approvedEntries, entityId'
          }
        });
      }

      console.log(`ARCHITECT_DEBUG: Starting batch processing for client ${clientId}, entity ${entityId}, ${approvedEntries.length} entries`);

      const processingService = new BatchProcessingService();
      const result = await processingService.processBatch(approvedEntries, clientId, entityId, batchSettings);

      if (!result) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: 'Failed to process batch entries.'
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: `Successfully created ${result.createdCount} journal entries.`,
        data: {
          createdCount: result.createdCount,
          createdEntryIds: result.createdEntryIds
        },
      });

    } catch (error: any) {
      console.error("Batch Processing Error:", error);
      return res.status(500).json({ 
        success: false, 
        error: {
          code: 'PROCESSING_FAILED',
          message: 'An error occurred while processing the batch entries.'
        }
      });
    }
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
            accountId: typeof lineData.accountId === 'string' ? parseInt(lineData.accountId) : lineData.accountId,
            amount: typeof lineData.amount === 'number' ? lineData.amount.toString() : lineData.amount,
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
      return; // This ensures TypeScript knows entry is not undefined after this point
    }
    
    if (entry.entityId !== entityId || entry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
      return;
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
      return;
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
      return;
    }
    
    try {
      const updateData = updateJournalEntrySchema.parse(req.body);
      console.log('--- UPDATE REQUEST DATA ---', updateData);
      
      const { lines, files, ...entryData } = updateData;
      
      // ARCHITECT'S SURGICAL FIX: Auto-generate unique reference numbers instead of blocking
      if (entryData.referenceNumber && entryData.referenceNumber !== existingEntry.referenceNumber) {
        entryData.referenceNumber = await ensureUniqueReference(
          entryData.referenceNumber, 
          entityId,
          id // Exclude current entry from duplicate check
        );
      }
      
      // Clean entityId to ensure it's not null - explicitly cast to number
      const cleanedEntryData = {
        ...entryData,
        entityId: (entryData.entityId || existingEntry.entityId) as number
      };
      
      const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(
        id, 
        cleanedEntryData, 
        lines as any[], 
        files as any[]
      );
      
      if (!updatedEntry) {
        throwNotFound(`Journal entry with ID ${id} not found after update`);
        return;
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
      return;
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
      return;
    }
    
    const copiedEntry = await journalEntryStorage.copyJournalEntry(originalEntryId, user.id);
    res.status(201).json(copiedEntry);
  }));

  // Delete a journal entry
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
      return;
    }
    
    // Verify the entry belongs to the specified entity and client
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
      return;
    }
    
    const deleted = await journalEntryStorage.deleteJournalEntry(id);
    
    if (!deleted) {
      throwNotFound(`Journal entry with ID ${id} not found`);
      return;
    }
    
    res.status(204).send();
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
      return;
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
      return;
    }
    
    if (existingEntry.status !== 'posted') {
      throwBadRequest('Only posted journal entries can be voided');
      return;
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
      return;
    }
    
    if (existingEntry.entityId !== entityId || existingEntry.clientId !== clientId) {
      throwForbidden('Journal entry does not belong to the specified entity or client');
      return;
    }
    
    try {
      const { date, description, referenceNumber } = req.body;
      
      const reversalEntry = await journalEntryStorage.reverseJournalEntry(journalEntryId, {
        date: date ? new Date(date) : undefined,
        description: description || `Reversal of ${existingEntry?.referenceNumber || 'Unknown'}`,
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

  // Add file download route (Fixes issue #17)
  app.get('/api/clients/:clientId/entities/:entityId/journal-entries/:journalEntryId/files/:fileId/download', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const fileId = parseInt(req.params.fileId);
    const fileInfo = await journalEntryStorage.getJournalEntryFile(fileId);
    if (!fileInfo || !fileInfo.storageKey) {
      throwNotFound('File not found');
      return;
    }
    const fileData = await journalEntryStorage.getJournalEntryFileData(fileInfo.storageKey);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileInfo.filename}"`);
    res.send(fileData);
  }));

  console.log('✅ Hierarchical journal entry routes registered');
}
