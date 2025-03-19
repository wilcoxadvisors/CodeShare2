import React from 'react';

const HeroSection = () => {
  return (
    <section className="relative bg-gray-50 pt-32 pb-20 md:pt-40 md:pb-24">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-white z-0">
        <div className="absolute inset-0 bg-blue-800 opacity-5 z-0">
          <svg className="absolute bottom-0 left-0 transform translate-x-80 -translate-y-20" width="404" height="404" fill="none" viewBox="0 0 404 404">
            <defs>
              <pattern id="85737c0e-0916-41d7-917f-596dc7edfa27" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="4" height="4" className="text-blue-200" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="404" height="404" fill="url(#85737c0e-0916-41d7-917f-596dc7edfa27)" />
          </svg>
          <svg className="absolute top-0 right-0 transform -translate-x-80 translate-y-20" width="404" height="404" fill="none" viewBox="0 0 404 404">
            <defs>
              <pattern id="85737c0e-0916-41d7-917f-596dc7edfa28" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="4" height="4" className="text-blue-200" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="404" height="404" fill="url(#85737c0e-0916-41d7-917f-596dc7edfa28)" />
          </svg>
        </div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          {/* Hero content */}
          <div className="md:w-1/2 mb-12 md:mb-0 md:pr-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Financial Expertise for Your Business Growth
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Professional accounting services and strategic financial guidance to help your small business thrive in today's competitive landscape.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <a 
                href="#contact" 
                className="bg-blue-800 text-white px-8 py-4 rounded-md font-medium hover:bg-blue-700 transition-colors text-center"
              >
                Get Started
              </a>
              <a 
                href="#services" 
                className="border-2 border-blue-800 text-blue-800 px-8 py-4 rounded-md font-medium hover:bg-blue-50 transition-colors text-center"
              >
                Our Services
              </a>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-gray-600 font-semibold mb-2">Trusted by businesses across industries:</p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-gray-400 font-bold text-lg">TechStart</div>
                <div className="text-gray-400 font-bold text-lg">GreenLeaf</div>
                <div className="text-gray-400 font-bold text-lg">BuildCo</div>
                <div className="text-gray-400 font-bold text-lg">RetailPro</div>
              </div>
            </div>
          </div>
          
          {/* Hero image */}
          <div className="md:w-1/2">
            <div className="relative">
              <div className="absolute -top-4 -left-4 right-4 bottom-4 bg-blue-800 rounded-lg"></div>
              <div className="relative bg-white p-6 shadow-xl rounded-lg">
                <div className="bg-gray-200 aspect-w-4 aspect-h-3 rounded-md flex items-center justify-center mb-6">
                  <span className="text-gray-400 text-sm">Business Analytics Image</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">Maximize Your Financial Potential</h3>
                <p className="text-gray-600 mb-4">
                  Our strategic approach to financial management has helped businesses increase profitability by an average of 24% in the first year.
                </p>
                
                <div className="flex justify-between">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-blue-800">98%</span>
                    <span className="text-sm text-gray-500">Client Retention</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-blue-800">24%</span>
                    <span className="text-sm text-gray-500">Profit Increase</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-blue-800">15+</span>
                    <span className="text-sm text-gray-500">Years Experience</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;