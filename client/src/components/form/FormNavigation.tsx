import React from 'react';

interface FormNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  isFirstStep,
  isLastStep,
  onBack,
  onNext
}) => {
  return (
    <div className="flex justify-between mt-8">
      <button
        type="button"
        onClick={onBack}
        className={`px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
          isFirstStep
            ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }`}
        disabled={isFirstStep}
      >
        Back
      </button>
      
      <button
        type="button"
        onClick={onNext}
        className="px-6 py-2 bg-blue-800 text-white rounded-md font-medium hover:bg-blue-900 transition-colors duration-200"
      >
        {isLastStep ? 'Submit' : 'Next'}
      </button>
    </div>
  );
};

export default FormNavigation;