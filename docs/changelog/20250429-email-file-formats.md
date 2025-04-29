# Email File Format Support - April 29, 2025

## Overview

Added support for email file formats (.eml, .msg) in journal entry attachments. Users can now upload email files as supporting documentation for journal entries.

## Changes

### Added Support for Email MIME Types

- Added support for `message/rfc822` (.eml files)
- Added support for `application/vnd.ms-outlook` (.msg files)

### Updated File Type Icon Display

Enhanced the `getFileIconByMimeType` function in `fileUtils.ts` to display appropriate icons for email files:

```typescript
export function getFileIconByMimeType(mimeType: string): string {
  // ... existing code ...
  
  else if (mimeType === 'message/rfc822' || mimeType === 'application/vnd.ms-outlook') {
    // Email file formats (.eml, .msg)
    return 'SendHorizontal';
  }
  
  // ... existing code ...
}
```

### Updated File Type Whitelist

Updated the file type whitelist in the server-side file upload handler to include these new formats.

```javascript
// Whitelisted MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  // Existing types
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/csv',
  
  // New email formats
  'message/rfc822',                 // .eml files
  'application/vnd.ms-outlook'      // .msg files
];
```

### Updated Error Messages

Enhanced error message when uploading unsupported file types to explicitly mention the new supported email formats:

```typescript
toast({
  title: "Unsupported File Type",
  description: "Please upload a supported file (PDF, Word, Excel, CSV, Image, Email)",
  variant: "destructive"
});
```

## Testing

Testing was performed with:
- Outlook .msg files (various sizes)
- Standard .eml files exported from different email clients
- Email files with attachments

## Benefits

This enhancement provides several key benefits:
1. **Streamlined Documentation**: Users can directly upload email correspondence as journal entry documentation without converting to PDFs
2. **Audit Trail Integrity**: Preserves email metadata for better audit trail
3. **User Experience**: Reduces steps needed to attach email evidence to journal entries

## Implementation Notes

The implementation uses the Multer middleware with a MIME type filter to verify file formats on upload. Email files are stored in the PostgreSQL blob storage system with their original format preserved.