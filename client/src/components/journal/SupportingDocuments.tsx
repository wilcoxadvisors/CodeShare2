// src/components/journal/SupportingDocuments.tsx
import React from 'react';
import { File, X } from 'lucide-react';

interface SupportingDocument {
  name: string;
  size: number;
  file: File;
}

interface SupportingDocumentsProps {
  supportingDocs: SupportingDocument[];
  onDelete?: (index: number) => void;
}

export default function SupportingDocuments({ 
  supportingDocs, 
  onDelete 
}: SupportingDocumentsProps) {
  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-medium text-gray-700">Supporting Documents</h3>
      {supportingDocs.length > 0 ? (
        <ul className="mt-1 text-sm text-gray-600">
          {supportingDocs.map((doc, index) => (
            <li key={index} className="flex items-center mb-1">
              <File size={16} className="mr-1 text-gray-500" />
              <span className="flex-1">{doc.name} ({(doc.size / 1024).toFixed(1)} KB)</span>
              {onDelete && (
                <button 
                  type="button" 
                  onClick={() => onDelete(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Remove document"
                >
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-gray-500">No supporting documents attached</p>
      )}
    </div>
  );
}