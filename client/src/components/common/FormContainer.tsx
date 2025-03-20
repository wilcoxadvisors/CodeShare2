import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface FormContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  formError?: string | null; // Added for compatibility with useFormState
  submitLabel?: string;
  cancelLabel?: string;
  showSubmitButton?: boolean;
  showCancelButton?: boolean;
  footerContent?: React.ReactNode;
  className?: string;
  id?: string;
}

const FormContainer: React.FC<FormContainerProps> = ({
  title,
  description,
  children,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
  formError = null,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  showSubmitButton = true,
  showCancelButton = true,
  footerContent,
  className = '',
  id,
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {title && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}

      {(error || formError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || formError}</AlertDescription>
        </Alert>
      )}

      <form id={id} onSubmit={onSubmit} className="space-y-6">
        {children}

        <div className="flex items-center justify-end space-x-4">
          {footerContent}
          
          {showCancelButton && onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
          )}
          
          {showSubmitButton && (
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FormContainer;