import { db } from '../db';
import { journalEntries, journalEntryLines, txDimensionLink } from '../../shared/schema';
import { and, eq } from 'drizzle-orm';

export class BatchProcessingService {
  public async processBatch(approvedEntries: any[], clientId: number, entityId: number, batchSettings?: any) {
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

          // Use minimal insert data object with only required fields
          const journalEntryData: any = {
            entityId: entityId,
            clientId: actualClientId, // Use the client ID from the entity
            date: entryDate,
            referenceNumber: entryGroup.header.Reference || `BATCH-${actualClientId}-${entityId}-${Date.now()}-${createdCount + 1}`,
            description: entryGroup.header.Description || 'Batch import entry',
            status: 'draft',
            createdBy: 1, // TODO: Get actual user ID from request context
            isSystemGenerated: false,
            isAccrual: false,
          };

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

      console.log(`Successfully processed and created ${createdCount} journal entries with IDs: ${createdEntryIds.join(', ')}`);
      return { createdCount, createdEntryIds };
    });
  }
}