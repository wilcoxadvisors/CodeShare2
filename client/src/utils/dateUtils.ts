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
  
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use local date parts to prevent timezone shifts
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
  format: 'numeric' | 'short' | 'long' = 'short'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format,
    day: 'numeric',
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
  // Check format using regex: YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  // Parse parts and validate month and day
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Check month is between 1-12
  if (month < 1 || month > 12) return false;
  
  // Check day is valid for month (including leap years)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  
  return true;
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
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? fallback : date;
  } catch (error) {
    return fallback;
  }
}