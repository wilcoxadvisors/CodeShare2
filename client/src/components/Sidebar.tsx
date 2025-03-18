import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardEdit,
  BarChart2,
  Receipt,
  Wallet,
  Computer,
  Settings,
  LogOut
} from 'lucide-react';

function Sidebar() {
  const { logout } = useAuth();
  const [location, navigate] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
  };

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
  };

  const NavItem = ({ path, icon, label }: { path: string, icon: React.ReactNode, label: string }) => (
    <div 
      className={`flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer ${
        isActive(path) 
          ? 'bg-secondary-800 text-white' 
          : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
      }`}
      onClick={handleNavigation(path)}
    >
      {icon}
      {label}
    </div>
  );

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-secondary-900">
        <div className="flex items-center justify-center h-16 px-4 border-b border-secondary-800">
          <h1 className="text-xl font-bold text-white">Wilcox Advisors</h1>
        </div>
        
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <NavItem 
              path="/" 
              icon={<LayoutDashboard className="h-5 w-5 mr-3" />} 
              label="Dashboard" 
            />
            
            <NavItem 
              path="/general-ledger" 
              icon={<BookOpen className="h-5 w-5 mr-3" />} 
              label="General Ledger" 
            />
            
            <NavItem 
              path="/journal-entries" 
              icon={<ClipboardEdit className="h-5 w-5 mr-3" />} 
              label="Journal Entries" 
            />
            
            <NavItem 
              path="/chart-of-accounts" 
              icon={<BarChart2 className="h-5 w-5 mr-3" />} 
              label="Chart of Accounts" 
            />
            
            <NavItem 
              path="/reports" 
              icon={<Receipt className="h-5 w-5 mr-3" />} 
              label="Reports" 
            />
            
            <NavItem 
              path="/trial-balance" 
              icon={<BarChart2 className="h-5 w-5 mr-3" />} 
              label="Trial Balance" 
            />
            
            <NavItem 
              path="/accounts-payable" 
              icon={<Wallet className="h-5 w-5 mr-3" />} 
              label="Accounts Payable" 
            />
            
            <NavItem 
              path="/accounts-receivable" 
              icon={<Wallet className="h-5 w-5 mr-3" />} 
              label="Accounts Receivable" 
            />
            
            <NavItem 
              path="/fixed-assets" 
              icon={<Computer className="h-5 w-5 mr-3" />} 
              label="Fixed Assets" 
            />
            
            <div className="mt-4 border-t border-secondary-800 pt-4">
              <div 
                className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-secondary-800 hover:text-white cursor-pointer"
                onClick={handleNavigation("/settings")}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </div>
              
              <div 
                className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-secondary-800 hover:text-white cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </div>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
