/**
 * Scheduled Tasks Manager
 * 
 * This module handles scheduled/periodic tasks such as:
 * - Permanent deletion of soft-deleted clients after 90 days
 * - Any other scheduled maintenance operations
 */

import { clientStorage } from '../storage/clientStorage';
import { auditLogStorage } from '../storage/auditLogStorage';
import { entityStorage } from '../storage/entityStorage';

/**
 * System admin user ID for automated actions
 */
const SYSTEM_USER_ID = 0;

/**
 * Number of days after which soft-deleted clients should be permanently deleted
 */
const DELETION_THRESHOLD_DAYS = 90;

/**
 * Check for and permanently delete any clients that have been soft-deleted 
 * for longer than the deletion threshold period.
 * 
 * @returns {Promise<{deleted: number, errors: string[]}>} Result summary
 */
export async function cleanupSoftDeletedClients(): Promise<{deleted: number, errors: string[]}> {
  const result = {
    deleted: 0, 
    errors: [] as string[]
  };

  try {
    console.log(`[ScheduledTasks] Starting cleanup of soft-deleted clients older than ${DELETION_THRESHOLD_DAYS} days...`);
    
    // Find clients deleted more than X days ago
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - DELETION_THRESHOLD_DAYS);
    
    const clientsToDelete = await clientStorage.getClientsDeletedBefore(thresholdDate);
    console.log(`[ScheduledTasks] Found ${clientsToDelete.length} clients to permanently delete`);
    
    if (clientsToDelete.length === 0) {
      return result;
    }
    
    // Log this scheduled cleanup action
    await auditLogStorage.createAuditLog({
      action: 'scheduled_delete_started',
      performedBy: SYSTEM_USER_ID,
      details: JSON.stringify({
        clientCount: clientsToDelete.length,
        thresholdDays: DELETION_THRESHOLD_DAYS,
        thresholdDate: thresholdDate.toISOString()
      })
    });
    
    // Process each client for permanent deletion
    for (const client of clientsToDelete) {
      try {
        console.log(`[ScheduledTasks] Permanently deleting client ${client.id} (${client.name}), deleted on ${client.deletedAt}`);
        
        // Permanently delete the client
        const success = await clientStorage.permanentlyDeleteClient(client.id, SYSTEM_USER_ID);
        
        if (success) {
          result.deleted++;
          
          // Log the successful deletion
          await auditLogStorage.createAuditLog({
            action: 'scheduled_permanent_delete',
            performedBy: SYSTEM_USER_ID,
            details: JSON.stringify({
              clientId: client.id,
              clientName: client.name,
              deletedAt: client.deletedAt,
              deletionDate: new Date().toISOString()
            })
          });
        } else {
          const errorMsg = `Failed to permanently delete client ${client.id} (${client.name})`;
          result.errors.push(errorMsg);
          console.error(`[ScheduledTasks] ${errorMsg}`);
        }
      } catch (error) {
        const errorMsg = `Error permanently deleting client ${client.id} (${client.name}): ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error(`[ScheduledTasks] ${errorMsg}`);
      }
    }
    
    // Log completion of this scheduled task
    await auditLogStorage.createAuditLog({
      action: 'scheduled_delete_completed',
      performedBy: SYSTEM_USER_ID,
      details: JSON.stringify({
        successCount: result.deleted,
        errorCount: result.errors.length,
        totalAttempted: clientsToDelete.length
      })
    });
    
    console.log(`[ScheduledTasks] Completed cleanup of soft-deleted clients. Successfully deleted: ${result.deleted}, Errors: ${result.errors.length}`);
    return result;
  } catch (error) {
    const errorMsg = `Error in cleanupSoftDeletedClients: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error(`[ScheduledTasks] ${errorMsg}`);
    return result;
  }
}

/**
 * Run all scheduled maintenance tasks
 * This function can be called by a cron job or other scheduling mechanism
 */
export async function runAllScheduledTasks(): Promise<void> {
  console.log('[ScheduledTasks] Running all scheduled maintenance tasks...');
  
  try {
    // Run client cleanup
    const clientCleanupResult = await cleanupSoftDeletedClients();
    console.log(`[ScheduledTasks] Client cleanup completed with ${clientCleanupResult.deleted} clients permanently deleted`);
    
    // Add more scheduled tasks here as needed
    
    console.log('[ScheduledTasks] All scheduled maintenance tasks completed successfully');
  } catch (error) {
    console.error(`[ScheduledTasks] Error running scheduled tasks: ${error instanceof Error ? error.message : String(error)}`);
  }
}