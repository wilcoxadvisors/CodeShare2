# Scheduled Tasks Documentation

## Overview

The system includes scheduled maintenance tasks that run automatically to maintain data integrity and optimize performance. This document outlines how these scheduled tasks work and how to manage them.

## Soft-Deleted Client Cleanup

The primary scheduled task in the system is the automatic cleanup of soft-deleted clients.

### Purpose

When clients are "deleted" in the system, they are initially only soft-deleted (marked with a `deletedAt` timestamp but not actually removed from the database). This allows for potential recovery if needed. However, to prevent the database from growing indefinitely and to comply with data retention policies, these soft-deleted clients are permanently removed after a specified period.

### Cleanup Process

The cleanup process follows these steps:

1. Identifies all clients that have been soft-deleted for longer than the threshold period (90 days)
2. Logs the start of the cleanup operation with details on identified clients
3. Permanently deletes each identified client and their associated data
4. Records each successful deletion in the audit log
5. Logs any errors encountered during the process
6. Creates a summary log entry when the process completes

### Configuration

The cleanup task is configured with these parameters:

- **Deletion Threshold**: 90 days (defined in `DELETION_THRESHOLD_DAYS` constant)
- **System User ID**: 0 (for audit logging)

### Code Implementation

The cleanup functionality is implemented in the `cleanupSoftDeletedClients()` function in `server/tasks/scheduledTasks.ts`, which:

- Uses `clientStorage.getClientsDeletedBefore()` to find eligible clients
- Calls `clientStorage.permanentlyDeleteClient()` for each client
- Creates detailed audit logs for the entire process

### Execution Methods

The cleanup task can be executed in three ways:

1. **Automatic Scheduled Run**: 
   - Configured to run automatically at scheduled intervals
   - Implemented through the `runAllScheduledTasks()` function

2. **Manual Admin Trigger**:
   - Available via the System Maintenance tab in the Admin Dashboard
   - Calls the `/api/admin/trigger-cleanup` endpoint
   - Shows real-time status and results in the UI

3. **Command-line Script**:
   - Available through `scripts/direct-cleanup.js`
   - Useful for maintenance operations or troubleshooting

## Adding New Scheduled Tasks

To add new scheduled tasks to the system:

1. Implement the task function in `server/tasks/scheduledTasks.ts`
2. Add the task to the `runAllScheduledTasks()` function
3. Add appropriate audit logging for the task
4. Update UI components to display task status (if needed)

## Monitoring and Logging

All scheduled tasks generate detailed logs:

- **Console Logs**: Detailed operational logs with timestamps
- **Audit Logs**: Permanent records in the database of all operations
- **Task Results**: Structured results (success/failure counts, errors)

## Security Considerations

- Scheduled tasks run with system privileges (using SYSTEM_USER_ID)
- The manual trigger endpoint requires administrator authentication
- All operation details are recorded in audit logs

## Error Handling

The scheduled tasks include robust error handling:

- Errors during individual client deletions are logged but don't stop the process
- Overall process errors are captured and logged
- Structured error reporting for both automated runs and manual triggers

## Future Enhancements

Planned enhancements to the scheduled tasks system:

- More granular control over retention periods
- Additional scheduled maintenance tasks
- Enhanced reporting of task execution history
- More detailed status information in the admin UI