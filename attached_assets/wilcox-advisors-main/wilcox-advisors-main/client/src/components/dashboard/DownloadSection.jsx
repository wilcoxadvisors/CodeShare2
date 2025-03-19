// src/components/dashboard/DownloadSection.jsx
import React from 'react';

export default function DownloadSection() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Download Deliverables</h3>
      <button className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition duration-200">
        Download Latest Report
      </button>
    </div>
  );
}
