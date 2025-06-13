// In-memory job scheduling for accrual reversals
// This provides a simple alternative to BullMQ for environments without Redis

interface ScheduledJob {
  id: string;
  data: ReversalJobData;
  scheduledTime: number;
  timeoutId: NodeJS.Timeout;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

// Store scheduled jobs in memory
const scheduledJobs = new Map<string, ScheduledJob>();

// Job data interface
export interface ReversalJobData {
  originalEntryId: number;
  reversalDate: string;
  clientId: number;
  entityId: number;
}

// Process a reversal job (the actual business logic)
async function processReversalJob(data: ReversalJobData) {
  try {
    console.log(`Processing accrual reversal for entry ${data.originalEntryId}`);
    
    // Import the journal entry storage here to avoid circular dependencies
    const journalEntryStorage = await import('../storage/journalEntryStorage');
    
    // Create the reversal entry
    const reversalEntry = await journalEntryStorage.reverseJournalEntry(
      data.originalEntryId,
      {
        date: data.reversalDate,
        description: `Automatic reversal of accrual entry`,
        createdBy: 1 // System user - could be made configurable
      }
    );
    
    console.log(`Successfully created reversal entry ${reversalEntry.id} for original entry ${data.originalEntryId}`);
    return reversalEntry;
  } catch (error) {
    console.error(`Failed to process reversal job for entry ${data.originalEntryId}:`, error);
    throw error;
  }
}

// Schedule a reversal job
export async function scheduleAccrualReversal(data: ReversalJobData) {
  const { reversalDate, originalEntryId } = data;
  
  // Calculate delay until reversal date (set to run at 6 AM on the reversal date)
  const reversalDateTime = new Date(reversalDate);
  reversalDateTime.setHours(6, 0, 0, 0); // 6 AM on the reversal date
  
  const delay = reversalDateTime.getTime() - Date.now();
  
  if (delay <= 0) {
    throw new Error('Reversal date must be in the future');
  }
  
  const jobId = `reversal-${originalEntryId}-${reversalDate}`;
  
  // Cancel any existing job for this entry
  await cancelAccrualReversal(originalEntryId, reversalDate);
  
  // Schedule the new job
  const timeoutId = setTimeout(async () => {
    const job = scheduledJobs.get(jobId);
    if (job && job.status === 'pending') {
      try {
        job.status = 'completed';
        await processReversalJob(data);
        scheduledJobs.delete(jobId); // Clean up completed job
      } catch (error) {
        if (job) {
          job.status = 'failed';
        }
        console.error(`Reversal job ${jobId} failed:`, error);
      }
    }
  }, delay);
  
  // Store the job
  const job: ScheduledJob = {
    id: jobId,
    data,
    scheduledTime: reversalDateTime.getTime(),
    timeoutId,
    status: 'pending'
  };
  
  scheduledJobs.set(jobId, job);
  
  console.log(`Scheduled accrual reversal job for entry ${originalEntryId} on ${reversalDate} (delay: ${Math.round(delay / 1000 / 60)} minutes)`);
  return job;
}

// Cancel a scheduled reversal job
export async function cancelAccrualReversal(originalEntryId: number, reversalDate: string) {
  const jobId = `reversal-${originalEntryId}-${reversalDate}`;
  
  try {
    const job = scheduledJobs.get(jobId);
    if (job && job.status === 'pending') {
      clearTimeout(job.timeoutId);
      job.status = 'cancelled';
      scheduledJobs.delete(jobId);
      console.log(`Cancelled accrual reversal job for entry ${originalEntryId}`);
      return true;
    }
  } catch (error) {
    console.error(`Error cancelling reversal job: ${error}`);
  }
  
  return false;
}

// Get scheduled jobs (for monitoring/debugging)
export function getScheduledJobs() {
  return Array.from(scheduledJobs.values());
}

// Clean up completed/failed jobs older than 24 hours
export function cleanupOldJobs() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  for (const [jobId, job] of scheduledJobs.entries()) {
    if (job.scheduledTime < oneDayAgo && job.status !== 'pending') {
      scheduledJobs.delete(jobId);
    }
  }
}