import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-secondary-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        
        {children && (
          <div className="flex space-x-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
