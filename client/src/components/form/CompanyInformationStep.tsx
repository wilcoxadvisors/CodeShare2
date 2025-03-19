import React from 'react';

interface CompanyInformationStepProps {
  formData: {
    companyName: string;
    industry: string;
    companySize: string;
    annualRevenue: string;
    [key: string]: any;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const CompanyInformationStep: React.FC<CompanyInformationStepProps> = ({
  formData,
  handleChange
}) => {
  const companySizeOptions = [
    { value: '', label: 'Select company size' },
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501+', label: 'More than 500 employees' }
  ];

  const revenueOptions = [
    { value: '', label: 'Select annual revenue' },
    { value: 'less-than-1m', label: 'Less than $1 million' },
    { value: '1m-5m', label: '$1 million to $5 million' },
    { value: '5m-10m', label: '$5 million to $10 million' },
    { value: '10m-50m', label: '$10 million to $50 million' },
    { value: '50m+', label: 'More than $50 million' }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Company Information</h3>
      <p className="text-gray-600">
        Tell us about your business so we can better understand your needs.
      </p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Healthcare, Technology, Manufacturing"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="companySize" className="block text-sm font-medium text-gray-700">
            Company Size <span className="text-red-500">*</span>
          </label>
          <select
            id="companySize"
            name="companySize"
            value={formData.companySize}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {companySizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="annualRevenue" className="block text-sm font-medium text-gray-700">
            Annual Revenue <span className="text-red-500">*</span>
          </label>
          <select
            id="annualRevenue"
            name="annualRevenue"
            value={formData.annualRevenue}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {revenueOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CompanyInformationStep;