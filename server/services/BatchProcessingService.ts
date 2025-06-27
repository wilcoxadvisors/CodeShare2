import { db } from '../db';
import { journalEntries, journalEntryLines, txDimensionLink, entities, journalEntryFiles } from '../../shared/schema';
import { and, eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class BatchProcessingService {
  public async processBatch(
    approvedEntries: any[], 
    clientId: number, 
    entityId: number, 
    batchSettings?: {
      importMode?: string;
      description?: string;
      referenceSuffix?: string;
      batchDate?: string;
      isAccrual?: boolean;
      reversalDate?: string;
    },
    pendingAttachments?: any[]
  ) {
    // Wrap the entire batch processing in a single database transaction
    return await db.transaction(async (tx) => {
      let createdCount = 0;
      const createdEntryIds: number[] = [];

      for (const entryGroup of approvedEntries) {
        try {
          // 1. Create the main Journal Entry record
          // Format date consistently
          const entryDate = typeof entryGroup.header.Date === 'string' 
            ? entryGroup.header.Date
            : new Date(entryGroup.header.Date).toISOString().split('T')[0];

          // Get the actual clientId from the entity (since entities are linked to clients)
          // First, let's query the entity to get the correct clientId
          const entityQuery = await tx.select({ clientId: entities.clientId }).from(entities).where(eq(entities.id, entityId)).limit(1);
          if (entityQuery.length === 0) {
            throw new Error(`Entity with ID ${entityId} not found`);
          }
          const actualClientId = entityQuery[0].clientId;

          // Generate reference number with optional suffix
          let baseReference = entryGroup.header.Reference || `BATCH-${actualClientId}-${entityId}-${Date.now()}-${createdCount + 1}`;
          if (batchSettings?.referenceSuffix) {
            baseReference = `${baseReference}:${batchSettings.referenceSuffix}`;
          }

          // Determine entry status based on import mode (Dual-Path Logic)
          let entryStatus = 'draft'; // Default for standard mode
          if (batchSettings?.importMode === 'historical') {
            entryStatus = 'posted'; // Historical imports go directly to posted
          }

          // Apply header data from batch settings
          const entryDescription = batchSettings?.description || entryGroup.header.Description || 'Batch import entry';

          // Use minimal insert data object with only required fields
          const journalEntryData: any = {
            entityId: entityId,
            clientId: actualClientId, // Use the client ID from the entity
            date: entryDate,
            referenceNumber: baseReference,
            description: entryDescription,
            status: entryStatus, // Dynamic status based on import mode
            createdBy: 1, // TODO: Get actual user ID from request context
            isSystemGenerated: false,
            isAccrual: batchSettings?.isAccrual || false, // Apply accrual settings
            reversalDate: batchSettings?.reversalDate || null, // Apply reversal date if provided
          };

          console.log('ARCHITECT_DEBUG: Processing entry in mode:', batchSettings?.importMode || 'standard');
          console.log('ARCHITECT_DEBUG: Creating journal entry with data:', journalEntryData);

          const [newEntry] = await tx.insert(journalEntries).values(journalEntryData).returning();
          console.log('ARCHITECT_DEBUG: Created journal entry:', newEntry.id);

          // 2. Create the Journal Entry Lines
          for (const line of entryGroup.lines) {
            // Determine amount and type based on the parsed data structure
            const amount = Math.abs(line.amount);
            const type = line.amount >= 0 ? 'debit' : 'credit';

            const lineData: any = {
              journalEntryId: newEntry.id,
              accountId: line.accountId, // Assumes validation has provided the ID
              amount: amount.toString(),
              type: type,
              description: line.description || '',
              entityCode: line.entityCode || entityId.toString(),
            };

            console.log('ARCHITECT_DEBUG: Creating journal entry line:', lineData);

            const [newLine] = await tx.insert(journalEntryLines).values(lineData).returning();

            // 3. Create the Dimension Links (if any)
            if (line.dimensions && Array.isArray(line.dimensions)) {
              for (const dimTag of line.dimensions) {
                if (dimTag.dimensionId && dimTag.dimensionValueId) {
                  console.log('ARCHITECT_DEBUG: Creating dimension link:', {
                    journalEntryLineId: newLine.id,
                    dimensionId: dimTag.dimensionId,
                    dimensionValueId: dimTag.dimensionValueId,
                  });
                  
                  await tx.insert(txDimensionLink).values({
                    journalEntryLineId: newLine.id,
                    dimensionId: dimTag.dimensionId,
                    dimensionValueId: dimTag.dimensionValueId,
                  });
                }
              }
            }
          }

          createdEntryIds.push(newEntry.id);
          createdCount++;
          
        } catch (error) {
          console.error('ARCHITECT_DEBUG: Error processing entry group:', error);
          throw error; // This will cause the transaction to rollback
        }
      }

      // 4. Process pending attachments if any
      if (pendingAttachments && pendingAttachments.length > 0 && createdEntryIds.length > 0) {
        console.log(`ARCHITECT_DEBUG: Processing ${pendingAttachments.length} pending attachments for ${createdEntryIds.length} entries`);
        
        // Process each attachment
        for (const attachment of pendingAttachments) {
          try {
            // Generate storage key for the file
            const storageKey = `batch-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
            
            // For each created journal entry, link the attachment
            for (const journalEntryId of createdEntryIds) {
              const fileRecord = {
                journalEntryId: journalEntryId,
                filename: attachment.name || 'unknown',
                path: storageKey, // Use path field for file storage key
                size: attachment.size || 0,
                mimeType: attachment.type || 'application/octet-stream',
                uploadedBy: 1, // Default admin user for batch uploads
              };
              
              await tx.insert(journalEntryFiles).values(fileRecord);
              console.log(`ARCHITECT_DEBUG: Created file record for journal entry ${journalEntryId}`);
            }
          } catch (fileError) {
            console.error('ARCHITECT_DEBUG: Error processing attachment:', fileError);
            // Continue processing other attachments rather than failing the entire batch
          }
        }
      }

      console.log(`Successfully processed and created ${createdCount} journal entries with IDs: ${createdEntryIds.join(', ')}`);
      return { createdCount, createdEntryIds };
    });
  }
}