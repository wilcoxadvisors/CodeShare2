import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { apiRequest } from "@/lib/queryClient";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function ChartOfAccounts() {
  const { currentEntity } = useEntity();
  const { toast } = useToast();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [formTab, setFormTab] = useState("basic");
  const [accountCodePrefix, setAccountCodePrefix] = useState("");
  const [accountData, setAccountData] = useState({
    code: "",
    name: "",
    type: "",
    subtype: "",
    isSubledger: false,
    subledgerType: "",
    active: true,
    description: ""
  });

  // Get accounts data
  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : null,
    enabled: !!currentEntity,
  });

  // Group accounts by type for code auto-generation
  const accountsByType = Array.isArray(accounts) ? accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {}) : {};

  // Auto-generate account code based on type selection
  useEffect(() => {
    if (accountData.type && currentEntity) {
      const typePrefixes = {
        [AccountType.ASSET]: "1",
        [AccountType.LIABILITY]: "2",
        [AccountType.EQUITY]: "3",
        [AccountType.REVENUE]: "4",
        [AccountType.EXPENSE]: "5"
      };
      
      const prefix = typePrefixes[accountData.type] || "";
      setAccountCodePrefix(prefix);
      
      // Auto-generate next available code
      if (prefix && Array.isArray(accounts)) {
        const accountsOfType = accountsByType[accountData.type] || [];
        const existingCodes = accountsOfType
          .map(a => a.code)
          .filter(code => code.startsWith(prefix))
          .sort();
        
        if (existingCodes.length > 0) {
          const lastCode = existingCodes[existingCodes.length - 1];
          const numericPart = parseInt(lastCode.replace(/\D/g, ''));
          const newCode = `${prefix}${String(numericPart + 1).padStart(3, '0')}`;
          setAccountData(prev => ({ ...prev, code: newCode }));
        } else {
          // No existing accounts of this type, start with 001
          setAccountData(prev => ({ ...prev, code: `${prefix}001` }));
        }
      }
    }
  }, [accountData.type, currentEntity, accounts, accountsByType]);

  const createAccount = useMutation({
    mutationFn: async (data) => {
      return await apiRequest(
        `/api/entities/${currentEntity?.id}/accounts`, 
        {
          method: 'POST',
          data
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "The account has been created successfully.",
      });
      setShowAccountForm(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create account: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleNewAccount = () => {
    setAccountData({
      code: "",
      name: "",
      type: "",
      subtype: "",
      isSubledger: false,
      subledgerType: "",
      active: true,
      description: ""
    });
    setFormTab("basic");
    setShowAccountForm(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for account name standardization
    if (name === 'name' && value.length > 0) {
      // Capitalize first letter of each word and standardize spacing
      const standardizedName = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
      
      setAccountData(prev => ({
        ...prev,
        [name]: standardizedName
      }));
    } else {
      setAccountData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'type') {
      // When account type changes, reset code to trigger auto-generation
      setAccountData(prev => ({
        ...prev,
        [name]: value,
        code: ""  // Will be auto-generated by effect
      }));
    } else {
      setAccountData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCodeManualChange = (e) => {
    const { value } = e.target;
    // Keep the type prefix intact when manually editing
    if (accountCodePrefix && !value.startsWith(accountCodePrefix)) {
      setAccountData(prev => ({
        ...prev,
        code: accountCodePrefix + value.replace(/^\D+/g, '')
      }));
    } else {
      setAccountData(prev => ({
        ...prev,
        code: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createAccount.mutate({
      ...accountData,
      entityId: currentEntity?.id
    });
  };

  const columns = [
    { header: "Code", accessor: "code", type: "text" },
    { header: "Name", accessor: "name", type: "text" },
    { header: "Type", accessor: "type", type: "text" },
    { header: "Subtype", accessor: "subtype", type: "text" },
    { 
      header: "Subledger", 
      accessor: "isSubledger", 
      type: "boolean",
      render: (row) => row.isSubledger ? "Yes" : "No"
    },
    { 
      header: "Active", 
      accessor: "active", 
      type: "boolean",
      render: (row) => row.active ? "Yes" : "No"
    },
    {
      header: "Actions",
      accessor: "id",
      type: "actions",
      render: (row) => (
        <div className="text-right">
          <a href="#" className="text-primary-600 hover:text-primary-900">Edit</a>
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
        title="Chart of Accounts" 
        description="Manage your chart of accounts"
      >
        <div className="flex space-x-3">
          <button 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
          <button 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={handleNewAccount}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Account
          </button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <DataTable 
          columns={columns} 
          data={accounts || []} 
          isLoading={isLoading} 
        />
      </div>

      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <Tabs value={formTab} onValueChange={setFormTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="mt-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Account Type <span className="text-red-500">*</span></Label>
                      <Select 
                        value={accountData.type} 
                        onValueChange={(value) => handleSelectChange("type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AccountType.ASSET}>Asset</SelectItem>
                          <SelectItem value={AccountType.LIABILITY}>Liability</SelectItem>
                          <SelectItem value={AccountType.EQUITY}>Equity</SelectItem>
                          <SelectItem value={AccountType.REVENUE}>Revenue</SelectItem>
                          <SelectItem value={AccountType.EXPENSE}>Expense</SelectItem>
                        </SelectContent>
                      </Select>
                      {accountCodePrefix && (
                        <p className="text-xs text-gray-500 mt-1">
                          Type prefix: {accountCodePrefix}xxx
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subtype">Subtype</Label>
                      <Select 
                        value={accountData.subtype || ""} 
                        onValueChange={(value) => handleSelectChange("subtype", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subtype" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountData.type === AccountType.ASSET && (
                            <>
                              <SelectItem value="current_asset">Current Asset</SelectItem>
                              <SelectItem value="fixed_asset">Fixed Asset</SelectItem>
                              <SelectItem value="bank">Bank</SelectItem>
                              <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                            </>
                          )}
                          {accountData.type === AccountType.LIABILITY && (
                            <>
                              <SelectItem value="current_liability">Current Liability</SelectItem>
                              <SelectItem value="long_term_liability">Long-term Liability</SelectItem>
                              <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                            </>
                          )}
                          {accountData.type === AccountType.EQUITY && (
                            <>
                              <SelectItem value="retained_earnings">Retained Earnings</SelectItem>
                              <SelectItem value="common_stock">Common Stock</SelectItem>
                              <SelectItem value="owner_equity">Owner's Equity</SelectItem>
                            </>
                          )}
                          {accountData.type === AccountType.REVENUE && (
                            <>
                              <SelectItem value="operating_revenue">Operating Revenue</SelectItem>
                              <SelectItem value="non_operating_revenue">Non-operating Revenue</SelectItem>
                            </>
                          )}
                          {accountData.type === AccountType.EXPENSE && (
                            <>
                              <SelectItem value="operating_expense">Operating Expense</SelectItem>
                              <SelectItem value="non_operating_expense">Non-operating Expense</SelectItem>
                              <SelectItem value="cost_of_goods_sold">Cost of Goods Sold</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Account Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="code"
                        name="code"
                        value={accountData.code}
                        onChange={handleCodeManualChange}
                        required
                      />
                      {accountCodePrefix && (
                        <p className="text-xs text-gray-500 mt-1">
                          {accountCodePrefix && !accountData.code.startsWith(accountCodePrefix) && 
                            "Code will be prefixed with " + accountCodePrefix}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Account Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        name="name"
                        value={accountData.name}
                        onChange={handleChange}
                        placeholder="e.g., Cash in Bank"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      value={accountData.description}
                      onChange={handleChange}
                      placeholder="Brief description of the account's purpose"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="mt-4">
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isSubledger"
                      checked={accountData.isSubledger}
                      onCheckedChange={(checked) => 
                        handleSelectChange("isSubledger", checked)
                      }
                    />
                    <Label htmlFor="isSubledger">This is a subledger account</Label>
                  </div>
                  
                  {accountData.isSubledger && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="subledgerType">Subledger Type</Label>
                      <Select 
                        value={accountData.subledgerType} 
                        onValueChange={(value) => handleSelectChange("subledgerType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subledger type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                          <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                          <SelectItem value="inventory">Inventory</SelectItem>
                          <SelectItem value="fixed_assets">Fixed Assets</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Subledger accounts can be used to track detailed transaction information.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="active"
                      checked={accountData.active}
                      onCheckedChange={(checked) => 
                        handleSelectChange("active", checked)
                      }
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    Inactive accounts won't appear in dropdown menus for new transactions.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAccountForm(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createAccount.isPending}
              >
                {createAccount.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ChartOfAccounts;
