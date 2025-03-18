// src/components/journal/JournalHeader.jsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function JournalHeader({ 
  journalData, 
  errors, 
  handleChange, 
  showAdvancedFields, 
  setShowAdvancedFields 
}) {
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
        <label htmlFor="transactionNo" className="text-gray-700 font-medium mb-1">Transaction No.</label>
        <input
          type="text"
          id="transactionNo"
          name="transactionNo"
          value={journalData.transactionNo}
          onChange={handleChange}
          className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex flex-col md:col-span-1">
        <button 
          type="button"
          onClick={() => setShowAdvancedFields(!showAdvancedFields)}
          className="text-blue-600 hover:text-blue-800 flex items-center self-end mt-2"
        >
          {showAdvancedFields ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
          {showAdvancedFields ? 'Hide Advanced Fields' : 'Show Advanced Fields'}
        </button>
      </div>
      
      <div className="flex flex-col md:col-span-3">
        <label htmlFor="description" className="text-gray-700 font-medium mb-1">Description *</label>
        <textarea
          id="description"
          name="description"
          value={journalData.description}
          onChange={handleChange}
          rows={2}
          className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-required="true"
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>
    </div>
  );
}
