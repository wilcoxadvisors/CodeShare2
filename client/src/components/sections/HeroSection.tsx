import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import useMultiStepForm from '../../hooks/useMultiStepForm';
import CompanyInformationStep from '../form/CompanyInformationStep';
import ServicesSelectionStep from '../form/ServicesSelectionStep';
import ContactInformationStep from '../form/ContactInformationStep';
import FormNavigation from '../form/FormNavigation';
import FormProgress from '../form/FormProgress';

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

// Standalone hero section with built-in form logic
const HeroSection: React.FC = () => {
  // Use local state for form visibility instead of context
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const openConsultationForm = () => {
    console.log("Opening consultation form using local state");
    setShowForm(true);
  };

  const closeForm = () => {
    console.log("Closing consultation form using local state");
    setShowForm(false);
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
    <section className="bg-[#1E3A8A] py-24 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-1 gap-12 items-center">
          <div className="text-white text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Financial Expertise for Your Business Success
            </h1>
            <p className="text-xl mb-10 text-blue-100">
              Professional accounting and financial services tailored for small businesses. We handle the numbers so you can focus on growth.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
              <button 
                onClick={openConsultationForm}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 transition-colors px-8 py-4 rounded font-medium text-center shadow-lg"
              >
                Schedule Free Consultation
              </button>
              <a 
                href="#services" 
                className="border-2 border-white text-white hover:bg-white hover:text-[#1E3A8A] transition-colors px-8 py-4 rounded font-medium text-center"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Modal Form */}
      {showForm && (
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
      )}
    </section>
  );
};

export default HeroSection;