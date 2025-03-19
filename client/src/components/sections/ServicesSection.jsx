import React from 'react';

const ServicesSection = () => {
  const services = [
    {
      id: 1,
      title: 'Bookkeeping',
      description: 'Full-service bookkeeping including transaction coding and reconciliations'
    },
    {
      id: 2,
      title: 'Monthly Financial Package',
      description: 'Comprehensive monthly financial statements with analysis'
    },
    {
      id: 3,
      title: 'Cash Flow Management',
      description: 'Detailed cash flow tracking and forecasting'
    },
    {
      id: 4,
      title: 'Custom Reporting',
      description: 'Tailored financial reports for your specific needs'
    },
    {
      id: 5,
      title: 'Budgeting & Forecasting',
      description: 'Development and monitoring of budgets and forecasts'
    },
    {
      id: 6,
      title: 'Outsourced Controller/CFO Services',
      description: 'Strategic financial oversight and planning tailored to your business'
    }
  ];

  return (
    <section id="services" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-blue-800 mb-12">Our Small Business Services</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(service => (
            <div 
              key={service.id} 
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="#contact" 
            className="inline-flex items-center px-6 py-3 bg-blue-800 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Get Started With Our Services
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 ml-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M14 5l7 7m0 0l-7 7m7-7H3" 
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;