/**
 * Centralized date utility functions for consistent date handling
 * 
 * This file contains standardized functions for handling dates
 * throughout the application, particularly focusing on preventing
 * timezone-related issues.
 */

/**
 * Converts a date to YYYY-MM-DD format preserving local date
 * regardless of timezone, preventing off-by-one errors
 * 
 * @param date Date string or Date object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function toLocalYMD(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  // If it's already a YYYY-MM-DD string, return as is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // If it's a string with time component, extract just the date part
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0];
  }
  
  // For Date objects or other string formats, use local date methods
  // to avoid timezone conversion issues
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date for display in the UI
 * 
 * @param date Date string or Date object to format
 * @param format Format to use ('short', 'long', 'numeric', etc)
 * @returns Formatted date string for display
 */
export function formatDisplayDate(
  date: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? '2-digit' : format === 'medium' ? 'short' : 'long',
    day: '2-digit'
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Validates if a string is a valid date in YYYY-MM-DD format
 * 
 * @param dateStr Date string to validate
 * @returns true if valid YYYY-MM-DD format, false otherwise
 */
export function isValidYMDDate(dateStr: string): boolean {
  // Check basic format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  
  // Validate as actual date
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Get today's date in YYYY-MM-DD format
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayYMD(): string {
  return toLocalYMD(new Date());
}

/**
 * Safely parses a date string to Date object
 * 
 * @param dateStr Date string to parse
 * @param fallback Optional fallback date if parsing fails
 * @returns Date object or fallback
 */
export function parseDate(dateStr: string, fallback: Date = new Date()): Date {
  try {
    // For YYYY-MM-DD format, ensure correct parsing without timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    // For other formats, use standard Date parsing
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? fallback : date;
  } catch (e) {
    console.error('Error parsing date:', e);
    return fallback;
  }
}