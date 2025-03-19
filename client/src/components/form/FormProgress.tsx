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
            <div className="flex flex-col items-center">
              <div
                onClick={() => index <= currentStep && onStepClick(index)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-medium mb-1 transition-colors duration-200 ${
                  index < currentStep
                    ? 'bg-green-500 cursor-pointer' 
                    : index === currentStep
                      ? 'bg-blue-800 cursor-default'
                      : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {index < currentStep ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span 
                className={`text-xs font-medium ${
                  index <= currentStep ? 'text-gray-800' : 'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div 
                className={`flex-1 h-1 mx-2 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FormProgress;