// src/components/ClientDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Import dashboard components
import FinancialOverview from './dashboard/FinancialOverview';
import CashFlowChart from './dashboard/CashFlowChart';
import CustomReports from './dashboard/CustomReports';
import GeneralLedger from './dashboard/GeneralLedger';
import FileUpload from './dashboard/FileUpload';
import DownloadSection from './dashboard/DownloadSection';
import ClientChat from './dashboard/ClientChat';

function ClientDashboard() {
  const [dashboardData, setDashboardData] = useState({
    financials: { 
      profitLoss: { revenue: 50000, expenses: 30000, netIncome: 20000 }, 
      balanceSheet: { assets: 100000, liabilities: 40000, equity: 60000 } 
    },
    cashFlow: { labels: ['Jan', 'Feb', 'Mar'], data: [10000, 15000, 12000] },
    reports: ['Sales by Category', 'Expense Breakdown'],
    gl: [{ date: '2025-02-01', description: 'Sales', amount: 5000 }],
  });
  const [clientChatMessages, setClientChatMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/client/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(response.data);
      if (response.data.clientChat) {
        setClientChatMessages(response.data.clientChat);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile-friendly tab navigation
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <FinancialOverview financials={dashboardData.financials} />;
      case 'cashflow':
        return <CashFlowChart cashFlow={dashboardData.cashFlow} />;
      case 'reports':
        return <CustomReports reports={dashboardData.reports} />;
      case 'ledger':
        return <GeneralLedger entries={dashboardData.gl} />;
      case 'upload':
        return <FileUpload onSuccess={fetchDashboardData} />;
      case 'download':
        return <DownloadSection />;
      case 'chat':
        return <ClientChat messages={clientChatMessages} setMessages={setClientChatMessages} />;
      default:
        return <FinancialOverview financials={dashboardData.financials} />;
    }
  };

  return (
    <section className="py-8 md:py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-blue-800 mb-6 md:mb-10 text-center">Your Financial Dashboard</h2>
        
        {isLoading ? (
          <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
          </div>
        ) : (
          <>
            {/* Mobile Tab Navigation */}
            <div className="md:hidden mb-6 bg-white rounded-lg shadow overflow-x-auto">
              <div className="flex">
                <TabButton label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <TabButton label="Cash Flow" active={activeTab === 'cashflow'} onClick={() => setActiveTab('cashflow')} />
                <TabButton label="Ledger" active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} />
                <TabButton label="More" active={['reports', 'upload', 'download', 'chat'].includes(activeTab)} onClick={() => setActiveTab('reports')} />
              </div>
            </div>
            
            {/* Mobile View: Single Component Based on Tab */}
            <div className="md:hidden bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
              {renderTabContent()}
              
              {/* Secondary Tabs for "More" */}
              {['reports', 'upload', 'download', 'chat'].includes(activeTab) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    <SecondaryTabButton label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    <SecondaryTabButton label="Upload" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
                    <SecondaryTabButton label="Download" active={activeTab === 'download'} onClick={() => setActiveTab('download')} />
                    <SecondaryTabButton label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                  </div>
                </div>
              )}
            </div>
            
            {/* Desktop View: All Components */}
            <div className="hidden md:block bg-white p-6 rounded-lg shadow-md space-y-8">
              <FinancialOverview financials={dashboardData.financials} />
              <CashFlowChart cashFlow={dashboardData.cashFlow} />
              <CustomReports reports={dashboardData.reports} />
              <GeneralLedger entries={dashboardData.gl} />
              <FileUpload onSuccess={fetchDashboardData} />
              <DownloadSection />
              <ClientChat 
                messages={clientChatMessages} 
                setMessages={setClientChatMessages} 
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// Tab Button Component for Mobile Navigation
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-center text-sm font-medium ${
        active 
          ? 'text-blue-800 border-b-2 border-blue-800' 
          : 'text-gray-500 hover:text-blue-800'
      }`}
    >
      {label}
    </button>
  );
}

// Secondary Tab Button for "More" section
function SecondaryTabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-full ${
        active 
          ? 'bg-blue-800 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

export default ClientDashboard;
