// src/components/journal/ActionButtons.jsx
import React, { useRef } from 'react';
import { PlusCircle, Upload, Save } from 'lucide-react';
import SupportingDocuments from './SupportingDocuments';

export default function ActionButtons({
  addEntryRow,
  supportingDocs,
  handleFileUpload,
  isSubmitting
}) {
  const fileInputRef = useRef(null);
  
  return (
    <>
      {/* Add Line Button and Supporting Documents */}
      <div className="flex justify-between items-start">
        <button
          type="button"
          onClick={addEntryRow}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <PlusCircle size={18} className="mr-1" /> Add Line
        </button>
        
        <SupportingDocuments supportingDocs={supportingDocs} />
      </div>
      
      {/* Submit and Upload Buttons */}
      <div className="flex justify-between">
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files[0])}
            className="hidden"
            accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2 rounded-md transition duration-200 flex items-center justify-center"
          >
            <Upload className="mr-2 h-5 w-5" /> Upload Supporting Document
          </button>
        </div>
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className={`${isSubmitting ? 'bg-blue-400' : 'bg-blue-800 hover:bg-blue-900'} text-white px-6 py-2 rounded-md transition duration-200 flex items-center justify-center`}
        >
          {isSubmitting ? 'Saving...' : 'Post Journal Entry'} <Save className="ml-2 h-5 w-5" />
        </button>
      </div>
    </>
  );
}
