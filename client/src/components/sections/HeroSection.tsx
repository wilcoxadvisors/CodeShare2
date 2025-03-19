import React, { useState } from 'react';

// SUPER SIMPLE VERSION - Just barebones for testing
const HeroSection: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  
  // Very explicit functions to help with debugging
  const openModal = () => {
    console.log("BUTTON CLICKED - TRYING TO OPEN MODAL");
    window.alert("Button clicked! This message shows the button works.");
    setShowModal(true);
  };
  
  const closeModal = () => {
    console.log("CLOSING MODAL");
    setShowModal(false);
  };

  // Console log render to check if the component rerenders properly
  console.log("HeroSection Rendering. Current modal state:", showModal ? "SHOWN" : "HIDDEN");
  
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
            
            {/* Extra test buttons for debugging */}
            <div className="flex justify-center mb-4">
              <button 
                onClick={() => window.alert("Test button works!")}
                className="bg-green-500 text-white px-4 py-2 rounded-full mb-2 mr-2"
              >
                Test Button
              </button>
              <button 
                onClick={() => console.log("Console log test button clicked")}
                className="bg-purple-500 text-white px-4 py-2 rounded-full mb-2"
              >
                Console Log Test
              </button>
            </div>
            
            {/* Main CTA buttons */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
              <button 
                onClick={openModal}
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
      
      {/* Very basic modal for testing */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Test Modal</h2>
            <p className="mb-4">This is a simplified test modal to verify button functionality.</p>
            <div className="text-center">
              <button 
                onClick={closeModal}
                className="bg-[#1E3A8A] text-white px-4 py-2 rounded"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;