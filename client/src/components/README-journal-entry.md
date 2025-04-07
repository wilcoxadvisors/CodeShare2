# Journal Entry Implementation

## Overview

This documentation explains the journal entry implementation in the application. There are multiple overlapping implementations that have been consolidated.

## Primary Implementation

The primary and recommended implementation is:

- `JournalEntryForm.tsx` - The main component for creating and editing journal entries
- `NewJournalEntry.tsx` - The page component that renders JournalEntryForm

This is accessed through:
- `/journal-entries/new` route
- `/journal-entries/create` route (redirects to the same implementation)

## Features

The journal entry form includes:
- Support for entity code (intercompany transactions)
- Real-time validation for ensuring debits equal credits
- Entity-level balance validation for intercompany transactions
- Properly working Select components with 'none' default values
- Error handling and validation feedback

## Legacy/Alternative Implementations

The following implementations are considered legacy and are deprecated:

1. `client/src/components/forms/ManualJournalEntry.tsx` - Alternative implementation used by ManualJournalEntryTest page
2. `client/src/components/ManualJournalEntry.tsx` - Another version, not actively used
3. `client/src/components/journal/*` - Modular components used by ManualJournalEntry.tsx

## Code Organization

- **Schema**: Journal entry types and schemas are defined in `shared/schema.ts`
- **Validation**: Form validation logic is in `client/src/lib/validation.ts`
- **API Calls**: Journal entry API interactions are defined in the form components using TanStack Query

## Cleaning Up

When making updates to journal entry functionality:
1. Always update `JournalEntryForm.tsx` as the primary implementation
2. Do not modify the legacy implementations unless absolutely necessary
3. Consider consolidating to a single implementation in the future