import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEntity } from '../contexts/EntityContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import FilterSection from '../components/FilterSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, FileText } from 'lucide-react';
import { AccountType } from '@shared/schema';

function AccountsPayable() {
  const { currentEntity } = useEntity();
  const [activeTab, setActiveTab] = useState("vendors");
  const [filters, setFilters] = useState({
    accountId: "",
    startDate: "",
    endDate: "",
    status: ""
  });

  // Get Accounts Payable account
  const { data: accounts } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : null,
    enabled: !!currentEntity
  });

  const apAccount = accounts?.find(acc => 
    acc.type === AccountType.LIABILITY && acc.subledgerType === 'accounts_payable'
  );

  // Get AP transactions from general ledger
  const { data: apTransactions, isLoading } = useQuery({
    queryKey: [
      `/api/entities/${currentEntity?.id}/general-ledger`, 
      apAccount?.id,
      filters.startDate,
      filters.endDate,
      filters.status
    ],
    enabled: !!currentEntity && !!apAccount,
  });

  const handleApplyFilters = (filterData: any) => {
    setFilters(filterData);
  };

  // Vendor list would typically come from a vendor API endpoint
  // This is mocked for the demo since we're using in-memory storage
  const vendors = [
    { id: 1, name: 'Vendor XYZ', balance: 750, status: 'active' },
    { id: 2, name: 'Office Supplies Co.', balance: 320, status: 'active' },
    { id: 3, name: 'Tech Hardware Inc.', balance: 1200, status: 'active' },
  ];

  const vendorColumns = [
    { header: "Vendor", accessor: "name", type: "text" },
    { header: "Balance", accessor: "balance", type: "currency" },
    { header: "Status", accessor: "status", type: "text" },
    {
      header: "Actions",
      accessor: "id",
      type: "actions",
      render: (row: any) => (
        <div className="text-right">
          <a href="#" className="text-primary-600 hover:text-primary-900 mr-2">View</a>
          <a href="#" className="text-primary-600 hover:text-primary-900">Pay</a>
        </div>
      )
    }
  ];

  const transactionColumns = [
    { header: "Date", accessor: "date", type: "date" },
    { header: "Vendor", accessor: "description", type: "text" },
    { header: "Invoice #", accessor: "journalId", type: "text" },
    { header: "Debit", accessor: "debit", type: "currency" },
    { header: "Credit", accessor: "credit", type: "currency" },
    { header: "Balance", accessor: "balance", type: "currency" },
    {
      header: "Status",
      accessor: "status",
      type: "status",
      render: (row: any) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          row.status === 'posted' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      type: "actions",
      render: (row: any) => (
        <div className="text-right">
          <a href="#" className="text-primary-600 hover:text-primary-900">View</a>
        </div>
      )
    }
  ];

  if (!currentEntity) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">
            <h1 className="text-xl font-semibold text-gray-900">Please select an entity to continue</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Accounts Payable" 
        description="Manage vendor bills and payments"
      >
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <FileText className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            New Bill
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <UserPlus className="-ml-1 mr-2 h-5 w-5" />
            New Vendor
          </button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vendors">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Payables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2,270.00</div>
                  <div className="text-xs text-gray-500 mt-1">3 Active Vendors</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Past Due</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <div className="text-xs text-green-500 mt-1">No overdue payments</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Due This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$750.00</div>
                  <div className="text-xs text-gray-500 mt-1">1 Vendor Payment Due</div>
                </CardContent>
              </Card>
            </div>
            
            <DataTable 
              columns={vendorColumns} 
              data={vendors} 
              isLoading={false} 
            />
          </TabsContent>
          
          <TabsContent value="transactions">
            <FilterSection 
              accounts={accounts || []} 
              onApplyFilters={handleApplyFilters} 
              showAccountField={false}
            />
            
            <div className="mt-6">
              <DataTable 
                columns={transactionColumns} 
                data={apTransactions || []} 
                isLoading={isLoading} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="bills">
            <div className="text-center py-10 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900">Bills Module</h3>
              <p className="mt-2 text-sm text-gray-500">This module is under development.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="payments">
            <div className="text-center py-10 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900">Payments Module</h3>
              <p className="mt-2 text-sm text-gray-500">This module is under development.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default AccountsPayable;
