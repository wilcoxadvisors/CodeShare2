// src/components/journal/JournalHeader.tsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type JournalHeaderProps = {
  journalData: {
    date: string;
    transactionNo: string;
    reference: string;
    description: string | null;
  };
  errors: {
    date?: string;
    reference?: string;
    description?: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  showAdvancedFields: boolean;
  setShowAdvancedFields: (value: boolean) => void;
};

export default function JournalHeader({ 
  journalData, 
  errors, 
  handleChange, 
  showAdvancedFields, 
  setShowAdvancedFields 
}: JournalHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex flex-col">
        <label htmlFor="date" className="text-gray-700 font-medium mb-1">Date *</label>
        <input
          type="date"
          id="date"
          name="date"
          value={journalData.date}
          onChange={handleChange}
          className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-required="true"
        />
        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
      </div>
      
      <div className="flex flex-col">
        <label htmlFor="reference" className="text-gray-700 font-medium mb-1">Reference *</label>
        <input
          type="text"
          id="reference"
          name="reference"
          value={journalData.reference}
          onChange={handleChange}
          placeholder="INV-001 or REF-123"
          className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.reference && <p className="text-red-500 text-sm mt-1">{errors.reference}</p>}
      </div>
      
      <div className="flex flex-col md:col-span-3">
        <label htmlFor="description" className="text-gray-700 font-medium mb-1">Description</label>
        <textarea
          id="description"
          name="description"
          value={journalData.description || ''}
          onChange={handleChange}
          placeholder="Enter journal entry description"
          rows={2}
          className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>
      
      <div className="flex items-center md:col-span-3 justify-end">
        <button
          type="button"
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
          onClick={() => setShowAdvancedFields(!showAdvancedFields)}
        >
          {showAdvancedFields ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
          {showAdvancedFields ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </button>
      </div>
      
      {showAdvancedFields && (
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
          <div className="flex flex-col">
            <label htmlFor="documentDate" className="text-gray-700 font-medium mb-1">Document Date</label>
            <input
              type="date"
              id="documentDate"
              name="documentDate" 
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="period" className="text-gray-700 font-medium mb-1">Accounting Period</label>
            <select
              id="period"
              name="period"
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Current Period</option>
              <option value="jan">January 2025</option>
              <option value="feb">February 2025</option>
              <option value="mar">March 2025</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="approvalStatus" className="text-gray-700 font-medium mb-1">Approval Status</label>
            <select
              id="approvalStatus"
              name="approvalStatus"
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}