import React, { useState } from 'react';
import { X } from 'lucide-react';
import useMultiStepForm from '../hooks/useMultiStepForm.ts';
import CompanyInformationStep from './form/CompanyInformationStep.tsx';
import ServicesSelectionStep from './form/ServicesSelectionStep.tsx';
import ContactInformationStep from './form/ContactInformationStep.tsx';
import FormNavigation from './form/FormNavigation.tsx';
import FormProgress from './form/FormProgress.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import axios from 'axios';

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
  preferredContact: '',
  message: ''
};

const FORM_STEPS = ["Company Info", "Services", "Contact"];

// No props needed, we're using UIContext directly
const ConsultationFormModal: React.FC = () => {
  const { setShowConsultationForm } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeForm = () => {
    console.log("Closing consultation form via UIContext");
    setShowConsultationForm(false);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // In a real implementation, this would send the data to a server
      console.log('Form submitted with data:', data);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
      alert('Thank you for your interest! We will contact you shortly to schedule a consultation.');
      closeForm();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    currentStepIndex,
    step,
    steps,
    isFirstStep,
    isLastStep,
    back,
    next,
    goTo,
    data,
    setData
  } = useMultiStepForm(FORM_STEPS, INITIAL_DATA, onSubmit);

  const validateCurrentStep = () => {
    const errors: string[] = [];
    
    if (currentStepIndex === 0) { // Company Information
      if (!data.companyName) errors.push("Company Name is required");
      if (!data.industry) errors.push("Industry is required");
      if (!data.companySize) errors.push("Company Size is required");
      if (!data.annualRevenue) errors.push("Annual Revenue is required");
    } 
    else if (currentStepIndex === 1) { // Services
      if (data.services.length === 0) errors.push("Please select at least one service");
    }
    else if (currentStepIndex === 2) { // Contact Information
      if (!data.firstName) errors.push("First Name is required");
      if (!data.lastName) errors.push("Last Name is required");
      if (!data.email) errors.push("Email Address is required");
      if (!data.preferredContact) errors.push("Preferred Contact Method is required");
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (isLastStep) {
      if (validateCurrentStep()) {
        onSubmit(data);
      }
    } else {
      if (validateCurrentStep()) {
        next();
        setFormErrors([]);
      }
    }
  };

  // Import the CustomChangeEvent type from ServicesSelectionStep
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string; value: any } }
  ) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-md sm:max-w-lg md:max-w-2xl">
        <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-800">Schedule Your Free Consultation</h2>
          <button onClick={closeForm} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <FormProgress 
            currentStep={currentStepIndex} 
            steps={FORM_STEPS}
            onStepClick={goTo}
          />
          
          <form onSubmit={(e) => e.preventDefault()}>
            {currentStepIndex === 0 && (
              <CompanyInformationStep 
                formData={data} 
                handleChange={handleChange}
              />
            )}
            
            {currentStepIndex === 1 && (
              <ServicesSelectionStep 
                formData={data} 
                handleChange={handleChange}
              />
            )}
            
            {currentStepIndex === 2 && (
              <ContactInformationStep 
                formData={data} 
                handleChange={handleChange}
              />
            )}
            
            {/* Display validation errors */}
            {formErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-6 mb-4">
                <p className="font-medium mb-1">Please correct the following errors:</p>
                <ul className="list-disc pl-5 text-sm">
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <FormNavigation
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              onBack={back}
              onNext={handleNext}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConsultationFormModal;