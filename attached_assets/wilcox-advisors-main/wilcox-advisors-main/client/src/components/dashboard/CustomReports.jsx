// src/components/dashboard/CustomReports.jsx
import React from 'react';

export default function CustomReports({ reports }) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Custom Reports</h3>
      <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
        {reports.map((report, index) => (
          <option key={index} value={report}>{report}</option>
        ))}
      </select>
    </div>
  );
}
