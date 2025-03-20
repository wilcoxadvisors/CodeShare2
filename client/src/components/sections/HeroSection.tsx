import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../../contexts/UIContext.tsx';
import useMultiStepForm from '../../hooks/useMultiStepForm.ts';
import CompanyInformationStep from '../form/CompanyInformationStep.tsx';
import ServicesSelectionStep from '../form/ServicesSelectionStep.tsx';
import ContactInformationStep from '../form/ContactInformationStep.tsx';
import FormNavigation from '../form/FormNavigation.tsx';
import FormProgress from '../form/FormProgress.tsx';

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

const HeroSection: React.FC = () => {
  const { setShowConsultationForm } = useUI();
  
  const openConsultationForm = () => {
    setShowConsultationForm(true);
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
    </section>
  );
};

export default HeroSection;