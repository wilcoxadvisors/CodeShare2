// components/TabNavigation.jsx
import React from 'react';
import { Layout, Home, Info, Bookmark, FileText, Phone } from 'lucide-react';

export default function TabNavigation({ activeTab, setActiveTab }) {
  return (
    <div className="flex border-b overflow-x-auto">
      <TabButton 
        active={activeTab === 'general'} 
        onClick={() => setActiveTab('general')}
        icon={<Layout size={16} />}
        label="General"
      />
      <TabButton 
        active={activeTab === 'home'} 
        onClick={() => setActiveTab('home')}
        icon={<Home size={16} />}
        label="Home Page"
      />
      <TabButton 
        active={activeTab === 'learn-more'} 
        onClick={() => setActiveTab('learn-more')}
        icon={<Info size={16} />}
        label="Learn More"
      />
      <TabButton 
        active={activeTab === 'about'} 
        onClick={() => setActiveTab('about')}
        icon={<Bookmark size={16} />}
        label="About Us"
      />
      <TabButton 
        active={activeTab === 'services'} 
        onClick={() => setActiveTab('services')}
        icon={<FileText size={16} />}
        label="Services"
      />
      <TabButton 
        active={activeTab === 'contact'} 
        onClick={() => setActiveTab('contact')}
        icon={<Phone size={16} />}
        label="Contact"
      />
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center ${
        active 
          ? 'border-b-2 border-blue-800 text-blue-800' 
          : 'text-gray-600 hover:text-blue-800'
      }`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
}
