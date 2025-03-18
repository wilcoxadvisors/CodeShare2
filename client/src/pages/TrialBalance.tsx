import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import PageHeader from "../components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { AccountType } from "@shared/schema";

// Define financial statement line item (FSLI) categories
enum FSLICategory {
  ASSETS = "Assets",
  LIABILITIES = "Liabilities",
  EQUITY = "Equity",
  REVENUE = "Revenue",
  EXPENSES = "Expenses"
}

function TrialBalance() {
  const { currentEntity } = useEntity();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [reportTab, setReportTab] = useState("summary"); // summary or detail

  const { data: trialBalanceData, isLoading } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/reports/trial-balance`, reportDate] : null,
    enabled: !!currentEntity
  });

  // Process data for report display
  const processTrialBalanceData = () => {
    if (!trialBalanceData || !Array.isArray(trialBalanceData)) return { categories: [], totals: { debit: 0, credit: 0 } };

    // The API is returning an array directly
    const accounts = [...trialBalanceData];
    
    // Extract total row (last item in the array)
    const totalRow = accounts.find(account => account.type === "TOTAL");
    const regularAccounts = accounts.filter(account => account.type !== "TOTAL");
    
    // Group regular accounts by category
    const grouped = regularAccounts.reduce((acc: Record<string, any[]>, account: any) => {
      let category;
      
      // Map account types to high-level categories
      switch(account.type) {
        case AccountType.ASSET:
          category = FSLICategory.ASSETS;
          break;
        case AccountType.LIABILITY:
          category = FSLICategory.LIABILITIES;
          break;
        case AccountType.EQUITY:
          category = FSLICategory.EQUITY;
          break;
        case AccountType.REVENUE:
          category = FSLICategory.REVENUE;
          break;
        case AccountType.EXPENSE:
          category = FSLICategory.EXPENSES;
          break;
        default:
          category = "Other";
      }

      // Filter out zero balances if not showing them
      if (!showZeroBalances && account.debit === 0 && account.credit === 0) {
        return acc;
      }

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(account);
      return acc;
    }, {});

    // Use the total row provided by the API instead of calculating
    const totals = totalRow || {
      debit: regularAccounts.reduce((sum, account) => sum + (parseFloat(account.debit) || 0), 0),
      credit: regularAccounts.reduce((sum, account) => sum + (parseFloat(account.credit) || 0), 0)
    };

    // Prepare categories array for display
    const categories = Object.entries(grouped).map(([name, accounts]: [string, any[]]) => ({
      name,
      accounts,
      // Calculate subtotals for each category
      subtotals: accounts.reduce((sum, account) => {
        return {
          debit: sum.debit + parseFloat(account.debit || 0),
          credit: sum.credit + parseFloat(account.credit || 0)
        };
      }, { debit: 0, credit: 0 })
    }));

    return { categories, totals };
  };

  const { categories, totals } = processTrialBalanceData();
  
  const formatCurrency = (amount: number | string | undefined): string => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(numericAmount);
  };

  // Export to CSV
  const exportCSV = () => {
    if (!trialBalanceData || !Array.isArray(trialBalanceData)) return;

    let csvContent = "Account Code,Account Name,Beginning Balance,Debit,Credit,Ending Balance\n";
    
    // The API is returning an array directly instead of an object with accounts property
    const accounts = trialBalanceData;
    accounts.forEach(account => {
      // Calculate beginning balance (either from API or use 0 for income statement accounts)
      const beginningBalance = account.beginningBalance || 
        (account.type === AccountType.REVENUE || account.type === AccountType.EXPENSE ? 0 : 
         (account.normalBalance === 'debit' ? account.debit - account.credit : account.credit - account.debit));
      
      // Calculate ending balance
      const isDebitNormal = account.type === AccountType.ASSET || account.type === AccountType.EXPENSE;
      const endingBalance = isDebitNormal ? 
        beginningBalance + account.debit - account.credit : 
        beginningBalance + account.credit - account.debit;

      csvContent += `${account.code},${account.name},${beginningBalance || 0},${account.debit || 0},${account.credit || 0},${endingBalance || 0}\n`;
    });

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trial_balance_${currentEntity?.name}_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print report
  const printReport = () => {
    window.print();
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

  if (isLoading) {
    return (
      <div className="py-6">
        <PageHeader title="Trial Balance" description={`${currentEntity.name} - As of ${reportDate}`} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">
            <p className="text-gray-600">Loading trial balance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <PageHeader 
        title="Trial Balance" 
        description={`${currentEntity.name} - As of ${reportDate}`}
      >
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={exportCSV}
            className="flex items-center"
          >
            <Download className="-ml-1 mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={printReport}
            className="flex items-center"
          >
            <Printer className="-ml-1 mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Controls */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">As of Date</label>
              <input
                type="date"
                id="reportDate"
                name="reportDate"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="showZeroBalances"
                name="showZeroBalances"
                checked={showZeroBalances}
                onChange={(e) => setShowZeroBalances(e.target.checked)}
                className="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
              />
              <label htmlFor="showZeroBalances" className="ml-2 block text-sm text-gray-700">
                Show zero balances
              </label>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <button
                onClick={() => setReportTab("summary")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${reportTab === "summary" ? "bg-background text-foreground shadow" : ""}`}
              >
                Summary
              </button>
              <button
                onClick={() => setReportTab("detail")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${reportTab === "detail" ? "bg-background text-foreground shadow" : ""}`}
              >
                Detail
              </button>
            </div>
          </div>
        </div>

        {/* Report */}
        <Card className="print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Trial Balance</CardTitle>
            <p className="text-sm text-gray-500">As of {new Date(reportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </CardHeader>
          <CardContent>
            {reportTab === "summary" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700">Category</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Debit</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.name} className="border-b border-gray-200">
                          <td className="px-4 py-2 font-medium">{category.name}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(category.subtotals.debit)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(category.subtotals.credit)}</td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(totals.debit)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(totals.credit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Balanced Indicator */}
                <div className="mt-4 text-right">
                  {Math.abs(totals.debit - totals.credit) < 0.01 ? (
                    <span className="text-green-600 font-medium">✓ Debits and Credits are balanced</span>
                  ) : (
                    <span className="text-red-600 font-medium">⚠ Debits and Credits are not balanced: {formatCurrency(Math.abs(totals.debit - totals.credit))} difference</span>
                  )}
                </div>
              </div>
            )}
            
            {reportTab === "detail" && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700">Account Code</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700">Account Name</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Beginning Balance</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Debit</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Credit</th>
                        <th className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <Fragment key={category.name}>
                          {/* Category Header */}
                          <tr className="bg-gray-100">
                            <td colSpan={6} className="px-4 py-2 font-semibold">{category.name}</td>
                          </tr>
                          
                          {/* Accounts in this category */}
                          {category.accounts.map((account) => {
                            // Calculate beginning balance (either from API or use 0 for income statement accounts)
                            const beginningBalance = account.beginningBalance || 
                              (account.type === AccountType.REVENUE || account.type === AccountType.EXPENSE ? 0 : 
                               (account.normalBalance === 'debit' ? account.debit - account.credit : account.credit - account.debit));
                            
                            // Calculate ending balance
                            const isDebitNormal = account.type === AccountType.ASSET || account.type === AccountType.EXPENSE;
                            const endingBalance = isDebitNormal ? 
                              beginningBalance + account.debit - account.credit : 
                              beginningBalance + account.credit - account.debit;
                            
                            return (
                              <tr key={account.id} className="border-b border-gray-200">
                                <td className="px-4 py-2">{account.code}</td>
                                <td className="px-4 py-2">{account.name}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(beginningBalance)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(account.debit)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(account.credit)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(endingBalance)}</td>
                              </tr>
                            );
                          })}
                          
                          {/* Category Subtotal */}
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <td colSpan={3} className="px-4 py-2 font-medium text-right">Subtotal: {category.name}</td>
                            <td className="px-4 py-2 font-medium text-right">{formatCurrency(category.subtotals.debit)}</td>
                            <td className="px-4 py-2 font-medium text-right">{formatCurrency(category.subtotals.credit)}</td>
                            <td className="px-4 py-2 font-medium text-right"></td>
                          </tr>
                        </Fragment>
                      ))}
                      
                      {/* Total Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(totals.debit)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(totals.credit)}</td>
                        <td className="px-4 py-3 text-right"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Balanced Indicator */}
                <div className="mt-4 text-right">
                  {Math.abs(totals.debit - totals.credit) < 0.01 ? (
                    <span className="text-green-600 font-medium">✓ Debits and Credits are balanced</span>
                  ) : (
                    <span className="text-red-600 font-medium">⚠ Debits and Credits are not balanced: {formatCurrency(Math.abs(totals.debit - totals.credit))} difference</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TrialBalance;