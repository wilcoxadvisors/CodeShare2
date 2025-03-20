import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Standardized page header component used across the application
 */
const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  children 
}) => {
  return (
    <div className="bg-white border-b border-gray-200 py-6 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {children && (
            <div className="flex-shrink-0 flex space-x-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;