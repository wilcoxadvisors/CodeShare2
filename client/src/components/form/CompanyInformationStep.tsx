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
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Company Information</h3>
      <p className="text-gray-600 mb-6">Please provide basic information about your company.</p>
      
      <div className="mb-4">
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">Industry <span className="text-red-500">*</span></label>
        <select
          id="industry"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select your industry</option>
          <option value="retail">Retail</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="technology">Technology</option>
          <option value="healthcare">Healthcare</option>
          <option value="finance">Finance</option>
          <option value="real_estate">Real Estate</option>
          <option value="hospitality">Hospitality</option>
          <option value="education">Education</option>
          <option value="construction">Construction</option>
          <option value="professional_services">Professional Services</option>
          <option value="nonprofit">Nonprofit</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">Company Size <span className="text-red-500">*</span></label>
        <select
          id="companySize"
          name="companySize"
          value={formData.companySize}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select company size</option>
          <option value="1-10">1-10 employees</option>
          <option value="11-50">11-50 employees</option>
          <option value="51-200">51-200 employees</option>
          <option value="201-500">201-500 employees</option>
          <option value="501-1000">501-1000 employees</option>
          <option value="1000+">1000+ employees</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="annualRevenue" className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue <span className="text-red-500">*</span></label>
        <select
          id="annualRevenue"
          name="annualRevenue"
          value={formData.annualRevenue}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select annual revenue</option>
          <option value="less_than_100k">Less than $100,000</option>
          <option value="100k-500k">$100,000 - $500,000</option>
          <option value="500k-1m">$500,000 - $1 million</option>
          <option value="1m-5m">$1 million - $5 million</option>
          <option value="5m-10m">$5 million - $10 million</option>
          <option value="10m-50m">$10 million - $50 million</option>
          <option value="50m-100m">$50 million - $100 million</option>
          <option value="more_than_100m">More than $100 million</option>
        </select>
      </div>
    </div>
  );
};

export default CompanyInformationStep;