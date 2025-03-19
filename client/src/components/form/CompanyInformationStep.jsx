// src/components/form/CompanyInformationStep.jsx
import React from 'react';

function CompanyInformationStep({ formData, handleInputChange, fields }) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="mb-4">
          <label 
            htmlFor={field.name} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'text' || field.type === 'email' || field.type === 'tel' ? (
            <input
              type={field.type}
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleInputChange}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleInputChange}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select {field.label}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleInputChange}
              required={field.required}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default CompanyInformationStep;