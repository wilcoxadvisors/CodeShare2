// src/components/form/FormNavigation.jsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FormNavigation({
  currentStep,
  totalSteps,
  prevStep,
  nextStep,
  isStepValid,
  isSubmitting
}) {
  return (
    <div className="mt-8 flex justify-between">
      {currentStep > 0 && (
        <button 
          type="button" 
          onClick={prevStep} 
          className="flex items-center px-4 py-2 text-blue-800 hover:text-blue-900 transition duration-200"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Previous
        </button>
      )}
      <button
        type={currentStep === totalSteps - 1 ? 'submit' : 'button'}
        onClick={currentStep < totalSteps - 1 ? nextStep : undefined}
        disabled={!isStepValid() || isSubmitting}
        className={`ml-auto px-6 py-2 rounded-lg font-semibold transition duration-200 ${
          isStepValid() && !isSubmitting
            ? 'bg-blue-800 text-white hover:bg-blue-900' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? 'Submitting...' : currentStep === totalSteps - 1 ? 'Submit' : 'Next'}
        {currentStep < totalSteps - 1 && <ChevronRight className="w-5 h-5 ml-1" />}
      </button>
    </div>
  );
}
