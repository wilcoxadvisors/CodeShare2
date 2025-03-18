import { useState } from "react";
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
import { AccountType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function ChartOfAccounts() {
  const { currentEntity } = useEntity();
  const { toast } = useToast();
  const [showAccountForm, setShowAccountForm] = useState(false);
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

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : null,
    enabled: !!currentEntity,
  });

  const createAccount = useMutation({
    mutationFn: async (data) => {
      return await apiRequest(
        "POST", 
        `/api/entities/${currentEntity?.id}/accounts`, 
        data
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
    setShowAccountForm(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAccountData({
      ...accountData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSelectChange = (name, value) => {
    setAccountData({
      ...accountData,
      [name]: value
    });
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Account Code</Label>
                  <Input
                    id="code"
                    name="code"
                    value={accountData.code}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={accountData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type</Label>
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subtype">Subtype</Label>
                  <Input
                    id="subtype"
                    name="subtype"
                    value={accountData.subtype}
                    onChange={handleChange}
                    placeholder="e.g. current_asset, operating_expense"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isSubledger"
                  checked={accountData.isSubledger}
                  onCheckedChange={(checked) => 
                    handleSelectChange("isSubledger", checked)
                  }
                />
                <Label htmlFor="isSubledger">Is Subledger Account</Label>
              </div>
              
              {accountData.isSubledger && (
                <div className="space-y-2">
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
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={accountData.description}
                  onChange={handleChange}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={accountData.active}
                  onCheckedChange={(checked) => 
                    handleSelectChange("active", checked)
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            
            <DialogFooter>
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
