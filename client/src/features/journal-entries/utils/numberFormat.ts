// This function takes a string or number and returns a formatted currency string.
// It returns an empty string for zero or invalid inputs, perfect for display in an input field.
export const formatCurrencyForDisplay = (value: string | number): string => {
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('en-US');
};

// This function takes a potentially formatted string from an input and returns a clean numeric string.
export const parseCurrencyForState = (value: string): string => {
  return value.replace(/[^0-9.-]/g, '');
};