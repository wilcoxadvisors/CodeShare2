import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import { asyncHandler, throwNotFound, throwBadRequest } from './errorHandling';
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

// Authentication middleware - simple check for user in session
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // If user exists in session, they're authenticated
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // No authenticated user
  return res.status(401).json({ message: "Unauthorized" });
};

/**
 * Register journal entry routes
 */
export function registerJournalEntryRoutes(app: Express, storage: IStorage) {
  /**
   * Create a journal entry with lines
   */
  app.post('/api/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Validate that we have a user object and a valid user ID
    if (!req.user || typeof (req.user as any).id !== 'number') {
      console.error('User ID not found in request object for journal entry creation');
      return res.status(500).json({ message: 'Authentication error: User ID not found.' });
    }
    
    const user = req.user as { id: number };
    
    try {
      console.log('DETAILED DEBUGGING - CREATE JOURNAL ENTRY');
      console.log('Request body: ', JSON.stringify(req.body));
      console.log('Request headers: ', JSON.stringify(req.headers));
      console.log('User ID from session: ', user.id);
      
      if (req.body.lines) {
        console.log('Input lines before validation: ', JSON.stringify(req.body.lines));
        console.log('Lines is Array?', Array.isArray(req.body.lines));
        console.log('Lines count:', req.body.lines.length);
        if (req.body.lines.length > 0) {
          console.log('First line structure:', JSON.stringify(req.body.lines[0]));
        }
      } else {
        console.log('Warning: No lines in request body');
      }
      
      // Use createJournalEntrySchema to validate the entire payload with cross-field validation
      // Explicitly include createdBy field to ensure it's set
      const validationInput = {
        ...req.body,
        createdBy: user.id
      };
      console.log('Validation input:', JSON.stringify(validationInput));
      
      const validatedData = createJournalEntrySchema.parse(validationInput);
      console.log('Validation successful. Validated data: ', JSON.stringify(validatedData));
      
      // Double check that createdBy is set
      if (!validatedData.createdBy) {
        console.log('Error: createdBy missing after validation');
        return res.status(400).json({ message: "Creator ID is required" });
      }
      
      // Extract main entry data and lines
      const { lines, ...journalEntryData } = validatedData;
      
      console.log('Journal entry data: ', JSON.stringify(journalEntryData));
      console.log('Lines data after extraction: ', JSON.stringify(lines));
      console.log('Lines array type:', Array.isArray(lines));
      console.log('Lines array length:', Array.isArray(lines) ? lines.length : 'Not array');
      
      if (!lines || lines.length === 0) {
        console.log('ERROR: Lines array is empty or null after validation');
        return res.status(400).json({ message: "Journal entry must have at least one line" });
      }
      
      // Create journal entry with lines
      console.log('Calling storage.createJournalEntry with clientId:', journalEntryData.clientId);
      console.log('Calling storage.createJournalEntry with createdById:', journalEntryData.createdBy);
      
      const journalEntry = await storage.createJournalEntry(
        journalEntryData.clientId,
        journalEntryData.createdBy,
        journalEntryData, 
        lines || [] // Ensure we always pass an array, even if empty
      );
      
      console.log('Journal entry created successfully:', JSON.stringify(journalEntry));
      res.status(201).json(journalEntry);
    } catch (error) {
      console.error('ERROR in journal entry creation:', error);
      if (error instanceof ZodError) {
        console.error('Validation error details:', JSON.stringify(error.errors));
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Get all journal entries with filtering
   */
  app.get('/api/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      // Simply pass the raw query parameters to the Zod schema
      // The schema itself will handle the string-to-number conversions
      const validatedParams = listJournalEntriesFiltersSchema.parse(req.query);
      
      // Pass the validated parameters to the storage function
      const entries = await storage.listJournalEntries(validatedParams);
      
      res.json(entries);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Get a specific journal entry with its lines
   */
  app.get('/api/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    const journalEntry = await storage.getJournalEntry(id);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    res.json(journalEntry);
  }));
  
  /**
   * Update a journal entry
   */
  app.put('/api/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.user as { id: number };
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await storage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent updates to posted or void entries
    if (existingEntry.status === 'posted' || existingEntry.status === 'void') {
      throwBadRequest(`Cannot update a journal entry with status '${existingEntry.status}'`);
    }
    
    try {
      // Validate update data with schema including balance check
      const validatedData = updateJournalEntrySchema.parse({
        ...req.body,
        updatedBy: user.id
      });
      
      // Extract lines from validated data
      const { lines, ...entryData } = validatedData;
      
      // Update the journal entry
      const updatedEntry = await storage.updateJournalEntry(id, entryData, lines);
      
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Delete or void a journal entry
   */
  app.delete('/api/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.user as { id: number };
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await storage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // If entry is posted, change status to void instead of actually deleting
    if (existingEntry.status === 'posted') {
      const voidedEntry = await storage.updateJournalEntry(id, { 
        status: 'void' as any,  // TODO: Fix type casting here once schema is updated
        rejectedBy: user.id,
        rejectedAt: new Date(),
        rejectionReason: req.body.reason || 'Voided by user'
      }, existingEntry.lines);
      
      return res.json({ 
        message: 'Journal entry voided successfully', 
        entry: voidedEntry 
      });
    }
    
    // If draft, perform actual deletion
    await storage.deleteJournalEntry(id);
    
    res.json({ message: 'Journal entry deleted successfully' });
  }));
  
  /**
   * Post a journal entry (change status from draft to posted)
   */
  app.post('/api/journal-entries/:id/post', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.user as { id: number };
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await storage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent posting an already posted or voided entry
    if (existingEntry.status !== 'draft') {
      throwBadRequest(`Cannot post a journal entry with status '${existingEntry.status}'`);
    }
    
    // Update the status to posted
    const postedEntry = await storage.updateJournalEntry(id, {
      status: 'posted' as any, // TODO: Fix type casting here once schema is updated
      postedBy: user.id,
      postedAt: new Date()
    }, existingEntry.lines);
    
    res.json({
      message: 'Journal entry posted successfully',
      entry: postedEntry
    });
  }));
  
  /**
   * Add a line to a journal entry
   */
  app.post('/api/journal-entries/:id/lines', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const journalEntryId = parseInt(req.params.id);
    
    if (isNaN(journalEntryId)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await storage.getJournalEntry(journalEntryId);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent modifications to posted or void entries
    if (existingEntry.status === 'posted' || existingEntry.status === 'void') {
      throwBadRequest(`Cannot modify a journal entry with status '${existingEntry.status}'`);
    }
    
    try {
      // Define the validation schema for a new line
      const addLineSchema = z.object({
        accountId: z.number({
          required_error: "Account ID is required"
        }),
        type: z.enum(['debit', 'credit'], {
          required_error: "Line type must be either 'debit' or 'credit'"
        }),
        amount: z.string({
          required_error: "Amount is required"
        }).refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: "Amount must be a positive number"
        }),
        description: z.string().nullable().optional(),
        locationId: z.number().nullable().optional(),
        fsliBucket: z.string().nullable().optional(),
        internalReportingBucket: z.string().nullable().optional(),
        itemId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        departmentId: z.number().nullable().optional(),
        reconciled: z.boolean().nullable().optional(),
        reconciledBy: z.number().nullable().optional(),
      });
      
      // Parse and validate line data
      const validatedLineData = addLineSchema.parse(req.body);
      
      // Add journalEntryId to the validated data
      const lineData = {
        ...validatedLineData,
        journalEntryId
      };
      
      // Add the new line
      const newLine = await storage.addJournalEntryLine(lineData);
      
      // Check if the journal entry is still balanced
      const updatedEntry = await storage.getJournalEntry(journalEntryId);
      
      if (!updatedEntry) {
        throw new Error('Failed to retrieve updated journal entry');
      }
      
      let totalDebits = 0;
      let totalCredits = 0;
      
      updatedEntry.lines.forEach(line => {
        if (line.type === 'debit') {
          totalDebits += parseFloat(line.amount);
        } else {
          totalCredits += parseFloat(line.amount);
        }
      });
      
      const epsilon = 0.001;
      const balanced = Math.abs(totalDebits - totalCredits) <= epsilon;
      
      res.status(201).json({
        line: newLine,
        balanced,
        totalDebits,
        totalCredits
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Update a specific journal entry line
   */
  app.put('/api/journal-entries/:entryId/lines/:lineId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entryId = parseInt(req.params.entryId);
    const lineId = parseInt(req.params.lineId);
    
    if (isNaN(entryId) || isNaN(lineId)) {
      throwBadRequest('Invalid journal entry ID or line ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await storage.getJournalEntry(entryId);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent modifications to posted or void entries
    if (existingEntry.status === 'posted' || existingEntry.status === 'void') {
      throwBadRequest(`Cannot modify a journal entry with status '${existingEntry.status}'`);
    }
    
    try {
      // Define validation schema for updating a line
      const updateLineSchema = z.object({
        accountId: z.number().int().positive().optional(),
        type: z.enum(['debit', 'credit']).optional(),
        amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
          message: "Amount must be a positive number"
        }).optional(),
        description: z.string().nullable().optional(),
        locationId: z.number().nullable().optional(),
        fsliBucket: z.string().nullable().optional(),
        internalReportingBucket: z.string().nullable().optional(),
        itemId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        departmentId: z.number().nullable().optional(),
        reconciled: z.boolean().nullable().optional(),
        reconciledBy: z.number().nullable().optional(),
      });
      
      // Parse and validate line data
      const validatedData = updateLineSchema.parse(req.body);
      
      // Add journalEntryId to validated data
      const lineData = {
        ...validatedData,
        journalEntryId: entryId
      };
      
      // Update the line
      const updatedLine = await storage.updateJournalEntryLine(lineId, lineData);
      
      if (!updatedLine) {
        throwNotFound('Journal Entry Line');
      }
      
      // Check if the journal entry is still balanced
      const updatedEntry = await storage.getJournalEntry(entryId);
      
      if (!updatedEntry) {
        throw new Error('Failed to retrieve updated journal entry');
      }
      
      let totalDebits = 0;
      let totalCredits = 0;
      
      updatedEntry.lines.forEach(line => {
        if (line.type === 'debit') {
          totalDebits += parseFloat(line.amount);
        } else {
          totalCredits += parseFloat(line.amount);
        }
      });
      
      const epsilon = 0.001;
      const balanced = Math.abs(totalDebits - totalCredits) <= epsilon;
      
      res.json({
        line: updatedLine,
        balanced,
        totalDebits,
        totalCredits
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Delete a specific journal entry line
   */
  app.delete('/api/journal-entries/:entryId/lines/:lineId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entryId = parseInt(req.params.entryId);
    const lineId = parseInt(req.params.lineId);
    
    if (isNaN(entryId) || isNaN(lineId)) {
      throwBadRequest('Invalid journal entry ID or line ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await storage.getJournalEntry(entryId);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent modifications to posted or void entries
    if (existingEntry.status === 'posted' || existingEntry.status === 'void') {
      throwBadRequest(`Cannot modify a journal entry with status '${existingEntry.status}'`);
    }
    
    // Check if this is the last line (can't delete all lines)
    if (existingEntry.lines.length <= 1) {
      throwBadRequest('Cannot delete the last line in a journal entry');
    }
    
    // Delete the line
    await storage.deleteJournalEntryLine(lineId);
    
    // Check if the journal entry is still balanced
    const updatedEntry = await storage.getJournalEntry(entryId);
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    updatedEntry?.lines.forEach(line => {
      if (line.type === 'debit') {
        totalDebits += parseFloat(line.amount);
      } else {
        totalCredits += parseFloat(line.amount);
      }
    });
    
    const epsilon = 0.001;
    const balanced = Math.abs(totalDebits - totalCredits) <= epsilon;
    
    res.json({
      message: 'Line deleted successfully',
      balanced,
      totalDebits,
      totalCredits
    });
  }));
  
  /**
   * Reverse a journal entry
   * Creates a new journal entry with opposite debits/credits to cancel out the original entry
   */
  app.post('/api/journal-entries/:id/reverse', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.user as { id: number };
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check if it exists and has the correct status
    const existingEntry = await storage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Only posted entries can be reversed
    if (existingEntry.status !== 'posted') {
      throwBadRequest(`Only posted journal entries can be reversed. Current status: '${existingEntry.status}'`);
    }
    
    try {
      // Define schema for reversal options
      const reversalOptionsSchema = z.object({
        date: z.string().optional().transform(val => val ? new Date(val) : undefined),
        description: z.string().optional(),
        referenceNumber: z.string().optional(),
      });
      
      // Validate reversal options
      const validatedOptions = reversalOptionsSchema.parse(req.body);
      
      // Create default values if not provided
      const reversalOptions = {
        date: validatedOptions.date,
        description: validatedOptions.description || `Reversal of ${existingEntry.referenceNumber || id}`,
        createdBy: user.id,
        referenceNumber: validatedOptions.referenceNumber || `REV-${existingEntry.referenceNumber || id}`
      };
      
      // Create the reversal entry
      const reversalEntry = await storage.reverseJournalEntry(id, reversalOptions);
      
      if (!reversalEntry) {
        throw new Error('Failed to create reversal entry');
      }
      
      res.status(201).json({
        message: 'Journal entry reversed successfully',
        originalEntry: existingEntry,
        reversalEntry
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
}