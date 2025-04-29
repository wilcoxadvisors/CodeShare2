# Journal Entry File Upload Fix - 2025-04-29

## Issue Fixed
Fixed a database error (500) when attempting to upload files to journal entries. The issue occurred because the 
`deleted_at` column was defined in the Drizzle schema model but was missing from the actual database table.

## Changes Made
1. Created migration file `server/migrations/20250429_add_deleted_at_to_journal_entry_files.ts` to add the missing column
2. Updated the migration system in `server/migrate.ts` to run the new migration
3. Added a regression test in `test/upload_posting_workflow.test.ts` to verify the complete journal entry workflow:
   - Create a draft journal entry
   - Upload files successfully
   - Patch the entry to "posted" status
   - Verify that further file uploads are rejected with a 403 status
4. Updated CI workflow in `.github/workflows/attachment-validation.yml` to include the new test and migration

## Technical Details
- The issue was related to the Drizzle ORM attempting to insert into the `deleted_at` column which didn't exist in the database
- This was causing a Postgres error with code 42703: "column does not exist"
- The fix ensures the database schema matches the Drizzle model definition

## Validation
The fix was verified by:
1. Successfully running the migration to add the missing column
2. Testing the full workflow of creating a journal entry, uploading files, and posting
3. Ensuring uploads return 201 before posting and 403 after posting
4. Adding a regression test to prevent this issue from recurring