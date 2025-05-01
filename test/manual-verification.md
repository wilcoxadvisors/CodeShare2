# Manual Verification Steps

This document outlines manual verification steps to confirm that the fixes for journal entry date timezone issues and file attachment permissions are working correctly.

## Date Timezone Fix Verification

1. **Create Journal Entry with Specific Date**
   - Login as an admin user
   - Navigate to Journal Entries
   - Create a new Journal Entry
   - Set the date to May 1, 2025 (05/01/2025)
   - Fill in other required fields and save as draft
   - **Expected Result**: Date should be displayed as May 1, 2025

2. **Verify Date in List View**
   - Navigate to Journal Entries list
   - Find the entry created in step 1
   - **Expected Result**: Date should be displayed as May 1, 2025, not April 30 or May 2

3. **Update Journal Entry**
   - Edit the journal entry created in step 1
   - Change the description but not the date
   - Save the entry
   - **Expected Result**: Date should remain May 1, 2025

4. **Filter by Date Range**
   - Navigate to Journal Entries list
   - Use the date filter to search for entries between Apr 30, 2025 and May 2, 2025
   - **Expected Result**: The entry created in step 1 should appear in the results

## File Attachment Permissions Verification

1. **Upload File to Draft Journal Entry**
   - Create a new Journal Entry with status "draft"
   - Attach a PDF file using the file upload feature
   - **Expected Result**: File should upload successfully and appear in the attachments list

2. **Delete File from Draft Journal Entry**
   - Select the file uploaded in step 1
   - Click the delete button
   - **Expected Result**: File should be deleted successfully

3. **Upload File to Pending Approval Journal Entry**
   - Create a new Journal Entry with status "pending_approval" (or change an existing draft to pending_approval)
   - Attempt to attach a PDF file
   - **Expected Result**: File should upload successfully and appear in the attachments list

4. **Delete File from Pending Approval Journal Entry**
   - Select the file uploaded in step 3
   - Click the delete button
   - **Expected Result**: File should be deleted successfully

5. **Verify Upload Blocked for Posted Journal Entry**
   - Create a new Journal Entry with status "posted" (or change an existing entry to posted)
   - Attempt to attach a PDF file
   - **Expected Result**: Upload should be blocked with appropriate error message

## Database Verification

1. **Check Column Type**
   - Run the following SQL query:
     ```sql
     SELECT column_name, data_type, pg_catalog.col_description(
         (table_schema || '.' || table_name)::regclass::oid, 
         ordinal_position
     ) as column_comment
     FROM information_schema.columns
     WHERE table_name = 'journal_entries' AND column_name = 'date';
     ```
   - **Expected Result**: data_type should be "date" (not timestamp or timestamp with time zone)

2. **Verify Date Storage Format**
   - Create a journal entry with the application
   - Run the following SQL query:
     ```sql
     SELECT id, date, status FROM journal_entries ORDER BY id DESC LIMIT 5;
     ```
   - **Expected Result**: Dates should be stored in YYYY-MM-DD format without time component

## Edge Case Testing

1. **Cross-day Timezone Testing**
   - Create a journal entry at 11:00 PM in your local timezone
   - **Expected Result**: Date should be stored and displayed as the current day, not shifted to the next day

2. **Multi-Browser Testing**
   - Test the date handling in different browsers (Chrome, Firefox, Safari)
   - **Expected Result**: Consistent date display across all browsers

## Regression Testing

1. **Existing Journal Entries**
   - View several existing journal entries created before the fix
   - **Expected Result**: Dates should display correctly without timezone shifts

2. **Batch Operations**
   - Perform batch operations on journal entries (if applicable)
   - **Expected Result**: Dates should be maintained correctly during batch operations