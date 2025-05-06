import { Express, Request, Response, Router } from 'express';
import { asyncHandler, throwBadRequest, throwForbidden, throwNotFound } from './errorHandling';
import { isAuthenticated } from './auth';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { journalEntryStorage } from './storage/journalEntryStorage';
import { auditLogStorage } from './storage/auditLogStorage';
import { getFileStorage } from './storage/fileStorage';

/**
 * Register hierarchical attachment routes for journal entries
 */
export function registerAttachmentRoutes(app: Express) {
  // Configure allowed file types
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
  
  // Configure rate limiting for file uploads - 50 files per user per 10-minute window
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

  // Create a router that will merge params from parent router
  const router = Router({ mergeParams: true });

  /**
   * Upload file(s) to a journal entry - hierarchical route
   */
  router.post('/', 
    isAuthenticated,
    uploadLimiter,
    upload.array('files', 10), // Support multiple files with a limit of 10
    asyncHandler(async (req: Request, res: Response) => {
      const jeId = parseInt(req.params.jeId);
      const entityId = parseInt(req.params.eId);
      const clientId = parseInt(req.params.cId);
      const user = req.user as { id: number };
      
      console.log('DEBUG Attach BE: Received params:', {
        clientId,
        entityId,
        jeId,
        files: req.files?.length || 0
      });
      
      if (isNaN(jeId) || isNaN(entityId) || isNaN(clientId)) {
        throwBadRequest('Invalid ID provided - Journal Entry, Entity, or Client ID is not a number');
      }
      
      // Get the existing entry to check its status
      const journalEntry = await journalEntryStorage.getJournalEntry(jeId);
      
      if (!journalEntry) {
        throwNotFound('Journal Entry');
      }
      
      // Verify that the journal entry belongs to the specified entity
      if (journalEntry.entityId !== entityId) {
        throwForbidden('Journal entry does not belong to the specified entity');
      }
      
      // Check if journal entry status allows file attachments (only draft or pending_approval)
      const allowedStatuses = ['draft', 'pending_approval'];
      const status = (journalEntry.status ?? '').toLowerCase();
      if (!allowedStatuses.includes(status)) {
        // Log the attempt for audit purposes
        await auditLogStorage.createAuditLog({
          action: 'journal_file_upload_denied',
          performedBy: user.id,
          details: JSON.stringify({
            journalEntryId: jeId,
            status: journalEntry.status,
            clientId,
            entityId
          })
        });
        
        throwForbidden(`File uploads are only allowed for entries in draft or pending approval status. Current status: ${journalEntry.status}`);
      }
      
      // Check if files were included in the request
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throwBadRequest('No files were uploaded');
      }
      
      // Filter out files with disallowed types
      const validFiles = (req.files as Express.Multer.File[]).filter(file => 
        isAllowedFileType(file.mimetype)
      );
      
      const skippedFiles = (req.files as Express.Multer.File[]).filter(file => 
        !isAllowedFileType(file.mimetype)
      );
      
      if (validFiles.length === 0) {
        throwBadRequest(`No valid files were uploaded. Allowed file types: PDF, Office documents, images, text files, CSV. Rejected files: ${skippedFiles.map(f => f.originalname).join(', ')}`);
      }
      
      // Get the file storage implementation
      const fileStorage = getFileStorage();
      
      try {
        // Process each file and store metadata in the database
        const savedFiles = [];
        
        for (const file of validFiles) {
          // Store the file in the database
          const savedFile = await journalEntryStorage.saveJournalEntryFile({
            journalEntryId: jeId,
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: user.id,
            fileData: file.buffer.toString('base64')
          });
          
          // Add the saved file to the list
          savedFiles.push({
            id: savedFile.id,
            filename: savedFile.filename,
            mimeType: savedFile.mimeType,
            size: savedFile.size
          });
          
          // Log the upload for audit purposes (async, don't await to improve response time)
          auditLogStorage.createAuditLog({
            action: 'journal_file_uploaded',
            performedBy: user.id,
            details: JSON.stringify({
              journalEntryId: jeId,
              fileId: savedFile.id,
              filename: savedFile.filename,
              size: savedFile.size,
              clientId,
              entityId
            })
          }).catch(err => console.error('Error creating audit log for file upload:', err));
        }
        
        // If there were any skipped files, include them in the response
        if (skippedFiles.length > 0) {
          res.status(207).json({
            message: 'Some files were uploaded successfully, but others were skipped due to invalid file types',
            files: savedFiles,
            skipped: skippedFiles.map(f => ({ 
              filename: f.originalname, 
              reason: 'Unsupported file type' 
            }))
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
   * Get all files attached to a journal entry - hierarchical route
   */
  router.get('/', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const jeId = parseInt(req.params.jeId);
    const entityId = parseInt(req.params.eId);
    const clientId = parseInt(req.params.cId);
    
    console.log('DEBUG Attach BE: Get files for journal entry ID:', { jeId, entityId, clientId });
    
    if (isNaN(jeId) || isNaN(entityId) || isNaN(clientId)) {
      throwBadRequest('Invalid ID provided - Journal Entry, Entity, or Client ID is not a number');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(jeId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Verify that the journal entry belongs to the specified entity
    if (journalEntry.entityId !== entityId) {
      throwForbidden('Journal entry does not belong to the specified entity');
    }
    
    // Get the files for this journal entry
    const files = await journalEntryStorage.getJournalEntryFiles(jeId);
    
    console.log('DEBUG Attach BE: Files retrieved for entry', jeId, ':', files?.length || 0);
    
    // Always return an array (even if empty) to avoid "attachments.map is not a function" error
    res.json(files || []);
  }));

  /**
   * Get a specific file from a journal entry - hierarchical route
   */
  router.get('/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const jeId = parseInt(req.params.jeId);
    const entityId = parseInt(req.params.eId);
    const clientId = parseInt(req.params.cId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(jeId) || isNaN(entityId) || isNaN(clientId) || isNaN(fileId)) {
      throwBadRequest('Invalid ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(jeId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Verify that the journal entry belongs to the specified entity
    if (journalEntry.entityId !== entityId) {
      throwForbidden('Journal entry does not belong to the specified entity');
    }
    
    // Get the file metadata
    const file = await journalEntryStorage.getJournalEntryFile(fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Verify that the file belongs to the journal entry
    if (file.journalEntryId !== jeId) {
      throwForbidden('File does not belong to the specified journal entry');
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
        journalEntryId: jeId,
        fileId,
        filename: file.filename,
        inline: true,
        clientId,
        entityId
      })
    }).catch(err => console.error('Error creating audit log for file view:', err));
    
    try {
      // If the file is stored in the blob storage
      if (file.storageKey) {
        // Get the file data
        const fileData = await journalEntryStorage.getJournalEntryFileData(file.storageKey);
        
        if (!fileData) {
          throwNotFound('File data');
        }
        
        // Send the file as a response
        const buffer = Buffer.from(fileData.data, 'base64');
        res.end(buffer);
      }
      // If the file is stored in the filesystem (legacy)
      else if (file.path) {
        // Send the file from the filesystem
        res.sendFile(file.path);
      }
      // If neither storage method is available
      else {
        throwNotFound('File data');
      }
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  }));

  /**
   * Download a specific file from a journal entry - hierarchical route
   */
  router.get('/:fileId/download', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const jeId = parseInt(req.params.jeId);
    const entityId = parseInt(req.params.eId);
    const clientId = parseInt(req.params.cId);
    const fileId = parseInt(req.params.fileId);
    
    if (isNaN(jeId) || isNaN(entityId) || isNaN(clientId) || isNaN(fileId)) {
      throwBadRequest('Invalid ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(jeId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Verify that the journal entry belongs to the specified entity
    if (journalEntry.entityId !== entityId) {
      throwForbidden('Journal entry does not belong to the specified entity');
    }
    
    // Get the file metadata
    const file = await journalEntryStorage.getJournalEntryFile(fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Verify that the file belongs to the journal entry
    if (file.journalEntryId !== jeId) {
      throwForbidden('File does not belong to the specified journal entry');
    }
    
    // For download, set content disposition to attachment
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    // Log file download for audit purposes (async, don't await to improve response time)
    auditLogStorage.createAuditLog({
      action: 'journal_file_downloaded',
      performedBy: (req.user as any).id,
      details: JSON.stringify({
        journalEntryId: jeId,
        fileId,
        filename: file.filename,
        clientId,
        entityId
      })
    }).catch(err => console.error('Error creating audit log for file download:', err));
    
    try {
      // If the file is stored in the blob storage
      if (file.storageKey) {
        // Get the file data
        const fileData = await journalEntryStorage.getJournalEntryFileData(file.storageKey);
        
        if (!fileData) {
          throwNotFound('File data');
        }
        
        // Send the file as a response
        const buffer = Buffer.from(fileData.data, 'base64');
        res.end(buffer);
      }
      // If the file is stored in the filesystem (legacy)
      else if (file.path) {
        // Send the file from the filesystem
        res.download(file.path, file.filename);
      }
      // If neither storage method is available
      else {
        throwNotFound('File data');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }));

  /**
   * Delete a file from a journal entry - hierarchical route
   */
  router.delete('/:fileId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const jeId = parseInt(req.params.jeId);
    const entityId = parseInt(req.params.eId);
    const clientId = parseInt(req.params.cId);
    const fileId = parseInt(req.params.fileId);
    const user = req.user as { id: number };
    
    if (isNaN(jeId) || isNaN(entityId) || isNaN(clientId) || isNaN(fileId)) {
      throwBadRequest('Invalid ID provided');
    }
    
    // Check that the journal entry exists
    const journalEntry = await journalEntryStorage.getJournalEntry(jeId);
    
    if (!journalEntry) {
      throwNotFound('Journal Entry');
    }
    
    // Verify that the journal entry belongs to the specified entity
    if (journalEntry.entityId !== entityId) {
      throwForbidden('Journal entry does not belong to the specified entity');
    }
    
    // Check if journal entry status allows file deletion (only draft or pending_approval)
    const allowedStatuses = ['draft', 'pending_approval'];
    const status = (journalEntry.status ?? '').toLowerCase();
    if (!allowedStatuses.includes(status)) {
      // Log the attempt for audit purposes
      await auditLogStorage.createAuditLog({
        action: 'journal_file_delete_denied',
        performedBy: user.id,
        details: JSON.stringify({
          journalEntryId: jeId,
          fileId,
          status: journalEntry.status,
          clientId,
          entityId
        })
      });
      
      throwForbidden(`File deletion is only allowed for entries in draft or pending approval status. Current status: ${journalEntry.status}`);
    }
    
    // Get the file metadata
    const file = await journalEntryStorage.getJournalEntryFile(fileId);
    
    if (!file) {
      throwNotFound('File');
    }
    
    // Verify that the file belongs to the journal entry
    if (file.journalEntryId !== jeId) {
      throwForbidden('File does not belong to the specified journal entry');
    }
    
    // Delete the file
    await journalEntryStorage.deleteJournalEntryFile(fileId);
    
    // Log file deletion for audit purposes (async, don't await to improve response time)
    auditLogStorage.createAuditLog({
      action: 'journal_file_deleted',
      performedBy: user.id,
      details: JSON.stringify({
        journalEntryId: jeId,
        fileId,
        filename: file.filename,
        clientId,
        entityId
      })
    }).catch(err => console.error('Error creating audit log for file deletion:', err));
    
    // Return success response
    res.json({ message: 'File deleted successfully' });
  }));
  
  // Register the hierarchical route
  app.use('/api/clients/:cId/entities/:eId/journal-entries/:jeId/files', router);
  
  // Legacy routes that redirect to the hierarchical paths will be handled separately
}