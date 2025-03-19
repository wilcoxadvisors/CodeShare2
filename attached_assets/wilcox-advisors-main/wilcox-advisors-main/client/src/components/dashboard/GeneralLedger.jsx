// src/components/dashboard/GeneralLedger.jsx
import React, { useState } from 'react';

export default function GeneralLedger({ entries }) {
  const [visibleEntries, setVisibleEntries] = useState(5);
  
  const loadMore = () => {
    setVisibleEntries(prev => prev + 5);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">General Ledger</h3>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {entries.slice(0, visibleEntries).map((entry, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">{entry.date}</span>
              <span className="font-semibold text-blue-800">{formatCurrency(entry.amount)}</span>
            </div>
            <p className="text-gray-700">{entry.description}</p>
          </div>
        ))}
        
        {visibleEntries < entries.length && (
          <button 
            onClick={loadMore}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Load More Entries
          </button>
        )}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{entry.date}</td>
                <td className="px-4 py-2">{entry.description}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
