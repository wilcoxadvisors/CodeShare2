// src/components/ConsultationFormModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import useMultiStepForm from '../hooks/useMultiStepForm';
import FormProgress from './form/FormProgress';
import CompanyInformationStep from './form/CompanyInformationStep';
import ServicesSelectionStep from './form/ServicesSelectionStep';
import FormNavigation from './form/FormNavigation';
import { useUI } from '../contexts/UIContext';

const servicesList = [
  { id: 'bookkeeping', title: 'Bookkeeping', description: 'Full-service bookkeeping including transaction coding and reconciliations' },
  { id: 'monthlyFinancials', title: 'Monthly Financial Package', description: 'Comprehensive monthly financial statements with analysis' },
  { id: 'cashFlow', title: 'Cash Flow Management', description: 'Detailed cash flow tracking and forecasting' },
  { id: 'customReporting', title: 'Custom Reporting', description: 'Tailored financial reports for your specific needs' },
  { id: 'budgeting', title: 'Budgeting & Forecasting', description: 'Development and monitoring of budgets and forecasts' },
  { id: 'controllerCFO', title: 'Outsourced Controller/CFO Services', description: 'Strategic financial oversight and planning tailored to your business' },
];

const formSteps = [
  {
    title: "Company Information",
    fields: [
      { name: "companyName", label: "Company Name", type: "text", required: true },
      { name: "industry", label: "Industry", type: "text", required: true },
      { name: "yearsInBusiness", label: "Years in Business", type: "select", options: ["Less than 1 year", "1-3 years", "3-5 years", "5-10 years", "More than 10 years"], required: true },
      { name: "revenueRange", label: "Annual Revenue Range", type: "select", options: ["Under $100K", "$100K - $250K", "$250K - $500K", "$500K - $1M", "Over $1M"], required: true },
    ],
  },
  { title: "Services of Interest", fields: [{ name: "services", type: "services", required: true }] },
  {
    title: "Contact Information",
    fields: [
      { name: "contactName", label: "Your Name", type: "text", required: true },
      { name: "email", label: "Email Address", type: "email", required: true },
      { name: "phone", label: "Phone Number", type: "tel", required: false },
      { name: "preferredContact", label: "Preferred Contact Method", type: "select", options: ["Email", "Phone"], required: true },
      { name: "preferredTime", label: "Best Time to Contact", type: "select", options: ["Morning", "Afternoon", "Evening"], required: true },
      { name: "notes", label: "Additional Notes", type: "textarea", required: false },
    ],
  },
];

function ConsultationFormModal({ setShowConsultationForm }) { // Add prop
  const { setShowConsultationForm: setShowConsultationFormContext } = useUI(); // Keep context for debugging
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormData = {
    companyName: '', industry: '', yearsInBusiness: '', revenueRange: '', services: [],
    contactName: '', email: '', phone: '', preferredContact: '', preferredTime: '', notes: '',
  };

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:10000'}/api/consultation`, formData);
      alert('Thank you! Your request has been submitted. We\'ll contact you shortly!');
      setShowConsultationForm(false); // Use prop to close modal
    } catch (error) {
      alert('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    currentStep,
    formData,
    handleInputChange,
    handleServiceToggle,
    isStepValid,
    prevStep,
    nextStep,
    handleSubmit
  } = useMultiStepForm(formSteps, initialFormData, handleFormSubmit);

  const handleClose = () => {
    setShowConsultationForm(false); // Use prop to close modal
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-md sm:max-w-lg md:max-w-3xl">
        <div className="sticky top-0 bg-white p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-800">Schedule Your Free Consultation</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <FormProgress steps={formSteps} currentStep={currentStep} />
          
          <form onSubmit={handleSubmit}>
            {currentStep === 0 && (
              <CompanyInformationStep
                formData={formData}
                handleInputChange={handleInputChange}
                fields={formSteps[0].fields}
              />
            )}
            
            {currentStep === 1 && (
              <ServicesSelectionStep
                formData={formData}
                handleServiceToggle={handleServiceToggle}
                servicesList={servicesList}
              />
            )}
            
            {currentStep === 2 && (
              <CompanyInformationStep
                formData={formData}
                handleInputChange={handleInputChange}
                fields={formSteps[2].fields}
              />
            )}
            
            <FormNavigation
              currentStep={currentStep}
              totalSteps={formSteps.length}
              prevStep={prevStep}
              nextStep={nextStep}
              isStepValid={isStepValid}
              isSubmitting={isSubmitting}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default ConsultationFormModal;
