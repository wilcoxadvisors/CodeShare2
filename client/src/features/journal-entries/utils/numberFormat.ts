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
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  // Default to USD if no currency is specified
  const defaultOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  return new Intl.NumberFormat("en-US", defaultOptions).format(value);
}

/**
 * Format a number with thousands separators
 * @param value Number string to format
 * @returns Formatted number string with thousands separators
 */
export function formatNumberWithSeparator(value: string): string {
  // Remove existing separators and whitespace
  const cleanedValue = value.replace(/[,\s]/g, "");
  
  // If it's not a valid number, return the original value
  if (isNaN(Number(cleanedValue))) {
    return value;
  }

  // Split the number into parts before and after decimal point
  const parts = cleanedValue.split(".");
  const wholePart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : "";

  // Add thousands separators to the whole part
  const formattedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return formattedWholePart + decimalPart;
}

/**
 * Safely parse a string as a number, handling commas and currency symbols
 * @param value String to parse
 * @returns Parsed number or 0 if invalid
 */
export function safeParseAmount(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  // Remove currency symbols, commas, and whitespace
  const cleanedValue = value.replace(/[$,\s]/g, "");
  
  // Handle negative values with parentheses like (123.45)
  const isNegative = cleanedValue.startsWith("(") && cleanedValue.endsWith(")");
  const valueWithoutParentheses = isNegative 
    ? cleanedValue.slice(1, -1) 
    : cleanedValue;
  
  // Parse the value
  const parsedValue = parseFloat(valueWithoutParentheses);
  
  // Return the value (negative if in parentheses)
  return isNaN(parsedValue) ? 0 : (isNegative ? -parsedValue : parsedValue);
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