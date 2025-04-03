import { Express, Request, Response } from 'express';
import { IStorage } from './storage';

/**
 * Register debugging routes for development only
 */
export function registerDebugRoutes(app: Express, storage: IStorage): void {
  /**
   * Test route for creating a journal entry
   */
  app.post('/api/debug/journal-entries', async (req: Request, res: Response) => {
    try {
      console.log('=== DEBUG CREATE JOURNAL ENTRY ===');
      console.log('Headers:', req.headers);
      console.log('Raw body:', req.body);
      
      // Extract data from request
      const { lines = [], ...entryData } = req.body;
      
      console.log('Entry data:', JSON.stringify(entryData, null, 2));
      console.log('Lines data:', JSON.stringify(lines, null, 2));
      console.log('Lines is array?', Array.isArray(lines));
      
      // Set a default user ID for testing
      if (!entryData.createdBy) {
        entryData.createdBy = 1;
      }
      
      // Validate minimum data
      const requiredFields = ['clientId', 'entityId', 'date', 'createdBy'];
      const missingFields = requiredFields.filter(field => !entryData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }
      
      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ 
          message: "Journal entry must have at least one line"
        });
      }
      
      // Properly handle date using the validation schema approach
      console.log('Original date value:', entryData.date);
      
      // Use the preprocessing logic from our validation schema
      let parsedDate;
      if (typeof entryData.date === "string") {
        parsedDate = new Date(entryData.date);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            message: "Invalid date format. Please provide a valid date string."
          });
        }
      } else if (entryData.date instanceof Date) {
        parsedDate = entryData.date;
      } else {
        return res.status(400).json({
          message: "Date is required and must be a valid date string or Date object."
        });
      }

      console.log('Parsed date:', parsedDate);
      console.log('Parsed date ISO:', parsedDate.toISOString());
      console.log('Parsed date time value:', parsedDate.getTime());
      
      // Create clean entry data object with Date object (not string)
      const journalEntryData = {
        clientId: entryData.clientId,
        entityId: entryData.entityId,
        date: parsedDate,
        createdBy: entryData.createdBy,
        referenceNumber: entryData.referenceNumber || `DEBUG-${Date.now()}`,
        description: entryData.description || 'Debug journal entry',
        status: entryData.status || 'draft',
        journalType: entryData.journalType || 'JE',
        isSystemGenerated: entryData.isSystemGenerated || false
      };
    
      console.log('Prepared entry data:', JSON.stringify(journalEntryData, null, 2));
      
      // Create journal entry with direct database access to bypass potential issues
      try {
        const journalEntry = await storage.createJournalEntry(journalEntryData.clientId, journalEntryData.createdBy, journalEntryData, lines);
        console.log('Journal entry created successfully:', journalEntry);
        res.status(201).json(journalEntry);
      } catch (storageError: any) {
        console.error('Storage error:', storageError);
        
        return res.status(500).json({
          message: "Error creating journal entry",
          error: storageError.message || 'Unknown error',
          stack: storageError.stack
        });
      }
    } catch (error: any) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        message: "Server error", 
        error: error.message || 'Unknown error',
        stack: error.stack 
      });
    }
  });
}