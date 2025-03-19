import React from 'react';

interface Service {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ServicesSectionProps {
  services?: Service[];
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ services }) => {
  // Default services if none provided
  const defaultServices: Service[] = [
    {
      title: "Tax Planning & Preparation",
      description: "Strategic tax planning and preparation services for businesses and individuals to minimize tax liabilities while ensuring full compliance.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-800 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      )
    },
    {
      title: "Accounting & Bookkeeping",
      description: "Comprehensive accounting services including bookkeeping, financial statement preparation, and management reporting tailored to your business needs.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-800 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Business Advisory",
      description: "Expert guidance on financial management, business growth strategies, budgeting, forecasting, and operational efficiency improvements.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-800 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      title: "Audit & Assurance",
      description: "Professional audit services providing independent assessments of financial statements and internal controls to enhance credibility with stakeholders.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-800 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: "Financial Planning",
      description: "Personalized financial planning services to help you achieve your long-term financial goals through investment strategies and retirement planning.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-800 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "CFO Services",
      description: "Part-time CFO services providing expert financial leadership, strategic planning, and management without the cost of a full-time executive.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-800 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  const serviceList = services || defaultServices;

  return (
    <section id="services" className="py-16 bg-gray-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-20 -mr-20 -mb-20 transform rotate-45"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100 rounded-full opacity-20 -ml-20 -mt-20"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-blue-800 mb-4">Our Services</h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
            We offer a comprehensive range of financial and accounting services designed to support your business at every stage of growth.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceList.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 flex flex-col h-full"
            >
              <div className="flex justify-center">{service.icon}</div>
              <h3 className="text-xl font-bold text-blue-800 mb-3 text-center">{service.title}</h3>
              <p className="text-gray-700 leading-relaxed text-center">{service.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center mt-auto">
                <a 
                  href="#contact" 
                  className="text-blue-800 hover:text-blue-900 hover:underline font-medium transition duration-200"
                >
                  Learn more →
                </a>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="#contact" 
            className="inline-block bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition duration-200 font-medium shadow-md"
          >
            Request a Consultation
          </a>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;