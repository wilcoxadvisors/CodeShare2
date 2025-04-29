# Journal Entry File Attachment Workflow

## Overview

This document explains the workflow for attaching files to journal entries, including the proper sequence of operations and status transitions to ensure data integrity.

## Workflow Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Create JE   │────▶│ Upload           │────▶│ Update JE      │
│  as DRAFT    │     │ Attachments      │     │ Status         │
└─────────────┘     └──────────────────┘     └────────────────┘
```

## Status Transitions

Journal entries follow this status flow when attachments are involved:

1. **DRAFT** - Initial state when created with pending file uploads
2. **PENDING_APPROVAL** - Optional intermediate state for review workflows
3. **POSTED** - Final state after file uploads are complete

## Implementation Details

### 1. Create Journal Entry as DRAFT

When files are pending upload, the system must first create the journal entry in DRAFT status, regardless of the user's intent to post immediately:

```typescript
// Check if there are files to upload
const hasAttachments = pendingFiles?.length > 0;

// Create initial data with DRAFT status when files exist
const initialData = {
  ...journalData,
  status: hasAttachments ? JournalEntryStatus.DRAFT : journalData.status,
  // other fields...
};

// Create the entry
const result = await createEntry.mutateAsync(initialData);
```

### 2. Upload File Attachments

After the journal entry is created with an ID, the pending files can be uploaded. The system must wait for all uploads to complete before changing the entry status:

```typescript
// Upload files if there are any
if (hasAttachments && uploadPendingFilesRef.current) {
  try {
    setIsUploading(true);
    
    // IMPORTANT: Wait for all uploads to complete
    await uploadPendingFilesRef.current(newJournalEntryId);
    
    // Success handling...
  } catch (fileError) {
    // Error handling...
  } finally {
    setIsUploading(false);
  }
}
```

### 3. Update Journal Entry Status

If the user intended to post the entry immediately, update the status to POSTED after all files are uploaded:

```typescript
// If user wanted to post immediately but we created as draft due to attachments
if (hasAttachments && initialData.intendedStatus === JournalEntryStatus.POSTED) {
  await updateEntry.mutateAsync({
    id: newJournalEntryId,
    status: JournalEntryStatus.POSTED
  });
}
```

## Backend Storage Implementation

Journal entry files are stored in PostgreSQL with two related tables:

1. **journal_entry_files** - Metadata table with filename, type, size information
2. **journal_entry_file_blobs** - Binary data table storing the actual file content

This design ensures:
- Files are stored directly in the database, not on filesystem
- File access follows the same permission model as journal entries
- Database backup includes all file data

## File Format Support

The system supports these file formats:
- PDF documents (application/pdf)
- Excel spreadsheets (application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- Word documents (application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- CSV files (text/csv) 
- Images (image/jpeg, image/png)
- Email files (message/rfc822, application/vnd.ms-outlook)

## Security Considerations

1. File uploads are restricted by:
   - Type (MIME whitelist)
   - Size (10MB maximum)
   - User permissions (requires JE_FILES_ADMIN role)

2. All uploads require authentication and are logged in the audit trail

3. File access follows the same authorization model as journal entries

## Testing

Automated tests verify this workflow with:
- Unit tests for date and file utilities
- Integration tests for API endpoints
- End-to-end Cypress tests for the complete workflow