import React from 'react';

const HeroSection = ({ setShowConsultationForm }) => {
  return (
    <section className="w-full py-20 bg-gradient-to-r from-blue-800 to-blue-900 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Financial Solutions for Small Businesses
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Professional accounting services tailored to help your business thrive. From bookkeeping to strategic financial planning, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setShowConsultationForm(true)}
              className="px-6 py-3 bg-white text-blue-800 rounded-md font-semibold hover:bg-blue-50 transition-colors"
            >
              Schedule Free Consultation
            </button>
            <a
              href="#services"
              className="px-6 py-3 border-2 border-white rounded-md font-semibold hover:bg-blue-800 transition-colors"
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