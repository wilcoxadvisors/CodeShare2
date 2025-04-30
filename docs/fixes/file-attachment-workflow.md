# Journal Entry File Attachment Workflow

## Bug #7 Fix: Multipart Upload Issues

### Root Cause
The primary issue preventing file uploads was the manual specification of a `Content-Type: 'multipart/form-data'` header in axios requests when using FormData. This prevents the browser from automatically generating the necessary multipart boundary parameter, resulting in malformed requests.

### Fix Implementation
1. Removed manually specified `Content-Type` header in `attachmentQueries.ts` for FormData uploads
2. Enhanced UI with per-file progress tracking
3. Added error handling and retry logic (up to 3 attempts) for file uploads

### Code Changes

#### Before (problematic code):
```typescript
// In attachmentQueries.ts
const response = await axios.post(`/api/journal-entries/${journalEntryId}/files`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data'  // This causes the issue
  },
  onUploadProgress: (progressEvent) => {
    onProgress && onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
  }
});
```

#### After (fixed code):
```typescript
// In attachmentQueries.ts
const response = await axios.post(`/api/journal-entries/${journalEntryId}/files`, formData, {
  // No Content-Type header specified - browser will set it with correct boundary
  onUploadProgress: (progressEvent) => {
    onProgress && onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
  }
});
```

### UI Enhancements
1. Added per-file progress tracking with individual progress bars
2. Added cancel upload functionality
3. Enhanced drag-and-drop interface
4. Improved error messaging and file validation

### Upload Workflow
1. User selects or drags files to upload area
2. System validates file types and sizes against whitelist
3. For each file, a dedicated progress bar displays upload progress
4. User can cancel uploads in progress
5. On completion, file metadata is displayed in the attachments list
6. Files can be downloaded or deleted (if entry status allows)

### Status-Based Rules
- Files can be added/deleted only when entry is in `draft` or `pending_approval` status
- Posted entries have read-only attachments
- UI disables upload functionality based on entry status

### Testing Verification
1. Upload single file → progress bar reaches 100% → file appears in list
2. Upload multiple files → each file shows individual progress → all files appear in list
3. Files persist after page reload
4. Invalid file types are rejected
5. Files over 10MB size limit are rejected
6. Posted entries show files but disable upload/delete functionality