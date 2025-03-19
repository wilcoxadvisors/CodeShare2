import React from 'react';

interface AboutSectionProps {
  aboutText?: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ aboutText }) => {
  const defaultAboutText = "At Wilcox Advisors, we specialize in financial solutions for small businesses. " +
    "From startups to growing companies, we provide the expertise you need to succeed—built to scale with you every step of the way. " +
    "Our team of certified professionals brings decades of combined experience across diverse industries, " +
    "ensuring you receive tailored guidance that addresses your unique challenges and opportunities.";

  return (
    <section id="about" className="py-16 bg-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-10 -mr-32 -mt-32 transform rotate-45"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full opacity-10 -ml-32 -mb-32"></div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="md:order-2">
            <h2 className="text-3xl font-bold text-blue-800 mb-6">About Wilcox Advisors</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              {aboutText || defaultAboutText}
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <a 
                href="#contact" 
                className="bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition duration-200 text-center shadow-sm"
              >
                Contact Us
              </a>
              <a 
                href="#services" 
                className="border-2 border-blue-800 text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-50 transition duration-200 text-center"
              >
                Our Services
              </a>
            </div>
          </div>
          
          <div className="md:order-1 relative">
            <div className="absolute -top-4 -left-4 right-4 bottom-4 bg-blue-800 rounded-lg opacity-20"></div>
            <div className="rounded-lg overflow-hidden shadow-xl relative bg-white">
              <div className="p-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Our Mission</h3>
                <p className="text-gray-700 mb-6">
                  To empower small businesses with financial clarity, strategic guidance, and personalized solutions that drive sustainable growth and success.
                </p>
                
                <h3 className="text-xl font-bold text-blue-800 mb-4">Our Values</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Integrity in all professional relationships</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Excellence in service delivery</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Innovation in financial solutions</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Client success as our primary measure</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;