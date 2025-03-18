// src/components/form/FormProgress.jsx
import React from 'react';
import { Check } from 'lucide-react';

export default function FormProgress({ steps, currentStep }) {
  return (
    <div className="flex justify-between mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            index === currentStep ? 'bg-blue-800 text-white' :
            index < currentStep ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {index < currentStep ? <Check size={16} /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`h-1 w-12 sm:w-16 ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
