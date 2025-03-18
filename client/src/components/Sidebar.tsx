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
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
  };

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-secondary-900">
        <div className="flex items-center justify-center h-16 px-4 border-b border-secondary-800">
          <h1 className="text-xl font-bold text-white">Wilcox Advisors</h1>
        </div>
        
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link href="/">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <LayoutDashboard className="h-5 w-5 mr-3" />
                Dashboard
              </a>
            </Link>
            
            <Link href="/general-ledger">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/general-ledger') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <BookOpen className="h-5 w-5 mr-3" />
                General Ledger
              </a>
            </Link>
            
            <Link href="/journal-entries">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/journal-entries') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <ClipboardEdit className="h-5 w-5 mr-3" />
                Journal Entries
              </a>
            </Link>
            
            <Link href="/chart-of-accounts">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/chart-of-accounts') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <BarChart2 className="h-5 w-5 mr-3" />
                Chart of Accounts
              </a>
            </Link>
            
            <Link href="/reports">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/reports') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <Receipt className="h-5 w-5 mr-3" />
                Reports
              </a>
            </Link>
            
            <Link href="/accounts-payable">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/accounts-payable') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <Wallet className="h-5 w-5 mr-3" />
                Accounts Payable
              </a>
            </Link>
            
            <Link href="/accounts-receivable">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/accounts-receivable') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <Wallet className="h-5 w-5 mr-3" />
                Accounts Receivable
              </a>
            </Link>
            
            <Link href="/fixed-assets">
              <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive('/fixed-assets') 
                  ? 'bg-secondary-800 text-white' 
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              }`}>
                <Computer className="h-5 w-5 mr-3" />
                Fixed Assets
              </a>
            </Link>
            
            <div className="mt-4 border-t border-secondary-800 pt-4">
              <Link href="/settings">
                <a className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-secondary-800 hover:text-white">
                  <Settings className="h-5 w-5 mr-3" />
                  Settings
                </a>
              </Link>
              
              <a 
                href="#" 
                className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-secondary-800 hover:text-white"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </a>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
