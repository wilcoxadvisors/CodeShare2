// src/components/journal/ActionButtons.tsx
import React, { useRef } from 'react';
import { PlusCircle, Upload, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";

type ActionButtonsProps = {
  addEntryRow: () => void;
  supportingDocs: Array<{name: string, size: number, file: File}>;
  handleFileUpload: (file: File) => void;
  isSubmitting: boolean;
};

export default function ActionButtons({
  addEntryRow,
  supportingDocs,
  handleFileUpload,
  isSubmitting
}: ActionButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <>
      {/* Add Line Button and Supporting Documents */}
      <div className="flex justify-between items-start mt-4">
        <Button
          type="button"
          onClick={addEntryRow}
          variant="link"
          className="flex items-center text-blue-600 hover:text-blue-800 p-0"
        >
          <PlusCircle size={18} className="mr-1" /> Add Line
        </Button>
        
        {/* Supporting Documents */}
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-gray-700">Supporting Documents</h3>
          {supportingDocs.length > 0 ? (
            <ul className="mt-1 text-sm text-gray-600">
              {supportingDocs.map((doc, index) => (
                <li key={index} className="flex items-center mb-1">
                  <span className="mr-2">📎</span>
                  <span>{doc.name} ({(doc.size / 1024).toFixed(1)} KB)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No supporting documents attached</p>
          )}
        </div>
      </div>
      
      {/* Submit and Upload Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden"
            accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
          />
          <Button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex items-center justify-center"
          >
            <Upload className="mr-2 h-5 w-5" /> Upload Supporting Document
          </Button>
        </div>
        
        <Button 
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-800 hover:bg-blue-900"
        >
          {isSubmitting ? 'Saving...' : 'Post Journal Entry'} <Save className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </>
  );
}