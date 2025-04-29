# Journal Entry Date Timezone Fix

## Issue
Journal entry dates were shifting to the previous day for users in negative UTC offsets (such as North and South America). This was occurring because:

1. When the date was selected in the datepicker, it was being converted to an ISO string with `toISOString()`
2. ISO strings include timezone information, using UTC
3. For users in negative UTC offsets (e.g., UTC-5 for Eastern Time), this conversion would shift the date to the previous day

Example:
- User selects April 29, 2025
- If the user is in UTC-5 timezone, `new Date('2025-04-29').toISOString()` would result in "2025-04-28T19:00:00.000Z"
- The date portion becomes April 28 instead of 29

## Solution
We modified the date handling to preserve the exact date as selected by the user without timezone conversion:

1. Created a utility function `formatPickerDate` in `utils/formatDate.ts` that:
   - Takes a date string or Date object
   - Returns a simple YYYY-MM-DD formatted string, preserving the local date
   - Handles various input formats (ISO strings, Date objects)

2. Updated date formatting in both create and update operations:
   - Removed complex date formatting logic that used `toISOString()`
   - Used direct string splitting to extract the date part when needed
   - Maintained the date exactly as selected without timezone conversion

3. Made sure the date initial value uses `formatPickerDate` for consistent formatting

## Testing
To verify the fix:
1. Set your system to a negative UTC timezone (like America/New_York UTC-5)
2. Create a new journal entry and select today's date
3. Submit the form
4. Verify the entry is saved with the correct date, not a day earlier
5. Edit an existing entry and verify the date remains the same

## Technical Details
The key changes were:
- Replaced `date.toISOString()` approach with direct YYYY-MM-DD formatting
- Simplified date handling to focus on preserving the exact selected date
- Created a reusable utility function to standardize date formatting