/**
 * Formats date values to YYYY-MM-DD without timezone conversion
 * This prevents the date from shifting to the previous day in negative UTC offsets
 * 
 * @param value - Date object or date string to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatPickerDate = (value: string | Date): string => {
  if (!value) return '';
  
  // If it's already a string in YYYY-MM-DD format, just return it
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // If it's a string with time component, extract just the date part
  if (typeof value === 'string' && value.includes('T')) {
    return value.split('T')[0];
  }
  
  // For Date objects or other string formats, use local date methods
  // to avoid timezone conversion issues
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}