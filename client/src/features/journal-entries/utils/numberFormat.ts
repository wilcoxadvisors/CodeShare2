// This function takes a string or number and returns a formatted currency string.
// It returns an empty string for zero or invalid inputs, perfect for display in an input field.
export const formatCurrencyForDisplay = (value: string | number): string => {
  const stringValue = String(value).replace(/,/g, '');
  if (!stringValue || stringValue === '0' || stringValue === '') return '';
  
  // Handle incomplete decimal inputs (like "10." or "10.5" or "10.50")
  if (stringValue.includes('.')) {
    const [wholePart, decimalPart] = stringValue.split('.');
    
    // If user is typing a decimal, preserve the exact decimal input
    if (decimalPart !== undefined) {
      const wholeNum = parseFloat(wholePart) || 0;
      if (wholeNum === 0 && wholePart !== '0') return stringValue;
      
      // Format the whole number part with commas, then add the decimal part as-is
      const formattedWhole = wholeNum.toLocaleString('en-US');
      return `${formattedWhole}.${decimalPart}`;
    } else {
      // Just a decimal point at the end
      const wholeNum = parseFloat(wholePart) || 0;
      if (wholeNum === 0 && wholePart !== '0') return stringValue;
      return `${wholeNum.toLocaleString('en-US')}.`;
    }
  }
  
  // Check if it's a valid number
  const num = parseFloat(stringValue);
  if (isNaN(num) || num === 0) return '';
  
  // Format with proper decimal places
  return num.toLocaleString('en-US');
};

// This function takes a potentially formatted string from an input and returns a clean numeric string.
export const parseCurrencyForState = (value: string): string => {
  // Remove commas and keep only numbers, dots, and minus signs
  const cleaned = value.replace(/[^0-9.-]/g, '');
  
  // Handle multiple decimal points by keeping only the first one
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  
  return cleaned;
};