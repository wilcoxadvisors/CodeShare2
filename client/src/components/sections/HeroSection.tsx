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
    <section id="hero" className="bg-blue-800 text-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Financial Expertise for Your Business Success
          </h1>
          <p className="text-xl mb-8">
            Professional accounting and financial services tailored for small businesses. We
            handle the numbers so you can focus on growth.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleScheduleConsultation}
              className="bg-white text-blue-800 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium"
            >
              Schedule Free Consultation
            </button>
            <a 
              href="#services" 
              className="border-2 border-white text-white hover:bg-blue-800 px-6 py-3 rounded-lg font-medium"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;