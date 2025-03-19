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
  // Custom handler for checkboxes
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    let updatedServices = [...formData.services];
    
    if (checked) {
      updatedServices.push(value);
    } else {
      updatedServices = updatedServices.filter(service => service !== value);
    }
    
    // Create a synthetic event to match the handleChange function expected format
    const syntheticEvent = {
      target: {
        name: 'services',
        value: updatedServices
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleChange(syntheticEvent);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Services of Interest</h3>
      <p className="text-gray-600 mb-6">Please select the services you're interested in. You can select multiple options.</p>
      
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="financial_planning"
              name="financial_planning"
              type="checkbox"
              value="financial_planning"
              checked={formData.services.includes('financial_planning')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="financial_planning" className="font-medium text-gray-700">Financial Planning</label>
            <p className="text-gray-500">Comprehensive financial planning and wealth management</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="tax_services"
              name="tax_services"
              type="checkbox"
              value="tax_services"
              checked={formData.services.includes('tax_services')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="tax_services" className="font-medium text-gray-700">Tax Services</label>
            <p className="text-gray-500">Tax planning, preparation, and compliance</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="accounting"
              name="accounting"
              type="checkbox"
              value="accounting"
              checked={formData.services.includes('accounting')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="accounting" className="font-medium text-gray-700">Accounting</label>
            <p className="text-gray-500">Bookkeeping, financial statements, and accounting services</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="business_advisory"
              name="business_advisory"
              type="checkbox"
              value="business_advisory"
              checked={formData.services.includes('business_advisory')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="business_advisory" className="font-medium text-gray-700">Business Advisory</label>
            <p className="text-gray-500">Strategic planning, business consulting, and growth advice</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="audit_assurance"
              name="audit_assurance"
              type="checkbox"
              value="audit_assurance"
              checked={formData.services.includes('audit_assurance')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="audit_assurance" className="font-medium text-gray-700">Audit & Assurance</label>
            <p className="text-gray-500">Financial audit, internal controls, and compliance services</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="financial_systems"
              name="financial_systems"
              type="checkbox"
              value="financial_systems"
              checked={formData.services.includes('financial_systems')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="financial_systems" className="font-medium text-gray-700">Financial Systems Implementation</label>
            <p className="text-gray-500">Setup and integration of accounting and financial software</p>
          </div>
        </div>
      </div>
      
      {formData.services.length === 0 && (
        <p className="text-red-500 text-sm mt-2">Please select at least one service</p>
      )}
    </div>
  );
};

export default ServicesSelectionStep;