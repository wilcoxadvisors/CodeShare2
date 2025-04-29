# Email File Format Support Added (2025-04-29)

## Overview
We've expanded the file type whitelist to include email file formats (.eml, .msg) in the journal entry attachment system. This allows users to attach email correspondences directly to journal entries, improving documentation and audit trails.

## Changes
- Added support for .eml (RFC-822) files with MIME type 'message/rfc822'
- Added support for .msg (Outlook) files with MIME type 'application/vnd.ms-outlook'
- Updated file handling UI to display appropriate icons for email file formats
- Added email file formats to the allowed extensions list in both frontend and backend validations

## Affected Components
- Server-side file validation in journalEntryRoutes.ts
- Client-side dropzone configuration in JournalEntryForm.tsx and JournalEntryDetail.tsx
- File icon display logic to properly render email file icons using SendHorizontal component

## Testing
- Created test fixtures for .eml and .msg files in test/fixtures/
- Added a simple test script (test/file_upload_test.js) to verify proper handling

## UI Updates
- Updated helper text to indicate email file format support
- Added appropriate icon rendering for email files