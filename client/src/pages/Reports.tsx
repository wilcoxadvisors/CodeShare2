import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEntity } from '../contexts/EntityContext';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

// Define types for report data structures
interface FinancialItem {
  accountId: number;
  accountName: string;
  accountCode?: string;
  balance: number;
}

interface BalanceSheetData {
  assets: FinancialItem[];
  liabilities: FinancialItem[];
  equity: FinancialItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  liabilitiesAndEquity: number;
}

interface IncomeStatementData {
  revenue: FinancialItem[];
  expenses: FinancialItem[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface TrialBalanceItem extends FinancialItem {
  debit: number;
  credit: number;
}

interface CashFlowData {
  cashFlows: {
    category: string;
    items: FinancialItem[];
    total: number;
  }[];
  netCashFlow: number;
}

interface GLEntry {
  id: number;
  date: Date;
  journalId: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

function Reports() {
  const { currentEntity } = useEntity();
  const [activeTab, setActiveTab] = useState("balance-sheet");
  const [reportParams, setReportParams] = useState({
    asOfDate: new Date().toISOString().split('T')[0],
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const { data: balanceSheetData, isLoading: balanceSheetLoading, refetch: refetchBalanceSheet } = useQuery<BalanceSheetData>({
    queryKey: currentEntity && activeTab === "balance-sheet" 
      ? [`/api/entities/${currentEntity.id}/reports/balance-sheet`, reportParams.asOfDate] as const
      : ['balance-sheet-disabled'],
    enabled: !!currentEntity && activeTab === "balance-sheet"
  });
  
  const { data: incomeStatementData, isLoading: incomeStatementLoading, refetch: refetchIncomeStatement } = useQuery<IncomeStatementData>({
    queryKey: currentEntity && activeTab === "income-statement" 
      ? [`/api/entities/${currentEntity.id}/reports/income-statement`, reportParams.startDate, reportParams.endDate] as const
      : ['income-statement-disabled'],
    enabled: !!currentEntity && activeTab === "income-statement"
  });
  
  const { data: trialBalanceData, isLoading: trialBalanceLoading, refetch: refetchTrialBalance } = useQuery<TrialBalanceItem[]>({
    queryKey: currentEntity && activeTab === "trial-balance" 
      ? [`/api/entities/${currentEntity.id}/reports/trial-balance`, reportParams.startDate, reportParams.endDate] as const
      : ['trial-balance-disabled'],
    enabled: !!currentEntity && activeTab === "trial-balance"
  });
  
  const { data: cashFlowData, isLoading: cashFlowLoading, refetch: refetchCashFlow } = useQuery<CashFlowData>({
    queryKey: currentEntity && activeTab === "cash-flow" 
      ? [`/api/entities/${currentEntity.id}/reports/cash-flow`, reportParams.startDate, reportParams.endDate] as const
      : ['cash-flow-disabled'],
    enabled: !!currentEntity && activeTab === "cash-flow"
  });
  
  const { data: generalLedgerData, isLoading: generalLedgerLoading, refetch: refetchGeneralLedger } = useQuery<GLEntry[]>({
    queryKey: currentEntity && activeTab === "general-ledger" 
      ? [`/api/entities/${currentEntity.id}/general-ledger`, reportParams.startDate, reportParams.endDate] as const
      : ['general-ledger-disabled'],
    enabled: !!currentEntity && activeTab === "general-ledger"
  });
  
  const handleParamChange = (name: string, value: string) => {
    setReportParams(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRunReport = () => {
    switch (activeTab) {
      case "balance-sheet":
        refetchBalanceSheet();
        break;
      case "income-statement":
        refetchIncomeStatement();
        break;
      case "trial-balance":
        refetchTrialBalance();
        break;
      case "cash-flow":
        refetchCashFlow();
        break;
      case "general-ledger":
        refetchGeneralLedger();
        break;
    }
  };
  
  const handleExport = () => {
    // Export functionality would go here
    alert("Export functionality would be implemented here");
  };

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
        title="Financial Reports" 
        description="Generate and view financial reports"
      >
        <div className="flex space-x-3">
          <button 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={handleExport}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
          </TabsList>
          
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {activeTab === "balance-sheet" ? (
                  <div>
                    <Label htmlFor="asOfDate">As of Date</Label>
                    <div className="flex mt-1">
                      <Input
                        id="asOfDate"
                        type="date"
                        value={reportParams.asOfDate}
                        onChange={(e) => handleParamChange('asOfDate', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <div className="flex mt-1">
                        <Input
                          id="startDate"
                          type="date"
                          value={reportParams.startDate}
                          onChange={(e) => handleParamChange('startDate', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <div className="flex mt-1">
                        <Input
                          id="endDate"
                          type="date"
                          value={reportParams.endDate}
                          onChange={(e) => handleParamChange('endDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div>
                  <Button onClick={handleRunReport}>
                    Run Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <TabsContent value="balance-sheet">
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>
                  As of {new Date(reportParams.asOfDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {balanceSheetLoading ? (
                  <div className="flex justify-center py-8">Loading...</div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Assets</h3>
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <dl className="divide-y divide-gray-200">
                          {balanceSheetData?.assets?.map((asset: any) => (
                            <div key={asset.accountId} className="flex justify-between py-2 text-sm">
                              <dt className="text-gray-500 w-2/3">{asset.accountName}</dt>
                              <dd className="text-gray-900 text-right">${asset.balance.toLocaleString()}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between py-2 font-medium">
                            <dt>Total Assets</dt>
                            <dd>${balanceSheetData?.totalAssets?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Liabilities</h3>
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <dl className="divide-y divide-gray-200">
                          {balanceSheetData?.liabilities?.map((liability: any) => (
                            <div key={liability.accountId} className="flex justify-between py-2 text-sm">
                              <dt className="text-gray-500 w-2/3">{liability.accountName}</dt>
                              <dd className="text-gray-900 text-right">${liability.balance.toLocaleString()}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between py-2 font-medium">
                            <dt>Total Liabilities</dt>
                            <dd>${balanceSheetData?.totalLiabilities?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Equity</h3>
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <dl className="divide-y divide-gray-200">
                          {balanceSheetData?.equity?.map((equity: any) => (
                            <div key={equity.accountId} className="flex justify-between py-2 text-sm">
                              <dt className="text-gray-500 w-2/3">{equity.accountName}</dt>
                              <dd className="text-gray-900 text-right">${equity.balance.toLocaleString()}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between py-2 font-medium">
                            <dt>Total Equity</dt>
                            <dd>${balanceSheetData?.totalEquity?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div className="border-t-2 border-gray-900 pt-2">
                      <dl>
                        <div className="flex justify-between py-2 font-medium text-gray-900">
                          <dt>Total Liabilities & Equity</dt>
                          <dd>${balanceSheetData?.liabilitiesAndEquity?.toLocaleString() || "0.00"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="income-statement">
            <Card>
              <CardHeader>
                <CardTitle>Income Statement</CardTitle>
                <CardDescription>
                  {new Date(reportParams.startDate).toLocaleDateString()} to {new Date(reportParams.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {incomeStatementLoading ? (
                  <div className="flex justify-center py-8">Loading...</div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Revenue</h3>
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <dl className="divide-y divide-gray-200">
                          {incomeStatementData?.revenue?.map((rev: any) => (
                            <div key={rev.accountId} className="flex justify-between py-2 text-sm">
                              <dt className="text-gray-500 w-2/3">{rev.accountName}</dt>
                              <dd className="text-gray-900 text-right">${rev.balance.toLocaleString()}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between py-2 font-medium">
                            <dt>Total Revenue</dt>
                            <dd>${incomeStatementData?.totalRevenue?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Expenses</h3>
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <dl className="divide-y divide-gray-200">
                          {incomeStatementData?.expenses?.map((expense: any) => (
                            <div key={expense.accountId} className="flex justify-between py-2 text-sm">
                              <dt className="text-gray-500 w-2/3">{expense.accountName}</dt>
                              <dd className="text-gray-900 text-right">${expense.balance.toLocaleString()}</dd>
                            </div>
                          ))}
                          <div className="flex justify-between py-2 font-medium">
                            <dt>Total Expenses</dt>
                            <dd>${incomeStatementData?.totalExpenses?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    
                    <div className="border-t-2 border-gray-900 pt-2">
                      <dl>
                        <div className="flex justify-between py-2 font-medium text-gray-900">
                          <dt>Net Income</dt>
                          <dd>${incomeStatementData?.netIncome?.toLocaleString() || "0.00"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trial-balance">
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance</CardTitle>
                <CardDescription>
                  {new Date(reportParams.startDate).toLocaleDateString()} to {new Date(reportParams.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trialBalanceLoading ? (
                  <div className="flex justify-center py-8">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {trialBalanceData?.map((item: any) => (
                          <tr key={item.accountId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.accountCode} - {item.accountName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {item.balance > 0 ? `$${item.balance.toLocaleString()}` : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {item.balance < 0 ? `$${Math.abs(item.balance).toLocaleString()}` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <th scope="row" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totals</th>
                          <td className="px-6 py-3 text-right text-xs font-medium text-gray-900">
                            $
                            {trialBalanceData?.reduce((sum: number, item: any) => 
                              sum + (item.balance > 0 ? item.balance : 0), 0)?.toLocaleString() || "0.00"}
                          </td>
                          <td className="px-6 py-3 text-right text-xs font-medium text-gray-900">
                            $
                            {trialBalanceData?.reduce((sum: number, item: any) => 
                              sum + (item.balance < 0 ? Math.abs(item.balance) : 0), 0)?.toLocaleString() || "0.00"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cash-flow">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Statement</CardTitle>
                <CardDescription>
                  {new Date(reportParams.startDate).toLocaleDateString()} to {new Date(reportParams.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cashFlowLoading ? (
                  <div className="flex justify-center py-8">Loading...</div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Cash Flows</h3>
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <dl className="divide-y divide-gray-200">
                          {cashFlowData?.cashFlows?.map((flow: any, index: number) => (
                            <div key={index} className="flex justify-between py-2 text-sm">
                              <dt className="text-gray-500 w-2/3">
                                {flow.description} ({new Date(flow.date).toLocaleDateString()})
                              </dt>
                              <dd className={`text-right ${flow.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${Math.abs(flow.amount).toLocaleString()}
                                {flow.amount > 0 ? ' (inflow)' : ' (outflow)'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                    
                    <div className="border-t-2 border-gray-900 pt-2">
                      <dl>
                        <div className="flex justify-between py-2 font-medium text-gray-900">
                          <dt>Net Cash Flow</dt>
                          <dd className={cashFlowData?.netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                            ${Math.abs(cashFlowData?.netCashFlow || 0).toLocaleString()}
                            {cashFlowData?.netCashFlow > 0 ? ' (increase)' : ' (decrease)'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general-ledger">
            <Card>
              <CardHeader>
                <CardTitle>General Ledger</CardTitle>
                <CardDescription>
                  {new Date(reportParams.startDate).toLocaleDateString()} to {new Date(reportParams.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generalLedgerLoading ? (
                  <div className="flex justify-center py-8">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journal</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {generalLedgerData?.map((item: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.journalId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.accountCode} - {item.accountName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {item.debit > 0 ? `$${item.debit.toLocaleString()}` : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {item.credit > 0 ? `$${item.credit.toLocaleString()}` : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              ${item.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default Reports;
