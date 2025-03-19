import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Financial Expertise for Your Business Success
          </h1>
          <p className="text-xl mb-8">
            Professional accounting and financial services tailored for small businesses. We 
            handle the numbers so you can focus on growth.
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="#contact" 
              className="px-6 py-3 bg-white text-blue-800 font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              Schedule Free Consultation
            </a>
            <a 
              href="#services" 
              className="px-6 py-3 border border-white text-white font-medium rounded-md hover:bg-blue-800 transition-colors"
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