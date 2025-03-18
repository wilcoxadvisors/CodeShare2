import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EntitySelector from './EntitySelector';

function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getPageTitle = (path: string) => {
    const routes = {
      '/': 'Dashboard',
      '/general-ledger': 'General Ledger',
      '/journal-entries': 'Journal Entries',
      '/chart-of-accounts': 'Chart of Accounts',
      '/reports': 'Reports',
      '/accounts-payable': 'Accounts Payable',
      '/accounts-receivable': 'Accounts Receivable',
      '/fixed-assets': 'Fixed Assets'
    };
    
    return routes[path as keyof typeof routes] || '';
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <button 
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-2 md:hidden text-xl font-bold text-secondary-900">Wilcox Advisors</h1>
            </div>
            
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Navigation tabs for specific sections */}
              {location === '/general-ledger' && (
                <>
                  <a href="#" className="border-primary-500 text-secondary-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    General Ledger
                  </a>
                  <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Trial Balance
                  </a>
                  <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Journal Entries
                  </a>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center">
            <div className="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center">
              <EntitySelector />
              
              <button className="ml-3 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <Bell className="h-6 w-6" />
              </button>
              
              <div className="ml-3 relative">
                <div>
                  <button type="button" className="flex items-center max-w-xs bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                    <img 
                      className="h-8 w-8 rounded-full" 
                      src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
                      alt={user?.name || 'User'} 
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <a href="/" className="bg-primary-50 border-primary-500 text-primary-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Dashboard
            </a>
            <a href="/general-ledger" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              General Ledger
            </a>
            <a href="/journal-entries" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Journal Entries
            </a>
            <a href="/chart-of-accounts" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Chart of Accounts
            </a>
            <a href="/reports" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Reports
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
