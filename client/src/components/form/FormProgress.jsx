// src/components/form/FormProgress.jsx
import React from 'react';

function FormProgress({ currentStep, totalSteps, steps }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => (
          <div key={index} className="text-sm font-medium">
            <span className={`mr-2 inline-flex items-center justify-center w-6 h-6 rounded-full ${
              currentStep >= index ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {index + 1}
            </span>
            <span className={currentStep >= index ? 'text-blue-800' : 'text-gray-500'}>
              {step.title}
            </span>
          </div>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-800 h-2.5 rounded-full" 
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

export default FormProgress;