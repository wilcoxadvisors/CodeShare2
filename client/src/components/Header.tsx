import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Bell, Menu, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useEntity } from '../contexts/EntityContext';
import GlobalContextSelector from './dashboard/GlobalContextSelector';

interface Client {
  id: number;
  name: string;
  [key: string]: any;
}

// Define section tabs outside the component for better performance
const sectionTabs = {
  '/reports': [
    { path: '/reports', label: 'Overview' },
    { path: '/reports/balance-sheet', label: 'Balance Sheet' },
    { path: '/reports/income-statement', label: 'Income Statement' },
    { path: '/reports/cash-flow', label: 'Cash Flow' }
  ],
  '/general-ledger': [
    { path: '/general-ledger', label: 'General Ledger' },
    { path: '/trial-balance', label: 'Trial Balance' },
    { path: '/journal-entries', label: 'Journal Entries' }
  ],
  '/journal-entries': [
    { path: '/journal-entries', label: 'All Entries' },
    { path: '/journal-entries/create', label: 'Create Entry' },
    { path: '/journal-entries/batch', label: 'Batch Upload' }
  ],
  '/chart-of-accounts': [
    { path: '/chart-of-accounts', label: 'All Accounts' },
    { path: '/chart-of-accounts/create', label: 'Create Account' }
  ],
  '/accounts-payable': [
    { path: '/accounts-payable', label: 'Overview' },
    { path: '/accounts-payable/vendors', label: 'Vendors' },
    { path: '/accounts-payable/bills', label: 'Bills' },
    { path: '/accounts-payable/payments', label: 'Payments' }
  ],
  '/accounts-receivable': [
    { path: '/accounts-receivable', label: 'Overview' },
    { path: '/accounts-receivable/customers', label: 'Customers' },
    { path: '/accounts-receivable/invoices', label: 'Invoices' },
    { path: '/accounts-receivable/receipts', label: 'Receipts' }
  ],
  '/fixed-assets': [
    { path: '/fixed-assets', label: 'All Assets' },
    { path: '/fixed-assets/add', label: 'Add Asset' },
    { path: '/fixed-assets/depreciation', label: 'Depreciation' }
  ],
  '/document-analysis': [
    { path: '/document-analysis', label: 'Document Analysis' },
    { path: '/document-analysis/history', label: 'Analysis History' }
  ]
};

// Main navigation items for mobile menu
const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard' }
];

function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { selectedClientId, setSelectedClientId } = useEntity();
  
  // Define routes where the selector should not be shown
  const hideSelectorRoutes = ['/dashboard', '/login', '/register', '/setup'];
  
  // Query for clients to populate client selector
  const { data: clientsResponse } = useQuery<{ status: string, data: Client[] }>({
    queryKey: user ? ['/api/admin/clients'] : [],
    enabled: !!user,
  });
  
  // Safely extract clients array from the API response or use empty array as fallback
  const clients = clientsResponse?.data && Array.isArray(clientsResponse.data) 
    ? clientsResponse.data 
    : [];

  // Function to determine the base section of the current path (memoized)
  const currentBaseSection = useMemo(() => {
    // Extract the base section (e.g., /reports/balance-sheet -> /reports)
    const firstSlashIndex = location.indexOf('/', 1);
    if (firstSlashIndex === -1) {
      return location; // Already a base path
    }
    return location.substring(0, firstSlashIndex);
  }, [location]);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <button 
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <a href="/dashboard" className="ml-2 text-xl font-bold text-secondary-900">Wilcox Advisors</a>
            </div>
            
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Financial Reports Section Tabs */}
              {currentBaseSection === '/reports' && (
                <>
                  <a href="/reports" className={`${location === '/reports' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Overview
                  </a>
                  <a href="/reports/balance-sheet" className={`${location === '/reports/balance-sheet' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Balance Sheet
                  </a>
                  <a href="/reports/income-statement" className={`${location === '/reports/income-statement' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Income Statement
                  </a>
                  <a href="/reports/cash-flow" className={`${location === '/reports/cash-flow' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Cash Flow
                  </a>
                </>
              )}
              
              {/* General Ledger Section Tabs */}
              {currentBaseSection === '/general-ledger' && (
                <>
                  <a href="/general-ledger" className={`${location === '/general-ledger' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    General Ledger
                  </a>
                  <a href="/trial-balance" className={`${location === '/trial-balance' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Trial Balance
                  </a>
                  <a href="/journal-entries" className={`${location === '/journal-entries' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Journal Entries
                  </a>
                </>
              )}
              
              {/* Journal Entries Section Tabs */}
              {currentBaseSection === '/journal-entries' && (
                <>
                  <a href="/journal-entries" className={`${location === '/journal-entries' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    All Entries
                  </a>
                  <a href="/journal-entries/create" className={`${location === '/journal-entries/create' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Create Entry
                  </a>
                  <a href="/journal-entries/batch" className={`${location === '/journal-entries/batch' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Batch Upload
                  </a>
                </>
              )}
              
              {/* Chart of Accounts Section Tabs */}
              {currentBaseSection === '/chart-of-accounts' && (
                <>
                  <a href="/chart-of-accounts" className={`${location === '/chart-of-accounts' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    All Accounts
                  </a>
                  <a href="/chart-of-accounts/create" className={`${location === '/chart-of-accounts/create' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Create Account
                  </a>
                </>
              )}
              
              {/* Accounts Payable Section Tabs */}
              {currentBaseSection === '/accounts-payable' && (
                <>
                  <a href="/accounts-payable" className={`${location === '/accounts-payable' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Overview
                  </a>
                  <a href="/accounts-payable/vendors" className={`${location === '/accounts-payable/vendors' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Vendors
                  </a>
                  <a href="/accounts-payable/bills" className={`${location === '/accounts-payable/bills' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Bills
                  </a>
                  <a href="/accounts-payable/payments" className={`${location === '/accounts-payable/payments' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Payments
                  </a>
                </>
              )}
              
              {/* Accounts Receivable Section Tabs */}
              {currentBaseSection === '/accounts-receivable' && (
                <>
                  <a href="/accounts-receivable" className={`${location === '/accounts-receivable' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Overview
                  </a>
                  <a href="/accounts-receivable/customers" className={`${location === '/accounts-receivable/customers' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Customers
                  </a>
                  <a href="/accounts-receivable/invoices" className={`${location === '/accounts-receivable/invoices' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Invoices
                  </a>
                  <a href="/accounts-receivable/receipts" className={`${location === '/accounts-receivable/receipts' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Receipts
                  </a>
                </>
              )}
              
              {/* Fixed Assets Section Tabs */}
              {currentBaseSection === '/fixed-assets' && (
                <>
                  <a href="/fixed-assets" className={`${location === '/fixed-assets' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    All Assets
                  </a>
                  <a href="/fixed-assets/add" className={`${location === '/fixed-assets/add' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Add Asset
                  </a>
                  <a href="/fixed-assets/depreciation" className={`${location === '/fixed-assets/depreciation' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Depreciation
                  </a>
                </>
              )}
              
              {/* Document Analysis Section Tabs */}
              {currentBaseSection === '/document-analysis' && (
                <>
                  <a href="/document-analysis" className={`${location === '/document-analysis' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Document Analysis
                  </a>
                  <a href="/document-analysis/history" className={`${location === '/document-analysis/history' ? 'border-primary-500 text-secondary-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    Analysis History
                  </a>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center">
            {/* GlobalContextSelector for client and entity selection - desktop only */}
            {!hideSelectorRoutes.includes(location) && (
              <div className="relative mr-3 hidden md:block">
                <GlobalContextSelector clients={clients} entities={useEntity().entities} />
              </div>
            )}
            
            {/* Mobile-friendly context button with indicator - visible on mobile and small screens */}
            {!hideSelectorRoutes.includes(location) && (
              <div className="flex md:hidden items-center mr-3">
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  aria-label="Select client and entity"
                >
                  <Building className="h-4 w-4 mr-1.5" />
                  <span className="truncate max-w-[120px]">
                    {selectedClientId ? 
                      (clients.find(c => c.id === selectedClientId)?.name || 'Select Client') : 
                      'Select Context'}
                  </span>
                </button>
              </div>
            )}
            
            <div>
              <button className="ml-3 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <Bell className="h-6 w-6" />
              </button>
            </div>
            
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
      
      {/* Mobile menu, show/hide based on menu state */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          {/* Client/Entity context selector for mobile */}
          {!hideSelectorRoutes.includes(location) && (
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-500 mb-2">Select Client & Entity</h2>
              <GlobalContextSelector 
                clients={clients} 
                entities={useEntity().entities} 
              />
            </div>
          )}
        
          <div className="pt-2 pb-3 space-y-1">
            {/* Main navigation */}
            <a href="/dashboard" className={`${location === '/dashboard' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
              Dashboard
            </a>
            
            {/* Financial accounting section */}
            <div className="pt-1 pb-1">
              <div className="pl-3 pr-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Financial Accounting
              </div>
              
              <a href="/general-ledger" className={`${currentBaseSection === '/general-ledger' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                General Ledger
              </a>
              <a href="/journal-entries" className={`${currentBaseSection === '/journal-entries' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Journal Entries
              </a>
              <a href="/chart-of-accounts" className={`${currentBaseSection === '/chart-of-accounts' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Chart of Accounts
              </a>
              <a href="/trial-balance" className={`${currentBaseSection === '/trial-balance' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Trial Balance
              </a>
            </div>
            
            {/* Accounts payable/receivable section */}
            <div className="pt-1 pb-1">
              <div className="pl-3 pr-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Accounts Management
              </div>
              
              <a href="/accounts-payable" className={`${currentBaseSection === '/accounts-payable' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Accounts Payable
              </a>
              <a href="/accounts-receivable" className={`${currentBaseSection === '/accounts-receivable' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Accounts Receivable
              </a>
              <a href="/fixed-assets" className={`${currentBaseSection === '/fixed-assets' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Fixed Assets
              </a>
            </div>
            
            {/* Reports section */}
            <div className="pt-1 pb-1">
              <div className="pl-3 pr-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Reports & Analysis
              </div>
              
              <a href="/reports" className={`${location === '/reports' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Financial Reports
              </a>
              <a href="/document-analysis" className={`${location === '/document-analysis' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-6 pr-4 py-2 border-l-4 text-sm font-medium`}>
                Document Analysis
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;