import { journalEntryStorage } from '../storage/journalEntryStorage';

/**
 * Schedule an automatic reversal for an accrual journal entry
 * This function is called when a journal entry with isAccrual=true is posted
 */
export async function scheduleAccrualReversal(journalEntryId: number, reversalDate: string): Promise<void> {
  console.log(`ACCRUAL SCHEDULING: Scheduling reversal for journal entry ${journalEntryId} on ${reversalDate}`);
  
  // For the robust cron job-based approach, we don't need to schedule individual jobs
  // The daily cron job will automatically process all due reversals
  // This function serves as a placeholder for potential future enhancement with job queues
  
  console.log(`ACCRUAL SCHEDULING: Reversal scheduled for journal entry ${journalEntryId}. Will be processed by daily cron job on ${reversalDate}`);
}

async function run() {
  console.log('Starting daily accrual reversal processing...');
  
  try {
    const result = await journalEntryStorage.processDueAccrualReversals();
    console.log(`Accrual reversal processing finished. Success: ${result.successCount}, Failed: ${result.failCount}`);
    
    if (result.failCount > 0) {
      console.warn(`Warning: ${result.failCount} accrual reversals failed. Check logs for details.`);
    }
  } catch (error) {
    console.error('Error during accrual reversal processing:', error);
    throw error;
  }
}

// Execute the task
run().catch(err => {
  console.error('Critical error running reversal processor:', err);
  process.exit(1);
});