// src/components/journal/SupportingDocuments.jsx
import React from 'react';

export default function SupportingDocuments({ supportingDocs }) {
  if (supportingDocs.length === 0) return null;
  
  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <h3 className="text-sm font-medium mb-2">Supporting Documents:</h3>
      <ul className="text-sm">
        {supportingDocs.map((doc, idx) => (
          <li key={idx} className="text-gray-700">
            {doc.name} ({(doc.size / 1024).toFixed(1)} KB)
          </li>
        ))}
      </ul>
    </div>
  );
}
