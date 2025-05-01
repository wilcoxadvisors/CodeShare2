# Manual Verification Steps

This document provides step-by-step instructions to verify the fixes for:
1. Journal entry date format/timezone issues
2. File attachment permissions for journal entries in different statuses

## Date Format Fix Verification

### Expected Behavior
- All dates should now be stored as DATE type (without time components)
- Dates should be displayed consistently in YYYY-MM-DD format regardless of browser timezone
- No "off-by-one day" issues when editing existing journal entries

### Test Case 1: Create Journal Entry with Date
1. Log in as an admin user
2. Navigate to Journal Entries
3. Click "Create New" button
4. Set a specific date (e.g., "2025-05-15")
5. Fill in other required fields and add at least one debit and one credit line
6. Save as draft
7. Expected result: The journal entry should show the exact date you entered (2025-05-15)

### Test Case 2: Edit Existing Journal Entry
1. Find the journal entry you just created
2. Click the "Edit" button
3. Do not change the date, just make some other minor change
4. Save the entry
5. Expected result: The date should remain unchanged (2025-05-15)

### Test Case 3: Database Verification
Run this SQL to verify date format consistency:

```sql
SELECT 
    id, 
    date,
    -- Extract useful date components for verification
    EXTRACT(YEAR FROM date::date) AS year,
    EXTRACT(MONTH FROM date::date) AS month,
    EXTRACT(DAY FROM date::date) AS day,
    status
FROM 
    journal_entries
ORDER BY 
    date DESC
LIMIT 10;
```

The date column should now show only date components without time (e.g., "2025-05-15").

## Journal Entry File Permissions Fix

### Expected Behavior
- File attachments can be uploaded to journal entries in 'draft' status
- File attachments can be uploaded to journal entries in 'pending_approval' status
- File attachments can be deleted from journal entries in 'draft' status
- File attachments can be deleted from journal entries in 'pending_approval' status
- File operations are not available for entries in 'posted', 'approved', 'rejected', or 'voided' status

### Test Case 1: Uploading and Deleting Files in Draft Status
1. Create a new journal entry in "draft" status
2. Upload a file attachment (PDF or image)
3. Verify the file appears in the attachments list
4. Delete the file
5. Expected result: File should be deleted successfully

### Test Case 2: Uploading and Deleting Files in Pending Approval Status
1. Create a journal entry and submit it for approval (status changes to "pending_approval")
2. Upload a file attachment
3. Verify the file appears in the attachments list
4. Delete the file
5. Expected result: File should be deleted successfully

### Test Case 3: Verifying File Controls for Posted Entries
1. Find or create a journal entry in "posted" status
2. Verify the file upload area is not visible
3. If files exist, verify the delete button is not visible
4. Expected result: No file upload or delete functionality should be visible

## Cross-Browser Testing

If possible, verify both fixes (date format and file permissions) across:
- Chrome
- Firefox
- Safari
- Edge

## Regression Testing

Ensure other journal entry operations still work correctly:
1. Creating journal entries with multiple lines
2. Editing existing journal entries
3. Posting journal entries
4. Reversing journal entries
5. Searching and filtering journal entries by date