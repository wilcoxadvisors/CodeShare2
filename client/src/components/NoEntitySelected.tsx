import React from 'react';
import { Building, Users } from 'lucide-react';

/**
 * Component displayed when no client or entity is selected
 * Provides clear instructions to the user to select a client to begin working
 */
export default function NoEntitySelected() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <Building className="w-8 h-8 text-gray-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Select a Client to Begin
        </h2>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          To access your financial data and manage journal entries, please select a client 
          from the dropdown menu above. Once selected, you'll be able to work with their 
          entities and financial records.
        </p>
        
        <div className="flex items-center justify-center text-sm text-gray-500">
          <Users className="w-4 h-4 mr-2" />
          <span>Use the "Select Client..." dropdown to get started</span>
        </div>
      </div>
    </div>
  );
}