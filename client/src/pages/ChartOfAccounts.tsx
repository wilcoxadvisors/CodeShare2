import React, { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";

// Helper function to capitalize first letter of a string
const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { AccountType } from "../lib/schema";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  Check,
  X,
  Info,
  AlertTriangle,
  RefreshCw,
  Filter,
  User,
  Folder,
  Sparkles
} from "lucide-react";

// Account form validation schema
const accountFormSchema = z.object({
  accountCode: z.string().min(3, "Account code must be at least 3 characters"),
  name: z.string().min(2, "Account name must be at least 2 characters"),
  type: z.enum([
    AccountType.ASSET, 
    AccountType.LIABILITY, 
    AccountType.EQUITY, 
    AccountType.REVENUE, 
    AccountType.EXPENSE
  ], {
    required_error: "Account type is required"
  }),
  subtype: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  parentId: z.number().nullable().optional(),
  isSubledger: z.boolean().default(false),
  subledgerType: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

/**
 * Chart of Accounts Component
 * 
 * This component renders the Chart of Accounts page for a specific entity.
 * It provides functionality to:
 * 1. View, filter, and search accounts
 * 2. Create, edit, and deactivate accounts
 * 3. Import and export accounts
 * 4. View account details and hierarchy
 */
function ChartOfAccounts() {
  const { currentEntity, setCurrentEntity } = useEntity();
  const [searchTerm, setSearchTerm] = useState("");
  const [accountType, setAccountType] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [filterBy, setFilterBy] = useState("");
  
  // Account modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  
  // Account deletion confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);
  
  // Import/Export state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<"csv" | "excel">("csv");
  const [updateStrategy, setUpdateStrategy] = useState<"all" | "selected">("selected");
  
  // Import preview data
  const [changesPreview, setChangesPreview] = useState<{
    additions: any[];
    modifications: any[];
    removals: any[];
    unchanged: number;
  }>({
    additions: [],
    modifications: [],
    removals: [],
    unchanged: 0
  });
  
  // Selected accounts for import (when using "selected" strategy)
  const [selectedNewAccounts, setSelectedNewAccounts] = useState<string[]>([]);
  const [selectedModifiedAccounts, setSelectedModifiedAccounts] = useState<string[]>([]);
  const [selectedMissingAccounts, setSelectedMissingAccounts] = useState<string[]>([]);
  
  // Actions for missing accounts (mark as inactive or delete)
  const [missingAccountActions, setMissingAccountActions] = useState<Record<string, 'inactive' | 'delete'>>({});
  
  // Form refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch accounts
  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: [`/api/clients/${currentEntity?.id}/accounts`],
    enabled: !!currentEntity?.id,
  });
  
  // Import accounts mutation
  const importAccounts = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest(`/api/clients/${currentEntity?.id}/accounts/import`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Accounts imported successfully",
        description: "Your Chart of Accounts has been updated.",
      });
      refetch();
      setShowPreviewDialog(false);
      setShowImportDialog(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to import accounts",
        description: error.message || "There was an error importing the accounts. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Export accounts mutation
  const exportAccounts = useMutation({
    mutationFn: async (format: 'csv' | 'excel') => {
      const response = await apiRequest(`/api/clients/${currentEntity?.id}/accounts/export?format=${format}`, {
        method: 'GET',
        responseType: 'blob',
      });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chart_of_accounts_${currentEntity?.name}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to export accounts",
        description: error.message || "There was an error exporting the accounts. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Transform flat accounts list into hierarchical structure
  const accountsTree = useMemo(() => {
    if (!accounts) return [];
    
    // First pass: Create a lookup map and identify root nodes
    const accountMap = new Map();
    const rootAccounts: any[] = [];
    
    // Clone the accounts to avoid modifying the original data
    const flatAccounts = JSON.parse(JSON.stringify(accounts));
    
    // Add a children array to each account
    flatAccounts.forEach((account: any) => {
      account.children = [];
      accountMap.set(account.id, account);
    });
    
    // Second pass: Build the tree structure
    flatAccounts.forEach((account: any) => {
      if (account.parentId && accountMap.has(account.parentId)) {
        // This is a child node, add it to its parent's children array
        const parent = accountMap.get(account.parentId);
        parent.children.push(account);
      } else {
        // This is a root node with no parent
        rootAccounts.push(account);
      }
    });
    
    // Sort the accounts
    const sortAccountNodes = (nodes: any[]) => {
      // First sort by active status (active first)
      nodes.sort((a, b) => {
        // First by active status
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        
        // Then by accountCode
        return a.accountCode.localeCompare(b.accountCode);
      });
      
      // Then recursively sort children
      nodes.forEach(node => {
        if (node.children && node.children.length) {
          sortAccountNodes(node.children);
        }
      });
      
      return nodes;
    };
    
    return sortAccountNodes(rootAccounts);
  }, [accounts]);
  
  // Filtered accounts based on search term, type filter, and inactive filter
  const filteredAccounts = useMemo(() => {
    let filtered = [...accountsTree];
    
    // Helper function to recursively filter accounts
    const filterAccountsRecursive = (accounts: any[]) => {
      return accounts.filter(account => {
        // Apply active/inactive filter
        if (!showInactive && !account.active) {
          return false;
        }
        
        // Filter by account type if selected
        if (accountType && account.type !== accountType) {
          // Check if any children match the type filter
          const matchingChildren = account.children.length ? 
            filterAccountsRecursive(account.children).length > 0 : false;
          
          if (!matchingChildren) {
            return false;
          }
        }
        
        // Filter by search term (case insensitive)
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === "" || 
          account.name.toLowerCase().includes(searchLower) || 
          account.accountCode.toLowerCase().includes(searchLower) ||
          (account.description && account.description.toLowerCase().includes(searchLower));
        
        if (matchesSearch) {
          // This account matches the search term
          // Recursively filter its children
          if (account.children.length) {
            account.children = filterAccountsRecursive(account.children);
          }
          return true;
        } else {
          // This account doesn't match the search term, but maybe its children do
          if (account.children.length) {
            const filteredChildren = filterAccountsRecursive(account.children);
            if (filteredChildren.length > 0) {
              account.children = filteredChildren;
              return true;
            }
          }
          return false;
        }
      });
    };
    
    // Apply filters
    filtered = filterAccountsRecursive(filtered);
    
    return filtered;
  }, [accountsTree, searchTerm, accountType, showInactive]);
  
  // Function to toggle expansion of an account node
  const toggleExpand = (accountId: number) => {
    setExpanded(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };
  
  // Function to expand all nodes
  const expandAll = () => {
    const newExpanded: Record<number, boolean> = {};
    
    const traverseAndExpand = (nodes: any[]) => {
      nodes.forEach(node => {
        newExpanded[node.id] = true;
        if (node.children && node.children.length) {
          traverseAndExpand(node.children);
        }
      });
    };
    
    traverseAndExpand(accountsTree);
    setExpanded(newExpanded);
  };
  
  // Function to collapse all nodes
  const collapseAll = () => {
    setExpanded({});
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setAccountType("");
    setShowInactive(false);
  };
  
  // Count total accounts
  const totalAccounts = useMemo(() => {
    if (!accounts) return 0;
    return accounts.length;
  }, [accounts]);
  
  // Count active accounts
  const activeAccounts = useMemo(() => {
    if (!accounts) return 0;
    return accounts.filter((account: any) => account.active).length;
  }, [accounts]);
  
  // Handle import file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);
      
      // Auto-detect format from file extension
      if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setImportFormat('excel');
      }
    }
  };
  
  // Function to preview import changes
  const handlePreviewImport = async () => {
    if (!importFile || !currentEntity?.id) return;
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('format', importFormat);
      
      const response = await apiRequest(`/api/clients/${currentEntity.id}/accounts/import/preview`, {
        method: 'POST',
        body: formData,
      });
      
      // Populate preview data
      setChangesPreview({
        additions: response.additions || [],
        modifications: response.modifications || [],
        removals: response.removals || [],
        unchanged: response.unchanged || 0
      });
      
      // Pre-select all new accounts by default
      setSelectedNewAccounts(response.additions.map((a: any) => a.accountCode || a.code));
      setSelectedModifiedAccounts(response.modifications.map((m: any) => m.original.accountCode || m.original.code));
      
      // Close import dialog and open preview dialog
      setShowImportDialog(false);
      setShowPreviewDialog(true);
    } catch (error) {
      toast({
        title: "Failed to preview import",
        description: (error as Error).message || "There was an error previewing the import. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle final import after preview
  const handleImportConfirm = () => {
    if (!importFile || !currentEntity?.id) return;
    
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('format', importFormat);
    formData.append('strategy', updateStrategy);
    
    if (updateStrategy === 'selected') {
      // For each selected missing account, make sure there's an action (default to 'inactive')
      const missingAccountActionsWithDefaults = selectedMissingAccounts.reduce((acc, code) => {
        return {
          ...acc,
          [code]: missingAccountActions[code] || 'inactive'
        };
      }, {});
      
      // Include the selected accounts data with missing account actions
      formData.append('selections', JSON.stringify({
        newAccountCodes: selectedNewAccounts,
        modifiedAccountCodes: selectedModifiedAccounts,
        missingAccountCodes: selectedMissingAccounts,
        missingAccountActions: missingAccountActionsWithDefaults
      }));
    }
    
    importAccounts.mutate(formData);
  };
  
  // Validate import data to check if it has proper fields
  const validateAndProcessImportData = async (data: any) => {
    // Check if the data has required fields
    if (!Array.isArray(data)) {
      throw new Error("Invalid data format. Expected an array of accounts.");
    }
    
    if (data.length === 0) {
      throw new Error("The file contains no account data.");
    }
    
    // Check for required fields in the first row
    const firstRow = data[0];
    const hasRequiredFields = firstRow.hasOwnProperty('name') && 
      (firstRow.hasOwnProperty('accountCode') || firstRow.hasOwnProperty('code'));
    
    if (!hasRequiredFields) {
      throw new Error("The file is missing required fields. Each account must have a name and accountCode (or code).");
    }
    
    // Map account types to standard types if needed
    return data.map((account: any) => {
      // Use accountCode as the primary field, but fall back to code if needed
      const processedAccount = {
        ...account,
        accountCode: account.accountCode || account.code
      };
      
      return processedAccount;
    });
  };
  
  // Render account row (recursive for tree structure)
  const renderAccountRow = (account: any, level = 0, parentExpanded = true) => {
    const isExpanded = !!expanded[account.id];
    const hasChildren = account.children && account.children.length > 0;
    const isVisible = parentExpanded;
    
    const paddingLeft = level * 20; // Indentation based on level
    
    if (!isVisible) return null;
    
    return (
      <div key={account.id}>
        <div 
          className={`
            flex items-center border-b border-gray-100 py-2 
            ${!account.active ? 'text-gray-400 bg-gray-50' : ''}
          `}
        >
          <div style={{ paddingLeft: `${paddingLeft}px` }} className="flex items-center min-w-[350px]">
            {hasChildren ? (
              <button 
                onClick={() => toggleExpand(account.id)}
                className="mr-1 p-1 rounded-sm hover:bg-gray-100 focus:outline-none"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-6"></span> // Placeholder for alignment
            )}
            
            <span className="font-medium mr-2">{account.accountCode}</span>
            <span className="truncate">{account.name}</span>
          </div>
          
          <div className="flex-1 px-4 max-w-xs truncate">
            {account.description || "-"}
          </div>
          
          <div className="px-4 w-36 text-sm">
            <Badge variant={account.active ? "outline" : "secondary"}>
              {account.type}
            </Badge>
          </div>
          
          <div className="px-4 w-24 text-sm">
            {account.isSubledger ? (
              <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                Subledger
              </Badge>
            ) : "-"}
          </div>
          
          <div className="px-4 w-24 text-center">
            {account.active ? (
              <Badge variant="outline" className="border-green-500 text-green-700">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-300 text-gray-500">
                Inactive
              </Badge>
            )}
          </div>
          
          <div className="px-4 flex justify-end w-24">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    setCurrentAccount(account);
                    setIsEditModalOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => {
                    // Toggle account active status
                    setCurrentAccount(account);
                    setShowDeleteConfirm(true);
                  }}
                >
                  {account.active ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Activate</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Render children recursively if expanded */}
        {isExpanded && account.children && account.children.map((child: any) => 
          renderAccountRow(child, level + 1, isVisible)
        )}
      </div>
    );
  };
  
  // Form validation schema for creating/editing accounts
  const accountFormSchema = z.object({
    accountCode: z.string().min(1, "Account code is required"),
    name: z.string().min(1, "Account name is required"),
    type: z.enum(["asset", "liability", "equity", "revenue", "expense"], {
      required_error: "Account type is required",
    }),
    subtype: z.string().optional(),
    isSubledger: z.boolean().default(false),
    subledgerType: z.string().optional(),
    parentId: z.number().optional().nullable(),
    description: z.string().optional(),
    active: z.boolean().default(true),
  });

  // Create account mutation
  const createAccount = useMutation({
    mutationFn: async (data: z.infer<typeof accountFormSchema>) => {
      return apiRequest(`/api/clients/${currentEntity?.id}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentEntity?.id}/accounts/tree`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentEntity?.id}/accounts`] });
      setIsCreateModalOpen(false);
      toast({
        title: "Account created",
        description: "Account has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating account",
        description: error.message || "An error occurred while creating the account",
        variant: "destructive",
      });
    },
  });

  // Update account mutation
  const updateAccount = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof accountFormSchema> }) => {
      return apiRequest(`/api/clients/${currentEntity?.id}/accounts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentEntity?.id}/accounts/tree`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentEntity?.id}/accounts`] });
      setIsEditModalOpen(false);
      setCurrentAccount(null);
      toast({
        title: "Account updated",
        description: "Account has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating account",
        description: error.message || "An error occurred while updating the account",
        variant: "destructive",
      });
    },
  });

  // Handle account deletion (deactivation)
  const deactivateAccount = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/clients/${currentEntity?.id}/accounts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: false }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentEntity?.id}/accounts/tree`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentEntity?.id}/accounts`] });
      setShowDeleteConfirm(false);
      setCurrentAccount(null);
      toast({
        title: "Account deactivated",
        description: "Account has been deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deactivating account",
        description: error.message || "An error occurred while deactivating the account",
        variant: "destructive",
      });
    },
  });
  
  return (
    <>
      <PageHeader 
        title="Chart of Accounts" 
        description="Manage your organization's chart of accounts to track financial transactions."
      />
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Search and filters */}
        <div className="flex flex-1 items-center space-x-2 min-w-[320px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search accounts by code or name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={accountType} onValueChange={(value) => setAccountType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Account Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Account Types</SelectItem>
              <SelectItem value="Assets">Assets</SelectItem>
              <SelectItem value="Liabilities">Liabilities</SelectItem>
              <SelectItem value="Equity">Equity</SelectItem>
              <SelectItem value="Revenue">Revenue</SelectItem>
              <SelectItem value="Expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={(checked) => setShowInactive(!!checked)}
            />
            <Label
              htmlFor="show-inactive"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Show inactive
            </Label>
          </div>
          
          {(searchTerm || accountType || showInactive) && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Import/Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import / Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Import Accounts</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAccounts.mutate('csv')}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export as CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAccounts.mutate('excel')}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Expand/Collapse dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ChevronDown className="mr-2 h-4 w-4" />
                Expand / Collapse
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={expandAll}>
                <span>Expand All</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={collapseAll}>
                <span>Collapse All</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Add account button */}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>
      
      {/* Accounts list with header */}
      <div className="bg-white rounded-md border">
        {/* Header */}
        <div className="flex items-center border-b border-gray-100 bg-gray-50 py-3 text-sm font-medium text-gray-500">
          <div className="px-4 min-w-[350px]">Account</div>
          <div className="flex-1 px-4 max-w-xs">Description</div>
          <div className="px-4 w-36">Type</div>
          <div className="px-4 w-24">Subledger</div>
          <div className="px-4 w-24 text-center">Status</div>
          <div className="px-4 w-24 text-right">Actions</div>
        </div>
        
        {/* Account rows */}
        <div>
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center border-b py-3">
                <div className="px-4 min-w-[350px]">
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="flex-1 px-4 max-w-xs">
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="px-4 w-36">
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="px-4 w-24">
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="px-4 w-24 text-center">
                  <Skeleton className="h-5 w-16 mx-auto" />
                </div>
                <div className="px-4 w-24 text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </div>
              </div>
            ))
          ) : filteredAccounts.length > 0 ? (
            filteredAccounts.map(account => renderAccountRow(account))
          ) : (
            <div className="py-8 text-center text-gray-500">
              {accounts && accounts.length > 0 ? (
                <div>
                  <Filter className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p>No accounts match your search criteria.</p>
                  <Button 
                    variant="link" 
                    onClick={resetFilters}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div>
                  <Folder className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p>No accounts found. Let's add your first account!</p>
                  <Button 
                    variant="link" 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-2"
                  >
                    Create account
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Accounts summary */}
      <div className="mt-4 flex items-center text-sm text-gray-500">
        <div className="mr-6">
          Total accounts: <span className="font-medium text-gray-700">{totalAccounts}</span>
        </div>
        <div>
          Active accounts: <span className="font-medium text-gray-700">{activeAccounts}</span>
        </div>
      </div>
      
      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Import Chart of Accounts
            </DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with your Chart of Accounts data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="import-file" className="text-right">
                File
              </Label>
              <div className="col-span-3">
                <Input
                  id="import-file"
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Accepted formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="import-format" className="text-right">
                Format
              </Label>
              <div className="col-span-3">
                <Select
                  value={importFormat}
                  onValueChange={(value) => setImportFormat(value as "csv" | "excel")}
                >
                  <SelectTrigger id="import-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Import Options
              </Label>
              <div className="col-span-3">
                <RadioGroup 
                  value={updateStrategy} 
                  onValueChange={(value) => setUpdateStrategy(value as "all" | "selected")}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="all" id="strategy-all" />
                    <Label htmlFor="strategy-all">Import all accounts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="strategy-selected" />
                    <Label htmlFor="strategy-selected">Select accounts to import (preview changes first)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 col-span-full">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Import Instructions</h3>
                  <ul className="mt-1 text-sm text-blue-700 list-disc pl-5">
                    <li>Your file should include columns for accountCode, name, type, and parentId.</li>
                    <li>The accountCode must be unique for each account.</li>
                    <li>Account types should be one of: Assets, Liabilities, Equity, Revenue, Expenses.</li>
                    <li>For parent-child relationships, use the accountCode to identify the parent.</li>
                    <li>Set "active" to false to import inactive accounts.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePreviewImport} 
              disabled={!importFile}
            >
              {updateStrategy === 'selected' ? 'Preview Changes' : 'Import Accounts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Preview Changes Before Import
            </DialogTitle>
            <DialogDescription>
              Review the changes that will be made to your Chart of Accounts before confirming the import.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    Summary of Changes
                  </h3>
                  <ul className="mt-1 text-sm text-blue-700 list-disc pl-5">
                    <li>{changesPreview.additions.length} new accounts will be added</li>
                    <li>{changesPreview.modifications.length} existing accounts will be modified</li>
                    <li>{changesPreview.removals.length} accounts are missing from import</li>
                    <li>{changesPreview.unchanged} accounts are unchanged</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {changesPreview.additions.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-gray-900">New Accounts ({changesPreview.additions.length})</h3>
                  <div className="flex items-center">
                    <Checkbox 
                      id="select-all-additions"
                      checked={changesPreview.additions.every(account => 
                        selectedNewAccounts.includes(account.accountCode || account.code)
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Add all addition account codes that aren't already in the selection
                          const newCodes = changesPreview.additions
                            .map(a => a.accountCode || a.code)
                            .filter(code => !selectedNewAccounts.includes(code));
                          
                          setSelectedNewAccounts(prev => [...prev, ...newCodes]);
                        } else {
                          // Remove all addition account codes from the selection
                          const additionCodes = changesPreview.additions.map(a => a.accountCode || a.code);
                          setSelectedNewAccounts(prev => prev.filter(code => !additionCodes.includes(code)));
                        }
                      }}
                      className="mr-2 h-4 w-4"
                    />
                    <Label htmlFor="select-all-additions" className="text-sm font-medium text-gray-700">
                      Select All
                    </Label>
                  </div>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          Approve
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {changesPreview.additions.map((account, index) => {
                        const parentAccount = account.parentId ? 
                          accounts.find((a: any) => a.id === account.parentId) : null;
                          
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Checkbox 
                                id={`new-account-${index}`}
                                checked={selectedNewAccounts.includes(account.accountCode || account.code)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedNewAccounts(prev => [...prev, account.accountCode || account.code]);
                                  } else {
                                    setSelectedNewAccounts(prev => 
                                      prev.filter(code => code !== (account.accountCode || account.code))
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {account.accountCode || account.code}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {account.name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {account.type}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {parentAccount ? 
                                `${parentAccount.accountCode} - ${parentAccount.name}` : 
                                "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {changesPreview.modifications.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-gray-900">
                    Modified Accounts ({changesPreview.modifications.length})
                  </h3>
                  <div className="flex items-center">
                    <Checkbox 
                      id="select-all-modifications"
                      checked={changesPreview.modifications.every(mod => 
                        selectedModifiedAccounts.includes(mod.original.accountCode || mod.original.code)
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Add all modification account codes that aren't already in the selection
                          const modCodes = changesPreview.modifications
                            .map(m => m.original.accountCode || m.original.code)
                            .filter(code => !selectedModifiedAccounts.includes(code));
                          
                          setSelectedModifiedAccounts(prev => [...prev, ...modCodes]);
                        } else {
                          // Remove all modification account codes from the selection
                          const modCodes = changesPreview.modifications.map(m => m.original.accountCode || m.original.code);
                          setSelectedModifiedAccounts(prev => prev.filter(code => !modCodes.includes(code)));
                        }
                      }}
                      className="mr-2 h-4 w-4"
                    />
                    <Label htmlFor="select-all-modifications" className="text-sm font-medium text-gray-700">
                      Select All
                    </Label>
                  </div>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          Approve
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fields Changed
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Value
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {changesPreview.modifications.map((mod, index) => {
                        // Determine which fields have changed
                        const changes = [];
                        
                        // Check all fields for changes
                        if (mod.original.name !== mod.modified.name) {
                          changes.push({
                            field: 'Name',
                            current: mod.original.name,
                            new: mod.modified.name
                          });
                        }
                        
                        if ((mod.original.accountCode || mod.original.code) !== (mod.modified.accountCode || mod.modified.code)) {
                          changes.push({
                            field: 'Account Code',
                            current: mod.original.accountCode || mod.original.code,
                            new: mod.modified.accountCode || mod.modified.code
                          });
                        }
                        
                        if (mod.original.type !== mod.modified.type) {
                          changes.push({
                            field: 'Type',
                            current: mod.original.type,
                            new: mod.modified.type
                          });
                        }
                        
                        if (mod.original.description !== mod.modified.description) {
                          changes.push({
                            field: 'Description',
                            current: mod.original.description || 'None',
                            new: mod.modified.description || 'None'
                          });
                        }
                        
                        if (mod.original.parentId !== mod.modified.parentId) {
                          const currentParent = mod.original.parentId ? 
                            accounts.find((a: any) => a.id === mod.original.parentId) : null;
                            
                          const newParent = mod.modified.parentId ?
                            accounts.find((a: any) => a.id === mod.modified.parentId) : null;
                            
                          changes.push({
                            field: 'Parent',
                            current: currentParent ? `${currentParent.accountCode} - ${currentParent.name}` : 'None',
                            new: newParent ? `${newParent.accountCode} - ${newParent.name}` : 'None'
                          });
                        }
                        
                        if (mod.original.active !== mod.modified.active) {
                          changes.push({
                            field: 'Status',
                            current: mod.original.active ? 'Active' : 'Inactive',
                            new: mod.modified.active ? 'Active' : 'Inactive'
                          });
                        }
                        
                        if (mod.original.isSubledger !== mod.modified.isSubledger) {
                          changes.push({
                            field: 'Subledger',
                            current: mod.original.isSubledger ? 'Yes' : 'No',
                            new: mod.modified.isSubledger ? 'Yes' : 'No'
                          });
                        }
                        
                        return (
                          <Fragment key={index}>
                            <tr className="bg-gray-50 border-t border-gray-200">
                              <td rowSpan={changes.length > 0 ? changes.length : 1} className="px-3 py-2 align-top">
                                <Checkbox 
                                  id={`mod-account-${index}`}
                                  checked={selectedModifiedAccounts.includes(mod.original.accountCode || mod.original.code)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedModifiedAccounts(prev => [...prev, mod.original.accountCode || mod.original.code]);
                                    } else {
                                      setSelectedModifiedAccounts(prev => 
                                        prev.filter(code => code !== (mod.original.accountCode || mod.original.code))
                                      );
                                    }
                                  }}
                                />
                              </td>
                              <td rowSpan={changes.length > 0 ? changes.length : 1} className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                                {mod.original.accountCode || mod.original.code} - {mod.original.name}
                              </td>
                              {changes.length > 0 ? (
                                <>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {changes[0].field}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {changes[0].current}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-600">
                                    {changes[0].new}
                                  </td>
                                </>
                              ) : (
                                <td colSpan={3} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  No changes detected
                                </td>
                              )}
                            </tr>
                            
                            {/* Additional rows for each change */}
                            {changes.slice(1).map((change, changeIndex) => (
                              <tr key={`${index}-change-${changeIndex}`}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-t border-gray-100">
                                  {change.field}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-t border-gray-100">
                                  {change.current}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-600 border-t border-gray-100">
                                  {change.new}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {changesPreview.removals.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-gray-900">
                    Missing Accounts ({changesPreview.removals.length})
                  </h3>
                  <div className="flex items-center">
                    <Checkbox 
                      id="select-all-removals"
                      checked={changesPreview.removals.every(account => 
                        selectedMissingAccounts.includes(account.accountCode || account.code)
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Select all missing accounts
                          const missingCodes = changesPreview.removals
                            .map(a => a.accountCode || a.code)
                            .filter(code => !selectedMissingAccounts.includes(code));
                          
                          setSelectedMissingAccounts(prev => [...prev, ...missingCodes]);
                        } else {
                          // Deselect all missing accounts
                          const missingCodes = changesPreview.removals.map(a => a.accountCode || a.code);
                          setSelectedMissingAccounts(prev => prev.filter(code => !missingCodes.includes(code)));
                        }
                      }}
                      className="mr-2 h-4 w-4"
                    />
                    <Label htmlFor="select-all-removals" className="text-sm font-medium text-gray-700">
                      Select All
                    </Label>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 mb-2 rounded-md text-sm">
                  <p className="text-gray-500">
                    These accounts exist in your current Chart of Accounts but are not present in the import file.
                    For selected accounts, choose whether to mark them as inactive or delete them.
                  </p>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          Select
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Status
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {changesPreview.removals.map((account, index) => {
                        const accountCode = account.accountCode || account.code;
                        // Check if account has transactions - dummy check for now
                        // This would be replaced with actual logic to check if the account has transactions
                        const hasTransactions = false; // In real implementation, this would be dynamic
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Checkbox 
                                id={`missing-account-${index}`}
                                checked={selectedMissingAccounts.includes(accountCode)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    // When selecting, also set default action to 'inactive'
                                    setSelectedMissingAccounts(prev => [...prev, accountCode]);
                                    if (!missingAccountActions[accountCode]) {
                                      setMissingAccountActions(prev => ({
                                        ...prev,
                                        [accountCode]: 'inactive'
                                      }));
                                    }
                                  } else {
                                    setSelectedMissingAccounts(prev => 
                                      prev.filter(code => code !== accountCode)
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {accountCode}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {account.name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {account.type}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {account.active ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              <Select
                                value={selectedMissingAccounts.includes(accountCode) ? missingAccountActions[accountCode] || 'inactive' : undefined}
                                onValueChange={(value: 'inactive' | 'delete') => {
                                  setMissingAccountActions(prev => ({
                                    ...prev,
                                    [accountCode]: value
                                  }));
                                  
                                  // If selecting an action but account is not selected, also select the account
                                  if (!selectedMissingAccounts.includes(accountCode)) {
                                    setSelectedMissingAccounts(prev => [...prev, accountCode]);
                                  }
                                }}
                                disabled={!selectedMissingAccounts.includes(accountCode)}
                              >
                                <SelectTrigger className="w-36 h-8">
                                  <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="inactive">Mark inactive</SelectItem>
                                  <SelectItem value="delete" disabled={hasTransactions}>Delete</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Import Accounts Selection */}
            <div className="mt-6 border rounded-md p-4 bg-gray-50">
              <h3 className="text-base font-medium text-gray-900 mb-3">Import Options</h3>
              
              <p className="text-sm text-gray-600 mb-3">
                You can select which accounts to import below. Select or deselect checkboxes in each section to customize your import.
              </p>
                
                {/* Account selection statistics */}
                {updateStrategy === 'selected' && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-center">
                      <Info className="h-5 w-5 text-blue-600 mr-2" />
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">
                          {selectedNewAccounts.length + selectedModifiedAccounts.length + selectedMissingAccounts.length}
                        </span> accounts selected for update 
                        (<span className="font-medium">{selectedNewAccounts.length}</span> new, 
                        <span className="font-medium"> {selectedModifiedAccounts.length}</span> modified,
                        <span className="font-medium"> {selectedMissingAccounts.length}</span> missing)
                      </div>
                    </div>
                    
                    <div className="flex mt-2 space-x-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Select all new accounts
                          const newCodes = changesPreview.additions.map(a => a.accountCode || a.code);
                          setSelectedNewAccounts(newCodes);
                          
                          // Select all modified accounts
                          const modCodes = changesPreview.modifications.map(m => m.original.accountCode || m.original.code);
                          setSelectedModifiedAccounts(modCodes);
                          
                          // Select all missing accounts
                          const missCodes = changesPreview.removals.map(a => a.accountCode || a.code);
                          setSelectedMissingAccounts(missCodes);
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedNewAccounts([]);
                          setSelectedModifiedAccounts([]);
                          setSelectedMissingAccounts([]);
                        }}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPreviewDialog(false);
                  setShowImportDialog(true); // Go back to import dialog
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowPreviewDialog(false);
                  handleImportConfirm(); // Proceed with import
                }}
                disabled={importAccounts.isPending || (updateStrategy === 'selected' && 
                  selectedNewAccounts.length === 0 && 
                  selectedModifiedAccounts.length === 0 && 
                  selectedMissingAccounts.length === 0
                )}
              >
                {importAccounts.isPending ? "Importing..." : "Confirm and Import"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Create New Account
            </DialogTitle>
            <DialogDescription>
              Add a new account to your Chart of Accounts.
            </DialogDescription>
          </DialogHeader>
          
          <Form
            schema={accountFormSchema}
            onSubmit={(values) => {
              createAccount.mutate(values);
            }}
            defaultValues={{
              accountCode: "",
              name: "",
              type: "asset" as AccountType,
              subtype: "",
              isSubledger: false,
              subledgerType: "",
              parentId: null,
              description: "",
              active: true,
            }}
            className="space-y-4 py-2"
          >
            {({ register, formState, control }) => (
              <>
                <FormField
                  control={control}
                  name="accountCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 1000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Cash" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asset">Asset</SelectItem>
                          <SelectItem value="liability">Liability</SelectItem>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="subtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtype (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g. Current Asset" 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Account (Optional)</FormLabel>
                      <Select 
                        value={field.value ? String(field.value) : ""} 
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Parent</SelectItem>
                          {accounts && Array.isArray(accounts) && accounts.map((account) => (
                            <SelectItem 
                              key={account.id} 
                              value={String(account.id)}
                            >
                              {account.accountCode} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter a description of this account"
                          value={field.value || ""}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="isSubledger"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Is Subledger</FormLabel>
                        <FormDescription>
                          Check if this account is a subledger account
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="subledgerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subledger Type (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g. Accounts Receivable" 
                          value={field.value || ""}
                          disabled={!formState.getValues().isSubledger}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAccount.isPending || !formState.isValid}
                  >
                    {createAccount.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Account Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) setCurrentAccount(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 mr-2" />
              Edit Account
            </DialogTitle>
            <DialogDescription>
              Modify the selected account details.
            </DialogDescription>
          </DialogHeader>
          
          {currentAccount && (
            <Form
              schema={accountFormSchema}
              onSubmit={(values) => {
                updateAccount.mutate({ id: currentAccount.id, data: values });
              }}
              defaultValues={{
                accountCode: currentAccount.accountCode || "",
                name: currentAccount.name || "",
                type: currentAccount.type || "asset",
                subtype: currentAccount.subtype || "",
                isSubledger: currentAccount.isSubledger || false,
                subledgerType: currentAccount.subledgerType || "",
                parentId: currentAccount.parentId || null,
                description: currentAccount.description || "",
                active: currentAccount.active !== undefined ? currentAccount.active : true,
              }}
              className="space-y-4 py-2"
            >
              {({ register, formState, control }) => (
                <>
                  <FormField
                    control={control}
                    name="accountCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. 1000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Cash" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="asset">Asset</SelectItem>
                            <SelectItem value="liability">Liability</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="subtype"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtype (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g. Current Asset" 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Account (Optional)</FormLabel>
                        <Select 
                          value={field.value ? String(field.value) : ""} 
                          onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No Parent</SelectItem>
                            {accounts && Array.isArray(accounts) && accounts
                              .filter(account => account.id !== currentAccount.id) // Prevent selecting self
                              .map((account) => (
                                <SelectItem 
                                  key={account.id} 
                                  value={String(account.id)}
                                >
                                  {account.accountCode} - {account.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter a description of this account"
                            value={field.value || ""}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="isSubledger"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Is Subledger</FormLabel>
                          <FormDescription>
                            Check if this account is a subledger account
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="subledgerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subledger Type (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g. Accounts Receivable" 
                            value={field.value || ""}
                            disabled={!formState.getValues().isSubledger}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Uncheck to deactivate this account
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setCurrentAccount(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateAccount.isPending || !formState.isValid}
                    >
                      {updateAccount.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Deactivate Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this account? 
              This action can be reversed later by editing the account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            {currentAccount && (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm font-medium">Account details:</div>
                <div className="mt-2">
                  <div><strong>Code:</strong> {currentAccount.accountCode}</div>
                  <div><strong>Name:</strong> {currentAccount.name}</div>
                  <div><strong>Type:</strong> {capitalizeFirstLetter(currentAccount.type)}</div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirm(false);
                setCurrentAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => currentAccount && deactivateAccount.mutate(currentAccount.id)}
              disabled={deactivateAccount.isPending}
            >
              {deactivateAccount.isPending ? "Deactivating..." : "Deactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ChartOfAccounts;