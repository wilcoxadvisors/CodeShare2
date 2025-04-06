# Administrator Guide

## Entity State Management

The system supports three different entity states to provide flexibility in managing entities:

1. **Active Entities**: `active: true, deletedAt: null`
   - Fully operational with no restrictions
   - Visible in all standard queries and UI views
   - Displayed with "Active" badge in the UI

2. **Inactive Entities**: `active: false, deletedAt: null`
   - Remain visible in standard queries but are visually marked as inactive
   - Have a grayed-out appearance and an "Inactive" badge in entity listings
   - Cannot perform certain operations (based on business rules)
   - Cannot be set to inactive again (Set Inactive button will be disabled)

3. **Soft-deleted Entities**: `active: false, deletedAt: <timestamp>`
   - Not visible in standard queries (filtered out by default)
   - Can only be retrieved with explicit `includeDeleted=true` parameter
   - Can be restored using the restore functionality
   - Displayed with "Deleted" badge when shown
   - Form fields are disabled when viewing deleted entities
   - Only Restore button is available for deleted entities

## Client and Entity Lifecycle

The system handles the full lifecycle of clients and entities:

1. **Creation**: New clients and entities start in the Active state
2. **Deactivation**: Entities can be set to inactive (maintaining all data)
3. **Soft Deletion**: Clients and entities can be soft-deleted (hidden but recoverable)
4. **Restoration**: Soft-deleted items can be restored to either Active or Inactive state
5. **Permanent Deletion**: Soft-deleted items are permanently removed after 90 days

## Scheduled Cleanup

The system automatically handles permanent deletion of soft-deleted clients:

### Automatic Deletion After 90 Days

- Soft-deleted clients and their associated data are automatically permanently deleted after 90 days
- This process runs as a scheduled task through the `cleanupSoftDeletedClients()` function
- The deletion threshold is defined as `DELETION_THRESHOLD_DAYS = 90` in the system

### Manual Deletion

As an administrator, you can also trigger the cleanup process manually:

1. Navigate to the Dashboard
2. Select the "System Maintenance" tab
3. Find the "Deleted Client Cleanup" section
4. Click the "Run Manual Cleanup" button
5. Confirm the action when prompted

This will permanently delete any clients that have been soft-deleted for more than 90 days.

## Audit Logging

All deletion activities are logged for accountability:

- Soft deletions include the admin user ID who performed the action
- Scheduled deletions are logged with the system user ID
- Manual cleanup operations are recorded with the admin user ID
- Audit logs include timestamps, affected entities, and operation details

## Important API Endpoints

### Client Management

- `DELETE /api/admin/clients/:id` - Soft delete a client
- `PATCH /api/admin/clients/:id/restore` - Restore a soft-deleted client
- `DELETE /api/admin/clients/:id/permanent` - Permanently delete a client (admin only)
- `POST /api/admin/trigger-cleanup` - Manually trigger the cleanup process

### Entity Management

- `POST /api/entities/:id/set-inactive` - Set entity to inactive
- `DELETE /api/entities/:id` - Soft-delete entity
- `POST /api/entities/:id/restore` - Restore entity
- `PATCH /api/admin/entities/:id/reactivate` - Reactivate an inactive entity

## UI Controls for Entity Management

The system provides various UI controls for managing entity states:

1. **Entity List View**:
   - Status badges indicating Active, Inactive, or Deleted state
   - Option to show/hide deleted entities via checkbox
   - Context-appropriate action buttons

2. **Entity Detail View**:
   - State-appropriate action buttons
   - Disabled form fields for deleted entities
   - Clear visual indicators of entity state

3. **Confirmation Dialogs**:
   - All state-changing operations require confirmation
   - Deletion operations include explicit warnings about consequences
   - Permanent deletion requires additional confirmation

## Best Practices

1. **Use Soft Deletion**: Always prefer soft deletion over permanent deletion to allow for recovery.
2. **Regular Maintenance**: Review the list of soft-deleted clients periodically before automatic deletion occurs.
3. **Audit Logs**: Check audit logs to verify deletion activities.
4. **Backup Data**: Create backups before performing bulk deletion operations.
5. **Testing**: Test the restoration process to ensure it works as expected.

## Troubleshooting

### Common Issues

1. **Entity Not Appearing**: Check if the entity is soft-deleted, and enable "Show Deleted" option.
2. **Can't Restore Entity**: Verify you have admin permissions.
3. **Cleanup Not Working**: Check console logs for error messages.

### Error Messages

If you encounter errors during cleanup operations, check the server logs for detailed error messages. Common error patterns include:

- "Failed to permanently delete client X" - Check database permissions
- "Error in cleanupSoftDeletedClients" - Check the overall cleanup process