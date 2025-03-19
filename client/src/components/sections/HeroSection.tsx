import React from 'react';

interface HeroSectionProps {
  onConsultClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onConsultClick }) => {
  return (
    <section id="hero" className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Financial Solutions for Small Businesses
          </h1>
          <p className="text-xl mb-8">
            Professional accounting services tailored for your business needs.
            Let us handle the numbers while you focus on growth.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
            <button 
              onClick={onConsultClick}
              className="bg-white text-blue-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition duration-200 font-medium"
            >
              Schedule Free Consultation
            </button>
            <a 
              href="#services" 
              className="border-2 border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-blue-800 transition duration-200 font-medium"
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