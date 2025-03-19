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
              id="bookkeeping"
              name="bookkeeping"
              type="checkbox"
              value="bookkeeping"
              checked={formData.services.includes('bookkeeping')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="bookkeeping" className="font-medium text-gray-700">Bookkeeping</label>
            <p className="text-gray-500">Full-service bookkeeping including transaction coding and reconciliations</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="monthly_financial_package"
              name="monthly_financial_package"
              type="checkbox"
              value="monthly_financial_package"
              checked={formData.services.includes('monthly_financial_package')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="monthly_financial_package" className="font-medium text-gray-700">Monthly Financial Package</label>
            <p className="text-gray-500">Comprehensive monthly financial statements with analysis</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="cash_flow_management"
              name="cash_flow_management"
              type="checkbox"
              value="cash_flow_management"
              checked={formData.services.includes('cash_flow_management')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="cash_flow_management" className="font-medium text-gray-700">Cash Flow Management</label>
            <p className="text-gray-500">Detailed cash flow tracking and forecasting</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="custom_reporting"
              name="custom_reporting"
              type="checkbox"
              value="custom_reporting"
              checked={formData.services.includes('custom_reporting')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="custom_reporting" className="font-medium text-gray-700">Custom Reporting</label>
            <p className="text-gray-500">Tailored financial reports for your specific needs</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="budgeting_forecasting"
              name="budgeting_forecasting"
              type="checkbox"
              value="budgeting_forecasting"
              checked={formData.services.includes('budgeting_forecasting')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="budgeting_forecasting" className="font-medium text-gray-700">Budgeting & Forecasting</label>
            <p className="text-gray-500">Development and monitoring of budgets and forecasts</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="outsourced_controller_cfo"
              name="outsourced_controller_cfo"
              type="checkbox"
              value="outsourced_controller_cfo"
              checked={formData.services.includes('outsourced_controller_cfo')}
              onChange={handleServiceChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="outsourced_controller_cfo" className="font-medium text-gray-700">Outsourced Controller/CFO Services</label>
            <p className="text-gray-500">Strategic financial oversight and planning tailored to your business</p>
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