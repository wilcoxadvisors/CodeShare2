# Email File Format Support for Journal Entry Attachments

## Overview
Added support for email file formats (.msg, .eml) in journal entry attachments. This enhancement allows users to attach Outlook (.msg) and standard email (.eml) files to journal entries as supporting documentation.

## Changes Made

### 1. Extended MIME Type Whitelist
- Added 'application/vnd.ms-outlook' (.msg) to the allowed MIME types
- Added 'message/rfc822' (.eml) to the allowed MIME types
- Updated file validation logic to accept these new formats

### 2. UI Enhancements
- Added appropriate icons for email attachments
  - Used SendHorizontal icon for .msg and .eml files
- Updated file type display in attachment list

### 3. Error Messages
- Updated error messages to include the new supported file types
- Improved error display to show the complete list of allowed formats

### 4. Documentation
- Added this changelog entry
- Updated relevant documentation to reflect the new file format support

## Testing Instructions
1. Create a new journal entry or edit an existing draft entry
2. Try attaching .msg files exported from Outlook
3. Try attaching .eml files from email clients
4. Verify both upload correctly and display with appropriate icons
5. Verify you can download these attachments from journal entry details view

## Technical Notes
- Email files are stored as binary blobs in the database
- Use standard attachment preview for these formats (no specialized preview)
- Enforced attachment size limits remain the same for all file types