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
        // 1. Create the main Journal Entry record
        const [newEntry] = await tx.insert(journalEntries).values({
          entityId,
          date: new Date(entryGroup.header.Date),
          description: entryGroup.header.Description || '',
          referenceNumber: entryGroup.header.Reference || `BATCH-${Date.now()}-${createdCount + 1}`,
          status: 'draft' as const, // Start as draft, can be posted later
          isAccrual: batchSettings?.isAccrual || false,
          reversalDate: batchSettings?.reversalDate ? new Date(batchSettings.reversalDate) : null,
          createdBy: 1, // TODO: Get actual user ID from request context
        }).returning();

        // 2. Create the Journal Entry Lines
        for (const line of entryGroup.lines) {
          const [newLine] = await tx.insert(journalEntryLines).values({
            journalEntryId: newEntry.id,
            accountId: line.accountId, // Assumes validation has provided the ID
            amount: line.amount.toString(),
            type: line.amount.isPositive() ? 'debit' : 'credit',
            description: line.description || '',
            entityCode: line.entityCode || entityId.toString(),
          }).returning();

          // 3. Create the Dimension Links (if any)
          if (line.dimensions && Array.isArray(line.dimensions)) {
            for (const dimTag of line.dimensions) {
              if (dimTag.dimensionId && dimTag.dimensionValueId) {
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
      }

      console.log(`Successfully processed and created ${createdCount} journal entries with IDs: ${createdEntryIds.join(', ')}`);
      return { createdCount, createdEntryIds };
    });
  }
}