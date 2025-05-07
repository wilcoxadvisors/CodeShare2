import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  label = 'Loading...'
}) => {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center space-y-2">
        <div className={`animate-spin rounded-full ${sizeMap[size]} border-b-2 border-primary`}></div>
        {label && (
          <div className="text-sm text-muted-foreground">
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

export default Spinner;