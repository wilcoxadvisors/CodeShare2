import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import { asyncHandler, throwNotFound, throwBadRequest } from './errorHandling';
import { 
  insertJournalEntrySchema, 
  insertJournalEntryLineSchema,
  JournalEntryStatus
} from '../shared/schema';
import { ZodError } from 'zod';
import { formatZodError } from '../shared/validation';

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
    const user = req.user as { id: number };
    
    try {
      // Parse main entry data
      const journalEntryData = insertJournalEntrySchema.parse({
        ...req.body.entry,
        createdBy: user.id
      });
      
      // Parse lines data
      const linesData = req.body.lines || [];
      
      // Validate that we have at least one line
      if (!linesData.length) {
        throwBadRequest('Journal entry must have at least one line');
      }
      
      // Parse each line
      const parsedLines = linesData.map((line: any) => {
        return insertJournalEntryLineSchema.parse(line);
      });
      
      // Check if debits equal credits
      let totalDebits = 0;
      let totalCredits = 0;
      
      parsedLines.forEach((line: any) => {
        if (line.type === 'debit') {
          totalDebits += parseFloat(line.amount);
        } else {
          totalCredits += parseFloat(line.amount);
        }
      });
      
      // Verify that debits = credits (within a small epsilon for floating point comparisons)
      const epsilon = 0.001;
      if (Math.abs(totalDebits - totalCredits) > epsilon) {
        throwBadRequest('Journal entry must balance: total debits must equal total credits');
      }
      
      // Create journal entry with lines
      const journalEntry = await storage.createJournalEntry(journalEntryData, parsedLines);
      
      res.status(201).json(journalEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: formatZodError(error) });
      }
      throw error;
    }
  }));
  
  /**
   * Get all journal entries with filtering
   */
  app.get('/api/journal-entries', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { 
      clientId, 
      entityId, 
      status, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    } = req.query;
    
    const entries = await storage.listJournalEntries({
      clientId: clientId ? parseInt(clientId as string) : undefined,
      entityId: entityId ? parseInt(entityId as string) : undefined,
      status: status as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0
    });
    
    res.json(entries);
  }));
  
  /**
   * Get a specific journal entry with its lines
   */
  app.get('/api/journal-entries/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
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
      // Partial update for the main entry
      const entryData = {
        ...req.body.entry
      };
      
      // Parse lines data
      const linesData = req.body.lines || [];
      
      // Validate that we have at least one line
      if (!linesData.length) {
        throwBadRequest('Journal entry must have at least one line');
      }
      
      // Check if debits equal credits for the updated lines
      let totalDebits = 0;
      let totalCredits = 0;
      
      linesData.forEach((line: any) => {
        // Type may come from existing line or new one
        const lineType = line.type || (existingEntry.lines.find(l => l.id === line.id)?.type);
        // Amount may come from existing line or new one
        const lineAmount = line.amount || (existingEntry.lines.find(l => l.id === line.id)?.amount);
        
        if (lineType === 'debit') {
          totalDebits += parseFloat(lineAmount);
        } else {
          totalCredits += parseFloat(lineAmount);
        }
      });
      
      // Verify that debits = credits (within a small epsilon for floating point comparisons)
      const epsilon = 0.001;
      if (Math.abs(totalDebits - totalCredits) > epsilon) {
        throwBadRequest('Journal entry must balance: total debits must equal total credits');
      }
      
      // Update the journal entry
      const updatedEntry = await storage.updateJournalEntry(id, entryData, linesData);
      
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
      // Parse and validate line data
      const lineData = insertJournalEntryLineSchema.parse({
        ...req.body,
        journalEntryId
      });
      
      // Add the new line
      const newLine = await storage.addJournalEntryLine(lineData);
      
      // Check if the journal entry is still balanced
      const updatedEntry = await storage.getJournalEntry(journalEntryId);
      
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
      // Update the line
      const updatedLine = await storage.updateJournalEntryLine(lineId, req.body);
      
      if (!updatedLine) {
        throwNotFound('Journal Entry Line');
      }
      
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
      // Extract the reversal options
      const { date, description, referenceNumber } = req.body;
      
      // Create the reversal entry
      const reversalEntry = await storage.reverseJournalEntry(id, {
        date: date ? new Date(date) : undefined,
        description: description || `Reversal of ${existingEntry.referenceNumber || id}`,
        createdBy: user.id,
        referenceNumber: referenceNumber || `REV-${existingEntry.referenceNumber || id}`
      });
      
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