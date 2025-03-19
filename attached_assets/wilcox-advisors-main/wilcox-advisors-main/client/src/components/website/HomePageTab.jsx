// components/website/HomePageTab.jsx
import React, { useState } from 'react';
import { Upload, Image, PlusCircle } from 'lucide-react';

export default function HomePageTab() {
  const [heroImage, setHeroImage] = useState(null);
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setHeroImage(URL.createObjectURL(e.target.files[0]));
    }
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Home Page Content</h3>
      
      {/* Hero Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Hero Section</h4>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Headline
          </label>
          <input
            type="text"
            defaultValue="Financial Expertise for Your Business Success"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subheading
          </label>
          <textarea
            defaultValue="Professional accounting and financial services tailored for small businesses. We handle the numbers so you can focus on growth."
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      </div>
      
      {/* Hero Image */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Hero Background Image</h4>
        
        <div className="flex items-center space-x-4">
          <div className="w-32 h-24 bg-gray-200 rounded border overflow-hidden">
            {heroImage ? (
              <img src={heroImage} alt="Hero image preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center pt-4 text-gray-500">
                <Image size={24} className="mx-auto mb-1" />
                <p className="text-xs">Current Image</p>
              </div>
            )}
          </div>
          <div>
            <div className="mb-2">
              <label className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 cursor-pointer">
                <Upload size={16} className="inline mr-2" />
                Select New Image
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">Recommended size: 1920x600 pixels</p>
          </div>
        </div>
      </div>
      
      {/* Call to Action Buttons */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Call to Action Buttons</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Button Text
            </label>
            <input
              type="text"
              defaultValue="Schedule Free Consultation"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Button Text
            </label>
            <input
              type="text"
              defaultValue="Learn More"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Featured Services Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Featured Services</h4>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border">
            <div className="flex justify-between">
              <p className="font-medium">Bookkeeping</p>
              <div>
                <button className="text-blue-800 hover:text-blue-900 mr-2">Edit</button>
                <button className="text-red-600 hover:text-red-700">Remove</button>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <div className="flex justify-between">
              <p className="font-medium">Cash Flow Management</p>
              <div>
                <button className="text-blue-800 hover:text-blue-900 mr-2">Edit</button>
                <button className="text-red-600 hover:text-red-700">Remove</button>
              </div>
            </div>
          </div>
          
          <button className="flex items-center text-blue-800 hover:text-blue-900">
            <PlusCircle size={16} className="mr-1" /> Add Featured Service
          </button>
        </div>
      </div>
    </div>
  );
}
