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
            Strategic Financial <span className="text-green-400">Expertise</span> for Business Growth
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Professional accounting and advisory services tailored for ambitious businesses.
            We transform financial challenges into strategic opportunities.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
            <button 
              onClick={onConsultClick}
              className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition duration-200 font-semibold shadow-lg transform hover:scale-105 text-lg"
            >
              Schedule Free Consultation
            </button>
            <a 
              href="#services" 
              className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-blue-800 transition duration-200 font-medium text-lg"
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