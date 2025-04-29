# Date Timezone Fix for Journal Entries

## Problem Description
Users in timezones with negative UTC offsets (e.g., UTC-7 for US Pacific) were experiencing an issue where dates selected in the journal entry form would be stored as one day earlier than intended. This occurred because:

1. When the user selected a date (e.g., April 29, 2025), it was created as a JavaScript Date object at midnight local time.
2. The code then called `toISOString()` which converts the date to UTC, causing it to shift to the previous calendar day for negative UTC offsets.
3. The server stored only the date portion, without preserving timezone information.

## Fix Implemented
We've updated the journal entry form to correctly preserve the calendar date exactly as selected by the user without any timezone conversion:

1. Removed usage of `toISOString()` for date serialization.
2. Added code to create date strings directly in YYYY-MM-DD format using local `getFullYear()`, `getMonth()`, and `getDate()` methods.
3. This ensures the date the user selects is exactly the date that gets stored in the database.

## Files Modified
- client/src/features/journal-entries/components/JournalEntryForm.tsx

## Testing
1. Log in as a user in a timezone with a negative UTC offset (e.g., US Pacific Time)
2. Create a new journal entry with a specific date (e.g., April 30, 2025)
3. Verify that the date stored and displayed in the journal entry list and detail views is exactly the date that was selected

## Implementation Details
Previous code:
```javascript
const date = new Date(data.date);
data.date = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD in UTC
```

New code:
```javascript
if (data.date && typeof data.date === "string" && data.date.includes("T")) {
  // If the date is already in ISO format, just take the date part
  data.date = data.date.split("T")[0];
} else if (data.date) {
  // Otherwise format as YYYY-MM-DD without timezone conversion
  const date = new Date(data.date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  data.date = `${year}-${month}-${day}`; // Format as YYYY-MM-DD in local timezone
}
```

This approach ensures that the user's selected date is preserved exactly as chosen without any timezone conversion issues.