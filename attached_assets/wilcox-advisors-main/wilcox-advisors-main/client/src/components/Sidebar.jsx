// src/components/Sidebar.jsx
import React from 'react';
import { Home, Users, Database, FileSpreadsheet, Settings, Globe, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ activeModule, setActiveModule }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <div className="w-64 bg-blue-900 text-white h-screen flex-shrink-0 flex flex-col">
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-2xl font-bold">Wilcox Advisors</h1>
      </div>
      <nav className="p-4 flex-grow">
        <NavItem icon={<Home className="mr-3" />} label="Dashboard" active={activeModule === 'dashboard'} onClick={() => setActiveModule('dashboard')} />
        <NavItem icon={<Users className="mr-3" />} label="Clients" active={activeModule === 'clients'} onClick={() => setActiveModule('clients')} />
        <NavItem icon={<Database className="mr-3" />} label="Accounting" active={activeModule === 'accounting'} onClick={() => setActiveModule('accounting')} />
        <NavItem icon={<FileSpreadsheet className="mr-3" />} label="Reports" active={activeModule === 'reports'} onClick={() => setActiveModule('reports')} />
        <NavItem icon={<Globe className="mr-3" />} label="Website" active={activeModule === 'website'} onClick={() => setActiveModule('website')} />
        <NavItem icon={<Settings className="mr-3" />} label="Settings" active={activeModule === 'settings'} onClick={() => setActiveModule('settings')} />
      </nav>
      
      {/* Logout Button */}
      <div className="p-4 border-t border-blue-800">
        <button onClick={handleLogout} className="flex items-center w-full p-3 rounded hover:bg-blue-800 text-white">
          <LogOut className="mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full p-3 rounded hover:bg-blue-800 mb-2 ${
        active ? 'bg-blue-800' : ''
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
