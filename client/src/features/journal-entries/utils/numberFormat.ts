// Advanced currency input handling with proper cursor position preservation
export const formatCurrencyInput = (
  value: string,
  previousValue: string = "",
  cursorPosition: number = 0
): { formattedValue: string; newCursorPosition: number } => {
  // Remove existing commas for processing
  const cleanValue = value.replace(/,/g, '');
  
  // Validate input - only allow numbers, one decimal point, and up to 2 decimal places
  const validPattern = /^\d*\.?\d{0,2}$/;
  if (!validPattern.test(cleanValue)) {
    return { formattedValue: previousValue, newCursorPosition: cursorPosition };
  }
  
  // Handle empty or zero values
  if (!cleanValue || cleanValue === '0' || cleanValue === '') {
    return { formattedValue: '', newCursorPosition: 0 };
  }
  
  // Split into whole and decimal parts
  const [wholePart, decimalPart] = cleanValue.split('.');
  
  if (decimalPart !== undefined) {
    // Has decimal point
    const wholeNum = parseInt(wholePart) || 0;
    const formattedWhole = wholeNum.toLocaleString('en-US');
    const formattedValue = `${formattedWhole}.${decimalPart}`;
    
    // Calculate new cursor position accounting for added commas
    const commasAdded = formattedWhole.length - wholePart.length;
    const newCursorPosition = Math.min(cursorPosition + commasAdded, formattedValue.length);
    
    return { formattedValue, newCursorPosition };
  } else {
    // No decimal point
    const num = parseInt(cleanValue) || 0;
    const formattedValue = num.toLocaleString('en-US');
    
    // Calculate new cursor position accounting for added commas
    const commasAdded = formattedValue.length - cleanValue.length;
    const newCursorPosition = Math.min(cursorPosition + commasAdded, formattedValue.length);
    
    return { formattedValue, newCursorPosition };
  }
};

// Simple display formatter for showing values (no cursor position handling needed)
export const formatCurrencyForDisplay = (value: string | number): string => {
  const stringValue = String(value).replace(/,/g, '');
  if (!stringValue || stringValue === '0' || stringValue === '') return '';
  
  const num = parseFloat(stringValue);
  if (isNaN(num) || num === 0) return '';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

// Clean parser for state storage
export const parseCurrencyForState = (value: string): string => {
  return value.replace(/[^0-9.-]/g, '');
};