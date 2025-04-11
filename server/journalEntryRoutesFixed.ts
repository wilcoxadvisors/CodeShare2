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
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

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
 * Helper function to serve files with proper path resolution
 */
const serveFileWithCorrectPath = (file: any, res: Response) => {
  // Try the path as is first
  let filePath = path.join(process.cwd(), file.path);
  
  // If not found, try in the public directory (removing leading slash if present)
  if (!fs.existsSync(filePath)) {
    const publicPath = path.join(process.cwd(), 'public', file.path.replace(/^\//, ''));
    
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
      console.log(`File found at public path: ${filePath}`);
    } else {
      console.error(`File not found at either path: ${filePath} or ${publicPath}`);
      return res.status(404).json({ message: 'File not found on server' });
    }
  }
  
  // Serve the file
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  
  // Stream the file to the response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  return true;
};

/**
 * Register file serving routes
 */
export function registerFileServingRoutes(app: Express) {
  /**
   * Serve a specific file from a journal entry
   */
  app.get('/api/journal-entries/:journalEntryId/files/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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
    
    // Get all files for this journal entry
    const files = await journalEntryStorage.getJournalEntryFiles(journalEntryId);
    
    // Find the requested file
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Serve the file with proper path resolution
    return serveFileWithCorrectPath(file, res);
  }));

  /**
   * Serve a specific file from a journal entry with download header
   */
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
    
    // Get all files for this journal entry
    const files = await journalEntryStorage.getJournalEntryFiles(journalEntryId);
    
    // Find the requested file
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Serve the file with proper path resolution
    return serveFileWithCorrectPath(file, res);
  }));
}