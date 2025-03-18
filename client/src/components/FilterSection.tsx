import React, { useState, FormEvent } from 'react';
import { Account } from '@shared/schema';

interface FilterSectionProps {
  accounts: Account[];
  onApplyFilters: (filters: any) => void;
  showAccountField?: boolean;
}

function FilterSection({ accounts, onApplyFilters, showAccountField = true }: FilterSectionProps) {
  const [filters, setFilters] = useState({
    accountId: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApplyFilters(filters);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {showAccountField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select 
                name="accountId"
                value={filters.accountId}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex space-x-2">
              <input 
                type="date" 
                name="startDate"
                value={filters.startDate}
                onChange={handleChange}
                className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md" 
              />
              <input 
                type="date" 
                name="endDate"
                value={filters.endDate}
                onChange={handleChange}
                className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              name="status"
              value={filters.status}
              onChange={handleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="">All</option>
              <option value="posted">Posted</option>
              <option value="draft">Unposted</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              type="submit"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Apply Filters
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default FilterSection;
