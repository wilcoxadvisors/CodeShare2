/**
 * Utility functions for formatting and parsing numbers
 */

/**
 * Format a number as a currency string
 * @param value Number to format
 * @param options Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string,
  options: Intl.NumberFormatOptions = {}
): string {
  // Default options for currency formatting
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  // Convert string to number if needed
  const num = typeof value === 'string' ? safeParseAmount(value) : value;

  // Return dash for zero values
  if (num === 0) return '-';

  // Format the number
  return new Intl.NumberFormat('en-US', defaultOptions).format(num);
}

/**
 * Format a number with thousands separators
 * @param value Number string to format
 * @returns Formatted number string with thousands separators
 */
export function formatNumberWithSeparator(value: string): string {
  // Clean the input value
  const cleanValue = value.replace(/[^0-9.]/g, '');
  
  // Split the value into integer and decimal parts
  const parts = cleanValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
  
  // Add thousands separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return formattedInteger + decimalPart;
}

/**
 * Safely parse a string as a number, handling commas and currency symbols
 * @param value String to parse
 * @returns Parsed number or 0 if invalid
 */
export function safeParseAmount(value: string | number): number {
  if (typeof value === 'number') return value;
  
  // Return 0 for empty strings
  if (!value) return 0;
  
  // Remove currency symbols, commas, and other non-numeric characters
  // Keep decimal points and negative signs
  const cleanValue = value.toString().replace(/[^0-9.-]/g, '');
  
  // Parse as float
  const num = parseFloat(cleanValue);
  
  // Return 0 if the result is NaN
  return isNaN(num) ? 0 : num;
}

/**
 * Format a number to show as a percentage
 * @param value Number to format as percentage
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Check if a number is zero or very close to zero
 * @param value Number to check
 * @param epsilon Threshold for "close to zero"
 * @returns True if number is effectively zero
 */
export function isEffectivelyZero(value: number, epsilon: number = 0.001): boolean {
  return Math.abs(value) < epsilon;
}