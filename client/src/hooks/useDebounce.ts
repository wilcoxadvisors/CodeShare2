import { useState, useEffect } from 'react';

/**
 * A custom hook that creates a debounced version of a value
 * 
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes (or the component unmounts)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A custom hook that creates a debounced function
 * 
 * @param fn The function to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useState<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    if (timerRef[0]) {
      clearTimeout(timerRef[0]);
    }

    timerRef[0] = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}