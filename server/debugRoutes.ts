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
      const requiredFields = ['clientId', 'entityId', 'date'];
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
      
      // Prepare journal entry data with defaults
      const journalEntryData = {
        ...entryData,
        // Set defaults for optional fields
        status: entryData.status || 'draft',
        journalType: entryData.journalType || 'JE',
        referenceNumber: entryData.referenceNumber || `DEBUG-${Date.now()}`,
        description: entryData.description || 'Debug journal entry'
      };
      
      console.log('Prepared entry data:', JSON.stringify(journalEntryData, null, 2));
      
      // Create journal entry with direct database access to bypass potential issues
      try {
        const journalEntry = await storage.createJournalEntry(journalEntryData, lines);
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