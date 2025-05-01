# Manual Verification Steps

## Journal Entry Date Format Fix

1. **Prerequisites**:
   - Login to the system with admin credentials
   - Navigate to Journal Entries module

2. **Test Case 1: Creating a Journal Entry with Today's Date**
   - Create a new journal entry using today's date
   - Verify the date is stored correctly in YYYY-MM-DD format
   - After saving, verify the displayed date matches the input date exactly
   - Expected result: Date should not shift ahead/behind by one day

3. **Test Case 2: Creating a Journal Entry with a Past Date**
   - Create a new journal entry using a specific past date (e.g., "2025-04-15")
   - Verify the date is stored correctly in YYYY-MM-DD format
   - After saving, verify the displayed date is still "2025-04-15"
   - Expected result: Date should not shift ahead/behind by one day

4. **Test Case 3: Updating a Journal Entry Date**
   - Find an existing draft journal entry
   - Edit the entry and change the date
   - Save the entry
   - Verify the new date is stored and displayed correctly
   - Expected result: Updated date should not shift ahead/behind by one day

## Journal Entry File Permissions Fix

1. **Test Case 1: Uploading and Deleting Files in Draft Status**
   - Create a new journal entry in "draft" status
   - Upload a file attachment
   - Verify the file appears in the attachments list
   - Delete the file
   - Expected result: File should be deleted successfully

2. **Test Case 2: Uploading and Deleting Files in Pending Approval Status**
   - Create a journal entry and submit it for approval (status changes to "pending_approval")
   - Upload a file attachment
   - Verify the file appears in the attachments list
   - Delete the file
   - Expected result: File should be deleted successfully

3. **Test Case 3: Verifying File Controls for Posted Entries**
   - Find or create a journal entry in "posted" status
   - Verify the file upload area is not visible
   - If files exist, verify the delete button is not visible
   - Expected result: No file upload or delete functionality should be visible

## Cross-Browser Testing

If possible, verify the date format consistency across:
- Chrome
- Firefox
- Safari
- Edge

## Verification SQL Query

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