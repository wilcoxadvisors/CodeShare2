import React, { useState } from 'react';
import { X } from 'lucide-react';
import useMultiStepForm from '../hooks/useMultiStepForm';
import CompanyInformationStep from './form/CompanyInformationStep';
import ServicesSelectionStep from './form/ServicesSelectionStep';
import ContactInformationStep from './form/ContactInformationStep';
import FormNavigation from './form/FormNavigation';
import FormProgress from './form/FormProgress';
import { useUI } from '../contexts/UIContext';
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

interface ConsultationFormModalProps {
  setShowConsultationForm?: (show: boolean) => void;
}

const ConsultationFormModal: React.FC<ConsultationFormModalProps> = ({ setShowConsultationForm }) => {
  const { setShowConsultationForm: setShowConsultationFormContext } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeForm = () => {
    if (setShowConsultationForm) {
      setShowConsultationForm(false);
    } else {
      setShowConsultationFormContext(false);
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            
            <FormNavigation
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              onBack={back}
              onNext={isLastStep ? () => onSubmit(data) : next}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConsultationFormModal;