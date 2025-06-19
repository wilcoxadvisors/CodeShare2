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
    
    // Allow typing decimal point and numbers
    const cleanValue = inputValue.replace(/[^0-9.-]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return; // Don't update if multiple decimal points
    }
    
    // Limit decimal places to 2
    const parts = cleanValue.split('.');
    if (parts[1] && parts[1].length > 2) {
      return; // Don't update if more than 2 decimal places
    }
    
    // Update the stored value (clean number)
    onChange(cleanValue);
    
    // Format for display
    const formattedValue = formatCurrency(cleanValue);
    
    // Set cursor position after formatting
    if (inputRef.current) {
      // Calculate cursor adjustment for added commas
      const beforeCommas = (inputValue.substring(0, cursorPosition).match(/,/g) || []).length;
      const afterCommas = (formattedValue.substring(0, cursorPosition).match(/,/g) || []).length;
      const cursorAdjustment = afterCommas - beforeCommas;
      const newCursorPosition = cursorPosition + cursorAdjustment;
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
  };

  // Handle key press for immediate validation
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key;
    const currentValue = (e.target as HTMLInputElement).value;
    
    // Allow control keys
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
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
      placeholder={placeholder}
      className={`text-right ${className}`}
      disabled={disabled}
    />
  );
};