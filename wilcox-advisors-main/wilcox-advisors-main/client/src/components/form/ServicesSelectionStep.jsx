// src/components/form/ServicesSelectionStep.jsx
import React from 'react';
import { Check } from 'lucide-react';

export default function ServicesSelectionStep({ formData, handleServiceToggle, servicesList }) {
  return (
    <div className="space-y-4">
      {servicesList.map((service) => (
        <div
          key={service.id}
          className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition duration-200"
          onClick={() => handleServiceToggle(service.id)}
        >
          <div className="flex items-center h-5">
            <div className={`w-5 h-5 border rounded flex items-center justify-center ${
              formData.services.includes(service.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            }`}>
              {formData.services.includes(service.id) && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
          <div className="ml-3 flex-1">
            <label className="text-sm font-medium text-gray-900 cursor-pointer">{service.title}</label>
            <p className="text-sm text-gray-600">{service.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
