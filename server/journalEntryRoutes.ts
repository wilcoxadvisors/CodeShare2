import { Express, Request, Response } from 'express';
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
import { parse, isValid } from 'date-fns';
import { journalEntryStorage } from './storage/journalEntryStorage';

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
export function registerJournalEntryRoutes(app: Express) {
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
      console.log('Calling journalEntryStorage.createJournalEntry with clientId:', journalEntryData.clientId);
      console.log('Calling journalEntryStorage.createJournalEntry with createdById:', journalEntryData.createdBy);
      
      const journalEntry = await journalEntryStorage.createJournalEntry(
        journalEntryData.clientId,
        journalEntryData.createdBy,
        journalEntryData
      );
      
      // Add lines to the journal entry
      if (lines && lines.length > 0) {
        for (const line of lines) {
          await journalEntryStorage.createJournalEntryLine({
            ...line,
            journalEntryId: journalEntry.id
          });
        }
      }
      
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
      console.log('Raw Query Params:', req.query); // Log raw query params
      
      const { startDate: startDateStr, endDate: endDateStr, accountId: accountIdStr, entityId: entityIdStr, descriptionText, minAmount: minAmountStr, maxAmount: maxAmountStr } = req.query;
      
      const filters: ListJournalEntriesFilters = {};
      const errors: string[] = [];
      
      // Parse/Validate Dates (Using date-fns)
      if (startDateStr && typeof startDateStr === 'string') {
          const parsedDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
          if (isValid(parsedDate)) {
               filters.startDate = parsedDate;
          } else {
               errors.push(`Invalid start date format: ${startDateStr}. Use YYYY-MM-DD.`);
          }
      }
      if (endDateStr && typeof endDateStr === 'string') {
          const parsedDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
           if (isValid(parsedDate)) {
               filters.endDate = parsedDate;
           } else {
               errors.push(`Invalid end date format: ${endDateStr}. Use YYYY-MM-DD.`);
           }
      }
      
      // Parse/Validate Integers
      if (accountIdStr && typeof accountIdStr === 'string') {
          const parsedId = parseInt(accountIdStr, 10);
          if (!isNaN(parsedId) && parsedId > 0) filters.accountId = parsedId;
          else errors.push(`Invalid account ID format: ${accountIdStr}. Must be a positive integer.`);
      }
      // Parse and validate entityId
       if (entityIdStr && typeof entityIdStr === 'string') {
          const parsedId = parseInt(entityIdStr, 10);
          if (!isNaN(parsedId) && parsedId > 0) filters.entityId = parsedId;
          else errors.push(`Invalid entity ID format: ${entityIdStr}. Must be a positive integer.`);
      }
      
      
      // Use string filter directly (add length validation if needed)
      if (descriptionText && typeof descriptionText === 'string') {
          filters.descriptionText = descriptionText;
      }
      
      // Parse/Validate Floats
      if (minAmountStr && typeof minAmountStr === 'string') {
          const parsedAmount = parseFloat(minAmountStr);
          if (!isNaN(parsedAmount)) filters.minAmount = parsedAmount;
          else errors.push(`Invalid minimum amount format: ${minAmountStr}. Must be a number.`);
      }
      if (maxAmountStr && typeof maxAmountStr === 'string') {
          const parsedAmount = parseFloat(maxAmountStr);
           if (!isNaN(parsedAmount)) filters.maxAmount = parsedAmount;
          else errors.push(`Invalid maximum amount format: ${maxAmountStr}. Must be a number.`);
      }
      
      // If any parsing errors occurred, return 400
      if (errors.length > 0) {
          console.warn(`List JE validation failed:`, errors);
          return res.status(400).json({ message: 'Invalid filter parameters', errors });
      }
      
      // Log the filters object *before* calling storage
      console.log(`Filters passed to storage:`, JSON.stringify(filters));
      
      // Call journalEntryStorage with the manually built filters
      const entries = await journalEntryStorage.listJournalEntries(filters);
      
      res.status(200).json(entries);
    } catch (error) {
      console.error('Error in list journal entries:', error);
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
    
    const journalEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Get lines and attach them to the journal entry
    const lines = await journalEntryStorage.getJournalEntryLines(id);
    
    // Return the journal entry with lines
    res.json({
      ...journalEntry,
      lines
    });
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
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent updates to posted or void entries
    if (existingEntry.status === JournalEntryStatus.POSTED || existingEntry.status === JournalEntryStatus.VOID) {
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
      
      // Update the journal entry with lines
      const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, entryData, lines);
      
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
    const user = req.user as { id: number, role?: string };
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // If entry is posted, change status to void instead of actually deleting
    if (existingEntry.status === JournalEntryStatus.POSTED) {
      // For posted entries, only admin users can void them
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can void posted journal entries' });
      }
      
      // Require a void reason
      const voidReason = req.body.reason || req.body.voidReason;
      if (!voidReason) {
        return res.status(400).json({ message: 'A reason is required to void a posted journal entry' });
      }
      
      const voidedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, { 
        status: JournalEntryStatus.VOID,
        rejectedBy: user.id,
        rejectedAt: new Date(),
        rejectionReason: voidReason
      }, existingEntry.lines);
      
      return res.json({ 
        message: 'Journal entry voided successfully', 
        entry: voidedEntry 
      });
    } else if (existingEntry.status === JournalEntryStatus.DRAFT) {
      // If draft, perform actual deletion
      await journalEntryStorage.deleteJournalEntry(id);
      
      return res.json({ message: 'Journal entry deleted successfully' });
    } else {
      // Other statuses cannot be deleted
      return res.status(400).json({ 
        message: `Journal entries with status '${existingEntry.status}' cannot be deleted` 
      });
    }
  }));
  
  /**
   * Delete or void a journal entry (entity-specific endpoint)
   */
  app.delete('/api/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entityId = parseInt(req.params.entityId);
    const user = req.user as { id: number, role?: string };
    
    if (isNaN(id) || isNaN(entityId)) {
      throwBadRequest('Invalid journal entry ID or entity ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Check that the journal entry belongs to the specified entity
    if (existingEntry.entityId !== entityId) {
      return res.status(404).json({ message: 'Journal entry not found for the specified entity' });
    }
    
    // If entry is posted, change status to void instead of actually deleting
    if (existingEntry.status === JournalEntryStatus.POSTED) {
      // For posted entries, only admin users can void them
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can void posted journal entries' });
      }
      
      // Require a void reason
      const voidReason = req.body.reason || req.body.voidReason;
      if (!voidReason) {
        return res.status(400).json({ message: 'A reason is required to void a posted journal entry' });
      }
      
      const voidedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, { 
        status: JournalEntryStatus.VOID,
        rejectedBy: user.id,
        rejectedAt: new Date(),
        rejectionReason: voidReason
      }, existingEntry.lines);
      
      return res.json({ 
        message: 'Journal entry voided successfully', 
        entry: voidedEntry 
      });
    } else if (existingEntry.status === JournalEntryStatus.DRAFT) {
      // If draft, perform actual deletion
      await journalEntryStorage.deleteJournalEntry(id);
      
      return res.json({ message: 'Journal entry deleted successfully' });
    } else {
      // Other statuses cannot be deleted
      return res.status(400).json({ 
        message: `Journal entries with status '${existingEntry.status}' cannot be deleted` 
      });
    }
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
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent posting if not in draft or approved status
    if (existingEntry.status !== JournalEntryStatus.DRAFT && existingEntry.status !== JournalEntryStatus.APPROVED) {
      throwBadRequest(`Cannot post a journal entry with status '${existingEntry.status}'. Must be 'draft' or 'approved'.`);
    }
    
    // Update the status to posted
    const postedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, {
      status: JournalEntryStatus.POSTED,
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
    console.log('ADD JOURNAL ENTRY LINE - Request body:', req.body);
    console.log('ADD JOURNAL ENTRY LINE - Request params:', req.params);
    
    const journalEntryId = parseInt(req.params.id);
    console.log('ADD JOURNAL ENTRY LINE - Parsed journal entry ID:', journalEntryId);
    
    if (isNaN(journalEntryId)) {
      console.log('ADD JOURNAL ENTRY LINE - Invalid journal entry ID');
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the existing entry to check its status
    const existingEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    console.log('ADD JOURNAL ENTRY LINE - Existing entry found:', existingEntry ? 'yes' : 'no');
    
    if (!existingEntry) {
      console.log('ADD JOURNAL ENTRY LINE - Journal entry not found');
      throwNotFound('Journal Entry');
    }
    
    // Prevent modifications to posted or void entries
    if (existingEntry.status === JournalEntryStatus.POSTED || existingEntry.status === JournalEntryStatus.VOID) {
      console.log(`ADD JOURNAL ENTRY LINE - Cannot modify entry with status: ${existingEntry.status}`);
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
        fsliBucket: z.string().nullable().optional(),
        internalReportingBucket: z.string().nullable().optional(),
        itemId: z.number().nullable().optional(),
        projectId: z.number().nullable().optional(),
        departmentId: z.number().nullable().optional(),
        reconciled: z.boolean().nullable().optional(),
        reconciledBy: z.number().nullable().optional(),
      });
      
      console.log('ADD JOURNAL ENTRY LINE - Validating line data');
      
      // Parse and validate line data
      const validatedLineData = addLineSchema.parse(req.body);
      console.log('ADD JOURNAL ENTRY LINE - Validated line data:', validatedLineData);
      
      // Make sure amount is a string
      const amount = typeof validatedLineData.amount === 'number' 
        ? validatedLineData.amount.toString() 
        : validatedLineData.amount;
      
      console.log('ADD JOURNAL ENTRY LINE - Amount formatted as:', amount);
    
      // Add journalEntryId to the validated data
      const lineData = {
        ...validatedLineData,
        amount,
        journalEntryId
      };
      
      console.log('ADD JOURNAL ENTRY LINE - Final line data to insert:', lineData);
      
      // Add the new line
      const newLine = await journalEntryStorage.createJournalEntryLine(lineData);
      console.log('ADD JOURNAL ENTRY LINE - New line created:', newLine);
      
      // Check if the journal entry is still balanced but get lines directly
      // instead of relying on the lines property of the entry
      let totalDebits = 0;
      let totalCredits = 0;
      
      // Get all journal entry lines directly
      const lines = await journalEntryStorage.getJournalEntryLines(journalEntryId);
      console.log('ADD JOURNAL ENTRY LINE - Retrieved lines count:', lines.length);
      
      // Process lines to calculate totals
      if (lines && Array.isArray(lines)) {
        lines.forEach(line => {
          if (line.type === 'debit') {
            totalDebits += parseFloat(line.amount);
          } else {
            totalCredits += parseFloat(line.amount);
          }
        });
      }
      
      console.log('ADD JOURNAL ENTRY LINE - Total debits:', totalDebits);
      console.log('ADD JOURNAL ENTRY LINE - Total credits:', totalCredits);
      
      const epsilon = 0.001;
      const balanced = Math.abs(totalDebits - totalCredits) <= epsilon;
      console.log('ADD JOURNAL ENTRY LINE - Entry balanced:', balanced);
      
      // Return the response with detailed information
      const responseData = {
        line: newLine,
        balanced,
        totalDebits,
        totalCredits
      };
      
      console.log('ADD JOURNAL ENTRY LINE - Response data:', responseData);
      res.status(201).json(responseData);
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
    const existingEntry = await journalEntryStorage.getJournalEntry(entryId);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent modifications to posted or void entries
    if (existingEntry.status === JournalEntryStatus.POSTED || existingEntry.status === JournalEntryStatus.VOID) {
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
      const updatedLine = await journalEntryStorage.updateJournalEntryLine(lineId, lineData);
      
      if (!updatedLine) {
        throwNotFound('Journal Entry Line');
      }
      
      // Check if the journal entry is still balanced
      const updatedEntry = await journalEntryStorage.getJournalEntry(entryId);
      
      if (!updatedEntry) {
        throw new Error('Failed to retrieve updated journal entry');
      }
      
      let totalDebits = 0;
      let totalCredits = 0;
      
      // Get all journal entry lines directly (don't rely on lines property)
      const lines = await journalEntryStorage.getJournalEntryLines(entryId);
      
      // Process lines to calculate totals
      if (lines && Array.isArray(lines)) {
        lines.forEach(line => {
          if (line.type === 'debit') {
            totalDebits += parseFloat(line.amount);
          } else {
            totalCredits += parseFloat(line.amount);
          }
        });
      }
      
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
    const existingEntry = await journalEntryStorage.getJournalEntry(entryId);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Prevent modifications to posted or void entries
    if (existingEntry.status === JournalEntryStatus.POSTED || existingEntry.status === JournalEntryStatus.VOID) {
      throwBadRequest(`Cannot modify a journal entry with status '${existingEntry.status}'`);
    }
    
    // Get all lines to check if this is the last line
    const entryLines = await journalEntryStorage.getJournalEntryLines(entryId);
    
    // Check if this is the last line (can't delete all lines)
    if (entryLines.length <= 1) {
      throwBadRequest('Cannot delete the last line in a journal entry');
    }
    
    // Delete the line
    await journalEntryStorage.deleteJournalEntryLine(lineId);
    
    // Check if the journal entry is still balanced
    const updatedEntry = await journalEntryStorage.getJournalEntry(entryId);
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    // Get all journal entry lines directly
    const lines = await journalEntryStorage.getJournalEntryLines(entryId);
    
    // Process lines to calculate totals
    if (lines && Array.isArray(lines)) {
      lines.forEach(line => {
        if (line.type === 'debit') {
          totalDebits += parseFloat(line.amount);
        } else {
          totalCredits += parseFloat(line.amount);
        }
      });
    }
    
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
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Only posted entries can be reversed
    if (existingEntry.status !== JournalEntryStatus.POSTED) {
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
      const reversalEntry = await journalEntryStorage.reverseJournalEntry(id, reversalOptions);
      
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

  /**
   * Entity-specific endpoints
   */

  /**
   * Get journal entries for a specific entity
   */
  app.get('/api/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    
    if (isNaN(entityId)) {
      throwBadRequest('Invalid entity ID provided');
    }
    
    // Use listJournalEntries with entityId filter
    const filters: ListJournalEntriesFilters = {
      entityId
    };
    
    // Add any query parameters to filters
    const { startDate: startDateStr, endDate: endDateStr, status } = req.query;
    
    // Parse dates if provided
    if (startDateStr && typeof startDateStr === 'string') {
      const parsedDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        filters.startDate = parsedDate;
      }
    }
    
    if (endDateStr && typeof endDateStr === 'string') {
      const parsedDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        filters.endDate = parsedDate;
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
  app.post('/api/entities/:entityId/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const user = req.user as { id: number };
    
    if (isNaN(entityId)) {
      throwBadRequest('Invalid entity ID provided');
    }
    
    try {
      // Add entityId to the request body
      const requestData = {
        ...req.body,
        entityId,
        createdBy: user.id
      };
      
      // Validate with schema
      const validatedData = createJournalEntrySchema.parse(requestData);
      
      // Extract lines from validated data
      const { lines, ...journalEntryData } = validatedData;
      
      // Create the journal entry
      const journalEntry = await journalEntryStorage.createJournalEntry(
        journalEntryData.clientId,
        journalEntryData.createdBy,
        journalEntryData
      );
      
      // Add lines to the journal entry
      if (lines && lines.length > 0) {
        for (const line of lines) {
          await journalEntryStorage.createJournalEntryLine({
            ...line,
            journalEntryId: journalEntry.id
          });
        }
      }
      
      res.status(201).json(journalEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Update a journal entry for a specific entity
   */
  app.put('/api/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const id = parseInt(req.params.id);
    const user = req.user as { id: number };
    
    if (isNaN(entityId) || isNaN(id)) {
      throwBadRequest('Invalid entity ID or journal entry ID provided');
    }
    
    // Get the existing entry to check
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Verify this entry belongs to the specified entity
    if (existingEntry.entityId !== entityId) {
      return res.status(404).json({ message: 'Journal entry not found for the specified entity' });
    }
    
    // Prevent updates to posted or void entries
    if (existingEntry.status === JournalEntryStatus.POSTED || existingEntry.status === JournalEntryStatus.VOID) {
      throwBadRequest(`Cannot update a journal entry with status '${existingEntry.status}'`);
    }
    
    try {
      // Validate update data
      const validatedData = updateJournalEntrySchema.parse({
        ...req.body,
        updatedBy: user.id
      });
      
      // Extract lines from validated data
      const { lines, ...entryData } = validatedData;
      
      // Update the journal entry with lines
      const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, entryData, lines);
      
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Delete or void a journal entry (entity-specific endpoint)
   */
  app.delete('/api/entities/:entityId/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const id = parseInt(req.params.id);
    const user = req.user as { id: number; isAdmin?: boolean };
    
    if (isNaN(entityId) || isNaN(id)) {
      throwBadRequest('Invalid entity ID or journal entry ID provided');
    }
    
    // Get the existing entry to check
    const existingEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!existingEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Verify this entry belongs to the specified entity
    if (existingEntry.entityId !== entityId) {
      return res.status(404).json({ message: 'Journal entry not found for the specified entity' });
    }
    
    // Handle deletion based on status
    if (existingEntry.status === JournalEntryStatus.DRAFT) {
      // Draft entries can be fully deleted
      await journalEntryStorage.deleteJournalEntry(id);
      return res.status(204).send();
    } else if (existingEntry.status === JournalEntryStatus.POSTED) {
      // Posted entries can only be voided, and only by admins
      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Only administrators can void posted journal entries' });
      }
      
      // Void the entry by updating its status
      await journalEntryStorage.updateJournalEntry(id, {
        status: JournalEntryStatus.VOID,
        updatedBy: user.id
      });
      
      return res.status(200).json({ message: 'Journal entry voided successfully' });
    } else {
      // Void entries cannot be modified
      return res.status(400).json({ message: 'Voided journal entries cannot be modified' });
    }
  }));
}