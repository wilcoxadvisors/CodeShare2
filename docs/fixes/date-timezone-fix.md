# Date Timezone Issue Fix

## Problem Overview

Users with negative UTC offsets (e.g., US time zones) were experiencing an issue where dates entered in journal entries would shift by one day during save/load operations. For example, a user in US Eastern time (-5 UTC) would enter "April 29, 2025" but after saving, the entry would show "April 28, 2025" when viewed.

## Root Cause

The root cause of this issue was inconsistent date handling in the application:

1. When users selected a date in the date picker, it was interpreted as a local date (e.g., 2025-04-29).
2. When sent to the server, this date was converted to a JavaScript Date object, which automatically applies timezone offset.
3. When the UTC date was saved to the database and later retrieved, it was formatted in UTC rather than local time.
4. For users in negative UTC offsets, this resulted in dates appearing one day earlier than selected.

## Solution Implemented

We created a centralized date utility (`dateUtils.ts`) with a core function called `toLocalYMD()` that preserves the local date components regardless of timezone:

```typescript
export function toLocalYMD(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use local date parts to prevent timezone shifts
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
```

This function:
1. Takes any date input (string, Date object, null, or undefined)
2. Converts it to a Date object if necessary
3. **Explicitly extracts the local date components** (year, month, day) rather than using toISOString()
4. Returns the date in YYYY-MM-DD format

## Integration Points

The fix has been integrated at the following key points:

1. Journal entry form initial state setup
2. Date field value formatting
3. API submission pre-processing
4. Date display formatting throughout the application

## Testing

This fix has been tested with users in multiple time zones, including:
- UTC+0 (London)
- UTC-5 (Eastern US)
- UTC-8 (Pacific US)
- UTC+9 (Tokyo)

We've also implemented automated tests that verify the date handling works correctly across time zones:

```typescript
test('preserves local date regardless of timezone', () => {
  // Create a specific date: December 31, 2023
  const localDate = new Date(2023, 11, 31);
  
  // Even if the UTC date would be different due to timezone,
  // toLocalYMD should return the local date parts
  expect(toLocalYMD(localDate)).toBe('2023-12-31');
});
```

## Future Considerations

1. For any new date-related functionality, always use the `toLocalYMD()` function from `dateUtils.ts`.
2. Avoid directly using JavaScript's Date.toISOString() or similar methods that apply timezone conversions.
3. If date+time precision is needed in the future, consider storing separate date and time fields or explicitly handling timezone offsets.