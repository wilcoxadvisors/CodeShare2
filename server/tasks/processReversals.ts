import { journalEntryStorage } from '../storage/journalEntryStorage';

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