import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface BaseFieldProps {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  tooltip?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}

interface CheckboxFieldProps extends Omit<BaseFieldProps, 'label'> {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const TextField: React.FC<TextFieldProps> = ({
  id,
  name,
  label,
  type = 'text',
  required = false,
  disabled = false,
  placeholder,
  value,
  onChange,
  error,
  className = '',
  min,
  max,
  step,
  tooltip,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label 
          htmlFor={id}
          className={error ? 'text-red-500' : ''}
          title={tooltip}
        >
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        min={min}
        max={max}
        step={step}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export const TextareaField: React.FC<TextareaFieldProps> = ({
  id,
  name,
  label,
  required = false,
  disabled = false,
  placeholder,
  value,
  onChange,
  error,
  className = '',
  rows = 3,
  tooltip,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label 
          htmlFor={id}
          className={error ? 'text-red-500' : ''}
          title={tooltip}
        >
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        rows={rows}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  name,
  label,
  required = false,
  disabled = false,
  placeholder,
  value,
  onValueChange,
  options,
  error,
  className = '',
  tooltip,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label 
          htmlFor={id}
          className={error ? 'text-red-500' : ''}
          title={tooltip}
        >
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={`${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="">None</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  id,
  name,
  label,
  checked,
  onCheckedChange,
  disabled = false,
  error,
  className = '',
  tooltip,
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Checkbox
        id={id}
        name={name}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={error ? 'border-red-500' : ''}
      />
      <Label 
        htmlFor={id}
        className={`text-sm font-medium leading-none ${error ? 'text-red-500' : ''}`}
        title={tooltip}
      >
        {label}
      </Label>
      {error && <p className="text-sm text-red-500 ml-2">{error}</p>}
    </div>
  );
};