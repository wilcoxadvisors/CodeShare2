import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "0.00",
  className = "",
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number with thousands separators
  const formatCurrency = (num: string): string => {
    if (!num || num === '') return '';
    
    // Remove any existing formatting
    const cleanNum = num.replace(/[^0-9.-]/g, '');
    
    // Handle empty or invalid input
    if (cleanNum === '' || cleanNum === '.') return cleanNum;
    
    // Split into integer and decimal parts
    const parts = cleanNum.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousands separators to integer part
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Reconstruct the number
    if (decimalPart !== undefined) {
      // Limit decimal places to 2
      const limitedDecimal = decimalPart.substring(0, 2);
      return `${integerPart}.${limitedDecimal}`;
    }
    
    return integerPart;
  };

  // Parse formatted currency back to clean number for storage
  const parseCurrency = (formatted: string): string => {
    if (!formatted || formatted === '') return '';
    return formatted.replace(/,/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Clean the input value - remove all non-numeric characters except decimal point and minus
    const cleanValue = inputValue.replace(/[^0-9.-]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return; // Don't update if multiple decimal points
    }
    
    // Limit decimal places to 2
    const parts = cleanValue.split('.');
    if (parts[1] && parts[1].length > 2) {
      // Truncate to 2 decimal places instead of blocking
      const truncatedValue = parts[0] + '.' + parts[1].substring(0, 2);
      onChange(truncatedValue);
      return;
    }
    
    // Update the stored value (clean number)
    onChange(cleanValue);
  };

  // Handle paste events to allow pasting numbers
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Clean the pasted text
    const cleanPasted = pastedText.replace(/[^0-9.-]/g, '');
    
    // Validate it's a valid number
    if (cleanPasted && !isNaN(parseFloat(cleanPasted))) {
      // Limit decimal places to 2
      const parts = cleanPasted.split('.');
      let finalValue = parts[0];
      if (parts[1]) {
        finalValue += '.' + parts[1].substring(0, 2);
      }
      onChange(finalValue);
    }
  };

  // Handle key press for immediate validation
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key;
    const currentValue = (e.target as HTMLInputElement).value;
    
    // Allow control keys (including Ctrl+V for paste)
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
      return;
    }
    
    // Allow Ctrl+V, Ctrl+C, Ctrl+X, Ctrl+A
    if (e.ctrlKey && ['v', 'c', 'x', 'a'].includes(char.toLowerCase())) {
      return;
    }
    
    // Allow digits
    if (/\d/.test(char)) {
      return;
    }
    
    // Allow decimal point only if none exists
    if (char === '.' && !currentValue.includes('.')) {
      return;
    }
    
    // Block all other characters
    e.preventDefault();
  };

  const displayValue = formatCurrency(value);

  return (
    <Input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyPress}
      onPaste={handlePaste}
      placeholder={placeholder}
      className={`text-right ${className}`}
      disabled={disabled}
    />
  );
};