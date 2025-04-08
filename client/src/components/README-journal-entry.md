# Journal Entry Implementation

## Overview

This documentation explains the journal entry implementation in the application. The codebase has been refactored to use a single, consolidated implementation for journal entries.

## Primary Implementation

The current implementation is:

- `client/src/features/journal-entries/components/JournalEntryForm.tsx` - The main component for creating and editing journal entries
- `client/src/features/journal-entries/pages/NewJournalEntry.tsx` - The page component that renders JournalEntryForm
- `client/src/features/journal-entries/pages/JournalEntryDetail.tsx` - The page component for viewing journal entry details

This is accessed through:
- `/journal-entries/new` route - For creating new journal entries
- `/journal-entries/:id` route - For viewing and editing existing entries
- `/journal-entries/batch-upload` route - For batch uploading journal entries

## Features

The journal entry form includes:
- Support for entity code (intercompany transactions)
- Real-time validation for ensuring debits equal credits
- Entity-level balance validation for intercompany transactions
- Properly working Select components with appropriate default values
- Error handling and validation feedback
- Integration with the Chart of Accounts at the client level

## Legacy Implementations Note

All legacy implementations have been removed from the codebase to eliminate redundancy and maintenance overhead. This includes:
- Previous implementations in the components/forms directory
- Deprecated implementations in the components directory
- Modular components that were part of earlier implementations

## Code Organization

- **Schema**: Journal entry types and schemas are defined in `shared/schema.ts`
- **Validation**: Form validation logic is in `client/src/lib/validation.ts`
- **API Calls**: Journal entry API interactions are defined in the form components using TanStack Query

## Best Practices for Future Development

When making updates to journal entry functionality:
1. Always update `client/src/features/journal-entries/components/JournalEntryForm.tsx` as the primary implementation
2. Maintain consistent validation logic between frontend and backend
3. Ensure robust error handling in both UI components and API calls
4. Follow the established API pattern: `/api/entities/:entityId/journal-entries/...`
5. Run appropriate tests after making changes