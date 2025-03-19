// components/website/LearnMoreTab.jsx
import React, { useState } from 'react';
import { Upload, Image, PlusCircle } from 'lucide-react';

export default function LearnMoreTab() {
  const [featuredImage, setFeaturedImage] = useState(null);
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFeaturedImage(URL.createObjectURL(e.target.files[0]));
    }
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Learn More Page Content</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Page Title</h4>
        <input
          type="text"
          defaultValue="Learn More About Our Services"
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Main Content</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paragraph 1
          </label>
          <textarea
            defaultValue="Wilcox Advisors specializes in providing top-tier financial and accounting services tailored for small businesses. Our expert team is dedicated to helping you save money, manage your finances effectively, and drive business growth."
            className="w-full p-2 border rounded"
            rows={4}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paragraph 2
          </label>
          <textarea
            defaultValue="Explore our comprehensive services, including bookkeeping, cash flow management, custom reporting, budgeting & forecasting, monthly financial packages, and outsourced controller/CFO support. Whether you're a startup or a growing company, we offer solutions designed to scale with your business needs. Contact us today to discover how we can help your business thrive!"
            className="w-full p-2 border rounded"
            rows={4}
          />
        </div>
        
        <button className="flex items-center text-blue-800 hover:text-blue-900">
          <PlusCircle size={16} className="mr-1" />
          Add Another Paragraph
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Call to Action Button</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button Text
            </label>
            <input
              type="text"
              defaultValue="Contact Us"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button Action
            </label>
            <select className="w-full p-2 border rounded">
              <option value="contact">Scroll to Contact Form</option>
              <option value="consultation">Open Consultation Form</option>
              <option value="custom">Custom URL</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Featured Image (Optional)</h4>
        
        <div className="flex items-center space-x-4">
          <div className="w-32 h-24 bg-gray-200 rounded border overflow-hidden">
            {featuredImage ? (
              <img src={featuredImage} alt="Featured image preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center pt-4 text-gray-500">
                <Image size={24} className="mx-auto mb-1" />
                <p className="text-xs">No Image</p>
              </div>
            )}
          </div>
          <div>
            <div className="mb-2">
              <label className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 cursor-pointer">
                <Upload size={16} className="inline mr-2" />
                Upload Image
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">Recommended size: 800x600 pixels</p>
          </div>
        </div>
      </div>
    </div>
  );
}
