import React from 'react';

const ServicesSection = () => {
  const services = [
    {
      title: "Bookkeeping & Accounting",
      description: "Comprehensive bookkeeping services to keep your finances organized and accurate. We handle transaction recording, reconciliation, and financial statement preparation."
    },
    {
      title: "Tax Preparation",
      description: "Expert tax preparation services for small businesses. Ensure compliance while maximizing deductions to minimize your tax burden."
    },
    {
      title: "Financial Planning",
      description: "Strategic financial planning tailored to your business goals. We help forecast cash flows, create budgets, and plan for future growth."
    },
    {
      title: "Payroll Management",
      description: "Streamlined payroll solutions to ensure your employees are paid accurately and on time while maintaining compliance with tax regulations."
    },
    {
      title: "Business Advisory",
      description: "Expert advice on improving financial performance, optimizing cash flow, and making sound business decisions based on your financial data."
    },
    {
      title: "Audit & Compliance",
      description: "Comprehensive audit services to ensure your financial records meet industry standards and regulatory requirements."
    }
  ];

  return (
    <section id="services" className="w-full py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Our Small Business Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {service.title}
              </h3>
              <p className="text-gray-600">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;