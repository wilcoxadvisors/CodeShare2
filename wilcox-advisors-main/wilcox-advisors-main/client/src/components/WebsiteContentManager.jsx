// components/WebsiteContentManager.jsx
import React, { useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import TabNavigation from './TabNavigation';
import GeneralTab from './website/GeneralTab';
import HomePageTab from './website/HomePageTab';
import LearnMoreTab from './website/LearnMoreTab';
import AboutTab from './website/AboutTab';
import ServicesTab from './website/ServicesTab';
import ContactTab from './website/ContactTab';

export default function WebsiteContentManager() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    setSaved(true);
    // In a real implementation, save data to backend here
    setTimeout(() => setSaved(false), 3000);
  };
  
  return (
    <div className="flex-1 p-6 bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Website Content Management</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleSave}
            className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900"
          >
            <Save className="mr-2" size={18} />
            Save Changes
          </button>
        </div>
      </div>
      
      {saved && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg flex items-center">
          <CheckCircle className="mr-2" />
          Changes saved successfully! Your website has been updated.
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="p-6">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'home' && <HomePageTab />}
          {activeTab === 'learn-more' && <LearnMoreTab />}
          {activeTab === 'about' && <AboutTab />}
          {activeTab === 'services' && <ServicesTab />}
          {activeTab === 'contact' && <ContactTab />}
        </div>
      </div>
    </div>
  );
}
