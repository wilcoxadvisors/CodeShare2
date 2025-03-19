import { z } from 'zod';
import { toast } from '@/hooks/use-toast';

/**
 * Validate data against a schema and handle errors
 * 
 * @param schema ZodSchema to validate against
 * @param data Data to validate
 * @param options Options for error handling
 * @returns Validated data or null if validation failed
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: {
    showToast?: boolean;
    toastTitle?: string;
  } = { showToast: true, toastTitle: 'Validation Error' }
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format error messages
      const formattedErrors = formatZodErrors(error);
      
      // Show toast if requested
      if (options.showToast) {
        toast({
          title: options.toastTitle || 'Validation Error',
          description: formattedErrors.join('\n'),
          variant: 'destructive',
        });
      }
      
      // Log errors to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Validation errors:', error.errors);
      }
    }
    
    return null;
  }
}

/**
 * Format ZodError into user-friendly messages
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.length > 0 ? `${err.path.join('.')}` : 'Field';
    const message = err.message;
    return `${path}: ${message}`;
  });
}

/**
 * General validation schemas
 */

// Basic text input validation
export const textFieldSchema = (options: { 
  min?: number; 
  max?: number;
  required?: boolean;
  fieldName?: string;
}) => {
  const { min, max, required = true, fieldName = 'Field' } = options;
  let schema = z.string();
  
  if (required) {
    schema = schema.min(1, `${fieldName} is required`);
  } else {
    schema = schema.optional();
  }
  
  if (min !== undefined) {
    schema = schema.min(min, `${fieldName} must be at least ${min} characters`);
  }
  
  if (max !== undefined) {
    schema = schema.max(max, `${fieldName} cannot exceed ${max} characters`);
  }
  
  return schema;
};

// Email validation
export const emailSchema = z.string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

// Password validation
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Numeric validation
export const numericSchema = (options: {
  min?: number;
  max?: number;
  required?: boolean;
  allowNegative?: boolean;
  fieldName?: string;
}) => {
  const { min, max, required = true, allowNegative = false, fieldName = 'Number' } = options;
  
  let schema = z.string()
    .refine(val => val === '' || !isNaN(parseFloat(val)), {
      message: `${fieldName} must be a valid number`
    });
  
  if (required) {
    schema = schema.min(1, `${fieldName} is required`);
  } else {
    schema = schema.optional();
  }
  
  schema = schema.refine(val => {
    if (val === '' && !required) return true;
    const num = parseFloat(val as string);
    return allowNegative || num >= 0;
  }, {
    message: `${fieldName} must be ${allowNegative ? 'a' : 'a non-negative'} number`
  });
  
  if (min !== undefined) {
    schema = schema.refine(val => {
      if (val === '' && !required) return true;
      return parseFloat(val as string) >= min;
    }, {
      message: `${fieldName} must be greater than or equal to ${min}`
    });
  }
  
  if (max !== undefined) {
    schema = schema.refine(val => {
      if (val === '' && !required) return true;
      return parseFloat(val as string) <= max;
    }, {
      message: `${fieldName} must be less than or equal to ${max}`
    });
  }
  
  return schema;
};

// Date validation
export const dateSchema = (options: {
  required?: boolean;
  pastOnly?: boolean;
  futureOnly?: boolean;
  minDate?: Date;
  maxDate?: Date;
  fieldName?: string;
}) => {
  const { 
    required = true, 
    pastOnly = false, 
    futureOnly = false,
    minDate,
    maxDate,
    fieldName = 'Date'
  } = options;
  
  let schema = z.string();
  
  if (required) {
    schema = schema.min(1, `${fieldName} is required`);
  } else {
    schema = schema.optional();
  }
  
  schema = schema.refine(val => {
    if (val === '' && !required) return true;
    const date = new Date(val as string);
    return !isNaN(date.getTime());
  }, {
    message: `${fieldName} must be a valid date`
  });
  
  if (pastOnly) {
    schema = schema.refine(val => {
      if (val === '' && !required) return true;
      const date = new Date(val as string);
      return date <= new Date();
    }, {
      message: `${fieldName} must be in the past`
    });
  }
  
  if (futureOnly) {
    schema = schema.refine(val => {
      if (val === '' && !required) return true;
      const date = new Date(val as string);
      return date > new Date();
    }, {
      message: `${fieldName} must be in the future`
    });
  }
  
  if (minDate) {
    schema = schema.refine(val => {
      if (val === '' && !required) return true;
      const date = new Date(val as string);
      return date >= minDate;
    }, {
      message: `${fieldName} must be on or after ${minDate.toLocaleDateString()}`
    });
  }
  
  if (maxDate) {
    schema = schema.refine(val => {
      if (val === '' && !required) return true;
      const date = new Date(val as string);
      return date <= maxDate;
    }, {
      message: `${fieldName} must be on or before ${maxDate.toLocaleDateString()}`
    });
  }
  
  return schema;
};

// Form validation helpers
export const validateForm = (formData: object, schema: z.ZodSchema<any>): { 
  success: boolean; 
  data?: any; 
  errors?: Record<string, string>; 
} => {
  try {
    const validData = schema.parse(formData);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Convert zod errors to form-friendly format
      const errors: Record<string, string> = {};
      
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      
      return { success: false, errors };
    }
    
    // Unexpected error
    return { 
      success: false, 
      errors: { _form: 'An unexpected error occurred during validation' } 
    };
  }
};