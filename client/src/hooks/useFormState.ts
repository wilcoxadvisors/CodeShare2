import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateForm } from '@/lib/validation';

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  formError: string | null;
  isSubmitting: boolean;
}

export interface UseFormStateOptions<T> {
  initialData: T;
  schema?: z.ZodSchema<any>;
  onSubmit?: (data: T) => Promise<void> | void;
}

export function useFormState<T extends Record<string, any>>({ 
  initialData, 
  schema,
  onSubmit
}: UseFormStateOptions<T>) {
  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    formError: null,
    isSubmitting: false
  });

  const setData = useCallback((key: keyof T, value: any) => {
    setFormState(prev => {
      // Create a copy of the previous errors object
      const updatedErrors = { ...prev.errors };
      
      // Clear error for the field being changed
      if (updatedErrors[key as string]) {
        delete updatedErrors[key as string];
      }
      
      return {
        ...prev,
        data: { ...prev.data, [key]: value },
        errors: updatedErrors,
        formError: null // Clear form-level error when fields change
      };
    });
  }, []);

  const setFieldValue = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setData(name as keyof T, checked);
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      const numValue = value === '' ? '' : Number(value);
      setData(name as keyof T, numValue);
      return;
    }
    
    // Handle all other input types
    setData(name as keyof T, value);
  }, [setData]);

  const setSelectValue = useCallback((name: string, value: string) => {
    setData(name as keyof T, value);
  }, [setData]);

  const setCheckboxValue = useCallback((name: string, checked: boolean) => {
    setData(name as keyof T, checked);
  }, [setData]);

  const validateFormData = useCallback(() => {
    if (!schema) return true;
    
    const validation = validateForm(formState.data, schema);
    
    if (!validation.success) {
      setFormState(prev => ({
        ...prev,
        errors: validation.errors || {},
        formError: 'Please correct the errors in the form.'
      }));
      return false;
    }
    
    return true;
  }, [formState.data, schema]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Skip validation if no schema is provided
    if (schema && !validateFormData()) {
      return;
    }
    
    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      formError: null
    }));
    
    try {
      if (onSubmit) {
        await onSubmit(formState.data);
      }
      
      // Don't reset form state here to allow the parent component
      // to handle success (clear the form, close modal, etc.)
    } catch (error: any) {
      setFormState(prev => ({
        ...prev,
        formError: error.message || 'An error occurred while submitting the form.',
        isSubmitting: false
      }));
    }
  }, [formState.data, onSubmit, schema, validateFormData]);

  const resetForm = useCallback(() => {
    setFormState({
      data: initialData,
      errors: {},
      formError: null,
      isSubmitting: false
    });
  }, [initialData]);

  const setFormData = useCallback((data: Partial<T>) => {
    setFormState(prev => ({
      ...prev,
      data: { ...prev.data, ...data },
      errors: {},
      formError: null
    }));
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error }
    }));
  }, []);

  const setFormErrorMessage = useCallback((error: string | null) => {
    setFormState(prev => ({
      ...prev,
      formError: error
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: {},
      formError: null
    }));
  }, []);

  return {
    ...formState,
    setData,
    setFieldValue,
    setSelectValue,
    setCheckboxValue,
    handleSubmit,
    resetForm,
    validateFormData,
    setFormData,
    setFieldError,
    setFormErrorMessage,
    clearErrors
  };
}