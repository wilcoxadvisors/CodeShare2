import React from 'react';

const HeroSection = ({ setShowConsultationForm }) => {
  return (
    <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Strategic Financial Advisory for Growing Businesses
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Wilcox Advisors partners with ambitious businesses to provide expert financial guidance, innovative accounting solutions, and strategic planning that fuels sustainable growth.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowConsultationForm && setShowConsultationForm(true)}
                className="px-6 py-3 bg-white text-blue-800 font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                Schedule a Consultation
              </button>
              <a 
                href="#services" 
                className="px-6 py-3 border border-white text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Explore Our Services
              </a>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-1/2 h-1/2 bg-blue-700 rounded-lg opacity-50"></div>
              <div className="absolute -bottom-10 -right-10 w-1/2 h-1/2 bg-blue-700 rounded-lg opacity-50"></div>
              
              <img 
                src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80" 
                alt="Financial professionals in meeting" 
                className="relative z-10 rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-20 pt-10 border-t border-blue-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">15+</div>
              <div className="text-blue-100">Years of Experience</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">300+</div>
              <div className="text-blue-100">Clients Served</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">98%</div>
              <div className="text-blue-100">Client Retention</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">$500M+</div>
              <div className="text-blue-100">Assets Managed</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;