import React from 'react';

const WhyChooseUsSection = () => {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white shadow-md rounded-md overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-6 text-center rounded">
                <div className="text-3xl font-bold text-blue-800 mb-2">15+</div>
                <div className="text-gray-600">Years of Experience</div>
              </div>
              
              <div className="bg-blue-50 p-6 text-center rounded">
                <div className="text-3xl font-bold text-blue-800 mb-2">200+</div>
                <div className="text-gray-600">Businesses Served</div>
              </div>
              
              <div className="bg-blue-50 p-6 text-center rounded">
                <div className="text-3xl font-bold text-blue-800 mb-2">18</div>
                <div className="text-gray-600">Team Members</div>
              </div>
              
              <div className="bg-blue-50 p-6 text-center rounded">
                <div className="text-3xl font-bold text-blue-800 mb-2">12</div>
                <div className="text-gray-600">Industry Specializations</div>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-4">What Makes Us Different</h2>
            
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Proactive approach to financial management</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Customized solutions for your specific industry</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Cutting-edge technology with a human touch</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-800 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Transparent, predictable pricing structure</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;