import React from 'react';

interface FormProgressProps {
  currentStep: number;
  steps: string[];
  onStepClick: (index: number) => void;
}

const FormProgress: React.FC<FormProgressProps> = ({ currentStep, steps, onStepClick }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between w-full">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => onStepClick(index)}
              disabled={index > currentStep}
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors ${
                index < currentStep 
                  ? 'bg-green-500 text-white' 
                  : index === currentStep 
                    ? 'bg-blue-800 text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {index < currentStep ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </button>
            <span 
              className={`text-sm ${
                index <= currentStep ? 'text-blue-800 font-medium' : 'text-gray-500'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      
      <div className="relative mt-3">
        <div className="absolute h-1 w-full bg-gray-200 rounded-full"></div>
        <div 
          className="absolute h-1 bg-blue-800 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default FormProgress;