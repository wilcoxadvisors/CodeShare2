/**
 * Centralized date utility functions for consistent date handling
 * 
 * This file contains standardized functions for handling dates
 * throughout the application, with a focus on preventing timezone issues.
 */

/**    
 * NEVER create a Date object for a plain YYYY-MM-DD string
 * Safely converts a YYYY-MM-DD string to display format without timezone shifts
 *
 * @param s Date string in YYYY-MM-DD format
 * @returns Formatted date string for display (MM/DD/YYYY)
 */
export function ymdToDisplay(s: string): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // fallback
  const [y, m, d] = s.split('-').map(Number);
  return `${m}/${d}/${y}`;  // US format MM/DD/YYYY
}

/**
 * Gets today's date in YYYY-MM-DD format without timezone shifts
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Format a YYYY-MM-DD date string for display (view-only, no timezone maths)
 * 
 * @param dateYMD Date string in YYYY-MM-DD format
 * @returns Formatted date string for display (MM/DD/YYYY)
 */
export function prettyYMD(dateYMD: string): string {
  // view-only, no timezone maths
  return dateYMD // e.g. '2025-05-01'
    ? dateYMD.replace(/-/g, '/') // convert to '2025/05/01'
    : '';
}

/**
 * Formats a date for display in the UI with configurable format
 * 
 * @param dateYMD Date string in YYYY-MM-DD format
 * @param format Format to use ('short', 'long', 'numeric', etc)
 * @returns Formatted date string for display
 */
export function formatDisplayDate(
  dateYMD: string | null | undefined, 
  format: 'numeric' | 'short' | 'long' = 'short'
): string {
  if (!dateYMD) return '';
  
  // Only process strings in YYYY-MM-DD format
  if (typeof dateYMD === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateYMD)) {
    // Parse the YYYY-MM-DD string to individual components
    const [year, month, day] = dateYMD.split('-').map(Number);
    
    // Create options for Intl.DateTimeFormat
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format,
      day: 'numeric',
    };
    
    // Use a UTC date to avoid timezone shifts, then format it
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat('en-US', options).format(utcDate);
  }
  
  return dateYMD || '';
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

// Keeping this for backward compatibility, but should eventually be removed
export function toLocalYMD(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  // If it's already a string in YYYY-MM-DD format, return it directly
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // If it's a Date object, convert to ISO string and take first 10 chars
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  
  // For string in different format, just take the first 10 chars if it has T
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0];
  }
  
  // Last resort, but should never happen with proper usage
  return typeof date === 'string' ? date : '';
}