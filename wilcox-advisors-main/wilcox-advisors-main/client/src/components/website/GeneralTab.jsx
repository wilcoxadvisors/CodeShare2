// components/website/GeneralTab.jsx
import React, { useState } from 'react';
import { Upload, Image } from 'lucide-react';

export default function GeneralTab() {
  const [logoFile, setLogoFile] = useState(null);
  
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(URL.createObjectURL(e.target.files[0]));
    }
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">General Settings</h3>
      
      {/* Logo Upload */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Website Logo</h4>
        <div className="flex items-center space-x-4">
          <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded border overflow-hidden">
            {logoFile ? (
              <img src={logoFile} alt="New logo preview" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center text-gray-500">
                <Image size={32} className="mx-auto mb-1" />
                <p className="text-xs">Current Logo</p>
              </div>
            )}
          </div>
          <div>
            <div className="mb-2">
              <label className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 cursor-pointer">
                <Upload size={16} className="inline mr-2" />
                Select New Logo
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleLogoChange}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">Recommended size: 180x60 pixels, PNG or SVG format</p>
          </div>
        </div>
      </div>

      {/* Site Title & Meta */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Website Title & Meta Tags</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site Title
          </label>
          <input
            type="text"
            defaultValue="Wilcox Advisors - Financial Solutions for Small Businesses"
            className="w-full p-2 border rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Appears in browser tabs and search results</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
          </label>
          <textarea
            defaultValue="Wilcox Advisors provides professional financial and accounting services tailored for small businesses, helping you save money and drive business growth."
            className="w-full p-2 border rounded"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Appears in search engine results</p>
        </div>
      </div>
      
      {/* Colors Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Brand Colors</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center">
              <input
                type="color"
                defaultValue="#1E3A8A"
                className="h-10 w-10 p-0 border-0"
              />
              <input
                type="text"
                defaultValue="#1E3A8A"
                className="ml-2 p-2 border rounded w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center">
              <input
                type="color"
                defaultValue="#0EA5E9"
                className="h-10 w-10 p-0 border-0"
              />
              <input
                type="text"
                defaultValue="#0EA5E9"
                className="ml-2 p-2 border rounded w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
