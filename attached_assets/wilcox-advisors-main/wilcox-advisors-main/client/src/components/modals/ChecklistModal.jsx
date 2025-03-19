// src/components/modals/ChecklistModal.jsx
import React from 'react';
import { useFormData } from '../../hooks/useFormData';
import axios from 'axios';

const checklistFormFields = [
  { name: "name", label: "Your Name", type: "text", required: true },
  { name: "email", label: "Email Address", type: "email", required: true },
  { name: "companyName", label: "Company Name", type: "text", required: true },
  { name: "revenueRange", label: "Annual Revenue Range", type: "select", options: ["Under $100K", "$100K - $250K", "$250K - $500K", "$500K - $1M", "Over $1M"], required: true },
];

export default function ChecklistModal({ isOpen, onClose }) {
  const [checklistData, handleChecklistInputChange, _, resetChecklistForm] = useFormData({
    name: '', email: '', companyName: '', revenueRange: '',
  });

  const isChecklistValid = () => 
    checklistFormFields.every(field => field.required ? checklistData[field.name]?.trim() !== '' : true);

  const handleChecklistSubmit = async (e) => {
    e.preventDefault();
    if (!isChecklistValid()) return alert('Please fill out all required fields.');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/checklist`, checklistData);
      alert('Thank you! Your Financial Checklist has been sent to your email!');
      onClose();
      resetChecklistForm();
    } catch (error) {
      alert('Submission failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md sm:max-w-lg">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">Get Your Free Financial Checklist</h2>
        <p className="text-gray-700 mb-6">Please provide your details to download the checklist!</p>
        <form onSubmit={handleChecklistSubmit} className="space-y-6">
          {checklistFormFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  name={field.name}
                  value={checklistData[field.name]}
                  onChange={handleChecklistInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required={field.required}
                >
                  <option value="">Select an option</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={checklistData[field.name]}
                  onChange={handleChecklistInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="text-gray-700 hover:text-blue-800">Cancel</button>
            <button 
              type="submit" 
              className="bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-900 transition duration-200" 
              disabled={!isChecklistValid()}
            >
              Submit & Download
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
