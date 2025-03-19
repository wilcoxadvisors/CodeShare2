// components/website/ServicesTab.jsx
import React from 'react';
import { PlusCircle } from 'lucide-react';

export default function ServicesTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Services Content</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Services Section Header</h4>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section Title
          </label>
          <input
            type="text"
            defaultValue="Our Small Business Services"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-4">Service Items</h4>
        
        <div className="space-y-4">
          {[
            { title: 'Bookkeeping', description: 'Full-service bookkeeping including transaction coding and reconciliations' },
            { title: 'Monthly Financial Package', description: 'Comprehensive monthly financial statements with analysis' },
            { title: 'Cash Flow Management', description: 'Detailed cash flow tracking and forecasting' }
          ].map((service, index) => (
            <div key={index} className="bg-white p-4 rounded border">
              <div className="flex justify-between">
                <p className="font-medium">{service.title}</p>
                <div>
                  <button className="text-blue-800 hover:text-blue-900 mr-2">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-700">
                    Remove
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {service.description}
              </p>
            </div>
          ))}
        </div>
        
        <button className="mt-4 flex items-center text-blue-800 hover:text-blue-900">
          <PlusCircle size={16} className="mr-1" /> 
          Add Service
        </button>
      </div>
    </div>
  );
}
