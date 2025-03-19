// src/components/form/ServicesSelectionStep.jsx
import React from 'react';
import { Check } from 'lucide-react';

function ServicesSelectionStep({ formData, handleServiceToggle, servicesList }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-700 mb-4">
        Select the services you're interested in. Choose all that apply:
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {servicesList.map((service) => (
          <div
            key={service.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              formData.services.includes(service.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onClick={() => handleServiceToggle(service.id)}
          >
            <div className="flex items-start">
              <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                formData.services.includes(service.id)
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-400'
              }`}>
                {formData.services.includes(service.id) && <Check size={14} />}
              </div>
              <div className="ml-3">
                <h3 className="font-medium">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServicesSelectionStep;