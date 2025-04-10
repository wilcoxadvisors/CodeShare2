import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, ChevronRight } from "lucide-react";

interface AccountTreeNode {
  id: number;
  clientId: number; 
  accountCode: string;
  code?: string; // For backward compatibility
  name: string;
  type: string;
  subtype: string | null;
  isSubledger: boolean;
  subledgerType: string | null;
  parentId: number | null;
  active: boolean;
  description: string | null;
  createdAt: string;
  children: AccountTreeNode[];
}

export default function ChartOfAccounts() {
  const { currentEntity, selectedClientId } = useEntity();
  const clientId = selectedClientId || (currentEntity?.clientId || 0);
  const { toast } = useToast();
  
  // State for account form
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [accountData, setAccountData] = useState({
    id: null as number | null,
    clientId: clientId || 0,
    accountCode: "",
    name: "",
    type: "Asset",
    subtype: "",
    isSubledger: false,
    subledgerType: "",
    parentId: null as number | null,
    active: true,
    description: ""
  });
  
  // Fetch accounts from API
  const { data: accountTree = [] as AccountTreeNode[], isLoading, error, refetch } = useQuery<AccountTreeNode[]>({
    queryKey: ['/api/clients', clientId, 'accounts', 'tree'],
    queryFn: async ({ queryKey }) => {
      if (!clientId) return [];
      const response = await apiRequest(`/api/clients/${queryKey[1]}/accounts/tree`);
      return response as unknown as AccountTreeNode[];
    },
    enabled: !!clientId
  });
  
  // Create a flattened version of the account tree for easier access
  const allAccounts = useMemo(() => {
    const flattenAccounts = (accounts: AccountTreeNode[], result: AccountTreeNode[] = []) => {
      for (const account of accounts) {
        result.push(account);
        if (account.children && account.children.length) {
          flattenAccounts(account.children, result);
        }
      }
      return result;
    };
    
    return flattenAccounts(accountTree);
  }, [accountTree]);
  
  // Create account mutation
  const createAccount = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/clients/${clientId}/accounts`, {
      method: 'POST',
      data,
    }),
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Account has been created successfully.",
      });
      setShowAccountForm(false);
      refetch();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Account",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update account mutation
  const updateAccount = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/clients/${clientId}/accounts/${data.id}`, {
      method: 'PUT',
      data,
    }),
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "Account has been updated successfully.",
      });
      setShowAccountForm(false);
      refetch();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Account",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Reset form state
  const resetForm = () => {
    setAccountData({
      id: null,
      clientId: clientId || 0,
      accountCode: "",
      name: "",
      type: "Asset",
      subtype: "",
      isSubledger: false,
      subledgerType: "",
      parentId: null,
      active: true,
      description: ""
    });
  };
  
  // Handle account form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!accountData.accountCode.trim() || !accountData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Account code and name are required.",
        variant: "destructive",
      });
      return;
    }
    
    // Create or update account
    if (isEditMode && accountData.id) {
      updateAccount.mutate(accountData);
    } else {
      createAccount.mutate(accountData);
    }
  };
  
  // Open form for editing an account
  const handleEditAccount = (account: AccountTreeNode) => {
    setAccountData({
      id: account.id,
      clientId: account.clientId,
      accountCode: account.accountCode,
      name: account.name,
      type: account.type,
      subtype: account.subtype || "",
      isSubledger: account.isSubledger,
      subledgerType: account.subledgerType || "",
      parentId: account.parentId,
      active: account.active,
      description: account.description || ""
    });
    setIsEditMode(true);
    setShowAccountForm(true);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-gray-600">Manage your financial accounts</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsEditMode(false);
          setShowAccountForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Account
        </Button>
      </div>
      
      {/* Account Form Dialog */}
      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Account" : "Create New Account"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the account details below" 
                : "Enter the details for the new account"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountCode">Account Code</Label>
                <Input
                  id="accountCode"
                  value={accountData.accountCode}
                  onChange={(e) => setAccountData({...accountData, accountCode: e.target.value})}
                  placeholder="Enter account code"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={accountData.name}
                  onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                  placeholder="Enter account name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={accountData.type}
                  onValueChange={(value) => setAccountData({...accountData, type: value})}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Account</Label>
                <Select
                  value={accountData.parentId ? String(accountData.parentId) : ""}
                  onValueChange={(value) => setAccountData({
                    ...accountData, 
                    parentId: value ? parseInt(value) : null
                  })}
                >
                  <SelectTrigger id="parentId">
                    <SelectValue placeholder="Select parent account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (top-level account)</SelectItem>
                    {allAccounts
                      .filter(a => a.id !== accountData.id) // Don't allow self as parent
                      .map(account => (
                        <SelectItem 
                          key={account.id} 
                          value={String(account.id)}
                          className={account.parentId ? "pl-6" : ""}
                        >
                          {account.accountCode} - {account.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAccountForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update Account" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {error ? (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          Error loading accounts: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="animate-pulse p-4">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded mb-2 w-full"></div>
          <div className="h-6 bg-gray-200 rounded mb-2 w-full"></div>
          <div className="h-6 bg-gray-200 rounded mb-2 w-full"></div>
        </div>
      ) : accountTree.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="mb-4">No accounts found.</p>
          <Button>Create your first account</Button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 font-medium border-b">
            <div>Account Code</div>
            <div>Name</div>
            <div>Type</div>
            <div className="text-right">Actions</div>
          </div>
          
          <div className="divide-y">
            {accountTree.map(account => (
              <div key={account.id} className="grid grid-cols-4 gap-4 p-4">
                <div>{account.accountCode}</div>
                <div>{account.name}</div>
                <div>{account.type}</div>
                <div className="text-right">
                  <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                  <Button variant="outline" size="sm">Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}