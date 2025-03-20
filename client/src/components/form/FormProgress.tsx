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
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Button */}
              <div>
                <button
                  type="button"
                  onClick={() => onStepClick(index)}
                  className={`flex flex-col items-center ${index < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                  disabled={index > currentStep}
                >
                  {/* Step Circle */}
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full font-medium text-sm mb-2 transition-colors ${
                      isActive
                        ? 'bg-blue-800 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-blue-800' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {step}
                  </span>
                </button>
              </div>
              
              {/* Connecting Line (not for the last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FormProgress;