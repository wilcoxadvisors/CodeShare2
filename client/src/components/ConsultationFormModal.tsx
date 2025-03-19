import React from 'react';
import { useUI } from '../contexts/UIContext';
import useMultiStepForm from '../hooks/useMultiStepForm';
import CompanyInformationStep from './form/CompanyInformationStep';
import ServicesSelectionStep from './form/ServicesSelectionStep';
import ContactInformationStep from './form/ContactInformationStep';
import FormNavigation from './form/FormNavigation';
import FormProgress from './form/FormProgress';

const initialFormData = {
  // Company information
  companyName: '',
  industry: '',
  companySize: '',
  annualRevenue: '',
  
  // Services needed
  services: [],
  
  // Contact information
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  preferredContact: 'email',
  message: ''
};

const ConsultationFormModal: React.FC = () => {
  const { showConsultationForm, setShowConsultationForm } = useUI();

  const handleClose = () => {
    setShowConsultationForm(false);
  };

  const handleSubmit = (formData: any) => {
    // In a real implementation, this would send data to the backend
    console.log('Form submitted:', formData);
    
    // Show a success message
    alert('Thank you for your interest! Our team will contact you shortly.');
    
    // Close the form
    setShowConsultationForm(false);
  };

  const {
    step,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    steps,
    goTo,
    next,
    back,
    formData,
    setFormData,
    handleChange,
  } = useMultiStepForm(
    [
      { 
        name: 'Company Information', 
        component: (
          <CompanyInformationStep 
            formData={formData} 
            handleChange={handleChange} 
          />
        ) 
      },
      { 
        name: 'Services Selection', 
        component: (
          <ServicesSelectionStep 
            formData={formData} 
            handleChange={handleChange} 
          />
        ) 
      },
      { 
        name: 'Contact Information', 
        component: (
          <ContactInformationStep 
            formData={formData} 
            handleChange={handleChange} 
          />
        ) 
      }
    ],
    initialFormData,
    handleSubmit
  );

  if (!showConsultationForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close form"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-6 pb-2">
          <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">Request a Consultation</h2>
          <p className="text-gray-600 mb-6">
            Fill out the form below to request a consultation with our financial advisors.
          </p>
          
          <FormProgress
            currentStep={currentStepIndex}
            steps={steps.map(s => s.name)}
            onStepClick={goTo}
          />
        </div>
        
        <div className="p-6 pt-2">
          <form>
            {step}
            
            <FormNavigation
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              onBack={back}
              onNext={next}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConsultationFormModal;