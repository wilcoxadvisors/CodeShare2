import React, { useState } from 'react';
import { useUI } from '../contexts/UIContext';
import useMultiStepForm from '../hooks/useMultiStepForm';
import CompanyInformationStep from './form/CompanyInformationStep';
import ServicesSelectionStep from './form/ServicesSelectionStep';
import ContactInformationStep from './form/ContactInformationStep';
import FormNavigation from './form/FormNavigation';
import FormProgress from './form/FormProgress';

interface FormData {
  // Company Information
  companyName: string;
  industry: string;
  companySize: string;
  annualRevenue: string;
  
  // Services Selection
  services: string[];
  
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: string;
  message: string;
}

const INITIAL_DATA: FormData = {
  companyName: '',
  industry: '',
  companySize: '',
  annualRevenue: '',
  services: [],
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  preferredContact: 'email',
  message: ''
};

const ConsultationFormModal: React.FC = () => {
  const { showConsultationForm, setShowConsultationForm } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  const steps = [
    { title: 'Company', component: CompanyInformationStep },
    { title: 'Services', component: ServicesSelectionStep },
    { title: 'Contact', component: ContactInformationStep }
  ];
  
  const { 
    step,
    currentStepIndex,
    steps: formSteps,
    isFirstStep,
    isLastStep,
    formData,
    handleChange,
    goTo,
    next,
    back 
  } = useMultiStepForm(steps, INITIAL_DATA, onSubmit);
  
  function onSubmit(data: FormData) {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', data);
      setIsSubmitting(false);
      setSubmissionSuccess(true);
      
      // Reset and close form after 2 seconds
      setTimeout(() => {
        setSubmissionSuccess(false);
        setShowConsultationForm(false);
      }, 2000);
    }, 1500);
  }
  
  if (!showConsultationForm) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Request a Consultation</h2>
            <button 
              onClick={() => setShowConsultationForm(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {submissionSuccess ? (
            <div className="text-center py-10">
              <div className="mb-4 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Thank you for your request!</h3>
              <p className="text-gray-600">
                We have received your consultation request and will contact you shortly.
              </p>
            </div>
          ) : (
            <form>
              <FormProgress 
                currentStep={currentStepIndex} 
                steps={steps.map(s => s.title)} 
                onStepClick={goTo} 
              />
              
              {step}
              
              <FormNavigation 
                isFirstStep={isFirstStep}
                isLastStep={isLastStep}
                onBack={back}
                onNext={next}
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultationFormModal;