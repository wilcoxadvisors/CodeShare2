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
      <h3 className="text-xl font-semibold text-gray-800">Company Information</h3>
      <p className="text-gray-600">
        Please provide some basic information about your company to help us better understand your needs.
      </p>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Your company name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            id="industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select an industry</option>
            <option value="accounting">Accounting & Finance</option>
            <option value="construction">Construction</option>
            <option value="consulting">Consulting</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="retail">Retail</option>
            <option value="technology">Technology</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">
            Company Size <span className="text-red-500">*</span>
          </label>
          <select
            id="companySize"
            name="companySize"
            value={formData.companySize}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
        
        <div>
          <label htmlFor="annualRevenue" className="block text-sm font-medium text-gray-700 mb-1">
            Annual Revenue <span className="text-red-500">*</span>
          </label>
          <select
            id="annualRevenue"
            name="annualRevenue"
            value={formData.annualRevenue}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select annual revenue</option>
            <option value="<500K">Less than $500K</option>
            <option value="500K-1M">$500K - $1M</option>
            <option value="1M-5M">$1M - $5M</option>
            <option value="5M-10M">$5M - $10M</option>
            <option value="10M-50M">$10M - $50M</option>
            <option value="50M+">$50M+</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CompanyInformationStep;