import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Info,
  Plus,
  Trash,
  X,
} from "lucide-react";

const ACCOUNT_SUBTYPES: Record<string, string[]> = {
  "Asset": ["Current Asset", "Fixed Asset", "Intangible Asset", "Other Asset"],
  "Liability": ["Current Liability", "Long-Term Liability", "Other Liability"],
  "Equity": ["Owner's Equity", "Retained Earnings", "Other Equity"],
  "Revenue": ["Operating Revenue", "Non-Operating Revenue", "Other Revenue"],
  "Expense": ["Operating Expense", "Non-Operating Expense", "Other Expense"]
};

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

interface ChangesPreview {
  additions: any[];
  modifications: any[];
  removals: any[];
  unchanged: number;
}

function ChartOfAccounts() {
  const { currentEntity, selectedClientId } = useEntity();
  const clientId = selectedClientId || (currentEntity?.clientId || 0);
  const { toast } = useToast();
  
  // Track mounted state to prevent state updates after unmounting
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Account form state
  const [accountData, setAccountData] = useState({
    id: null as number | null,
    clientId: clientId || 0,
    accountCode: "",
    name: "",
    type: "Asset", // Default type
    subtype: "",
    isSubledger: false,
    subledgerType: "",
    parentId: null as number | null,
    active: true,
    description: ""
  });
  
  // Account form visibility
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [disableAccountCode, setDisableAccountCode] = useState(false);
  const [disableAccountType, setDisableAccountType] = useState(false);
  
  // Delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountTreeNode | null>(null);
  
  // Account code prefix based on type
  const [accountCodePrefix, setAccountCodePrefix] = useState("");
  
  // Import functionality
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [changesPreview, setChangesPreview] = useState<ChangesPreview>({
    additions: [],
    modifications: [],
    removals: [],
    unchanged: 0
  });
  
  // Selection states for import preview
  const [selectedNewAccounts, setSelectedNewAccounts] = useState<string[]>([]);
  const [selectedModifiedAccounts, setSelectedModifiedAccounts] = useState<string[]>([]);
  const [selectedMissingAccounts, setSelectedMissingAccounts] = useState<string[]>([]);
  
  // Fetch accounts from API
  const { data: accountTree = [] as AccountTreeNode[], isLoading, error, refetch } = useQuery<AccountTreeNode[]>({
    queryKey: ['/api/clients', clientId, 'accounts', 'tree'],
    queryFn: ({ queryKey }) => 
      apiRequest(`/api/clients/${queryKey[1]}/accounts/tree`),
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
  
  // Handle account code change
  const handleAccountCodeChange = (value: string) => {
    // Handle automatic prefixing of account codes
    if (accountCodePrefix && !value.startsWith(accountCodePrefix) && !disableAccountCode) {
      // Only auto-prefix if they're entering a new value and not editing a prefixed value
      if (!/^\d+$/.test(value)) {
        // Not a pure number, don't auto-prefix
        setAccountData(prev => ({ ...prev, accountCode: value }));
      } else {
        // It's a number, auto-prefix it
        setAccountData(prev => ({ ...prev, accountCode: accountCodePrefix + value }));
      }
    } else {
      setAccountData(prev => ({ ...prev, accountCode: value }));
    }
  };

  // Handle select field changes
  const handleSelectChange = (name: string, value: string) => {
    setAccountData(prev => ({ ...prev, [name]: value }));
    
    // If changing account type, update subtype and prefix
    if (name === "type") {
      setAccountData(prev => ({ ...prev, subtype: "" }));
      
      // Set account code prefix based on type
      let prefix = "";
      switch (value) {
        case "Asset":
          prefix = "1";
          break;
        case "Liability":
          prefix = "2";
          break;
        case "Equity":
          prefix = "3";
          break;
        case "Revenue":
          prefix = "4";
          break;
        case "Expense":
          prefix = "5";
          break;
      }
      setAccountCodePrefix(prefix);
      
      // Auto-prefix the account code if it's empty or doesn't have a prefix yet
      if (!disableAccountCode) {
        if (!accountData.accountCode || 
            (accountData.accountCode && 
             !/^[12345]/.test(accountData.accountCode))) {
          setAccountData(prev => ({ 
            ...prev, 
            accountCode: prefix + (prev.accountCode.match(/\d+$/) || [""])
          }));
        }
      }
    }
  };
  
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
      
      // Reset form state
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
      setFieldErrors({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Account",
        description: error.message,
        variant: "destructive",
      });
      
      // Try to parse validation errors
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.validationErrors) {
          setFieldErrors(errorData.validationErrors);
        }
      } catch (e) {
        // Handle simple error message
        setFieldErrors({ form: error.message });
      }
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
      
      // Reset form state
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
      setFieldErrors({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Account",
        description: error.message,
        variant: "destructive",
      });
      
      // Try to parse validation errors
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.validationErrors) {
          setFieldErrors(errorData.validationErrors);
        }
      } catch (e) {
        // Handle simple error message
        setFieldErrors({ form: error.message });
      }
    }
  });
  
  // Delete account mutation
  const deleteAccount = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clients/${clientId}/accounts/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Account has been deleted or deactivated successfully.",
      });
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Account",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Import accounts mutation
  const importAccounts = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/clients/${clientId}/accounts/import`, {
      method: 'POST',
      data,
    }),
    onSuccess: () => {
      toast({
        title: "Accounts Imported",
        description: "Accounts have been imported successfully.",
      });
      setShowImportDialog(false);
      setShowPreviewDialog(false);
      setImportData([]);
      setChangesPreview({
        additions: [],
        modifications: [],
        removals: [],
        unchanged: 0
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Importing Accounts",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Check if account has transactions (to determine if type/code can be edited)
  const {
    mutate: checkTransactions
  } = useMutation<{ hasTransactions: boolean }, Error, number>({
    mutationFn: (accountId: number) => 
      apiRequest(`/api/clients/${clientId}/accounts/transactions-check/${accountId}`),
    onSuccess: (data) => {
      const hasTransactions = data.hasTransactions;
      
      setDisableAccountCode(hasTransactions);
      setDisableAccountType(hasTransactions);
      
      if (hasTransactions) {
        toast({
          title: "Account Has Transactions",
          description: "This account has transactions. Some fields cannot be modified.",
          variant: "default",
        });
      }
    },
    onError: () => {
      // Assume no transactions on error to allow editing
      setDisableAccountCode(false);
      setDisableAccountType(false);
    }
  });
  
  // Handle account form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    
    // Validation
    const errors: Record<string, string> = {};
    
    if (!accountData.accountCode.trim()) {
      errors.accountCode = "Account code is required";
    }
    
    if (!accountData.name.trim()) {
      errors.name = "Account name is required";
    }
    
    if (!accountData.type) {
      errors.type = "Account type is required";
    }
    
    if (accountData.isSubledger && !accountData.subledgerType) {
      errors.subledgerType = "Subledger type is required for subledger accounts";
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    // Create or update account
    if (isEditMode && accountData.id) {
      updateAccount.mutate(accountData);
    } else {
      createAccount.mutate(accountData);
    }
  };
  
  // Handle account deletion confirmation
  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      deleteAccount.mutate(accountToDelete.id);
    }
  };
  
  // Handle account edit button click
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
    
    // Check if account has transactions
    checkTransactions(account.id);
  };
  
  // Handle account delete button click
  const handleDeleteAccount = (account: AccountTreeNode) => {
    setAccountToDelete(account);
    setShowDeleteConfirm(true);
  };
  
  // Handle file import
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`/api/clients/${clientId}/accounts/validate-import`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setImportErrors(result.errors || [result.message || "Unknown error"]);
        setImportData([]);
        return;
      }
      
      if (result.validationErrors && result.validationErrors.length > 0) {
        setImportErrors(result.validationErrors);
        setImportData([]);
      } else {
        setImportData(result.accounts || []);
        setImportErrors([]);
      }
    } catch (error) {
      setImportErrors(["Failed to validate import file. Please try again."]);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Generate preview of changes when importing
  const generateChangePreview = (importData: any[]) => {
    // Map accounts by account code for easier lookup
    const existingAccountsMap = allAccounts.reduce<Record<string, AccountTreeNode>>(
      (acc, account) => {
        const code = account.accountCode || account.code || "";
        if (code) {
          acc[code] = account;
        }
        return acc;
      }, 
      {}
    );
    
    // Find new, modified, and unchanged accounts
    const additions: any[] = [];
    const modifications: any[] = [];
    let unchanged: number = 0;
    
    // Track account codes in import data
    const importAccountCodes = new Set<string>();
    
    importData.forEach(importAccount => {
      const accountCode = importAccount.accountCode || importAccount.code || "";
      if (!accountCode) return;
      
      importAccountCodes.add(accountCode);
      
      if (existingAccountsMap[accountCode]) {
        const existingAccount = existingAccountsMap[accountCode];
        
        // Check if there are changes
        let hasChanges = false;
        
        // Compare fields
        if (
          importAccount.name !== existingAccount.name ||
          importAccount.type !== existingAccount.type ||
          importAccount.subtype !== existingAccount.subtype ||
          importAccount.isSubledger !== existingAccount.isSubledger ||
          importAccount.subledgerType !== existingAccount.subledgerType ||
          importAccount.active !== existingAccount.active ||
          importAccount.description !== existingAccount.description ||
          (importAccount.parentId || null) !== (existingAccount.parentId || null)
        ) {
          hasChanges = true;
        }
        
        if (hasChanges) {
          modifications.push({
            existing: existingAccount,
            imported: importAccount
          });
        } else {
          // Unchanged count
          unchanged++;
        }
      } else {
        // New account
        additions.push(importAccount);
      }
    });
    
    // Find accounts that exist in the system but not in the import
    const removals = allAccounts.filter(
      account => !importAccountCodes.has(account.accountCode)
    );
    
    setChangesPreview({
      additions,
      modifications,
      removals,
      unchanged
    });
    
    // Initialize selection states
    setSelectedNewAccounts(additions.map(a => a.accountCode || a.code));
    setSelectedModifiedAccounts(modifications.map(m => m.imported.accountCode || m.imported.code));
    setSelectedMissingAccounts([]);
  };
  
  // Handle import confirmation
  const handleImportConfirm = () => {
    // Prepare import data with selection preferences
    const importRequest = {
      accounts: importData,
      options: {
        updateExisting: true,
        deactivateMissing: false,
        deleteMissing: false,
        includedCodes: [
          ...selectedNewAccounts,
          ...selectedModifiedAccounts
        ],
        missingAccountActions: selectedMissingAccounts.reduce((acc: Record<string, string>, code) => {
          acc[code] = "inactive";
          return acc;
        }, {})
      }
    };
    
    importAccounts.mutate(importRequest);
  };
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <PageHeader
        title="Chart of Accounts"
        description="Manage your organization's financial accounts"
      >
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".csv,.xlsx,.xls"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => {
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
            setIsEditMode(false);
            setShowAccountForm(true);
            setFieldErrors({});
            setDisableAccountCode(false);
            setDisableAccountType(false);
            setAccountCodePrefix("1"); // Default for Asset
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
      </PageHeader>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading accounts</h3>
              <p className="text-sm text-red-700 mt-1">
                {(error as Error).message || "Could not fetch accounts. Please try again."}
              </p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="animate-pulse flex-1 space-y-6 py-5">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 bg-gray-50 text-sm font-medium text-gray-700 border-b grid grid-cols-5">
            <div className="col-span-1">Account Code</div>
            <div className="col-span-1">Name</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Description</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {accountTree.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p className="text-center text-gray-500">No accounts found.</p>
                <Button 
                  onClick={() => {
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
                    setIsEditMode(false);
                    setShowAccountForm(true);
                    setFieldErrors({});
                    setDisableAccountCode(false);
                    setDisableAccountType(false);
                    setAccountCodePrefix("1"); // Default for Asset
                  }}
                  variant="outline"
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first account
                </Button>
              </div>
            ) : (
              <div className="account-tree">
                {/* Recursive account rendering */}
                {renderAccountTree(accountTree, 0)}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Account Form Dialog */}
      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Account" : "Create New Account"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the account details below." 
                : "Enter the details for the new account."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="mt-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountCode">Account Code</Label>
                      <Input
                        id="accountCode"
                        placeholder="Enter account code"
                        value={accountData.accountCode}
                        onChange={(e) => handleAccountCodeChange(e.target.value)}
                        disabled={disableAccountCode}
                        className={disableAccountCode ? "bg-gray-100" : ""}
                      />
                      {fieldErrors.accountCode && (
                        <div className="text-red-500 text-xs">{fieldErrors.accountCode}</div>
                      )}
                      {disableAccountCode && (
                        <p className="text-xs text-amber-600 mt-1">
                          Cannot change account code for accounts with transactions.
                        </p>
                      )}
                      {accountCodePrefix && (
                        <p className="text-xs text-gray-500 mt-1">
                          {accountCodePrefix && !accountData.accountCode.startsWith(accountCodePrefix) && 
                            "Code will be prefixed with " + accountCodePrefix}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Account Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter account name"
                        value={accountData.name}
                        onChange={(e) => 
                          setAccountData(prev => ({...prev, name: e.target.value}))
                        }
                      />
                      {fieldErrors.name && (
                        <div className="text-red-500 text-xs">{fieldErrors.name}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select 
                        value={accountData.type} 
                        onValueChange={(value) => handleSelectChange("type", value)}
                        disabled={disableAccountType}
                      >
                        <SelectTrigger id="accountType" className={disableAccountType ? "bg-gray-100" : ""}>
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
                      {fieldErrors.type && (
                        <div className="text-red-500 text-xs">{fieldErrors.type}</div>
                      )}
                      {disableAccountType && (
                        <p className="text-xs text-amber-600 mt-1">
                          Cannot change account type for accounts with transactions.
                        </p>
                      )}
                      {accountCodePrefix && (
                        <p className="text-xs text-gray-500 mt-1">
                          Type prefix: {accountCodePrefix}xxx
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountSubtype">Account Subtype</Label>
                      <Select 
                        value={accountData.subtype || ''} 
                        onValueChange={(value) => handleSelectChange("subtype", value)}
                      >
                        <SelectTrigger id="accountSubtype">
                          <SelectValue placeholder="Select account subtype" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_SUBTYPES[accountData.type]?.map((subtype) => (
                            <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the account's purpose"
                      value={accountData.description || ''}
                      onChange={(e) => 
                        setAccountData(prev => ({...prev, description: e.target.value}))
                      }
                      className="h-24"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Account</Label>
                    <Select
                      value={accountData.parentId ? String(accountData.parentId) : ""}
                      onValueChange={(value) => {
                        setAccountData(prev => ({
                          ...prev,
                          parentId: value === "" ? null : parseInt(value)
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full" id="parentId">
                        <SelectValue placeholder="Select a parent account (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="">No Parent (Top-Level Account)</SelectItem>
                        
                        {Object.entries(
                          allAccounts
                            .filter(account => account.active && (!isEditMode || account.id !== accountData.id))
                            .reduce<Record<string, any[]>>((acc, account) => {
                              const type = account.type;
                              if (!acc[type]) {
                                acc[type] = [];
                              }
                              acc[type].push(account);
                              return acc;
                            }, {})
                        ).map(([type, accounts]) => (
                          <SelectGroup key={type}>
                            <SelectLabel>{type}</SelectLabel>
                            {accounts.map(account => (
                              <SelectItem
                                key={account.id}
                                value={String(account.id)}
                                className={cn(
                                  account.parentId !== null ? "pl-6" : "",
                                  "flex items-center"
                                )}
                              >
                                <span className="font-mono text-xs opacity-70 mr-2">
                                  {account.accountCode}
                                </span>
                                <span className={account.children && account.children.length > 0 ? "font-medium" : ""}>
                                  {account.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-gray-500 mt-1">
                      Selecting a parent will place this account under it in the hierarchy
                    </div>
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
                        handleSelectChange("isSubledger", String(checked === true))
                      }
                    />
                    <Label htmlFor="isSubledger">This is a subledger account</Label>
                  </div>
                  
                  {accountData.isSubledger && (
                    <div className="space-y-2 ml-6 mt-2 max-w-full">
                      <Label htmlFor="subledgerType">Subledger Type</Label>
                      <Select 
                        value={accountData.subledgerType} 
                        onValueChange={(value) => handleSelectChange("subledgerType", value)}
                      >
                        <SelectTrigger className="w-full">
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
                      onCheckedChange={(checked) => {
                        setAccountData(prev => ({
                          ...prev,
                          active: checked === true
                        }));
                      }}
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
                disabled={isEditMode ? updateAccount.isPending : createAccount.isPending}
              >
                {isEditMode 
                  ? (updateAccount.isPending ? "Updating..." : "Update Account") 
                  : (createAccount.isPending ? "Creating..." : "Create Account")
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account 
              {accountToDelete && <span className="font-semibold"> {accountToDelete.accountCode} - {accountToDelete.name}</span>}.
              <br /><br />
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                <span className="text-amber-800">
                  <strong>Important:</strong> Accounts that have been used in journal entries cannot be deleted
                  and will be automatically deactivated instead.
                  <br /><br />
                  Only accounts with no transaction history can be fully deleted from the system.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Dialog */}
      <Dialog 
        open={showImportDialog} 
        onOpenChange={(open) => {
          setShowImportDialog(open);
          if (!open) {
            // Reset all import-related state when closing the dialog
            setImportData([]);
            setImportErrors([]);
            setChangesPreview({
              additions: [],
              modifications: [],
              removals: [],
              unchanged: 0
            });
            setSelectedNewAccounts([]);
            setSelectedModifiedAccounts([]);
            setSelectedMissingAccounts([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Import Chart of Accounts
            </DialogTitle>
            <DialogDescription>
              Import accounts from your Excel spreadsheet. The system will validate the data before importing.
            </DialogDescription>
          </DialogHeader>
          
          {importErrors.length > 0 ? (
            <div className="mt-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      The following errors were found in your Excel file:
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 space-y-1 list-disc pl-5">
                      {importErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportErrors([]);
                    setImportData([]); // Clear import data
                    setChangesPreview({
                      additions: [],
                      modifications: [],
                      removals: [],
                      unchanged: 0
                    }); // Reset preview
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Different File
                </Button>
              </div>
            </div>
          ) : importData.length > 0 ? (
            <div className="mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Ready to import {importData.length} accounts
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      The file has been validated and is ready to import. 
                      Click "Import Accounts" to proceed or "Cancel" to abort.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtype</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importData.slice(0, 5).map((account, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.accountCode || account.code}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{account.type}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{account.subtype || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{account.active ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                    {importData.length > 5 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-sm text-gray-500 text-center">
                          And {importData.length - 5} more accounts...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <DialogFooter className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportData([]);
                    setChangesPreview({
                      additions: [],
                      modifications: [],
                      removals: [],
                      unchanged: 0
                    }); // Reset preview
                  }}
                >
                  Cancel
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Show preview dialog with comparison between existing and new data
                      generateChangePreview(importData);
                      setShowImportDialog(false);
                      setShowPreviewDialog(true);
                    }}
                  >
                    Preview Changes
                  </Button>
                  <Button
                    onClick={handleImportConfirm}
                    disabled={importAccounts.isPending}
                  >
                    {importAccounts.isPending ? "Importing..." : "Import Accounts"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <div className="mt-4">
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <div className="flex justify-center">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400" />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload a CSV or Excel file containing your chart of accounts.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  The file should include columns for account code, name, type, and other account attributes.
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Supported File Formats
                    </h3>
                    <ul className="mt-1 pl-5 text-xs text-blue-700 list-disc">
                      <li>CSV (.csv)</li>
                      <li>Excel (.xlsx, .xls)</li>
                    </ul>
                    <p className="mt-2 text-xs text-blue-700">
                      Required columns: <span className="font-mono">accountCode</span>, <span className="font-mono">name</span>, <span className="font-mono">type</span>
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      Optional columns: <span className="font-mono">subtype</span>, <span className="font-mono">active</span>, <span className="font-mono">description</span>, <span className="font-mono">isSubledger</span>, <span className="font-mono">subledgerType</span>, <span className="font-mono">parentCode</span>
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      If <span className="font-mono">parentCode</span> is provided, it should be the <span className="font-mono">accountCode</span> of another account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
  
  // Helper function to render account tree
  function renderAccountTree(accounts: AccountTreeNode[], level: number) {
    return accounts.map((account) => {
      const hasChildren = account.children && account.children.length > 0;
      
      return (
        <div key={account.id} className="account-tree-node">
          <div 
            className={cn(
              "px-6 py-3 grid grid-cols-5 items-center",
              !account.active && "text-gray-400",
              level === 0 ? "border-t" : "",
              hasChildren ? "font-medium" : ""
            )}
            style={{ paddingLeft: `${6 + level * 20}px` }}
          >
            <div className="col-span-1 flex items-center">
              {hasChildren && (
                <div className="mr-2 w-4">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              )}
              {!hasChildren && level > 0 && <div className="mr-2 w-4"></div>}
              <span className="font-mono">{account.accountCode}</span>
            </div>
            
            <div className="col-span-1">
              <div className="flex items-center space-x-2">
                <span>{account.name}</span>
                {!account.active && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            
            <div className="col-span-1">
              <div className="flex flex-col">
                <span>{account.type}</span>
                {account.subtype && (
                  <span className="text-xs text-gray-500">{account.subtype}</span>
                )}
              </div>
            </div>
            
            <div className="col-span-1 truncate text-gray-500">
              {account.description || "-"}
            </div>
            
            <div className="col-span-1 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEditAccount(account)}
              >
                Edit
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleDeleteAccount(account)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {hasChildren && (
            <div className="account-children">
              {renderAccountTree(account.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  }
}

export default ChartOfAccounts;