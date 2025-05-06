import {
  toLocalYMD,
  formatDisplayDate,
  isValidYMDDate,
  getTodayYMD,
  parseDate
} from '../client/src/utils/dateUtils';

describe('dateUtils', () => {
  describe('toLocalYMD', () => {
    test('formats Date object to YYYY-MM-DD', () => {
      // Create a date with local time parts: 2023-05-15
      const date = new Date(2023, 4, 15); // Month is 0-indexed
      expect(toLocalYMD(date)).toBe('2023-05-15');
    });

    test('handles string dates correctly', () => {
      expect(toLocalYMD('2023-05-15')).toBe('2023-05-15');
      expect(toLocalYMD('2023-05-15T12:00:00Z')).toBe('2023-05-15');
    });

    test('handles null and undefined', () => {
      expect(toLocalYMD(null)).toBe('');
      expect(toLocalYMD(undefined)).toBe('');
    });

    test('preserves local date regardless of timezone', () => {
      // This is the key test that verifies the fix for the timezone issue
      // Create a specific date: December 31, 2023
      const localDate = new Date(2023, 11, 31);
      
      // Even if the UTC date would be different due to timezone,
      // toLocalYMD should return the local date parts
      expect(toLocalYMD(localDate)).toBe('2023-12-31');
    });
  });

  describe('formatDisplayDate', () => {
    test('formats date for display with different formats', () => {
      const date = new Date(2023, 4, 15);
      expect(formatDisplayDate(date, 'short')).toMatch(/May 15, 2023/);
      expect(formatDisplayDate(date, 'long')).toMatch(/May 15, 2023/);
      expect(formatDisplayDate(date, 'numeric')).toMatch(/5\/15\/2023/);
    });

    test('handles null and undefined', () => {
      expect(formatDisplayDate(null)).toBe('');
      expect(formatDisplayDate(undefined)).toBe('');
    });
  });

  describe('isValidYMDDate', () => {
    test('validates correct YYYY-MM-DD format', () => {
      expect(isValidYMDDate('2023-05-15')).toBe(true);
    });

    test('rejects invalid formats', () => {
      expect(isValidYMDDate('05/15/2023')).toBe(false);
      expect(isValidYMDDate('2023/05/15')).toBe(false);
      expect(isValidYMDDate('15-05-2023')).toBe(false);
      expect(isValidYMDDate('not-a-date')).toBe(false);
    });

    test('rejects invalid month or day values', () => {
      expect(isValidYMDDate('2023-13-15')).toBe(false); // Month > 12
      expect(isValidYMDDate('2023-00-15')).toBe(false); // Month < 1
      expect(isValidYMDDate('2023-02-30')).toBe(false); // Invalid day for February
      expect(isValidYMDDate('2023-04-31')).toBe(false); // April doesn't have 31 days
    });

    test('correctly validates leap year dates', () => {
      expect(isValidYMDDate('2020-02-29')).toBe(true); // 2020 was a leap year
      expect(isValidYMDDate('2023-02-29')).toBe(false); // 2023 was not a leap year
    });
  });

  describe('getTodayYMD', () => {
    // Mock Date.now for consistent testing
    const originalDate = global.Date;
    
    beforeEach(() => {
      // Mock the Date constructor to return a fixed date
      global.Date = class extends originalDate {
        constructor(...args) {
          if (args.length === 0) {
            // When called with no args (new Date()), return a fixed date
            super(2023, 4, 15); // May 15, 2023
          } else {
            super(...args);
          }
        }
      };
    });
    
    afterEach(() => {
      // Restore original Date
      global.Date = originalDate;
    });
    
    test('returns today in YYYY-MM-DD format', () => {
      expect(getTodayYMD()).toBe('2023-05-15');
    });
  });

  describe('parseDate', () => {
    test('parses valid date strings', () => {
      const result = parseDate('2023-05-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(4); // 0-indexed, so May is 4
      expect(result.getDate()).toBe(15);
    });

    test('returns fallback for invalid strings', () => {
      const fallback = new Date(2000, 0, 1);
      expect(parseDate('not-a-date', fallback)).toEqual(fallback);
    });

    test('uses current date as default fallback', () => {
      const invalidResult = parseDate('not-a-date');
      expect(invalidResult).toBeInstanceOf(Date);
      // Can't assert exact date since it uses current date
      // Just verify it's a valid date
      expect(isNaN(invalidResult.getTime())).toBe(false);
    });
  });
});