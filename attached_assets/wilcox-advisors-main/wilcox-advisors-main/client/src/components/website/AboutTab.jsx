// components/website/AboutTab.jsx
import React from 'react';
import { PlusCircle } from 'lucide-react';

export default function AboutTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">About Us Content</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Company Description</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            About Us Text
          </label>
          <textarea
            defaultValue="At Wilcox Advisors, we specialize in financial solutions for small businesses. From startups to growing companies, we provide the expertise you need to succeed—built to scale with you every step of the way."
            className="w-full p-2 border rounded"
            rows={6}
          />
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Team Members</h4>
        
        <div className="bg-white p-4 rounded border mb-4">
          <div className="flex justify-between">
            <p className="font-medium">John Smith</p>
            <div>
              <button className="text-blue-800 hover:text-blue-900 mr-2">
                Edit
              </button>
              <button className="text-red-600 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700">Senior Financial Advisor</p>
        </div>
        
        <div className="bg-white p-4 rounded border">
          <div className="flex justify-between">
            <p className="font-medium">Emily Rodriguez</p>
            <div>
              <button className="text-blue-800 hover:text-blue-900 mr-2">
                Edit
              </button>
              <button className="text-red-600 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700">Tax Specialist</p>
        </div>
        
        <button className="mt-4 flex items-center text-blue-800 hover:text-blue-900">
          <PlusCircle size={16} className="mr-1" />
          Add Team Member
        </button>
      </div>
    </div>
  );
}
