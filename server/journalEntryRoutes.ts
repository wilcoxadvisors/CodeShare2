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
  // Helper function to find client ID from entity ID
  const getClientIdFromEntityId = async (entityId: number): Promise<number | null> => {
    try {
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq }) => eq(entities.id, entityId),
        columns: {
          clientId: true
        }
      });
      return entity?.clientId || null;
    } catch (error) {
      console.error('Error getting client ID from entity ID:', error);
      return null;
    }
  };
  // Configure multer for file uploads
  // Define allowed MIME types for file uploads
  const ALLOWED_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Email formats
    'application/vnd.ms-outlook',      // .msg
    'message/rfc822',                  // .eml
    // Text
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed',
    // Regex patterns for broader matching
    /^application\/vnd\./,             // any other Office MIME
    /^text\//,                         // txt, csv, md, etc.
    /^image\/(png|jpe?g|gif)$/         // common images
  ];
  
  // Helper function to check if a file type is allowed
  const isAllowedFileType = (mimetype: string): boolean => {
    return ALLOWED_TYPES.some(type => 
      typeof type === 'string' ? type === mimetype : type.test(mimetype)
    );
  };
  
  // Configure rate limiting for file uploads
  // 50 files per user per 10-minute window
  const uploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 minutes
    max: 50,                   // 50 requests per window
    standardHeaders: true,     // Return rate limit info in the RateLimit-* headers
    message: { message: 'Too many file uploads. Please try again later.' },
    keyGenerator: (req) => {
      // Use user ID or IP address as the rate limit key
      const user = req.user as { id: number } | undefined;
      return user?.id?.toString() || req.ip || 'unknown';
    }
  });
  
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB file size limit
    },
    fileFilter: (req, file, cb) => {
      if (isAllowedFileType(file.mimetype)) {
        cb(null, true);
      } else {
        // Don't throw an error here, we'll handle it in the route
        cb(null, false);
      }
    }
  });
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
      console.log('--- BACKEND ROUTE: RAW BODY ---', req.body);
      console.log('DEBUG BE Route: Received req.body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers: ', JSON.stringify(req.headers));
      console.log('User ID from session: ', user.id);
      
      if (req.body.lines) {
        console.log('Input lines before validation: ', JSON.stringify(req.body.lines));
        console.log('Lines is Array?', Array.isArray(req.body.lines));
        console.log('Lines count:', req.body.lines.length);
        if (req.body.lines.length > 0) {
          console.log('First line structure:', JSON.stringify(req.body.lines[0]));
          if (req.body.lines[0].tags) {
            console.log('TAGS DEBUG: First line has tags:', JSON.stringify(req.body.lines[0].tags));
          } else {
            console.log('TAGS DEBUG: First line has NO tags property');
          }
          
          // Check each line for tags
          req.body.lines.forEach((line, index) => {
            console.log(`TAGS DEBUG: Line ${index} tags:`, line.tags || 'UNDEFINED');
          });
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
      console.log('--- BACKEND ROUTE: VALIDATED DATA ---', validatedData);
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
      
      // Check if the status is 'posted' - special handling required
      const isPostedEntry = journalEntryData.status === 'posted';
      
      // If the status is 'posted', temporarily set it to 'draft' for creation
      const modifiedEntryData = { 
        ...journalEntryData,
        status: isPostedEntry ? 'draft' : journalEntryData.status 
      };
      
      console.log('Calling journalEntryStorage.createJournalEntry with clientId:', modifiedEntryData.clientId);
      console.log('Calling journalEntryStorage.createJournalEntry with createdById:', modifiedEntryData.createdBy);
      console.log('DEBUG BE Route: Data passed to storage:', JSON.stringify(modifiedEntryData, null, 2));
      
      // Check if reference number already exists for this entity before creating
      if (modifiedEntryData.referenceNumber) {
        const existingEntries = await journalEntryStorage.listJournalEntries({
          entityId: modifiedEntryData.entityId,
          referenceNumber: modifiedEntryData.referenceNumber,
        });
        
        if (existingEntries.length > 0) {
          console.log('DEBUG: Duplicate reference number detected:', modifiedEntryData.referenceNumber);
          return res.status(400).json({ 
            message: `Reference number "${modifiedEntryData.referenceNumber}" is already in use for this entity. Please use a different reference number.` 
          });
        }
      }
      
      // Create the journal entry with 'draft' status if it was originally 'posted'
      const journalEntry = await journalEntryStorage.createJournalEntry(
        modifiedEntryData.clientId,
        modifiedEntryData.createdBy,
        modifiedEntryData
      );
      
      // Add lines to the journal entry
      if (lines && lines.length > 0) {
        console.log('DEBUG: Adding lines to journal entry', journalEntry.id);
        console.log('DEBUG: Number of lines to add:', lines.length);
        console.log('DEBUG: First line sample:', JSON.stringify(lines[0]));

        for (const line of lines) {
          console.log('DEBUG: Processing line:', JSON.stringify(line));
          
          // Make sure the line has an accountId
          if (!line.accountId) {
            console.log('DEBUG: Line missing accountId, skipping:', JSON.stringify(line));
            continue;
          }
          
          // If the line already has type and amount fields, use them directly
          if (line.type && line.amount) {
            console.log('DEBUG: Line already has type and amount:', line.type, line.amount);
            
            // Create the journal entry line
            const createdLine = await journalEntryStorage.createJournalEntryLine({
              journalEntryId: journalEntry.id,
              accountId: parseInt(line.accountId.toString()),
              type: line.type,
              amount: typeof line.amount === 'number' ? line.amount.toString() : line.amount,
              description: line.description || '',
              entityCode: line.entityCode || ''
            });

            // Handle dimension tags if present
            if (line.tags && Array.isArray(line.tags) && line.tags.length > 0) {
              console.log('DEBUG: Processing dimension tags for line:', createdLine.id, 'tags:', line.tags);
              await journalEntryStorage.createDimensionTags(createdLine.id, line.tags);
            }
            
            continue;
          }
          
          // If we got here, we need to check for debit/credit fields and convert
          console.log('DEBUG: Checking for debit/credit fields');
          
          // Parse debit/credit values, handling string inputs properly
          // Using any type since the line can have debit/credit fields from UI
          const anyLine = line as any;
          
          const debitValue = anyLine.debit !== undefined && anyLine.debit !== null ? 
            (typeof anyLine.debit === 'string' ? parseFloat(anyLine.debit) : anyLine.debit) : 0;
            
          const creditValue = anyLine.credit !== undefined && anyLine.credit !== null ? 
            (typeof anyLine.credit === 'string' ? parseFloat(anyLine.credit) : anyLine.credit) : 0;
          
          console.log('DEBUG: Debit value:', debitValue, 'Credit value:', creditValue);
          
          if (debitValue === 0 && creditValue === 0) {
            console.log('DEBUG: Line has zero amount, skipping');
            continue;
          }
          
          // Determine the type and amount based on debit/credit values
          const type = debitValue > 0 ? 'debit' : 'credit';
          const amount = debitValue > 0 ? debitValue : creditValue;
          
          console.log('DEBUG: Adding line with', type, 'amount', amount, 'to account', line.accountId);
          
          // Create the journal entry line
          const createdLine = await journalEntryStorage.createJournalEntryLine({
            journalEntryId: journalEntry.id,
            accountId: parseInt(line.accountId.toString()),
            type,
            amount: amount.toString(),
            description: line.description || '',
            entityCode: line.entityCode || ''
          });

          // Handle dimension tags if present
          if (line.tags && Array.isArray(line.tags) && line.tags.length > 0) {
            console.log('DEBUG: Processing dimension tags for line:', createdLine.id, 'tags:', line.tags);
            await journalEntryStorage.createDimensionTags(createdLine.id, line.tags);
          }
        }
        
        console.log('DEBUG: Finished adding lines to journal entry', journalEntry.id);
      } else {
        console.log('DEBUG: No lines to add to journal entry', journalEntry.id);
      }
      
      // If the original status was 'posted', now update the entry to 'posted'
      if (isPostedEntry) {
        console.log('Updating entry status to posted after adding lines');
        await journalEntryStorage.updateJournalEntry(journalEntry.id, { 
          status: 'posted', 
          postedBy: journalEntryData.createdBy,
          postedAt: new Date()
        });
        
        // Get the updated entry to return
        const updatedEntry = await journalEntryStorage.getJournalEntry(journalEntry.id);
        if (updatedEntry) {
          journalEntry.status = updatedEntry.status;
          journalEntry.postedBy = updatedEntry.postedBy;
          journalEntry.postedAt = updatedEntry.postedAt;
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
      
      // Check for database-specific errors, especially duplicate reference numbers
      const errorMessage = String(error);
      if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
        if (errorMessage.toLowerCase().includes('reference_number')) {
          return res.status(400).json({ 
            message: `Reference number "${modifiedEntryData?.referenceNumber}" is already in use. Please use a different reference number.` 
          });
        }
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
      
      // Validate Dates (using regex for YYYY-MM-DD format)
      if (startDateStr && typeof startDateStr === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(startDateStr)) {
               filters.startDate = startDateStr;
          } else {
               errors.push(`Invalid start date format: ${startDateStr}. Use YYYY-MM-DD.`);
          }
      }
      if (endDateStr && typeof endDateStr === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(endDateStr)) {
               filters.endDate = endDateStr;
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
   * Get a specific journal entry with its lines and files
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
    
    // Get attached files for this journal entry
    const files = await journalEntryStorage.getJournalEntryFiles(id);
    
    // Return the journal entry with lines and files
    res.json({
      ...journalEntry,
      lines,
      files
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
   * Submit a journal entry for approval
   */
  app.post('/api/journal-entries/:id/submit', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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
    
    // Can only submit draft entries for approval
    if (existingEntry.status !== JournalEntryStatus.DRAFT) {
      throwBadRequest(`Cannot submit a journal entry with status '${existingEntry.status}'. Must be 'draft'.`);
    }
    
    // Update the status to pending_approval
    const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, {
      status: JournalEntryStatus.PENDING_APPROVAL,
      requestedBy: user.id,
      requestedAt: new Date()
    }, existingEntry.lines);
    
    res.json({
      message: 'Journal entry submitted for approval successfully',
      entry: updatedEntry
    });
  }));

  /**
   * Approve a journal entry
   */
  app.post('/api/journal-entries/:id/approve', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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
    
    // Only admin users can approve journal entries
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can approve journal entries' });
    }
    
    // Can only approve entries that are pending approval
    if (existingEntry.status !== JournalEntryStatus.PENDING_APPROVAL) {
      throwBadRequest(`Cannot approve a journal entry with status '${existingEntry.status}'. Must be 'pending_approval'.`);
    }
    
    // Update the status to approved
    const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, {
      status: JournalEntryStatus.APPROVED,
      approvedBy: user.id,
      approvedAt: new Date()
    }, existingEntry.lines);
    
    res.json({
      message: 'Journal entry approved successfully',
      entry: updatedEntry
    });
  }));

  /**
   * Reject a journal entry
   */
  app.post('/api/journal-entries/:id/reject', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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
    
    // Only admin users can reject journal entries
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can reject journal entries' });
    }
    
    // Can only reject entries that are pending approval
    if (existingEntry.status !== JournalEntryStatus.PENDING_APPROVAL) {
      throwBadRequest(`Cannot reject a journal entry with status '${existingEntry.status}'. Must be 'pending_approval'.`);
    }
    
    // Require a rejection reason
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    // Update the status to rejected
    const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, {
      status: JournalEntryStatus.REJECTED,
      rejectedBy: user.id,
      rejectedAt: new Date(),
      rejectionReason
    }, existingEntry.lines);
    
    res.json({
      message: 'Journal entry rejected successfully',
      entry: updatedEntry
    });
  }));

  /**
   * Post a journal entry (change status from draft to posted)
   * @deprecated Use the hierarchical PUT /api/clients/:clientId/entities/:entityId/journal-entries/:id/post instead
   */
  app.put('/api/journal-entries/:id/post', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = req.user as { id: number, role?: string };
    
    // Only admin users can post journal entries
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can post journal entries' });
    }
    
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
  /**
   * Legacy GET /api/entities/:entityId/journal-entries route with auto-redirect
   * This redirects to the new hierarchical pattern
   */
  app.get('/api/entities/:entityId/journal-entries', (req, res, next) => {
    const entityId = req.params.entityId;
    
    // Skip if this is a test request or no redirection is needed
    if (req.query.skipRedirect === 'true') {
      return next();
    }
    
    // Get client ID from entity ID and redirect
    getClientIdFromEntityId(parseInt(entityId, 10)).then(clientId => {
      if (!clientId) {
        return res.status(404).json({ message: 'Entity not found' });
      }
      console.log(`DEBUG: Redirecting legacy journal entry request to hierarchical URL pattern for entity ${entityId} under client ${clientId}`);
      res.redirect(307, `/api/clients/${clientId}/entities/${entityId}/journal-entries`);
    }).catch(error => {
      console.error('Error during redirect:', error);
      next();
    });
  });
  
  /**
   * Legacy GET /api/entities/:entityId/journal-entries route (fallback handler)
   * This only runs if the redirect above is skipped or fails
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
    
    // Use date strings directly to avoid timezone issues
    if (startDateStr && typeof startDateStr === 'string') {
      // Validate it's in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
        filters.startDate = startDateStr;
      }
    }
    
    if (endDateStr && typeof endDateStr === 'string') {
      // Validate it's in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
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
  // Hierarchical route for creating journal entries
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
      
      // Check if reference number already exists for this entity
      if (journalEntryData.referenceNumber) {
        const existingEntries = await journalEntryStorage.listJournalEntries({
          entityId: journalEntryData.entityId,
          referenceNumber: journalEntryData.referenceNumber,
        });
        
        if (existingEntries.length > 0) {
          console.log('DEBUG: Duplicate reference number detected:', journalEntryData.referenceNumber);
          return res.status(400).json({ 
            message: `Reference number "${journalEntryData.referenceNumber}" is already in use for this entity. Please use a different reference number.` 
          });
        }
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
      
      res.status(201).json(journalEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      
      // Check for database-specific errors, especially duplicate reference numbers
      const errorMessage = String(error);
      if (errorMessage.includes("unique constraint") || errorMessage.includes("duplicate key")) {
        if (errorMessage.toLowerCase().includes("reference_number")) {
          return res.status(400).json({ 
            message: `Reference number is already in use. Please use a different reference number.` 
          });
        }
      }
      
      throw error;
    }
  }));
  
  /**
   * ---------------------------------------------------------------------------
   *  Hierarchical PATCH route PATCH /api/clients/:clientId/entities/:entityId/journal-entries/:id
   * ---------------------------------------------------------------------------
   */
  app.patch(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);
      const user = req.user as { id: number };

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity or journal entry ID');
      }

      // Validate: ensure entity belongs to client
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      // Get the existing entry
      const existingEntry = await journalEntryStorage.getJournalEntry(id);
      
      if (!existingEntry) {
        return throwNotFound('Journal Entry');
      }
      
      // Verify this entry belongs to the specified entity
      if (existingEntry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this entity');
      }
      
      // Prevent updates to posted or void entries
      if (existingEntry.status === JournalEntryStatus.POSTED || existingEntry.status === JournalEntryStatus.VOID) {
        return throwBadRequest(`Cannot update a journal entry with status '${existingEntry.status}'`);
      }
      
      try {
        // Validate update data
        const validatedData = updateJournalEntrySchema.parse({
          ...req.body,
          updatedBy: user.id
        });
        
        // Extract lines and files from validated data
        const { lines, files, ...entryData } = validatedData;
        
        // Update the journal entry with lines and files (dimension tags are handled automatically within this method)
        const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, entryData, lines, files);
        
        res.json(updatedEntry);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ errors: formatZodError(error) });
        }
        
        // Check for database-specific errors
        const errorMessage = String(error);
        if (errorMessage.includes("unique constraint") || errorMessage.includes("duplicate key")) {
          if (errorMessage.toLowerCase().includes("reference_number")) {
            return res.status(400).json({ 
              message: `Reference number is already in use. Please use a different reference number.` 
            });
          }
        }
        
        throw error;
      }
    })
  );

  /**
   * ---------------------------------------------------------------------------
   *  NEW 3-level list route
   *    GET /api/clients/:clientId/entities/:entityId/journal-entries
   * ---------------------------------------------------------------------------
   */
  app.get(
    '/api/clients/:clientId/entities/:entityId/journal-entries',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);

      if (Number.isNaN(clientId) || Number.isNaN(entityId)) {
        return throwBadRequest('Invalid client or entity ID');
      }

      // ✔️ Optional guard: ensure entity belongs to client
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      const entries = await journalEntryStorage.listJournalEntries({
        entityId,
        includeLines: true,          // preserve old behavior
        includeFiles: true,
      });

      // The frontend is looking for a direct array, not wrapped in data property
      res.json(entries);
    })
  );
  
  // Legacy route for creating journal entries for backward compatibility
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
      
      // Check if reference number already exists for this entity
      if (journalEntryData.referenceNumber) {
        const existingEntries = await journalEntryStorage.listJournalEntries({
          entityId: journalEntryData.entityId,
          referenceNumber: journalEntryData.referenceNumber,
        });
        
        if (existingEntries.length > 0) {
          console.log('DEBUG: Duplicate reference number detected:', journalEntryData.referenceNumber);
          return res.status(400).json({ 
            message: `Reference number "${journalEntryData.referenceNumber}" is already in use for this entity. Please use a different reference number.` 
          });
        }
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
          console.log(`LEGACY CREATION DEBUG: Creating line with tags:`, JSON.stringify(line.tags || [], null, 2));
          
          // Create the line without the tags property (since it's not part of the line schema)
          const { tags, ...lineData } = line;
          const createdLine = await journalEntryStorage.createJournalEntryLine({
            ...lineData,
            journalEntryId: journalEntry.id
          });
          
          // Create dimension tags for this line if they exist
          if (tags && tags.length > 0) {
            console.log(`LEGACY CREATION DEBUG: Creating ${tags.length} dimension tags for line ${createdLine.id}`);
            await journalEntryStorage.createDimensionTags(createdLine.id, tags);
          } else {
            console.log(`LEGACY CREATION DEBUG: No dimension tags to create for line ${createdLine.id}`);
          }
        }
      }
      
      res.status(201).json(journalEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      
      // Check for database-specific errors, especially duplicate reference numbers
      const errorMessage = String(error);
      if (errorMessage.includes("unique constraint") || errorMessage.includes("duplicate key")) {
        if (errorMessage.toLowerCase().includes("reference_number")) {
          return res.status(400).json({ 
            message: `Reference number is already in use. Please use a different reference number.` 
          });
        }
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

  /**
   * Upload a file attachment to a journal entry
   */
  app.post('/api/journal-entries/:id/files', 
    isAuthenticated,
    uploadLimiter, // Added rate limiting - 50 files per user per 10 minutes
    upload.array('files', 10), // Support multiple files with a limit of 10
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const user = req.user as { id: number };
      
      console.log('DEBUG Attach BE: Received req.files:', req.files);
      
      if (isNaN(id)) {
        throwBadRequest('Invalid journal entry ID provided');
      }
      
      // Get the existing entry to check its status
      const journalEntry = await journalEntryStorage.getJournalEntry(id);
      
      if (!journalEntry) {
        throwNotFound('Journal Entry');
      }
      
      // Check if journal entry status allows file attachments (only draft or pending_approval)
      // Bug fix: This permission check was preventing edits to files on entries in draft status
      const allowedStatuses = ['draft', 'pending_approval'];
      const status = (journalEntry.status ?? '').toLowerCase();
      if (!allowedStatuses.includes(status)) {
        // Log the attempt for audit purposes
        await auditLogStorage.createAuditLog({
          action: 'journal_file_upload_denied',
          performedBy: user.id,
          details: JSON.stringify({
            journalEntryId: id,
            status: journalEntry.status,
            reason: 'Journal entry status does not allow file uploads'
          })
        });
        
        throwForbidden(`Cannot upload files to journal entries with status: ${journalEntry.status}. Only entries in draft or pending_approval status can have files added.`);
      }
      
      // Check if files were uploaded
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files were uploaded' });
      }
      
      // Check if any files were rejected due to mime type validation
      if (req.body.files && req.files.length < req.body.files.length) {
        // Some files were rejected by the multer filter
        return res.status(400).json({ 
          message: 'One or more files were rejected due to unsupported file types. Supported types include PDF, Office documents, emails (.msg, .eml), images, and text files.'
        });
      }
      
      // Validate file types and sizes
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      for (const file of req.files as Express.Multer.File[]) {
        // Double check file size
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({ 
            message: `File ${file.originalname} exceeds maximum size limit of 10MB` 
          });
        }
        
        // Double check file type
        if (!isAllowedFileType(file.mimetype)) {
          // Log the attempt
          await auditLogStorage.createAuditLog({
            action: 'journal_file_upload_rejected',
            performedBy: user.id,
            details: JSON.stringify({
              journalEntryId: id,
              filename: file.originalname,
              mimeType: file.mimetype,
              reason: 'Unsupported file type'
            })
          });
          
          return res.status(400).json({
            message: `File type ${file.mimetype} is not supported. Supported types include PDF, Office documents, emails (.msg, .eml), images, and text files.`
          });
        }
      }
      
      try {
        // Get existing files for this journal entry to check for duplicates
        const existingFiles = await journalEntryStorage.getJournalEntryFiles(id);
        console.log('DEBUG Attach BE: Existing files count:', existingFiles.length);
        
        const savedFiles = [];
        const skippedFiles = [];
        
        // Process each file individually
        for (const file of req.files) {
          console.log('DEBUG Attach BE: Processing file:', file.originalname, 'size:', file.size);
          
          // Check for duplicate files based on filename and size
          const isDuplicate = existingFiles.some(existing => 
            existing.filename === file.originalname && existing.size === file.size
          );
          
          if (isDuplicate) {
            console.log('DEBUG Attach BE: Duplicate file detected:', file.originalname);
            skippedFiles.push({
              filename: file.originalname,
              reason: 'File with same name and size already exists'
            });
            continue;
          }
          
          try {
            // Add uploadedBy to the file data
            const fileData = {
              ...file,
              uploadedBy: user.id
            };
            
            console.log('DEBUG Attach BE: Data to storage:', {
              filename: fileData.originalname,
              mimetype: fileData.mimetype,
              size: fileData.size 
            });
            
            // Save the file to the journal entry
            const savedFile = await journalEntryStorage.createJournalEntryFile(id, fileData);
            savedFiles.push(savedFile);
            
            // Log the successful file upload for audit purposes
            await auditLogStorage.createAuditLog({
              action: 'journal_file_uploaded',
              performedBy: user.id,
              details: JSON.stringify({
                journalEntryId: id,
                fileId: savedFile.id,
                filename: savedFile.filename,
                size: savedFile.size,
                mimeType: savedFile.mimeType
              })
            });
          } catch (fileError: any) {
            // Check if it's a duplicate file error (409 Conflict)
            if (fileError.status === 409) {
              console.log(`DEBUG Attach BE: Skipping duplicate file: ${file.originalname}`);
              skippedFiles.push({
                filename: file.originalname,
                reason: 'duplicate'
              });
            } else {
              // For other errors, rethrow to be caught by the outer catch
              throw fileError;
            }
          }
        }
        
        // If we have both saved and skipped files, return a 207 Multi-Status response
        if (savedFiles.length > 0 && skippedFiles.length > 0) {
          res.status(207).json({
            message: 'Some files uploaded successfully, others were skipped',
            files: savedFiles,
            skipped: skippedFiles
          });
        } 
        // If all files were skipped, return a 207 Multi-Status with no successful uploads
        else if (savedFiles.length === 0 && skippedFiles.length > 0) {
          res.status(207).json({
            message: 'No files were uploaded - all were skipped',
            files: [],
            skipped: skippedFiles
          });
        }
        // If all files were saved, return a 201 Created
        else {
          res.status(201).json({
            message: 'Files uploaded successfully',
            files: savedFiles
          });
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        throw error;
      }
    })
  );
  
  /**
   * Get all files attached to a journal entry
   */
  app.get('/api/journal-entries/:id/files', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    console.log('DEBUG Attach BE: Get files for journal entry ID:', id);
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Get the files for this journal entry
    const files = await journalEntryStorage.getJournalEntryFiles(id);
    
    console.log('DEBUG Attach BE: Files retrieved for entry', req.params.id, ':', files);
    
    // Always return an array (even if empty) to avoid "attachments.map is not a function" error
    res.json(files || []);
  }));
  
  /**
   * Serve a specific file from a journal entry
   */
  app.get('/api/journal-entries/:journalEntryId/files/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Same handler for direct file access
    const journalEntryId = parseInt(req.params.journalEntryId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(journalEntryId) || isNaN(fileId)) {
      throwBadRequest('Invalid journal entry ID or file ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Get the file metadata
    const file = await journalEntryStorage.getJournalEntryFile(fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Get the file storage implementation
    const fileStorage = getFileStorage();
    
    // Set response headers
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    
    // Log file view for audit purposes (async, don't await to improve response time)
    auditLogStorage.createAuditLog({
      action: 'journal_file_viewed',
      performedBy: (req.user as any).id,
      details: JSON.stringify({
        journalEntryId,
        fileId,
        filename: file.filename,
        inline: true
      })
    }).catch(err => console.error('Error creating audit log for file view:', err));
    
    try {
      // If the file is stored in the blob storage
      if (file.storageKey) {
        console.log(`Serving file from blob storage with key: ${file.storageKey}`);
        // Get the file content from blob storage
        const fileBuffer = await fileStorage.load(file.storageKey);
        
        // Send the file content
        return res.send(fileBuffer);
      } 
      // Handle legacy filesystem storage for backward compatibility
      else if (file.path) {
        console.log(`Serving legacy file from filesystem: ${file.path}`);
        // Handle both relative and absolute paths
        // If the path starts with /, it is a relative path from public directory
        const filePath = file.path.startsWith("/") 
          ? path.join(process.cwd(), "public", file.path) 
          : file.path;
        
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "File not found on server" });
        }
        
        // Stream the file to the response
        const fileStream = fs.createReadStream(file.path);
        return fileStream.pipe(res);
      }
      // If neither storageKey nor path is provided
      else if (file.data) {
        console.log(`Serving file from legacy data field`);
        // For backward compatibility: some files might have data directly in the metadata
        const fileBuffer = Buffer.from(file.data, 'base64');
        return res.send(fileBuffer);
      }
      else {
        return res.status(404).json({ message: "File content not found" });
      }
    } catch (error) {
      console.error(`Error serving file: ${error}`);
      return res.status(500).json({ message: "Error serving file" });
    }
  }));

  // Special download endpoint to make it clearer
  app.get('/api/journal-entries/:journalEntryId/files/:fileId/download', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const journalEntryId = parseInt(req.params.journalEntryId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(journalEntryId) || isNaN(fileId)) {
      throwBadRequest('Invalid journal entry ID or file ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Get file metadata directly using a more efficient method
    const file = await journalEntryStorage.getJournalEntryFile(fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Get the file storage implementation
    const fileStorage = getFileStorage();
    
    // Set headers for file download - force attachment
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    // Log file download for audit purposes (async, don't await to improve response time)
    auditLogStorage.createAuditLog({
      action: 'journal_file_downloaded',
      performedBy: (req.user as any).id,
      details: JSON.stringify({
        journalEntryId,
        fileId,
        filename: file.filename,
        inline: false
      })
    }).catch(err => console.error('Error creating audit log for file download:', err));
    
    try {
      // Check if the file has a storageKey (uses the blob storage)
      if (file.storageKey) {
        console.log(`Serving file ${file.filename} from blob storage with key ${file.storageKey}`);
        const buffer = await fileStorage.load(file.storageKey);
        return res.send(buffer);
      }
      
      // Legacy: Check if the file has data stored directly in the file record
      if (file.data) {
        console.log(`Serving file ${file.filename} from direct database storage`);
        const buffer = Buffer.from(file.data, 'base64');
        return res.send(buffer);
      }
      
      // Legacy support for file system stored files
      // Handle both relative and absolute paths
      // If the path starts with /, it is a relative path from public directory
      if (file.path) {
        const filePath = file.path.startsWith("/") 
          ? path.join(process.cwd(), "public", file.path) 
          : file.path;
        
        if (fs.existsSync(filePath)) {
          console.log(`Serving file ${file.filename} from filesystem: ${filePath}`);
          return fs.createReadStream(filePath).pipe(res);
        }
      }
      
      // If we get here, the file is not found in any storage location
      return res.status(404).json({ message: "File not found on server" });
    } catch (error) {
      console.error(`Error serving file: ${error}`);
      return res.status(500).json({ message: "Error serving file" });
    }
  }));
  
  /**
   * DELETE /api/journal-entries/:journalEntryId/files/:fileId
   * Delete a file attachment from a journal entry
   */
  app.delete('/api/journal-entries/:journalEntryId/files/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const journalEntryId = parseInt(req.params.journalEntryId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(journalEntryId) || isNaN(fileId)) {
      throwBadRequest('Invalid journal entry ID or file ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Check if user has permission to delete files
    // User must either:
    // 1. Be the creator of the journal entry, OR
    // 2. Have the JE_FILES_ADMIN role
    // Cast the user to the correct type with roles
    // The user object might not have roles directly attached, so we need to fetch them
    const userId = (req.user as any).id;
    const userRoles = await db.execute(
      `SELECT role_code FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    
    const roles = userRoles.rows.map(row => row.role_code);
    const user = { 
      id: userId, 
      roles 
    };
    
    const canDelete = 
      user.id === journalEntry.createdBy || 
      (user.roles && user.roles.includes('JE_FILES_ADMIN'));
    
    if (!canDelete) {
      // Log the denied attempt in audit log
      await auditLogStorage.createAuditLog({
        action: 'journal_file_delete_denied',
        performedBy: user.id,
        details: JSON.stringify({
          journalEntryId,
          fileId,
          reason: 'User is not the creator of the journal entry and does not have JE_FILES_ADMIN role'
        })
      });
      
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this file' });
    }
    
    // Get the file metadata before deleting to include in the audit log
    const file = await journalEntryStorage.getJournalEntryFile(fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Check if journal entry status allows file deletions (only draft or pending_approval)
    // Bug fix: This permission check was preventing edits to files on entries in draft status
    const allowedStatuses = ['draft', 'pending_approval'];
    const status = (journalEntry.status ?? '').toLowerCase();
    if (!allowedStatuses.includes(status)) {
      // Log the attempt for audit purposes
      await auditLogStorage.createAuditLog({
        action: 'journal_file_delete_denied',
        performedBy: (req.user as any).id,
        details: JSON.stringify({
          journalEntryId,
          fileId,
          status: journalEntry.status,
          reason: 'Journal entry status does not allow file deletions'
        })
      });
      
      throwForbidden(`Cannot delete files from journal entries with status: ${journalEntry.status}. Only entries in draft or pending_approval status can have files removed.`);
    }
    
    // Delete the file
    const result = await journalEntryStorage.deleteJournalEntryFile(fileId);
    
    if (!result) {
      throwNotFound('File');
    }
    
    // Log the deletion for audit purposes
    await auditLogStorage.createAuditLog({
      action: 'journal_file_deleted',
      performedBy: (req.user as any).id,
      details: JSON.stringify({
        journalEntryId,
        fileId,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType
      })
    });
    
    // Return success
    res.status(204).send();
  }));
  
  // Legacy routes that redirect to hierarchical routes
  
  /**
   * ⚠️ LEGACY ROUTE - WILL BE DEPRECATED ⚠️
   * Upload files to a journal entry (redirects to hierarchical route)
   */
  /**
   * ⚠️ LEGACY ROUTE - WILL BE DEPRECATED ⚠️
   * Upload a file to a journal entry (redirects to hierarchical route)
   */
  app.post('/api/journal-entries/:id/files', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Get the journal entry to find its entity ID
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the journal entry to find its entity ID
    const journalEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    const entityId = journalEntry.entityId;
    
    // Find the client ID from the entity ID
    const clientId = await getClientIdFromEntityId(entityId);
    
    if (!clientId) {
      throwNotFound('Client for this entity');
    }
    
    // Set Deprecation header
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
    res.setHeader('Link', `</api/clients/${clientId}/entities/${entityId}/journal-entries/${id}/files>; rel="successor-version"`);
    
    // Redirect to hierarchical route
    res.redirect(307, `/api/clients/${clientId}/entities/${entityId}/journal-entries/${id}/files`);
  }));
  
  /**
   * ⚠️ LEGACY ROUTE - WILL BE DEPRECATED ⚠️
   * Get all files for a journal entry (redirects to hierarchical route)
   */
  app.get('/api/journal-entries/:id/files', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Get the journal entry to find its entity ID
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      throwBadRequest('Invalid journal entry ID provided');
    }
    
    // Get the journal entry to find its entity ID
    const journalEntry = await journalEntryStorage.getJournalEntry(id);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    const entityId = journalEntry.entityId;
    
    // Find the client ID from the entity ID
    const clientId = await getClientIdFromEntityId(entityId);
    
    if (!clientId) {
      throwNotFound('Client for this entity');
    }
    
    // Set Deprecation header
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
    res.setHeader('Link', `</api/clients/${clientId}/entities/${entityId}/journal-entries/${id}/files>; rel="successor-version"`);
    
    // Redirect to hierarchical route
    res.redirect(307, `/api/clients/${clientId}/entities/${entityId}/journal-entries/${id}/files`);
  }));
  
  /**
   * ⚠️ LEGACY ROUTE - WILL BE DEPRECATED ⚠️
   * Get a specific file from a journal entry (redirects to hierarchical route)
   */
  app.get('/api/journal-entries/:journalEntryId/files/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Get the journal entry to find its entity ID
    const journalEntryId = parseInt(req.params.journalEntryId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(journalEntryId) || isNaN(fileId)) {
      throwBadRequest('Invalid journal entry ID or file ID provided');
    }
    
    // Get the journal entry to find its entity ID
    const journalEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    const entityId = journalEntry.entityId;
    
    // Find the client ID from the entity ID
    const clientId = await getClientIdFromEntityId(entityId);
    
    if (!clientId) {
      throwNotFound('Client for this entity');
    }
    
    // Set Deprecation header
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
    res.setHeader('Link', `</api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}>; rel="successor-version"`);
    
    // Redirect to hierarchical route
    res.redirect(307, `/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}`);
  }));
  
  /**
   * ⚠️ LEGACY ROUTE - WILL BE DEPRECATED ⚠️
   * Download a specific file from a journal entry (redirects to hierarchical route)
   */
  app.get('/api/journal-entries/:journalEntryId/files/:fileId/download', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Get the journal entry to find its entity ID
    const journalEntryId = parseInt(req.params.journalEntryId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(journalEntryId) || isNaN(fileId)) {
      throwBadRequest('Invalid journal entry ID or file ID provided');
    }
    
    // Get the journal entry to find its entity ID
    const journalEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    const entityId = journalEntry.entityId;
    
    // Find the client ID from the entity ID
    const clientId = await getClientIdFromEntityId(entityId);
    
    if (!clientId) {
      throwNotFound('Client for this entity');
    }
    
    // Set Deprecation header
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
    res.setHeader('Link', `</api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}/download>; rel="successor-version"`);
    
    // Redirect to hierarchical route
    res.redirect(307, `/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}/download`);
  }));
  
  /**
   * ⚠️ LEGACY ROUTE - WILL BE DEPRECATED ⚠️
   * Delete a file from a journal entry (redirects to hierarchical route)
   */
  app.delete('/api/journal-entries/:journalEntryId/files/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Get the journal entry to find its entity ID
    const journalEntryId = parseInt(req.params.journalEntryId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(journalEntryId) || isNaN(fileId)) {
      throwBadRequest('Invalid journal entry ID or file ID provided');
    }
    
    // Get the journal entry to find its entity ID
    const journalEntry = await journalEntryStorage.getJournalEntry(journalEntryId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    const entityId = journalEntry.entityId;
    
    // Find the client ID from the entity ID
    const clientId = await getClientIdFromEntityId(entityId);
    
    if (!clientId) {
      throwNotFound('Client for this entity');
    }
    
    // Set Deprecation header
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
    res.setHeader('Link', `</api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}>; rel="successor-version"`);
    
    // Redirect to hierarchical route
    res.redirect(307, `/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}`);
  }));

  /**
   * ---------------------------------------------------------------------------
   *  Hierarchical detail route GET /api/clients/:clientId/entities/:entityId/journal-entries/:id
   * ---------------------------------------------------------------------------
   */
  app.get(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity or journal entry ID');
      }

      // Optional validation: ensure entity belongs to client and journal entry belongs to entity
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      const journalEntry = await journalEntryStorage.getJournalEntry(id, true, true);
      
      if (!journalEntry) {
        return throwNotFound('Journal entry not found');
      }
      
      if (journalEntry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this entity');
      }

      res.json(journalEntry);
    })
  );
  
  /**
   * ---------------------------------------------------------------------------
   *  Hierarchical update route PUT /api/clients/:clientId/entities/:entityId/journal-entries/:id
   * ---------------------------------------------------------------------------
   */
  app.put(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);
      const user = req.user as { id: number };

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity or journal entry ID');
      }

      // Validate: ensure entity belongs to client
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      // Get the existing entry
      const existingEntry = await journalEntryStorage.getJournalEntry(id);
      
      if (!existingEntry) {
        return throwNotFound('Journal Entry');
      }
      
      // Verify this entry belongs to the specified entity
      if (existingEntry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this entity');
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
        
        // Update the journal entry with lines (dimension tags are handled automatically within this method)
        const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, entryData, lines);
        
        res.json(updatedEntry);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ errors: formatZodError(error) });
        }
        throw error;
      }
    })
  );

  /**
   * ---------------------------------------------------------------------------
   *  Copy journal entry POST /api/clients/:clientId/entities/:entityId/journal-entries/:id/copy
   * ---------------------------------------------------------------------------
   */
  app.post(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id/copy',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const originalEntryId = parseInt(req.params.id, 10);
      const user = req.user as { id: number };

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(originalEntryId)) {
        return throwBadRequest('Invalid client, entity or journal entry ID');
      }

      // Validate: ensure entity belongs to client
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      // Get the original entry to validate it exists and belongs to this entity
      const originalEntry = await journalEntryStorage.getJournalEntry(originalEntryId);
      
      if (!originalEntry) {
        return throwNotFound('Journal entry not found');
      }
      
      // Verify this entry belongs to the specified entity
      if (originalEntry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this entity');
      }
      
      // Check if the original entry can be copied (prevent copying voided entries)
      if (originalEntry.status === 'voided') {
        return throwBadRequest('Voided journal entries cannot be copied');
      }
      
      try {
        // Use the storage method to copy the journal entry
        const copiedEntry = await journalEntryStorage.copyJournalEntry(originalEntryId, user.id);
        
        console.log(`Successfully copied journal entry ${originalEntryId} to new entry ${copiedEntry.id}`);
        
        res.status(201).json(copiedEntry);
      } catch (error) {
        console.error('Error copying journal entry:', error);
        throw error;
      }
    })
  );

  /**
   * ---------------------------------------------------------------------------
   *  Hierarchical post route PUT /api/clients/:clientId/entities/:entityId/journal-entries/:id/post
   * ---------------------------------------------------------------------------
   */
  app.put(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id/post',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);
      const user = req.user as { id: number };

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity or journal entry ID');
      }

      // Validate: ensure entity belongs to client
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      // Get the existing entry
      const existingEntry = await journalEntryStorage.getJournalEntry(id);
      
      if (!existingEntry) {
        return throwNotFound('Journal Entry');
      }
      
      // Verify this entry belongs to the specified entity
      if (existingEntry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this entity');
      }
      
      // Check if entry can be posted
      if (existingEntry.status !== JournalEntryStatus.DRAFT && 
          existingEntry.status !== JournalEntryStatus.PENDING_APPROVAL) {
        return throwBadRequest(`Cannot post a journal entry with status '${existingEntry.status}'`);
      }
      
      try {
        // Get the existing lines with their dimension tags before posting
        console.log(`POSTING DEBUG: Getting lines with dimension tags for journal entry ${id}`);
        const existingLines = await journalEntryStorage.getJournalEntryLines(id);
        console.log(`POSTING DEBUG: Found ${existingLines.length} lines with dimension tags`);
        
        // Update the status to POSTED while preserving the lines and their dimension tags
        const updatedEntry = await journalEntryStorage.updateJournalEntryWithLines(id, {
          status: JournalEntryStatus.POSTED,
          postedBy: user.id,
          postedAt: new Date(),
          updatedBy: user.id
        }, existingLines);
        
        console.log(`POSTING DEBUG: Successfully posted journal entry ${id} with preserved dimension tags`);
        
        // Check if the entry was an accrual and has a reversal date
        if (updatedEntry.isAccrual && updatedEntry.reversalDate) {
          try {
            console.log(`ACCRUAL: Immediately creating and posting reversal for entry ${id} with reversal date ${updatedEntry.reversalDate}`);

            // Call the reverseJournalEntry method with the new options
            await journalEntryStorage.reverseJournalEntry(id, {
              date: new Date(updatedEntry.reversalDate),
              description: `Automatic reversal of: ${updatedEntry.description}`,
              createdBy: user.id,
              postAutomatically: true // This new flag ensures it's posted
            });

            console.log(`ACCRUAL: Successfully created and posted reversal for entry ${id}.`);

            // Optionally, add a specific toast message or log for the user
            // (This would require modifying the API response, can be a future enhancement)

          } catch (reversalError) {
            // Log an error if the automatic reversal fails, but don't fail the original transaction
            console.error(`CRITICAL ERROR: Failed to create automatic reversal for posted accrual entry ${id}:`, reversalError);
            // In a real system, we would add this failed job to a dead-letter queue for admin review.
          }
        }
        
        res.json(updatedEntry);
      } catch (error) {
        console.error(`POSTING DEBUG: Error posting journal entry ${id}:`, error);
        throw error;
      }
    })
  );

  /**
   * ---------------------------------------------------------------------------
   * Hierarchical reverse route POST /api/clients/:clientId/entities/:entityId/journal-entries/:id/reverse
   * ---------------------------------------------------------------------------
   */
  app.post(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id/reverse',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);
      const user = req.user as { id: number };

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity, or journal entry ID');
      }

      // Validate: ensure entity belongs to client
      const entity = await db.query.entities.findFirst({
        where: (entities, { eq, and }) => and(
          eq(entities.id, entityId),
          eq(entities.clientId, clientId)
        )
      });
      
      if (!entity) {
        return throwNotFound('Entity not found for this client');
      }

      // Get the existing entry to verify it exists and belongs to this entity
      const existingEntry = await journalEntryStorage.getJournalEntry(id);
      
      if (!existingEntry) {
        return throwNotFound('Journal Entry');
      }
      
      // Verify this entry belongs to the specified entity
      if (existingEntry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this entity');
      }

      // The business logic is already in the storage layer. We just need to call it.
      const reversalOptions = {
        date: req.body.date, // Optional date from request body
        description: req.body.description, // Optional description from request body
        createdBy: user.id,
      };

      const reversalEntry = await journalEntryStorage.reverseJournalEntry(id, reversalOptions);

      res.status(201).json({
        message: 'Journal entry reversed successfully. A new draft has been created.',
        entry: reversalEntry,
      });
    })
  );

  /**
   * ---------------------------------------------------------------------------
   * Hierarchical delete route DELETE /api/clients/:clientId/entities/:entityId/journal-entries/:id
   * ---------------------------------------------------------------------------
   */
  app.delete(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity, or journal entry ID');
      }

      // Validate: ensure entry belongs to the client/entity
      const entry = await journalEntryStorage.getJournalEntry(id);
      if (!entry || entry.clientId !== clientId || entry.entityId !== entityId) {
        return throwNotFound('Journal entry not found for this client and entity.');
      }

      // Only allow deletion of drafts
      if (entry.status !== 'draft') {
        return throwBadRequest(`Cannot delete a journal entry with status '${entry.status}'. You can only delete drafts.`);
      }

      // Call the storage function to perform the deletion
      await journalEntryStorage.deleteJournalEntry(id);

      res.status(204).send(); // 204 No Content is standard for a successful DELETE
    })
  );

  /**
   * ---------------------------------------------------------------------------
   * Hierarchical void route POST /api/clients/:clientId/entities/:entityId/journal-entries/:id/void
   * ---------------------------------------------------------------------------
   */
  app.post(
    '/api/clients/:clientId/entities/:entityId/journal-entries/:id/void',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = parseInt(req.params.clientId, 10);
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);
      const user = req.user as { id: number, role?: string };
      const { voidReason } = req.body;

      if (Number.isNaN(clientId) || Number.isNaN(entityId) || Number.isNaN(id)) {
        return throwBadRequest('Invalid client, entity, or journal entry ID');
      }

      // Check for admin role
      if (user.role !== 'admin') {
        return throwForbidden('Only administrators can void posted journal entries.');
      }

      // Check for void reason
      if (!voidReason) {
        return throwBadRequest('A reason is required to void a posted journal entry.');
      }

      // Get the entry to be voided
      const originalEntry = await journalEntryStorage.getJournalEntry(id);
      if (!originalEntry || originalEntry.entityId !== entityId || originalEntry.clientId !== clientId) {
        return throwNotFound('Journal Entry not found for the specified client and entity.');
      }

      // Only "posted" entries can be voided
      if (originalEntry.status !== 'posted') {
        return throwBadRequest(`Cannot void a journal entry with status '${originalEntry.status}'.`);
      }

      // Update the entry status to 'void'
      const voidedEntry = await journalEntryStorage.updateJournalEntry(id, {
        status: 'void',
        rejectionReason: voidReason, // Use rejectionReason field to store the void reason
        rejectedBy: user.id, // Log who voided the entry
        rejectedAt: new Date(),
      });

      res.status(200).json({
        message: 'Journal entry has been voided successfully.',
        entry: voidedEntry,
      });
    })
  );

  /**
   * Legacy redirect for journal entry detail route
   */
  app.get(
    '/api/entities/:entityId/journal-entries/:id',
    asyncHandler(async (req: Request, res: Response, next) => {
      const entityId = parseInt(req.params.entityId, 10);
      const id = parseInt(req.params.id, 10);
      
      // Skip if this is a test request or no redirection is needed
      if (req.query.skipRedirect === 'true') {
        return next();
      }
      
      try {
        // Get client ID from entity ID and redirect
        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, entityId)
        });
        
        if (!entity) {
          return res.status(404).json({ message: 'Entity not found' });
        }
        
        console.log(`DEBUG: Redirecting legacy journal entry detail request to hierarchical URL pattern for entity ${entityId} under client ${entity.clientId}, journal entry ${id}`);
        return res.redirect(307, `/api/clients/${entity.clientId}/entities/${entityId}/journal-entries/${id}`);
      } catch (error) {
        console.error('Error during redirect:', error);
        return next();
      }
    })
  );
}