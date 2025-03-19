import React from 'react';
import { useUI } from '../../contexts/UIContext';

interface HeroSectionProps {
  onConsultClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onConsultClick }) => {
  const { setShowConsultationForm } = useUI();
  
  const handleScheduleConsultation = () => {
    // Use the context function if available
    if (typeof setShowConsultationForm === 'function') {
      setShowConsultationForm(true);
    }
    
    // Also use prop if available (for backward compatibility)
    if (typeof onConsultClick === 'function') {
      onConsultClick();
    }
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
                onClick={handleScheduleConsultation}
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