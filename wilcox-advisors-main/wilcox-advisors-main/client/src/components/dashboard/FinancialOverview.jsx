// src/components/dashboard/FinancialOverview.jsx
import React from 'react';

export default function FinancialOverview({ financials }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Financial Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-700 text-sm mb-1">Profit & Loss (YTD)</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:space-x-2">
            <div className="mb-2 sm:mb-0">
              <span className="block text-sm font-medium text-gray-500">Revenue</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(financials.profitLoss.revenue)}</span>
            </div>
            <div className="mb-2 sm:mb-0">
              <span className="block text-sm font-medium text-gray-500">Expenses</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(financials.profitLoss.expenses)}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-500">Net Income</span>
              <span className="text-lg font-semibold text-blue-800">{formatCurrency(financials.profitLoss.netIncome)}</span>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-gray-700 text-sm mb-1">Balance Sheet</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:space-x-2">
            <div className="mb-2 sm:mb-0">
              <span className="block text-sm font-medium text-gray-500">Assets</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(financials.balanceSheet.assets)}</span>
            </div>
            <div className="mb-2 sm:mb-0">
              <span className="block text-sm font-medium text-gray-500">Liabilities</span>
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(financials.balanceSheet.liabilities)}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-500">Equity</span>
              <span className="text-lg font-semibold text-green-700">{formatCurrency(financials.balanceSheet.equity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
