import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { useEntity } from "../contexts/EntityContext";
import PageHeader from "../components/PageHeader";

function Dashboard() {
  const { user } = useAuth();
  const { currentEntity } = useEntity();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/reports/income-statement`] : null,
    enabled: !!currentEntity
  });
  
  const { data: balanceSheetData, isLoading: balanceSheetLoading } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/reports/balance-sheet`] : null,
    enabled: !!currentEntity
  });
  
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/reports/cash-flow`] : null,
    enabled: !!currentEntity
  });
  
  // Sample data for charts
  const monthlyRevenue = [
    { month: 'Jan', revenue: 5000 },
    { month: 'Feb', revenue: 7500 },
    { month: 'Mar', revenue: 8000 },
    { month: 'Apr', revenue: 6800 },
    { month: 'May', revenue: 9200 },
    { month: 'Jun', revenue: 10500 },
  ];
  
  const cashFlowForecast = [
    { month: 'Jul', inflow: 12000, outflow: 9500 },
    { month: 'Aug', inflow: 14000, outflow: 10200 },
    { month: 'Sep', inflow: 15500, outflow: 11000 },
    { month: 'Oct', inflow: 13500, outflow: 10500 },
    { month: 'Nov', inflow: 16200, outflow: 11200 },
    { month: 'Dec', inflow: 18000, outflow: 13000 },
  ];
  
  const expenseBreakdown = [
    { category: 'Payroll', value: 45 },
    { category: 'Rent', value: 20 },
    { category: 'Utilities', value: 10 },
    { category: 'Marketing', value: 15 },
    { category: 'Other', value: 10 },
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
      <PageHeader title="Dashboard" description={`Welcome, ${user?.name || 'User'}!`}>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Journal Entry
          </button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Revenue YTD</CardTitle>
                  <CardDescription>Total revenue for current fiscal year</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${incomeLoading ? "..." : incomeData?.totalRevenue?.toLocaleString() || "0.00"}</div>
                  <div className="text-xs text-green-500 mt-1">↑ 12% from last year</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Net Income</CardTitle>
                  <CardDescription>Year to date</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${incomeLoading ? "..." : incomeData?.netIncome?.toLocaleString() || "0.00"}</div>
                  <div className="text-xs text-green-500 mt-1">↑ 8% from last year</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Cash Position</CardTitle>
                  <CardDescription>Current balance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${cashFlowLoading ? "..." : (cashFlowData?.netCashFlow || 0).toLocaleString()}</div>
                  <div className="text-xs text-red-500 mt-1">↓ 3% from last month</div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="hsl(var(--chart-2))" name="% of Total Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="cashflow">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Forecast</CardTitle>
                <CardDescription>Projected for next 6 months</CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="inflow" stroke="hsl(var(--chart-2))" name="Cash Inflow" />
                    <Line type="monotone" dataKey="outflow" stroke="hsl(var(--chart-3))" name="Cash Outflow" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Average Monthly Inflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$14,866</div>
                  <div className="text-xs text-green-500 mt-1">↑ 5% projected growth</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Average Monthly Outflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$10,900</div>
                  <div className="text-xs text-red-500 mt-1">↑ 3% projected increase</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Projected Net Position</CardTitle>
                  <CardDescription>End of year</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$23,800</div>
                  <div className="text-xs text-green-500 mt-1">↑ 15% from current</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="reports">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Sheet Summary</CardTitle>
                  <CardDescription>As of today</CardDescription>
                </CardHeader>
                <CardContent>
                  {balanceSheetLoading ? (
                    <div className="flex justify-center py-8">Loading...</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Assets</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {balanceSheetData?.assets?.map((asset) => (
                              <div key={asset.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{asset.accountName}</dt>
                                <dd className="text-gray-900">${asset.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Assets</dt>
                              <dd>${balanceSheetData?.totalAssets?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">Liabilities & Equity</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {balanceSheetData?.liabilities?.map((liability) => (
                              <div key={liability.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{liability.accountName}</dt>
                                <dd className="text-gray-900">${liability.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            {balanceSheetData?.equity?.map((equity) => (
                              <div key={equity.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{equity.accountName}</dt>
                                <dd className="text-gray-900">${equity.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Liabilities & Equity</dt>
                              <dd>${balanceSheetData?.liabilitiesAndEquity?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Income Statement Summary</CardTitle>
                  <CardDescription>Year to date</CardDescription>
                </CardHeader>
                <CardContent>
                  {incomeLoading ? (
                    <div className="flex justify-center py-8">Loading...</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Revenue</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {incomeData?.revenue?.map((rev) => (
                              <div key={rev.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{rev.accountName}</dt>
                                <dd className="text-gray-900">${rev.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Revenue</dt>
                              <dd>${incomeData?.totalRevenue?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">Expenses</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {incomeData?.expenses?.map((expense) => (
                              <div key={expense.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{expense.accountName}</dt>
                                <dd className="text-gray-900">${expense.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Expenses</dt>
                              <dd>${incomeData?.totalExpenses?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-2">
                        <dl>
                          <div className="flex justify-between py-1 font-medium text-gray-900">
                            <dt>Net Income</dt>
                            <dd>${incomeData?.netIncome?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default Dashboard;
