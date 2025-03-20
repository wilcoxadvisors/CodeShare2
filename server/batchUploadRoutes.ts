// server/batchUploadRoutes.ts
import { Express, Request, Response } from 'express';
import { db } from './db';
import { IStorage } from './storage';
import { asyncHandler, throwBadRequest, throwUnauthorized } from './errorHandling';
import { z } from 'zod';
import { enhancedJournalEntrySchema, enhancedJournalEntryLineSchema } from '../shared/validation';
import { JournalEntryStatus } from '../shared/schema';

// Define validator for the batch upload request body
const batchJournalEntrySchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().optional(),
  lines: z.array(
    z.object({
      accountId: z.number().int().positive("Account ID must be a positive integer"),
      description: z.string().optional(),
      debit: z.string().optional().default("0"),
      credit: z.string().optional().default("0"),
      entityId: z.number().int().positive()
    })
  ).min(2, "At least two lines are required for a journal entry")
});

const batchUploadSchema = z.object({
  entries: z.array(batchJournalEntrySchema)
});

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
  // TypeScript complains about req.session.user, but we know it exists
  // because we set it during login in routes.ts
  if (!req.session || !(req.session as any).user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerBatchUploadRoutes(app: Express, storage: IStorage) {
  /**
   * Batch create journal entries
   * Optimized for performance with larger datasets
   */
  app.post('/api/entities/:entityId/journal-entries/batch', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const entityId = parseInt(req.params.entityId);
    const userId = ((req.session as any).user as AuthUser).id;
    
    // Get entity to validate existence and user access
    const entity = await storage.getEntity(entityId);
    if (!entity) {
      throwBadRequest(`Entity with ID ${entityId} not found`);
    }
    
    // Verify user has access to this entity
    const accessLevel = await storage.getUserEntityAccess(userId, entityId);
    if (!accessLevel) {
      throwUnauthorized("You don't have access to this entity");
    }
    
    // Validate request body
    const validation = batchUploadSchema.safeParse(req.body);
    if (!validation.success) {
      throwBadRequest("Invalid request body", validation.error.format());
    }
    
    const { entries } = validation.data;
    
    if (entries.length === 0) {
      throwBadRequest("No entries provided");
    }
    
    // For tracking created entries
    const createdEntries: any[] = [];
    const errors: any[] = [];
    
    // Use a transaction for all entries to ensure data consistency
    await db.transaction(async (tx) => {
      // Process each entry in the batch
      for (const entry of entries) {
        try {
          // Prepare journal entry data
          const journalEntryData = {
            entityId,
            journalId: 1, // Default to general journal ID 1, can be configured if needed
            reference: entry.reference,
            date: new Date(entry.date),
            description: entry.description || null,
            status: JournalEntryStatus.DRAFT,
            createdBy: userId,
            createdAt: new Date(),
          };
          
          // Create the journal entry
          const createdEntry = await storage.createJournalEntry(journalEntryData);
          
          // Process each line
          for (const line of entry.lines) {
            // Create journal entry line
            await storage.createJournalEntryLine({
              journalEntryId: createdEntry.id,
              accountId: line.accountId,
              description: line.description || null,
              debit: line.debit,
              credit: line.credit,
              entityId: entityId
            });
          }
          
          // Add to successful entries
          createdEntries.push({
            id: createdEntry.id,
            reference: createdEntry.reference
          });
        } catch (error: any) {
          // Collect errors but continue processing other entries
          errors.push({
            reference: entry.reference,
            error: error.message
          });
        }
      }
    });
    
    // Log activity
    if (createdEntries.length > 0) {
      await storage.logUserActivity({
        userId,
        entityId,
        action: 'batch_create',
        resourceType: 'journal_entry',
        resourceId: null,
        details: `Batch created ${createdEntries.length} journal entries`
      });
    }
    
    // Return results
    res.status(201).json({
      success: true,
      message: `Successfully processed ${entries.length} entries`,
      created: createdEntries.length,
      failed: errors.length,
      entries: createdEntries,
      errors
    });
  }));
}