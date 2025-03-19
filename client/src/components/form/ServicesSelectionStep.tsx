import React from 'react';

interface ServicesSelectionStepProps {
  formData: {
    services: string[];
    [key: string]: any;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const ServicesSelectionStep: React.FC<ServicesSelectionStepProps> = ({
  formData,
  handleChange
}) => {
  const services = [
    {
      id: 'financial-accounting',
      label: 'Financial Accounting',
      description: 'Record transactions, maintain financial records, and prepare accurate financial statements.'
    },
    {
      id: 'tax-planning-preparation',
      label: 'Tax Planning & Preparation',
      description: 'Strategic tax planning and seamless tax return preparation for businesses and individuals.'
    },
    {
      id: 'business-advisory',
      label: 'Business Advisory',
      description: 'Expert guidance on business strategy, growth planning, and operational improvements.'
    },
    {
      id: 'audit-assurance',
      label: 'Audit & Assurance',
      description: 'Independent verification of financial statements and internal control assessments.'
    },
    {
      id: 'wealth-management',
      label: 'Wealth Management',
      description: 'Comprehensive financial planning, investment advisory, and retirement planning.'
    },
    {
      id: 'payroll-services',
      label: 'Payroll Services',
      description: 'Complete payroll processing, tax filings, and compliance management.'
    },
    {
      id: 'forecasting-budgeting',
      label: 'Forecasting & Budgeting',
      description: 'Create realistic financial projections and develop actionable budgets.'
    },
    {
      id: 'merger-acquisition',
      label: 'Merger & Acquisition',
      description: 'Due diligence, valuation, and strategic advisory for business transitions.'
    }
  ];

  const handleCheckboxChange = (id: string) => {
    const newServices = [...formData.services];
    
    if (newServices.includes(id)) {
      // Remove service if already selected
      const updatedServices = newServices.filter(service => service !== id);
      
      // Create a synthetic event object to match the handleChange signature
      const syntheticEvent = {
        target: {
          name: 'services',
          value: updatedServices
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleChange(syntheticEvent);
    } else {
      // Add service if not already selected
      newServices.push(id);
      
      // Create a synthetic event object to match the handleChange signature
      const syntheticEvent = {
        target: {
          name: 'services',
          value: newServices
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleChange(syntheticEvent);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Services</h3>
      <p className="text-gray-600">
        Select the services you're interested in. Choose all that apply to your business needs.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map(service => (
          <div 
            key={service.id}
            className={`relative p-4 border rounded-lg cursor-pointer transition-colors ${
              formData.services.includes(service.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
            onClick={() => handleCheckboxChange(service.id)}
          >
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id={service.id}
                  checked={formData.services.includes(service.id)}
                  onChange={() => handleCheckboxChange(service.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={service.id} className="font-medium text-gray-800">
                  {service.label}
                </label>
                <p className="text-gray-500 mt-1">{service.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesSelectionStep;