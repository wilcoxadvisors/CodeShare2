import React from 'react';

interface HeroSectionProps {
  onConsultClick?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onConsultClick }) => {
  return (
    <section id="hero" className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16 md:py-24 lg:py-32 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Financial Expertise for Your Business Success
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Professional accounting and financial services tailored for small businesses. 
            We handle the numbers so you can focus on growth.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
            <button 
              onClick={onConsultClick}
              className="bg-white text-blue-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition duration-200 font-medium shadow-md"
            >
              Schedule Free Consultation
            </button>
            <a 
              href="#services" 
              className="border-2 border-white text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition duration-200 font-medium"
            >
              Learn More
            </a>
          </div>
          
          <div className="mt-12 pt-8 border-t border-blue-700 hidden md:block">
            <p className="text-blue-100 font-medium mb-4">Trusted by businesses across industries:</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="text-white font-bold text-xl">TechStart</div>
              <div className="text-white font-bold text-xl">GreenLeaf</div>
              <div className="text-white font-bold text-xl">BuildCo</div>
              <div className="text-white font-bold text-xl">RetailPro</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;