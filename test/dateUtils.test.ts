import { toLocalYMD, formatDisplayDate, isValidYMDDate, getTodayYMD, parseDate } from '../client/src/utils/dateUtils';

describe('dateUtils', () => {
  describe('toLocalYMD', () => {
    test('preserves date strings in YYYY-MM-DD format', () => {
      expect(toLocalYMD('2025-04-29')).toBe('2025-04-29');
    });

    test('extracts date from ISO string', () => {
      expect(toLocalYMD('2025-04-29T14:30:00.000Z')).toBe('2025-04-29');
    });

    test('formats Date object without timezone shift', () => {
      // Mock a date with April 29, 2025 in local timezone
      const mockDate = new Date(2025, 3, 29); // Note: month is 0-indexed
      expect(toLocalYMD(mockDate)).toBe('2025-04-29');
    });

    test('handles null or undefined inputs', () => {
      expect(toLocalYMD(null)).toBe('');
      expect(toLocalYMD(undefined)).toBe('');
    });
  });

  describe('formatDisplayDate', () => {
    test('formats date in medium format (default)', () => {
      // Note: results will depend on the locale
      expect(formatDisplayDate('2025-04-29')).toMatch(/Apr(il)? 29, 2025/);
    });

    test('formats date in short format', () => {
      expect(formatDisplayDate('2025-04-29', 'short')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    test('handles null or undefined inputs', () => {
      expect(formatDisplayDate(null)).toBe('');
      expect(formatDisplayDate(undefined)).toBe('');
    });
  });

  describe('isValidYMDDate', () => {
    test('validates correct YYYY-MM-DD dates', () => {
      expect(isValidYMDDate('2025-04-29')).toBe(true);
    });

    test('rejects incorrectly formatted dates', () => {
      expect(isValidYMDDate('04-29-2025')).toBe(false);
      expect(isValidYMDDate('2025/04/29')).toBe(false);
      expect(isValidYMDDate('not-a-date')).toBe(false);
    });

    test('rejects invalid dates', () => {
      expect(isValidYMDDate('2025-02-30')).toBe(false); // Invalid February day
      expect(isValidYMDDate('2025-13-01')).toBe(false); // Invalid month
    });
  });

  describe('getTodayYMD', () => {
    test('returns today in YYYY-MM-DD format', () => {
      // Mock current date for consistent testing
      const realDate = global.Date;
      const mockDate = new Date(2025, 3, 29); // April 29, 2025
      
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return mockDate;
          }
          return new realDate(...args);
        }
      } as typeof Date;

      expect(getTodayYMD()).toBe('2025-04-29');
      
      // Restore original Date
      global.Date = realDate;
    });
  });

  describe('parseDate', () => {
    test('parses YYYY-MM-DD format correctly', () => {
      const result = parseDate('2025-04-29');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getDate()).toBe(29);
    });

    test('uses fallback for invalid dates', () => {
      const fallback = new Date(2020, 0, 1);
      expect(parseDate('invalid-date', fallback)).toEqual(fallback);
    });
  });
});