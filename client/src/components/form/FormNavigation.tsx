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
        className={`px-6 py-2 border border-gray-300 rounded-lg text-gray-700 transition-colors duration-200 ${
          isFirstStep ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
        }`}
        disabled={isFirstStep}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200 font-medium"
      >
        {isLastStep ? 'Submit' : 'Next'}
      </button>
    </div>
  );
};

export default FormNavigation;