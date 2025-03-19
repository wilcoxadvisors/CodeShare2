import React from 'react';

interface FormProgressProps {
  currentStep: number;
  steps: string[];
  onStepClick: (index: number) => void;
}

const FormProgress: React.FC<FormProgressProps> = ({ 
  currentStep, 
  steps, 
  onStepClick 
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step circle */}
            <button
              type="button"
              onClick={() => onStepClick(index)}
              disabled={index > currentStep}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                index === currentStep
                  ? 'bg-blue-800 text-white'
                  : index < currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              aria-current={index === currentStep ? 'step' : undefined}
            >
              {index < currentStep ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </button>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Step labels */}
      <div className="flex items-center justify-between mt-2">
        {steps.map((step, index) => (
          <div
            key={`label-${index}`}
            className={`text-xs font-medium ${
              index <= currentStep ? 'text-blue-800' : 'text-gray-500'
            }`}
            style={{ 
              width: `${100 / steps.length}%`, 
              textAlign: index === 0 ? 'left' : index === steps.length - 1 ? 'right' : 'center' 
            }}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormProgress;