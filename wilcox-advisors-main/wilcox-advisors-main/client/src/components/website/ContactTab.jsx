// components/website/ContactTab.jsx
import React from 'react';

export default function ContactTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Contact Information</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Business Information</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Email
            </label>
            <input
              type="email"
              defaultValue="contact@wilcoxadvisors.com"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              defaultValue="(555) 123-4567"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Business Address</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address
          </label>
          <input
            type="text"
            defaultValue="123 Business Avenue, Suite 400"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              defaultValue="Metropolis"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              defaultValue="NY"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              defaultValue="10001"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Social Media Links</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn
            </label>
            <input
              type="url"
              defaultValue="https://linkedin.com/company/wilcox-advisors"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twitter
            </label>
            <input
              type="url"
              defaultValue="https://twitter.com/wilcoxadvisors"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
