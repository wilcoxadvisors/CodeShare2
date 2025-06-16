import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AccountType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, Trash2, Download, Upload, Plus, FileSpreadsheet, 
  FileText, Info, AlertTriangle, ChevronRight, ChevronDown, ChevronLeft, X
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Account hierarchy interface matching backend AccountTreeNode
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

function ChartOfAccounts() {
  const { selectedClientId } = useEntity();
  const { toast } = useToast();
  

  
  console.log("DEBUG - ChartOfAccounts rendering with context:", {
    selectedClientId,
    timestamp: new Date().toISOString()
  });
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [formTab, setFormTab] = useState("basic");
  const [accountCodePrefix, setAccountCodePrefix] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Define interface for account data
  interface AccountData {
    id: number | null;
    accountCode: string;
    name: string;
    type: string;
    subtype: string;
    isSubledger: boolean;
    subledgerType: string;
    active: boolean;
    description: string;
    parentId: number | null;
  }

  const [accountData, setAccountData] = useState<AccountData>({
    id: null,
    accountCode: "",
    name: "",
    type: "",
    subtype: "",
    isSubledger: false,
    subledgerType: "",
    active: true,
    description: "",
    parentId: null
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{id: number, name: string, accountCode: string} | null>(null);
  // Track if the account has transactions - this affects which fields can be edited
  const [accountHasTransactions, setAccountHasTransactions] = useState<boolean>(false);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importData, setImportData] = useState<Array<Record<string, any>>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Parent account dropdown states
  const [parentAccountSearchQuery, setParentAccountSearchQuery] = useState("");
  const [parentAccountExpandedNodes, setParentAccountExpandedNodes] = useState<Record<number, boolean>>({});
  const [changesPreview, setChangesPreview] = useState<{
    additions: Array<Record<string, any>>;
    modifications: Array<{
      original: Record<string, any>;
      updated: Record<string, any>;
      changes: string[];
    }>;
    removals: Array<Record<string, any>>; // Accounts present in DB but not in import
    unchanged: number;
  }>({ additions: [], modifications: [], removals: [], unchanged: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add pagination state for active and inactive accounts tables
  const [activePagination, setActivePagination] = useState({
    currentPage: 1,
    pageSize: 25
  });
  
  const [inactivePagination, setInactivePagination] = useState({
    currentPage: 1,
    pageSize: 25
  });

  // Get hierarchical account tree data using client-based API
  const { data: accountsTree = { status: "", data: [] }, isLoading, refetch } = useQuery<{ status: string, data: AccountTreeNode[] }>({
    queryKey: ['accounts-tree', selectedClientId],
    enabled: !!selectedClientId
  });
  
  // Fetch clients data for export functionality
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: true
  });
  
  // Debug output for client context and refresh data when client selection changes
  useEffect(() => {
    console.log("DEBUG: Client context in ChartOfAccounts", { 
      selectedClientId,
      time: new Date().toISOString()
    });
    
    // Refetch account data when client changes
    if (selectedClientId) {
      console.log("DEBUG: Triggering account data refetch due to client change", { selectedClientId });
      // Using a small timeout to ensure the client context is fully updated
      setTimeout(() => {
        refetch();
      }, 100);
    }
  }, [selectedClientId, refetch]);
  
  // Extract the actual accounts array from the response
  const accountTreeData = accountsTree?.data || [];
  
  // Debug output to understand the account tree structure
  console.log("DEBUG: Account Tree Data", {
    rawData: accountsTree,
    extractedData: accountTreeData,
    count: accountTreeData.length,
    sample: accountTreeData.length > 0 ? accountTreeData[0] : null,
    clientId: selectedClientId,
    timestamp: new Date().toISOString()
  });
  
  // Extra verification logging for Step 3 display testing
  console.log("VERIFICATION STEP 3: Account Tree Structure", {
    totalNodes: accountTreeData.length,
    rootNodes: accountTreeData.filter(node => !node.parentId).length,
    activeAccounts: accountTreeData.filter(node => node.active).length,
    accountTypeBreakdown: accountTreeData.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    hierarchyDepth: accountTreeData.reduce((maxDepth, node) => {
      // Simple function to check max depth in a tree node
      const getNodeDepth = (node: AccountTreeNode): number => {
        if (!node.children || node.children.length === 0) return 0;
        return 1 + Math.max(...node.children.map(getNodeDepth));
      };
      const nodeDepth = getNodeDepth(node);
      return Math.max(maxDepth, nodeDepth);
    }, 0),
    timestamp: new Date().toISOString()
  });
  
  // State for tracking expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  
  // Update expanded nodes when account tree data changes
  useEffect(() => {
    if (accountTreeData.length > 0) {
      // Create a function to recursively expand all nodes
      const expandAllNodes = (nodes: AccountTreeNode[], result: Record<number, boolean>) => {
        for (const node of nodes) {
          // Set this node as expanded
          result[node.id] = true;
          
          // If it has children, recursively expand them as well
          if (node.children && node.children.length > 0) {
            expandAllNodes(node.children, result);
          }
        }
        return result;
      };
      
      // Create a new expanded nodes object with all nodes expanded
      setExpandedNodes(prev => {
        return expandAllNodes(accountTreeData, { ...prev });
      });
    }
  }, [accountTreeData]);
  
  // Toggle node expansion
  // Toggle node expansion - fixed to properly toggle individual nodes without affecting others
  const toggleNodeExpansion = (nodeId: number) => {
    setExpandedNodes(prev => {
      const newExpandedNodes = { ...prev };
      
      // If node is currently expanded, collapse it
      if (newExpandedNodes[nodeId]) {
        delete newExpandedNodes[nodeId]; // Remove from expanded nodes
      } else {
        // If node is currently collapsed, expand it
        newExpandedNodes[nodeId] = true;
      }
      
      return newExpandedNodes;
    });
  };
  
  // Function to flatten the hierarchical tree into a flat array with depth information
  const flattenAccountTree = (nodes: AccountTreeNode[], depth = 0, result: Array<AccountTreeNode & { depth: number }> = []): Array<AccountTreeNode & { depth: number }> => {
    for (const node of nodes) {
      // Add current node with its depth
      result.push({ ...node, depth });
      
      // If node has children and is expanded, recursively add them with increased depth
      if (expandedNodes[node.id] && node.children && node.children.length > 0) {
        flattenAccountTree(node.children, depth + 1, result);
      }
    }
    return result;
  };
  
  // Create a flattened account list for display, respecting the expanded state
  // The flattened accounts will now be split into active and inactive (deleted) accounts
  const { activeAccounts, inactiveAccounts } = useMemo(() => {
    const allFlattenedAccounts = flattenAccountTree(accountTreeData);
    
    // Split into active and inactive accounts
    const active = allFlattenedAccounts.filter(account => account.active);
    const inactive = allFlattenedAccounts.filter(account => !account.active);
    
    return { 
      activeAccounts: active,
      inactiveAccounts: inactive 
    };
  }, [accountTreeData, expandedNodes]);
  
  // Create a complete account list (all nodes) for searching, ignoring expansion state
  const allAccounts = useMemo(() => {
    // Helper function that flattens the entire tree regardless of expansion state
    const flattenAllAccounts = (nodes: AccountTreeNode[], result: AccountTreeNode[] = []): AccountTreeNode[] => {
      for (const node of nodes) {
        // Add the current node
        result.push(node);
        
        // Always process children, regardless of expanded state
        if (node.children && node.children.length > 0) {
          flattenAllAccounts(node.children, result);
        }
      }
      return result;
    };
    
    return flattenAllAccounts(accountTreeData);
  }, [accountTreeData]);
  
  // Improved filtering for accounts based on search term that preserves hierarchy
  const { filteredActiveAccounts, filteredInactiveAccounts } = useMemo(() => {
    // If no search term, return the original split active and inactive accounts
    if (!searchTerm) {
      return {
        filteredActiveAccounts: activeAccounts,
        filteredInactiveAccounts: inactiveAccounts
      };
    }
    
    // Step 1: Find accounts that match the search criteria (search through ALL accounts)
    const matchingAccountIds = new Set<number>();
    allAccounts.filter(account => {
      const matches = 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.description && account.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (matches) {
        matchingAccountIds.add(account.id);
      }
      return matches;
    });
    
    // Step 2: Find all parent IDs of matching accounts to maintain hierarchy
    const parentMap = new Map<number, number | null>();
    allAccounts.forEach(account => {
      parentMap.set(account.id, account.parentId);
    });
    
    const relevantAccountIds = new Set<number>(matchingAccountIds);
    const parentIdsToExpand = new Set<number>();
    
    // Get all ancestor IDs for each matching account
    matchingAccountIds.forEach(id => {
      let currentParentId = parentMap.get(id);
      while (currentParentId !== null && currentParentId !== undefined) {
        relevantAccountIds.add(currentParentId);
        parentIdsToExpand.add(currentParentId); // Also mark for expansion
        currentParentId = parentMap.get(currentParentId);
      }
    });
    
    // Auto-expand parent nodes when searching
    if (searchTerm.trim() !== '') {
      const newExpandedNodes = { ...expandedNodes };
      parentIdsToExpand.forEach(id => {
        newExpandedNodes[id] = true;
      });
      // Make sure all parent nodes in the path to matching accounts are expanded
      matchingAccountIds.forEach(id => {
        let currentParentId = parentMap.get(id);
        while (currentParentId !== null && currentParentId !== undefined) {
          newExpandedNodes[currentParentId] = true;
          currentParentId = parentMap.get(currentParentId);
        }
      });
      
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        setExpandedNodes(newExpandedNodes);
      }, 0);
    }
    
    // Get all accounts matching the search criteria and filter for active/inactive
    const allMatchingAccounts = flattenAccountTree(accountTreeData).filter(account => 
      relevantAccountIds.has(account.id)
    );
    
    // Split the matching accounts into active and inactive
    return {
      filteredActiveAccounts: allMatchingAccounts.filter(account => account.active),
      filteredInactiveAccounts: allMatchingAccounts.filter(account => !account.active)
    };
  }, [accountTreeData, allAccounts, searchTerm, expandedNodes, activeAccounts, inactiveAccounts]);
  
  // Create a combined list of active and inactive accounts for operations that need all accounts
  const allFlattenedAccounts = useMemo(() => {
    return [...activeAccounts, ...inactiveAccounts];
  }, [activeAccounts, inactiveAccounts]);
  
  // Function to expand all nodes
  const expandAllNodes = () => {
    const expandAll: Record<number, boolean> = {};
    allFlattenedAccounts.forEach(account => {
      expandAll[account.id] = true;
    });
    setExpandedNodes(expandAll);
  };
  
  // Function to collapse all nodes at once
  const collapseAllNodes = () => {
    // Simply reset all expanded nodes to collapse everything at once
    setExpandedNodes({});
    
    // Reset pagination to first page to ensure we see content after collapse
    setActivePagination({
      ...activePagination,
      currentPage: 1
    });
    
    setInactivePagination({
      ...inactivePagination,
      currentPage: 1
    });
    
    // Scroll to top of the account list to ensure UI consistency
    const accountsContainer = document.querySelector('.overflow-x-auto');
    if (accountsContainer) {
      accountsContainer.scrollTop = 0;
    }
  };

  // Auto-generate account code based on type selection
  useEffect(() => {
    if (!isEditMode && accountData.type && selectedClientId) {
      // Define account code prefixes
      const typePrefixes: Record<string, string> = {
        'asset': "1",
        'liability': "2",
        'equity': "3",
        'revenue': "4", 
        'expense': "5" // Base expense prefix
      };
      
      // For expense accounts, use more specific prefixes based on subtype
      let prefix = typePrefixes[accountData.type as keyof typeof typePrefixes] || "";
      if (accountData.type === 'expense' && accountData.subtype) {
        const expensePrefixes: Record<string, string> = {
          'operating_expense': "5",
          'non_operating_expense': "5",
          'cost_of_goods_sold': "5",
          'marketing': "6",
          'rent': "6",
          'payroll': "6",
          'utilities': "7",
          'equipment': "7",
          'professional_services': "7",
          'travel': "8",
          'insurance': "8",
          'taxes': "8",
          'depreciation': "9"
        };
        if (expensePrefixes[accountData.subtype]) {
          prefix = expensePrefixes[accountData.subtype];
        }
      }
      setAccountCodePrefix(prefix);
      
      // Only auto-generate code for new accounts, not when editing
      if (prefix && !accountData.id) {
        // Get accounts of the current type from the flattened account tree
        const accountsOfType = allFlattenedAccounts.filter(account => account.type === accountData.type);
        const existingCodes = accountsOfType
          .map((a: AccountTreeNode) => a.accountCode || a.code) // Support both formats for backward compatibility
          .filter((code: any): code is string => 
            typeof code === 'string' && code.startsWith(prefix)
          )
          .sort();
        
        if (existingCodes.length > 0) {
          const lastCode = existingCodes[existingCodes.length - 1];
          // Since we filtered for valid strings, we know lastCode is defined here
          // but we'll add a check just to satisfy TypeScript
          if (lastCode) {
            const numericPart = parseInt(lastCode.replace(/\D/g, ''));
            const newCode = `${prefix}${String(numericPart + 1).padStart(3, '0')}`;
          
            // Only update if code is empty or doesn't match our format
            if (!accountData.accountCode || !accountData.accountCode.startsWith(prefix)) {
              setAccountData(prev => ({ ...prev, accountCode: newCode }));
            }
          }
        } else {
          // No existing accounts of this type, start with 001
          const newCode = `${prefix}001`;
          
          // Only update if code is empty or doesn't match our format  
          if (!accountData.accountCode || !accountData.accountCode.startsWith(prefix)) {
            setAccountData(prev => ({ ...prev, accountCode: newCode }));
          }
        }
      }
    }
  }, [accountData.type, isEditMode, currentEntity, allFlattenedAccounts]);

  // Custom hook for adding an account
  const useAddAccount = () => {
    return useMutation({
      mutationFn: async (data: AccountData & { clientId: number }) => {
        console.log("VERIFICATION TEST: useAddAccount - Mutate called with:", JSON.stringify(data, null, 2));
        
        // Enhanced validation for clientId
        if (!data.clientId || typeof data.clientId !== 'number' || isNaN(data.clientId) || data.clientId <= 0) {
          console.error("VERIFICATION TEST: useAddAccount - Invalid clientId:", data.clientId, "type:", typeof data.clientId);
          throw new Error(`Invalid client ID: ${data.clientId}. Please select a valid client before creating an account.`);
        }
        
        const url = `/api/clients/${data.clientId}/accounts`;
        console.log("VERIFICATION TEST: useAddAccount - API URL:", url);
        console.log("VERIFICATION TEST: useAddAccount - Prepared data:", JSON.stringify(data, null, 2));
        
        try {
          // Additional logging for the API call
          console.log(`VERIFICATION TEST: useAddAccount - Making POST request to ${url}`);
          
          const result = await apiRequest(url, {
            method: 'POST',
            data
          });
          console.log("VERIFICATION TEST: useAddAccount - API response status: OK");
          console.log("VERIFICATION TEST: useAddAccount - API response data:", JSON.stringify(result, null, 2));
          return result;
        } catch (error: any) { // Explicitly type error as any to handle different properties safely
          console.error("VERIFICATION TEST: useAddAccount - API error:", error);
          console.error("VERIFICATION TEST: useAddAccount - Error message:", error.message);
          console.error("VERIFICATION TEST: useAddAccount - Error name:", error.name);
          
          if (error.response) {
            console.error("VERIFICATION TEST: useAddAccount - API error status:", error.response.status);
            console.error("VERIFICATION TEST: useAddAccount - API error data:", JSON.stringify(error.response.data, null, 2));
            console.error("VERIFICATION TEST: useAddAccount - API error headers:", JSON.stringify(error.response.headers, null, 2));
          }
          
          if (error.request) {
            console.error("VERIFICATION TEST: useAddAccount - Request was made but no response received");
            console.error("VERIFICATION TEST: useAddAccount - Request:", error.request);
          }
          
          throw error;
        }
      },
      onSuccess: (data) => {
        console.log("VERIFICATION TEST: useAddAccount - onSuccess triggered - account created successfully:", JSON.stringify(data, null, 2));
        toast({
          title: "Account created",
          description: "The account has been created successfully.",
        });
        setShowAccountForm(false);
        
        // Invalidate relevant queries to refresh UI
        if (selectedClientId) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts/tree`] });
        }
      },
      onError: (error: any) => {
        console.log("VERIFICATION TEST: useAddAccount - onError triggered:", error);
        toast({
          title: "Error",
          description: `Failed to create account: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };
  
  // Initialize the add account mutation
  const createAccount = useAddAccount();

  const handleNewAccount = () => {
    setAccountData({
      id: null,
      accountCode: "",
      name: "",
      type: "",
      subtype: "",
      isSubledger: false,
      subledgerType: "",
      active: true,
      description: "",
      parentId: null
    });
    setIsEditMode(false);
    setFormTab("basic");
    setShowAccountForm(true);
  };
  
  const handleEditAccount = (account: Record<string, any>) => {
    setAccountData({
      id: account.id,
      accountCode: account.accountCode || account.code, // Fallback for backward compatibility
      name: account.name,
      type: account.type,
      subtype: account.subtype || "",
      isSubledger: account.isSubledger,
      subledgerType: account.subledgerType || "",
      active: account.active,
      description: account.description || "",
      parentId: account.parentId
    });
    setIsEditMode(true);
    setFormTab("basic");
    setShowAccountForm(true);
  };
  
  const handleDeleteClick = (account: Record<string, any>) => {
    setAccountToDelete({
      id: account.id,
      name: account.name,
      accountCode: account.accountCode || account.code // Fallback for backward compatibility
    });
    setShowDeleteConfirm(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    // Special handling for account name standardization
    if (name === 'name' && value.length > 0) {
      // Capitalize first letter of each word and standardize spacing
      const standardizedName = value
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'type') {
      // When account type changes, reset code to trigger auto-generation
      setAccountData(prev => ({
        ...prev,
        [name]: value,
        accountCode: ""  // Will be auto-generated by effect
      }));
    } else {
      setAccountData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCodeManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Keep the type prefix intact when manually editing
    if (accountCodePrefix && !value.startsWith(accountCodePrefix)) {
      setAccountData(prev => ({
        ...prev,
        accountCode: accountCodePrefix + value.replace(/^\D+/g, '')
      }));
    } else {
      setAccountData(prev => ({
        ...prev,
        accountCode: value
      }));
    }
  };

  // Custom hook for updating an account
  const useUpdateAccount = () => {
    return useMutation({
      mutationFn: async (data: AccountData & { clientId: number, id: number, hasTransactions?: boolean }) => {
        console.log("DEBUG: useUpdateAccount - Mutate called with:", JSON.stringify(data, null, 2));
        
        // SECURITY: Filter out accountCode and type fields before sending to server
        // This ensures these restricted fields can never be sent even if they somehow
        // made it into the data object
        const { accountCode, type, ...filteredData } = data;
        
        // Only include these fields if explicitly requested via the hasTransactions flag
        // This way we never accidentally send these fields when they shouldn't be updated
        const dataToSend = data.hasTransactions === false 
          ? { ...filteredData, accountCode, type } // Only include when explicitly allowed
          : filteredData; // Otherwise exclude them
        
        console.log("DEBUG: useUpdateAccount - Filtered data to send:", JSON.stringify(dataToSend, null, 2));
        
        try {
          const response = await apiRequest(
            `/api/clients/${data.clientId}/accounts/${data.id}`, 
            {
              method: 'PUT',
              data: dataToSend
            }
          );
          console.log("DEBUG: useUpdateAccount - API response:", response);
          return response;
        } catch (error: any) {
          console.error("DEBUG: useUpdateAccount - API error response:", error);
          // Log the response body if available
          if (error.response) {
            try {
              const errorBody = await error.response.text();
              console.error("DEBUG: useUpdateAccount - Error response body:", errorBody);
            } catch (e) {
              console.error("DEBUG: useUpdateAccount - Could not read error response body");
            }
          }
          throw error;
        }
      },
      onSuccess: (data) => {
        console.log("DEBUG: useUpdateAccount - onSuccess triggered", data);
        toast({
          title: "Account updated",
          description: "The account has been updated successfully.",
        });
        setShowAccountForm(false);
        
        // Invalidate relevant queries to refresh UI
        if (selectedClientId) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts/tree`] });
        }
      },
      onError: (error: Error) => {
        console.log("DEBUG: useUpdateAccount - onError triggered:", error);
        toast({
          title: "Error",
          description: `Failed to update account: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };
  
  // Initialize the update account mutation
  const updateAccount = useUpdateAccount();
  
  // Custom hook for deleting an account
  const useDeleteAccount = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        console.log("DEBUG: useDeleteAccount - Mutate called with id:", id);
        if (!currentEntity?.clientId) {
          console.log("DEBUG: useDeleteAccount - Error: No client selected");
          throw new Error("No client selected");
        }
        console.log(`DEBUG: useDeleteAccount - Sending DELETE to /api/clients/${currentEntity.clientId}/accounts/${id}`);
        return await apiRequest(
          `/api/clients/${currentEntity.clientId}/accounts/${id}`, 
          {
            method: 'DELETE'
          }
        );
      },
      onSuccess: (data) => {
        console.log("DEBUG: useDeleteAccount - onSuccess triggered", data);
        toast({
          title: "Account deleted",
          description: "The account has been deleted successfully.",
        });
        
        // Close all open dialogs
        setShowDeleteConfirm(false);
        setAccountToDelete(null);
        setShowAccountForm(false); // Close the edit dialog too
        
        // Invalidate relevant queries to refresh UI
        if (selectedClientId) {
          console.log(`DEBUG: useDeleteAccount - Invalidating queries for clientId: ${selectedClientId}`);
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts/tree`] });
        }
      },
      onError: (error: any) => {
        console.log("DEBUG: useDeleteAccount - onError triggered:", error);
        if (error.response?.data?.canDeactivate) {
          // Show option to deactivate instead
          toast({
            title: "Cannot delete account",
            description: "This account is used in journal entries and cannot be deleted. You can deactivate it instead.",
          });
          
          setShowDeleteConfirm(false);
          // Show deactivation dialog if we have the account details
          if (accountToDelete) {
            setAccountData({
              id: accountToDelete.id,
              accountCode: accountToDelete.accountCode,
              name: accountToDelete.name,
              type: "",  // Will be filled when fetching account details
              subtype: "",
              isSubledger: false,
              subledgerType: "",
              active: false,  // Set to inactive
              description: "",
              parentId: null // Will be updated when fetching account details
            });
            
            // Get full account details before showing the form
            apiRequest(`/api/clients/${currentEntity?.clientId}/accounts/${accountToDelete.id}`)
              .then((accountDetails: any) => {
                setAccountData(prev => ({
                  ...prev,
                  type: accountDetails.type,
                  subtype: accountDetails.subtype || "",
                  isSubledger: accountDetails.isSubledger,
                  subledgerType: accountDetails.subledgerType || "",
                  description: accountDetails.description || "",
                  parentId: accountDetails.parentId
                }));
                setIsEditMode(true);
                setFormTab("basic");
                setShowAccountForm(true);
              })
              .catch(fetchError => {
                console.error("Error fetching account details:", fetchError);
                toast({
                  title: "Error",
                  description: "Could not fetch account details for deactivation",
                  variant: "destructive",
                });
              });
          }
        } else {
          toast({
            title: "Error",
            description: `Failed to delete account: ${error.message}`,
            variant: "destructive",
          });
        }
      }
    });
  };
  
  // Initialize the delete account mutation
  const deleteAccount = useDeleteAccount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation that a client is selected with detailed logging
    console.log("VERIFICATION TEST - handleSubmit - Client validation:", { 
      currentEntity, 
      selectedClientId,
      selectedClientId,
      selectedClientIdType: typeof selectedClientId
    });
    
    if (!selectedClientId) {
      console.error("VERIFICATION TEST - handleSubmit - No client ID available");
      toast({
        title: "Client required",
        description: "Please select a client from the header dropdown first.",
        variant: "destructive"
      });
      return;
    }
    
    if (typeof selectedClientId !== 'number' || isNaN(selectedClientId) || selectedClientId <= 0) {
      console.error("VERIFICATION TEST - handleSubmit - Invalid client ID:", selectedClientId);
      toast({
        title: "Invalid client",
        description: "The selected client appears to be invalid. Please try selecting a different client.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!accountData.name || !accountData.accountCode || !accountData.type) {
      console.error("VERIFICATION TEST - handleSubmit - Missing required fields:", { 
        name: accountData.name, 
        accountCode: accountData.accountCode,
        type: accountData.type
      });
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (Account Code, Name, and Type).",
        variant: "destructive"
      });
      return;
    }
    
    console.log("VERIFICATION TEST - handleSubmit - All form validations passed, preparing to submit account");
    
    // Create a copy of the data to submit
    // Create a copy of the data to submit with proper TypeScript type narrowing
    const submitData = {
      ...accountData,
      // Ensure parentId is either null or a valid number
      parentId: accountData.parentId === null || accountData.parentId === undefined ? null : 
                typeof accountData.parentId === 'string' ? parseInt(accountData.parentId, 10) : accountData.parentId
    };
    
    console.log("DEBUG - handleSubmit - parentId before:", accountData.parentId, "type:", typeof accountData.parentId);
    console.log("DEBUG - handleSubmit - parentId after:", submitData.parentId, "type:", typeof submitData.parentId);
    
    console.log("DEBUG - handleSubmit - Submitting account data:", {
      clientId: selectedClientId,
      submitData,
      isEditMode
    });
    
    try {
      if (isEditMode && submitData.id !== null) {
        // For edit mode, ensure we have a valid ID and it's not null
        
        // Fetch the original account data to compare what actually changed
        apiRequest(`/api/clients/${selectedClientId}/accounts/${submitData.id}`)
          .then((originalAccountData: any) => {
            console.log('DEBUG CoA Update: Original account data:', JSON.stringify(originalAccountData, null, 2));
            
            // First check if the account has transactions
            apiRequest(`/api/clients/${selectedClientId}/accounts/transactions-check/${submitData.id}`)
              .then((transactionCheckResult: any) => {
                console.log('DEBUG CoA Update: Transaction check result:', JSON.stringify(transactionCheckResult, null, 2));
                
                const hasTransactions = transactionCheckResult && transactionCheckResult.hasTransactions;
                setAccountHasTransactions(hasTransactions);
                
                // Create a base update object with required fields
                const baseUpdateData = {
                  id: submitData.id as number,
                  clientId: selectedClientId,
                };
                
                // Only include fields that were actually changed
                const changedFields: Record<string, any> = {};
                
                // Check each field to see if it was modified
                if (submitData.name !== originalAccountData.name) {
                  changedFields.name = submitData.name;
                }
                
                if (submitData.active !== originalAccountData.active) {
                  changedFields.active = submitData.active;
                }
                
                if (submitData.description !== originalAccountData.description) {
                  changedFields.description = submitData.description;
                }
                
                if (submitData.parentId !== originalAccountData.parentId) {
                  changedFields.parentId = submitData.parentId;
                }
                
                // These fields are more restrictive, only include them if:
                // 1. They were actually changed
                // 2. The account doesn't have transactions
                
                // CRITICAL: Accounts with transactions can NEVER update accountCode or type
                // Even if they somehow appear to have changed (which they shouldn't when fields are disabled)
                if (!hasTransactions) {
                  // Only check if these changed if the account doesn't have transactions
                  if (submitData.accountCode !== originalAccountData.accountCode) {
                    changedFields.accountCode = submitData.accountCode;
                  }
                  
                  if (submitData.type !== originalAccountData.type) {
                    changedFields.type = submitData.type;
                  }
                } else {
                  // For accounts with transactions, NEVER include accountCode and type in the update
                  // Not only should we exclude them when they change, we should ensure they're NEVER in the payload
                  console.log('DEBUG CoA Update: Account has transactions - EXCLUDING accountCode and type from update payload');
                }
                
                if (submitData.subtype !== originalAccountData.subtype) {
                  changedFields.subtype = submitData.subtype;
                }
                
                if (submitData.isSubledger !== originalAccountData.isSubledger) {
                  changedFields.isSubledger = submitData.isSubledger;
                }
                
                if (submitData.subledgerType !== originalAccountData.subledgerType) {
                  changedFields.subledgerType = submitData.subledgerType;
                }
                
                // Combine base fields with changed fields
                const updateData = {
                  ...baseUpdateData,
                  ...changedFields
                };
                
                // Add detailed logging for debugging the account update payload
                console.log('DEBUG CoA Update: Changed fields only:', JSON.stringify(changedFields, null, 2));
                console.log('DEBUG CoA Update: Final payload sent to API:', JSON.stringify(updateData, null, 2));
                
                if (Object.keys(changedFields).length === 0) {
                  console.log('DEBUG CoA Update: No fields have changed, skipping update');
                  toast({
                    title: "No Changes",
                    description: "No fields have been changed to update.",
                  });
                  setShowAccountForm(false);
                  return;
                }
                
                // Use the previously constructed updateData which properly merges baseUpdateData with changedFields
                // and ensures consistency between what we log and what we actually send
                
                // Critical debug log as requested
                console.log('CRITICAL DEBUG: Final FE Payload Sent:', JSON.stringify(updateData, null, 2));
                
                // Add hasTransactions flag to ensure our mutation function handles it properly
                const updateDataWithFlags = {
                  ...updateData,
                  hasTransactions // Pass the transactions flag to our mutation function
                };
                
                // Cast to any to bypass TypeScript's requirement for all AccountData fields
                // This is safe because we know the server only processes the fields we send
                updateAccount.mutate(updateDataWithFlags as any);
              })
              .catch(txCheckError => {
                console.error('DEBUG CoA Update: Error checking if account has transactions:', txCheckError);
                // Even if the transaction check fails, try to do the update with the non-restricted fields
                // Create a safer version of changedFields by filtering out restricted fields
                // even though we don't know for sure if the account has transactions
                const safeChangedFields: Record<string, any> = {};
                
                // Include only non-restricted fields in the safe update
                if (submitData.name !== originalAccountData.name) {
                  safeChangedFields.name = submitData.name;
                }
                if (submitData.active !== originalAccountData.active) {
                  safeChangedFields.active = submitData.active;
                }
                if (submitData.description !== originalAccountData.description) {
                  safeChangedFields.description = submitData.description;
                }
                if (submitData.parentId !== originalAccountData.parentId) {
                  safeChangedFields.parentId = submitData.parentId;
                }
                if (submitData.subtype !== originalAccountData.subtype) {
                  safeChangedFields.subtype = submitData.subtype;
                }
                if (submitData.isSubledger !== originalAccountData.isSubledger) {
                  safeChangedFields.isSubledger = submitData.isSubledger;
                }
                if (submitData.subledgerType !== originalAccountData.subledgerType) {
                  safeChangedFields.subledgerType = submitData.subledgerType;
                }
                
                // Create a base update object with required fields (the same as used in the success path)
                const baseUpdateData = {
                  id: submitData.id as number,
                  clientId: selectedClientId,
                };
                
                // Combine base fields with changed fields
                const safeUpdateData = {
                  ...baseUpdateData,
                  ...safeChangedFields
                };
                // Note: accountCode and type are intentionally omitted to be safe
                
                console.log('DEBUG CoA Update: Using safe update data due to transaction check error:', 
                           JSON.stringify(safeUpdateData, null, 2));
                // Critical debug log as requested
                console.log('CRITICAL DEBUG: Final FE Payload Sent:', JSON.stringify(safeUpdateData, null, 2));
                
                // Add hasTransactions flag = true as a safe fallback
                const safeUpdateDataWithFlags = {
                  ...safeUpdateData,
                  hasTransactions: true // Assume account has transactions to be safe in error case
                };
                
                // Cast to any to bypass TypeScript's requirement for all AccountData fields
                // This is safe because we know the server only processes the fields we send
                updateAccount.mutate(safeUpdateDataWithFlags as any);
              });
          })
          .catch(error => {
            console.error('DEBUG CoA Update: Error fetching original account data:', error);
            toast({
              title: "Error",
              description: "Could not fetch original account data to determine changes",
              variant: "destructive"
            });
          });
      } else {
        // For create mode
        console.log("VERIFICATION TEST - handleSubmit - Creating new account with data:", JSON.stringify({
          ...submitData,
          clientId: selectedClientId
        }, null, 2));
        
        createAccount.mutate({
          ...submitData,
          clientId: selectedClientId
        });
      }
    } catch (error) {
      console.error("DEBUG - handleSubmit - Error during mutation call:", error);
      toast({
        title: "Submission error",
        description: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      console.log("DEBUG: handleDeleteConfirm - Calling delete mutation with account ID:", accountToDelete.id);
      console.log("DEBUG: handleDeleteConfirm - Full account object:", accountToDelete);
      
      // Close all dialogs immediately to prevent further user interaction
      setShowDeleteConfirm(false);
      setShowAccountForm(false);
      
      // Call the delete mutation with the account ID directly
      deleteAccount.mutate(accountToDelete.id);
      
      // Immediately show a toast that deletion is in progress
      toast({
        title: "Account deletion in progress",
        description: "The account is being deleted, please wait...",
      });
    } else {
      console.error("DEBUG: handleDeleteConfirm - No account selected for deletion");
    }
  };
  
  // Excel export functionality
  // Function to fetch all accounts for export (not just visible ones)
  const fetchAllAccountsForExport = async () => {
    if (!selectedClientId) {
      toast({
        title: "No client selected",
        description: "Please select a client to export accounts.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      // Use the regular accounts API to get all accounts for the client
      const response = await fetch(`/api/clients/${selectedClientId}/accounts`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts for export: ${response.status} ${response.statusText}`);
      }
      
      const allAccounts = await response.json();
      console.log(`DEBUG: Export - Retrieved ${allAccounts?.length || 0} accounts from the server`);
      return allAccounts;
    } catch (error) {
      console.error("Error fetching accounts for export:", error);
      toast({
        title: "Export failed",
        description: `Error fetching accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return null;
    }
  };
  
  const handleExportToExcel = async () => {
    // First check if we have accounts in the current view
    if (!Array.isArray(allFlattenedAccounts) || allFlattenedAccounts.length === 0) {
      toast({
        title: "No accounts to export",
        description: "Please add accounts to the chart of accounts before exporting.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Show loading toast
      toast({
        title: "Preparing export",
        description: "Generating your Excel file...",
      });
      
      // Fetch all accounts including hidden ones
      const allAccounts = await fetchAllAccountsForExport();
      
      if (!allAccounts || !Array.isArray(allAccounts)) {
        throw new Error("Failed to retrieve accounts for export");
      }
      
      console.log(`DEBUG: Export - Retrieved ${allAccounts.length} accounts for export`);
      
      // Build a map of account IDs to account objects for parent lookup
      const accountMap = new Map();
      allAccounts.forEach((account: any) => {
        accountMap.set(account.id, account);
      });
      
      // Prepare data for export with enhanced parent information
      const exportData = allAccounts.map((account: any) => {
        // Find parent account details if parentId exists
        const parentAccount = account.parentId ? accountMap.get(account.parentId) : null;
        
        return {
          Code: account.accountCode || account.code, // Support both formats for backward compatibility
          Name: account.name,
          Type: account.type,
          Subtype: account.subtype || '',
          IsSubledger: account.isSubledger ? 'Yes' : 'No',
          SubledgerType: account.subledgerType || '',
          Active: account.active ? 'Yes' : 'No',
          Description: account.description || '',
          ParentId: account.parentId || '',
          ParentCode: parentAccount ? (parentAccount.accountCode || parentAccount.code) : '', // Support both formats
          ParentName: parentAccount ? parentAccount.name : ''
        };
      });
      
      // Sort by account code for better organization
      exportData.sort((a: any, b: any) => a.Code.localeCompare(b.Code));
      
      // Create worksheet with styled headers
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Column widths for better readability
      const columnWidths = [
        { wch: 10 },  // Code
        { wch: 30 },  // Name
        { wch: 15 },  // Type
        { wch: 20 },  // Subtype
        { wch: 12 },  // IsSubledger
        { wch: 20 },  // SubledgerType
        { wch: 10 },  // Active
        { wch: 40 },  // Description
        { wch: 10 },  // ParentId
        { wch: 10 },  // ParentCode
        { wch: 30 }   // ParentName
      ];
      
      worksheet['!cols'] = columnWidths;
      
      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts");
      
      // Generate filename with entity name and current date
      const date = new Date().toISOString().split('T')[0];
      // Get entity name from the selected client context
      let entityName = 'Entity';
      if (currentEntity?.name) {
        entityName = currentEntity.name;
      } else if (selectedClientId && Array.isArray(clients)) {
        const client = clients.find((c: any) => c.id === selectedClientId);
        if (client?.name) {
          entityName = client.name;
        }
      }
      const fileName = `${entityName}_ChartOfAccounts_${date}.xlsx`;
      
      // Download the file
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Export successful",
        description: `Chart of accounts exported as ${fileName}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: `Error exporting chart of accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  // Create template for import
  const handleGenerateTemplate = () => {
    try {
      // If we have accounts data, use it for the template
      // Otherwise use sample data
      let templateData = [];
      
      // Create template headers matching the export format
      const templateHeaders = [
        "Code", "Name", "Type", "Subtype", "IsSubledger", "SubledgerType", "Active", "Description", 
        "ParentId", "ParentCode", "ParentName"
      ];
      
      // Flatten the accounts tree to get all accounts
      const flatAccounts: AccountTreeNode[] = [];
      
      const flattenTree = (nodes: AccountTreeNode[]) => {
        for (const node of nodes) {
          flatAccounts.push(node);
          if (node.children && node.children.length > 0) {
            flattenTree(node.children);
          }
        }
      };
      
      // Only process if we have data and the tree is valid
      if (accountsTree && accountsTree.data && accountsTree.data.length > 0) {
        // Flatten the tree to get all accounts
        flattenTree(accountsTree.data);
        
        console.log("DEBUG: Using existing accounts data for template, count:", flatAccounts.length);
        
        // Map the actual account data to the template format
        templateData = flatAccounts.map((account: AccountTreeNode) => {
          // Find parent account if it exists
          const parent = account.parentId ? 
            flatAccounts.find((a: AccountTreeNode) => a.id === account.parentId) : null;
          
          return {
            Code: account.accountCode || account.code, // Support both formats for backward compatibility
            Name: account.name,
            Type: account.type,
            Subtype: account.subtype || "",
            IsSubledger: account.isSubledger ? "Yes" : "No",
            SubledgerType: account.subledgerType || "",
            Active: account.active ? "Yes" : "No",
            Description: account.description || "",
            ParentId: account.parentId ? String(account.parentId) : "",
            ParentCode: parent ? (parent.accountCode || parent.code) : "", // Support both formats
            ParentName: parent ? parent.name : ""
          };
        });
      } else {
        console.log("DEBUG: Using sample data for template - no accounts data available");
        // Create sample data (one row per account type) with consistent parent relationship examples
        
        // Create a temporary map structure to simulate real database relationships
        const rootAccounts = [
          { 
            tempId: 1001, // Synthetic ID just for relationship example
            Code: "1000", 
            Name: "Assets", 
            Type: "asset", 
            Subtype: "current_asset", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "All company assets", 
            ParentId: "",
            ParentCode: "",
            ParentName: ""
          },
          { 
            tempId: 2001,
            Code: "2000", 
            Name: "Liabilities", 
            Type: "liability", 
            Subtype: "current_liability", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "All company liabilities", 
            ParentId: "",
            ParentCode: "",
            ParentName: ""
          },
          { 
            tempId: 3001,
            Code: "3000", 
            Name: "Equity", 
            Type: "equity", 
            Subtype: "", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "Owner's equity", 
            ParentId: "",
            ParentCode: "",
            ParentName: ""
          },
          { 
            tempId: 4001,
            Code: "4000", 
            Name: "Revenue", 
            Type: "revenue", 
            Subtype: "", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "Income from operations", 
            ParentId: "",
            ParentCode: "",
            ParentName: ""
          },
          { 
            tempId: 5001,
            Code: "5000", 
            Name: "Expenses", 
            Type: "expense", 
            Subtype: "", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "Company expenses", 
            ParentId: "",
            ParentCode: "",
            ParentName: ""
          }
        ];
        
        const childAccounts = [
          { 
            Code: "1001", 
            Name: "Cash", 
            Type: "asset", 
            Subtype: "current_asset", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "Cash on hand", 
            ParentId: "1001", // Reference to Assets tempId
            ParentCode: "1000",
            ParentName: "Assets"
          },
          { 
            Code: "1002", 
            Name: "Bank Accounts", 
            Type: "asset", 
            Subtype: "current_asset", 
            IsSubledger: "Yes", 
            SubledgerType: "bank", 
            Active: "Yes", 
            Description: "Company bank accounts", 
            ParentId: "1001", // Reference to Assets tempId
            ParentCode: "1000",
            ParentName: "Assets"
          },
          { 
            Code: "2001", 
            Name: "Accounts Payable", 
            Type: "liability", 
            Subtype: "current_liability", 
            IsSubledger: "No", 
            SubledgerType: "", 
            Active: "Yes", 
            Description: "Short-term debt", 
            ParentId: "2001", // Reference to Liabilities tempId
            ParentCode: "2000",
            ParentName: "Liabilities"
          },
          {
            Code: "5001",
            Name: "Operating Expenses",
            Type: "expense",
            Subtype: "",
            IsSubledger: "No",
            SubledgerType: "",
            Active: "Yes",
            Description: "Day-to-day operational expenses",
            ParentId: "5001", // Reference to Expenses tempId
            ParentCode: "5000",
            ParentName: "Expenses"
          }
        ];
        
        // Combine root and child accounts for the template
        // Remove the temporary IDs from the root accounts before outputting
        templateData = [
          ...rootAccounts.map(root => {
            // Create a new object without the tempId property
            const { tempId, ...accountWithoutTempId } = root;
            return accountWithoutTempId;
          }),
          ...childAccounts
        ];
      }
      
      // First create a worksheet with only the headers
      const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders]);
      
      // Then add the data starting at the second row
      XLSX.utils.sheet_add_json(worksheet, templateData, { 
        origin: "A2",
        skipHeader: true 
      });
      
      // Column widths for better readability
      const columnWidths = [
        { wch: 10 },  // Code
        { wch: 30 },  // Name
        { wch: 15 },  // Type
        { wch: 20 },  // Subtype
        { wch: 12 },  // IsSubledger
        { wch: 20 },  // SubledgerType
        { wch: 10 },  // Active
        { wch: 40 },  // Description
        { wch: 10 },  // ParentId
        { wch: 10 },  // ParentCode
        { wch: 30 }   // ParentName
      ];
      
      worksheet['!cols'] = columnWidths;
      
      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      
      // Generate filename with entity name and current date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `ChartOfAccounts_Template_${date}.xlsx`;
      
      // Download the file
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Template generated",
        description: "Chart of accounts template has been downloaded. Fill in your accounts and use the Import function when ready.",
      });
    } catch (error) {
      console.error("Template generation error:", error);
      toast({
        title: "Template generation failed",
        description: `Error creating template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        
        if (fileType === 'csv') {
          // Process CSV file
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors && results.errors.length > 0) {
                console.error("CSV parsing errors:", results.errors);
                
                // Format the error message
                const errorMessage = results.errors.length === 1 
                  ? `Error parsing CSV file: ${results.errors[0].message}`
                  : `Error parsing CSV file: ${results.errors.length} errors found. First error: ${results.errors[0].message}`;
                
                toast({
                  title: "Import failed",
                  description: errorMessage,
                  variant: "destructive",
                });
                return;
              }
              
              // Validate and process the data
              validateAndProcessImportData(results.data);
            },
            error: (error: any) => {
              console.error("Error parsing CSV:", error);
              toast({
                title: "Import failed",
                description: `Error parsing CSV file: ${error.message || 'Unknown parsing error'}`,
                variant: "destructive",
              });
            }
          });
        } else {
          // Process Excel file
          // Ensure content is not undefined before using XLSX.read
          if (content) {
            const workbook = XLSX.read(content, { type: 'binary' });
            
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const data = XLSX.utils.sheet_to_json(worksheet);
            
            // Validate and process data
            validateAndProcessImportData(data);
          } else {
            throw new Error('Failed to read Excel file: File content is empty');
          }
        }
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "Import failed",
          description: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Import failed",
        description: "Failed to read the file. Please check the file format.",
        variant: "destructive",
      });
    };
    
    if (fileType === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };
  
  // Validate and process import data
  const validateAndProcessImportData = (data: any[]) => {
    if (!data || data.length === 0) {
      toast({
        title: "Import failed",
        description: "The file contains no data. Please check the file content.",
        variant: "destructive",
      });
      return;
    }
    
    // Flatten the accounts tree to get all accounts (for parent resolution)
    const flatAccounts: AccountTreeNode[] = [];
    
    const flattenTree = (nodes: AccountTreeNode[]) => {
      for (const node of nodes) {
        flatAccounts.push(node);
        if (node.children && node.children.length > 0) {
          flattenTree(node.children);
        }
      }
    };
    
    if (accountsTree && accountsTree.data) {
      flattenTree(accountsTree.data);
    }
    
    // Map of codes to account IDs for parent resolution
    const codeToIdMap = new Map<string, number>();
    flatAccounts.forEach(account => {
      // Use accountCode for consistency with backend schema
      const accountIdentifier = account.accountCode;
      // Only add to map if we have a valid string identifier
      if (accountIdentifier && typeof accountIdentifier === 'string') {
        codeToIdMap.set(accountIdentifier, account.id);
      }
    });
    
    // Validate required fields
    const errors: string[] = [];
    const processedData = data.map((row, index) => {
      const rowNum = index + 2; // +2 for Excel row number (1-based + header row)
      const validatedRow: {
        accountCode: string;
        name: string;
        type: string;
        subtype: string | null;
        isSubledger: boolean;
        subledgerType: string | null;
        active: boolean;
        description: string | null;
        parentId?: number | null;
      } = {
        accountCode: (row.AccountCode || row.Code)?.toString().trim(),
        name: row.Name?.toString().trim(),
        type: row.Type?.toString().toLowerCase().trim(),
        subtype: row.Subtype?.toString().trim() || null,
        isSubledger: row.IsSubledger?.toString().toUpperCase() === 'YES',
        subledgerType: row.SubledgerType?.toString().trim() || null,
        active: row.Active?.toString().toUpperCase() !== 'NO', // Default to active if not specified
        description: row.Description?.toString().trim() || null,
        parentId: null // Default to no parent
      };
      
      // Resolve parent account from ParentId, ParentCode, or both
      if (row.ParentId) {
        // If numeric ID is provided, use it directly
        const parentId = parseInt(row.ParentId, 10);
        if (!isNaN(parentId)) {
          validatedRow.parentId = parentId;
        }
      } else if (row.ParentCode) {
        // If parent code is provided, look up its ID
        const parentCode = row.ParentCode?.toString().trim();
        if (parentCode && codeToIdMap.has(parentCode)) {
          validatedRow.parentId = codeToIdMap.get(parentCode) || null;
        }
      }
      
      // Validate required fields
      if (!validatedRow.accountCode) {
        errors.push(`Row ${rowNum}: Account Code is required`);
      }
      
      if (!validatedRow.name) {
        errors.push(`Row ${rowNum}: Name is required`);
      }
      
      // Validate account type is one of the allowed values
      const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
      if (!validatedRow.type || !validTypes.includes(validatedRow.type)) {
        errors.push(`Row ${rowNum}: Invalid account type. Must be one of: ${validTypes.join(', ')}`);
      }
      
      return validatedRow;
    });
    
    // If validation errors, show them
    if (errors.length > 0) {
      setImportErrors(errors);
      setImportData([]);
      setShowImportDialog(true);
      return;
    } 
    
    // No validation errors, prepare for preview
    setImportData(processedData);
    setImportErrors([]);
    
    // Generate preview with change detection
    generateChangePreview(processedData);
  };
  
  // Compare imported data with existing accounts to detect changes
  const generateChangePreview = (importData: Array<Record<string, any>>) => {
    // Flatten the accounts tree to get a list of all accounts
    const flatAccounts: AccountTreeNode[] = [];
    
    const flattenTree = (nodes: AccountTreeNode[]) => {
      for (const node of nodes) {
        flatAccounts.push(node);
        if (node.children && node.children.length > 0) {
          flattenTree(node.children);
        }
      }
    };
    
    if (accountsTree && accountsTree.data) {
      flattenTree(accountsTree.data);
    }
    
    const additions: Array<Record<string, any>> = [];
    const modifications: Array<{
      original: Record<string, any>;
      updated: Record<string, any>;
      changes: string[];
    }> = [];
    
    // Process each imported account
    importData.forEach(importedAccount => {
      // Try to find matching account using multiple strategies:
      // 1. First try to match by ID if available in the import data (most reliable)
      // 2. Then try matching by accountCode (for backward compatibility)
      let existingAccount = null;
      
      // Check if we have an ID in the imported data
      if (importedAccount.id) {
        const importedId = parseInt(importedAccount.id, 10);
        if (!isNaN(importedId) && importedId > 0) {
          existingAccount = flatAccounts.find(acc => acc.id === importedId);
          console.log(`Matching by ID ${importedId} - match found: ${Boolean(existingAccount)}`);
        }
      }
      
      // If no match by ID, try to match by accountCode
      if (!existingAccount) {
        existingAccount = flatAccounts.find(acc => 
          acc.accountCode && acc.accountCode.toLowerCase() === importedAccount.accountCode.toLowerCase()
        );
        console.log(`Matching by accountCode ${importedAccount.accountCode} - match found: ${Boolean(existingAccount)}`);
      }
      
      if (!existingAccount) {
        // New account
        additions.push(importedAccount);
      } else {
        // Check for modifications in existing account
        const changes: string[] = [];
        
        // Check each field for changes, starting with accountCode
        const existingCode = existingAccount.accountCode || '';
        if (importedAccount.accountCode !== existingCode) {
          changes.push(`Account Code: "${existingCode}" → "${importedAccount.accountCode}"`);
        }
        
        if (importedAccount.name !== existingAccount.name) {
          changes.push(`Name: "${existingAccount.name}" → "${importedAccount.name}"`);
        }
        
        if (importedAccount.type !== existingAccount.type) {
          changes.push(`Type: "${existingAccount.type}" → "${importedAccount.type}"`);
        }
        
        if (importedAccount.subtype !== (existingAccount.subtype || null)) {
          changes.push(`Subtype: "${existingAccount.subtype || 'None'}" → "${importedAccount.subtype || 'None'}"`);
        }
        
        if (importedAccount.isSubledger !== existingAccount.isSubledger) {
          changes.push(`Is Subledger: "${existingAccount.isSubledger ? 'Yes' : 'No'}" → "${importedAccount.isSubledger ? 'Yes' : 'No'}"`);
        }
        
        if (importedAccount.subledgerType !== (existingAccount.subledgerType || null)) {
          changes.push(`Subledger Type: "${existingAccount.subledgerType || 'None'}" → "${importedAccount.subledgerType || 'None'}"`);
        }
        
        if (importedAccount.active !== existingAccount.active) {
          changes.push(`Active: "${existingAccount.active ? 'Yes' : 'No'}" → "${importedAccount.active ? 'Yes' : 'No'}"`);
        }
        
        if (importedAccount.description !== (existingAccount.description || null)) {
          changes.push(`Description: "${existingAccount.description || 'None'}" → "${importedAccount.description || 'None'}"`);
        }
        
        // Check for ParentId changes - handle both camelCase and PascalCase field names
        const importedParentId = importedAccount.parentId || importedAccount.ParentId;
        const existingParentId = existingAccount.parentId;
        
        // Special handling for null/undefined comparison - only show as a change if one is null and the other isn't
        const bothParentIdsNull = (importedParentId === null || importedParentId === undefined) && 
                                  (existingParentId === null || existingParentId === undefined);
        
        // Only show as a change if they're different AND not both null/undefined
        if (importedParentId !== existingParentId && !bothParentIdsNull) {
          changes.push(`Parent ID: "${existingParentId || 'None'}" → "${importedParentId || 'None'}"`);
        }
        
        // Check for ParentCode changes - handle both camelCase and PascalCase field names
        const importedParentCode = importedAccount.ParentCode;
        // Get parent code indirectly since it's not directly on the AccountTreeNode type
        // Use the existing parentId reference from above
        const existingParentAccount = existingParentId ? allAccounts.find(a => a.id === existingParentId) : null;
        const existingParentCode = existingParentAccount ? existingParentAccount.accountCode : null;
        
        // Special handling for null/undefined comparison
        const bothParentCodesNull = (importedParentCode === null || importedParentCode === undefined) && 
                                    (existingParentCode === null || existingParentCode === undefined);
        
        // Only show as a change if they're different AND not both null/undefined
        if ((importedParentCode || null) !== existingParentCode && !bothParentCodesNull) {
          changes.push(`Parent Code: "${existingParentCode || 'None'}" → "${importedParentCode || 'None'}"`);
        }
        
        // If any changes were found, add to modifications list
        if (changes.length > 0) {
          modifications.push({
            original: existingAccount,
            updated: importedAccount,
            changes: changes
          });
        }
      }
    });
    
    // Find accounts in the database that are not in the import (missing/removals)
    // These are accounts that exist in flatAccounts but their accountCode is not in importAccountCodes
    // Convert to lowercase for case-insensitive comparison
    const importAccountCodes = new Set(importData.map(row => (row.accountCode || '').toLowerCase()));
    const removals = flatAccounts.filter(account => {
      // CRITICAL FIX: Skip inactive accounts completely - they should not appear in the missing list
      if (!account.active) {
        console.log(`CRITICAL FIX: Excluding inactive account ${account.accountCode} from missing accounts list`);
        return false;
      }
      
      const accountCode = (account.accountCode || '').toLowerCase();
      return accountCode && !importAccountCodes.has(accountCode);
    });
    
    // Calculate unchanged accounts
    const unchangedCount = importData.length - additions.length - modifications.length;
    
    // Set preview data
    setChangesPreview({
      additions: additions,
      modifications: modifications,
      removals: removals,
      unchanged: unchangedCount
    });
    
    // Show preview dialog
    setShowPreviewDialog(true);
  };
  
  // Custom hook for batch importing accounts
  const useImportAccounts = () => {
    return useMutation({
      mutationFn: async (payload: any) => {
        console.log("DEBUG: useImportAccounts - Starting import with selectedClientId:", selectedClientId);
        
        // Enhanced client validation
        if (!selectedClientId) {
          console.error("DEBUG: useImportAccounts - No client ID available");
          throw new Error("No client selected. Please select a client before importing accounts.");
        }
        
        if (typeof selectedClientId !== 'number' || isNaN(selectedClientId) || selectedClientId <= 0) {
          console.error("DEBUG: useImportAccounts - Invalid client ID:", selectedClientId);
          throw new Error(`Invalid client ID: ${selectedClientId}. Please select a valid client.`);
        }
        
        console.log(`DEBUG: useImportAccounts - Using endpoint /api/clients/${selectedClientId}/accounts/import`);
        
        // Check if payload is already FormData (from handleImportConfirm)
        let formData;
        if (payload instanceof FormData) {
          formData = payload;
          console.log("DEBUG: useImportAccounts - Using prepared FormData with selections");
        } else {
          // Legacy path for simple array import
          const accounts = payload as any[];
          console.log(`DEBUG: useImportAccounts - Number of accounts to import: ${accounts.length}`);
          
          // Need to create FormData because the import endpoint expects multipart/form-data
          formData = new FormData();
          
          // Convert accounts to CSV string and add as a file
          const csv = Papa.unparse(accounts);
          const file = new Blob([csv], { type: 'text/csv' });
          formData.append('file', file, 'accounts_import.csv');
          
          console.log("DEBUG: useImportAccounts - FormData created with CSV file (no selections)");
        }
        
        try {
          // Use fetch directly since apiRequest doesn't handle FormData
          const response = await fetch(`/api/clients/${selectedClientId}/accounts/import`, {
            method: 'POST',
            body: formData,
            credentials: 'include' // Include cookies for authentication
          });
          
          console.log("DEBUG: useImportAccounts - Response status:", response.status);
          
          if (!response.ok) {
            console.error("DEBUG: useImportAccounts - Response error status:", response.status);
            let errorMessage = 'Unknown error occurred';
            
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
              console.error("DEBUG: useImportAccounts - Error data:", errorData);
            } catch (jsonError) {
              console.error("DEBUG: useImportAccounts - Failed to parse error JSON:", jsonError);
            }
            
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          console.log("DEBUG: useImportAccounts - Import successful, result:", result);
          return result;
        } catch (error) {
          console.error("DEBUG: useImportAccounts - Fetch error:", error);
          throw error;
        }
      },
      onSuccess: (result) => {
        console.log("EXPLICIT VERIFICATION - Import successful - Backend response:", result);
        
        // Extract all counts from the backend response for a more detailed success message
        const added = result.added || 0;
        const updated = result.updated || 0;
        const reactivated = result.reactivated || 0;
        const inactive = result.inactive || 0;
        const deleted = result.deleted || 0;
        const skipped = result.skipped || 0;
        
        // Build a more informative success message that shows exactly what happened
        let successParts = [];
        if (added > 0) successParts.push(`${added} new account${added > 1 ? 's' : ''} added`);
        if (updated > 0) successParts.push(`${updated} account${updated > 1 ? 's' : ''} updated`);
        if (reactivated > 0) successParts.push(`${reactivated} account${reactivated > 1 ? 's' : ''} reactivated`);
        if (inactive > 0) successParts.push(`${inactive} account${inactive > 1 ? 's' : ''} marked inactive`);
        if (deleted > 0) successParts.push(`${deleted} account${deleted > 1 ? 's' : ''} deleted`);
        
        // Convert the array to a readable message with proper punctuation
        let successMessage = '';
        if (successParts.length === 0) {
          successMessage = 'Import completed successfully. No accounts were modified.';
        } else if (successParts.length === 1) {
          successMessage = `Import completed successfully: ${successParts[0]}.`;
        } else {
          const lastPart = successParts.pop();
          successMessage = `Import completed successfully: ${successParts.join(', ')} and ${lastPart}.`;
        }
        
        // Add warnings if available
        if (result.warnings && result.warnings.length > 0) {
          // Show the first warning directly in the success message
          successMessage += `\n\nWarning: ${result.warnings[0]}`;
          
          // If there are multiple warnings, add a count
          if (result.warnings.length > 1) {
            successMessage += ` (${result.warnings.length - 1} more warning${result.warnings.length > 2 ? 's' : ''})`;
          }
        }
        
        // Show the success toast with the detailed message
        toast({
          title: "Chart of Accounts Import",
          description: successMessage,
          variant: "default",
        });
        
        // If there are multiple warnings, show them in a separate toast after a delay
        if (result.warnings && result.warnings.length > 1) {
          setTimeout(() => {
            toast({
              title: "Import Warnings",
              description: result.warnings.slice(0, 3).join('\n\n') + 
                (result.warnings.length > 3 ? `\n\n(${result.warnings.length - 3} more warnings)` : ''),
              variant: "default",
              duration: 7000, // Show warnings for longer
            });
          }, 500);
        }
        
        // Close dialogs and reset import state
        setShowImportDialog(false);
        setShowPreviewDialog(false);
        setImportData([]);
        setImportErrors([]);
        
        // Reset selection state - critical for next import session
        setSelectedNewAccounts([]);
        setSelectedModifiedAccounts([]);
        setSelectedMissingAccounts([]);
        setMissingAccountActions({});
        
        // Reset the file input to allow selecting a new file
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Also reset the reference to fileInputRef for React-managed file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Invalidate relevant queries to refresh UI
        if (selectedClientId) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/accounts/tree`] });
        }
      },
      onError: (error: any) => {
        console.error("EXPLICIT VERIFICATION - Import failed - Error:", error);
        
        // Parse the API error response for more detailed information
        let errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let errorDetails = '';
        let errorCategories: { [key: string]: string[] } = {};
        
        try {
          // Try to extract error details from the API response
          if (error.response?.data) {
            const responseData = error.response.data;
            
            // Use the formatted message if available
            if (responseData.message) {
              errorMessage = responseData.message;
            }
            
            // Get more detailed error information if available
            if (responseData.errors && responseData.errors.length > 0) {
              // Store the raw error details
              errorDetails = responseData.errors.join('\n');
              
              // Categorize errors for better presentation
              errorCategories = responseData.errors.reduce((acc: { [key: string]: string[] }, err: string) => {
                if (err.toLowerCase().includes('parent') || err.toLowerCase().includes('circular')) {
                  acc['Parent Relationship Issues'] = [...(acc['Parent Relationship Issues'] || []), err];
                } else if (err.toLowerCase().includes('duplicate') || err.toLowerCase().includes('already exists')) {
                  acc['Duplicate Account Issues'] = [...(acc['Duplicate Account Issues'] || []), err];
                } else if (err.toLowerCase().includes('transaction')) {
                  acc['Transaction Constraints'] = [...(acc['Transaction Constraints'] || []), err];
                } else if (err.toLowerCase().includes('type') || err.toLowerCase().includes('required field')) {
                  acc['Data Validation Issues'] = [...(acc['Data Validation Issues'] || []), err];
                } else {
                  acc['Other Issues'] = [...(acc['Other Issues'] || []), err];
                }
                return acc;
              }, {});
            }
            
            console.log("EXPLICIT VERIFICATION - Detailed error data:", responseData);
            console.log("EXPLICIT VERIFICATION - Categorized errors:", errorCategories);
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        
        // Create a more user-friendly error message
        let userFriendlyMessage = errorMessage;
        
        // If the error message indicates payload validation issues (which could be due to unchecked accounts)
        if (errorMessage.includes('validation') || 
            errorMessage.includes('selected') || 
            errorMessage.includes('checked') || 
            errorMessage.includes('approve')) {
          userFriendlyMessage = 'No accounts were selected for import. Please check the boxes next to the accounts you want to import, modify, or process.';
        } else if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
          userFriendlyMessage = 'Duplicate account codes detected. Please ensure all account codes are unique.';
        } else if (errorMessage.includes('parent') || errorMessage.includes('circular')) {
          userFriendlyMessage = 'There are issues with parent-child relationships in your chart of accounts. Please check for circular references or invalid parent accounts.';
        } else if (errorMessage.includes('transaction') || errorMessage.includes('cannot change type')) {
          userFriendlyMessage = 'Cannot modify accounts with existing transactions. Please review the details for more information.';
        }
        
        // Display the main error toast
        toast({
          title: "Chart of Accounts Import Failed",
          description: userFriendlyMessage,
          variant: "destructive",
          duration: 5000,
        });
        
        // Show categorized error details in separate toasts
        const categoryKeys = Object.keys(errorCategories);
        if (categoryKeys.length > 0) {
          // Show errors in categories with a slight delay between each
          categoryKeys.forEach((category, index) => {
            const errors = errorCategories[category];
            if (errors && errors.length > 0) {
              setTimeout(() => {
                toast({
                  title: category,
                  description: errors.slice(0, 2).join('\n\n') + 
                    (errors.length > 2 ? `\n\n(${errors.length - 2} more similar issues)` : ''),
                  variant: "destructive",
                  duration: 7000,
                });
              }, 600 * (index + 1)); // Stagger the error toasts
            }
          });
        } 
        // If we don't have categorized errors but have raw error details, show them
        else if (errorDetails) {
          setTimeout(() => {
            toast({
              title: "Error Details",
              description: errorDetails.length > 300 ? 
                errorDetails.substring(0, 300) + '...' : errorDetails,
              variant: "destructive",
              duration: 7000,
            });
          }, 600);
        }
      }
    });
  };
  
  // Initialize the import accounts mutation
  const importAccounts = useImportAccounts();
  
  // Updated state and types for more granular selective imports with industry-standard approach
  // Industry-standard interface for Chart of Accounts import
  interface ImportSelections {
    // Industry-standard interface (aligned with Odoo, Sage Intacct)
    // These are the primary fields that should be used
    updateExisting: boolean;                         // Updates existing accounts if found in import
    handleMissingAccounts?: 'ignore' | 'deactivate' | 'delete';  // Controls how missing accounts are handled
    
    // Primary fields matching the UI and recommended approach from documentation
    updateStrategy: 'all' | 'none' | 'selected';     // Strategy for updating existing accounts
    removeStrategy: 'inactive' | 'delete' | 'none';  // Strategy for handling missing accounts
    
    // Account code arrays for granular control
    newAccountCodes: string[];                       // New accounts to include (when updateStrategy is 'selected')
    modifiedAccountCodes: string[];                  // Existing accounts to update (when updateStrategy is 'selected')
    missingAccountCodes: string[];                   // Missing accounts to process (when removeStrategy is 'selected')
    
    // Per-account action overrides for maximum flexibility
    missingAccountActions: Record<string, 'inactive' | 'delete' | 'ignore'>;  // Specific action for each account
    
    // Legacy fields - keeping for backward compatibility
    deactivateMissing?: boolean;                     // Marks accounts missing from the import as inactive
    deleteMissing?: boolean;                         // Deletes accounts missing from the import
    includedCodes?: string[];
    excludedCodes?: string[];
  }
  
  // State for selected accounts in each category - these arrays control which accounts are processed
  // CRITICAL: These arrays must ONLY contain accounts that have been explicitly checked in the UI
  const [selectedNewAccounts, setSelectedNewAccounts] = useState<string[]>([]);
  const [selectedModifiedAccounts, setSelectedModifiedAccounts] = useState<string[]>([]);
  const [selectedMissingAccounts, setSelectedMissingAccounts] = useState<string[]>([]);
  const [missingAccountActions, setMissingAccountActions] = useState<Record<string, 'inactive' | 'delete' | 'ignore'>>({});
  
  // DEBUG: Log selection state changes to verify correct behavior
  useEffect(() => {
    console.log("EXPLICIT VERIFICATION - Selection state changed:", {
      selectedNewAccounts,
      selectedModifiedAccounts,
      selectedMissingAccounts
    });
  }, [selectedNewAccounts, selectedModifiedAccounts, selectedMissingAccounts]);
  
  // Legacy state to keep compatibility - will be removed in future refactors
  const [updateStrategy, setUpdateStrategy] = useState<'all' | 'none' | 'selected'>('all');
  const [removeStrategy, setRemoveStrategy] = useState<'inactive' | 'delete' | 'none'>('inactive');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const handleImportConfirm = () => {
    if (importData.length > 0) {
      console.log("DEBUG: handleImportConfirm - About to import accounts with granular selections");
      console.log("DEBUG: Total accounts from import data:", importData.length);
      
      // BUGFIX: Make sure we only process accounts that were explicitly selected in the UI
      // Log the selection state for debugging
      console.log("DEBUG: Current selection state before import:");
      console.log("  - selectedNewAccounts:", selectedNewAccounts.length, "items");
      console.log("  - selectedModifiedAccounts:", selectedModifiedAccounts.length, "items");
      console.log("  - selectedMissingAccounts:", selectedMissingAccounts.length, "items");
      
      // Force 'selected' strategy to ensure ONLY checked accounts are processed
      // Regardless of what the user selected in the strategy dropdown
      const effectiveUpdateStrategy = 'selected';
      
      // CRITICAL FIX: Explicitly verify that we're ONLY using accounts that have been checked in the UI
      // These arrays ONLY contain accounts that have been explicitly checked in the UI
      const filteredNewAccountCodes = [...selectedNewAccounts]; // Create copy to avoid reference issues
      const filteredModifiedAccountCodes = [...selectedModifiedAccounts]; // Create copy to avoid reference issues
      const filteredMissingAccountCodes = [...selectedMissingAccounts]; // Create copy to avoid reference issues
      
      console.log("EXPLICIT VERIFICATION - Selected new accounts:", filteredNewAccountCodes);
      console.log("EXPLICIT VERIFICATION - Selected modified accounts:", filteredModifiedAccountCodes);
      console.log("EXPLICIT VERIFICATION - Selected missing accounts:", filteredMissingAccountCodes);
      
      // Create selections object to pass to backend
      const selections: ImportSelections = {
        // Industry-standard interface properties - ALWAYS enable updates but only for selected accounts
        updateExisting: true,
        handleMissingAccounts: removeStrategy === 'inactive' ? 'deactivate' : 
                                removeStrategy === 'delete' ? 'delete' : 'ignore',
        
        // Legacy fields for backward compatibility
        deactivateMissing: removeStrategy === 'inactive',
        deleteMissing: removeStrategy === 'delete',
        
        // CRITICAL FIX: Force 'selected' strategy regardless of UI setting
        // This ensures only explicitly checked accounts are processed
        updateStrategy: 'selected', // Always force 'selected' mode regardless of dropdown
        removeStrategy: removeStrategy, // Keep original removal strategy type, but only apply to selected items
        
        // CRITICAL FIX: Specific accounts to include in each category - ONLY include explicitly selected accounts
        // These arrays MUST contain ONLY accounts where the checkbox was explicitly checked
        newAccountCodes: filteredNewAccountCodes,
        modifiedAccountCodes: filteredModifiedAccountCodes,
        missingAccountCodes: filteredMissingAccountCodes,
        
        // For missing accounts, specify the action for each account
        missingAccountActions: missingAccountActions
      };
      
      console.log(`EXPLICIT VERIFICATION - Will process exactly: ${filteredNewAccountCodes.length} new accounts, ${filteredModifiedAccountCodes.length} modified accounts, and ${filteredMissingAccountCodes.length} missing accounts`);
      
      try {
        // BUGFIX: Check if there are actually any selections to process
        // If no accounts are selected for any operation, show alert and don't submit
        const hasSelectedAccounts = 
          filteredNewAccountCodes.length > 0 ||
          filteredModifiedAccountCodes.length > 0 ||
          filteredMissingAccountCodes.length > 0;
        
        if (!hasSelectedAccounts) {
          toast({
            title: "No accounts selected",
            description: "You haven't selected any accounts to import, modify, or remove. Please select at least one account by checking the checkboxes next to the accounts you want to process.",
            variant: "destructive",
          });
          return; // Stop here and don't submit
        }
        
        // Need to create FormData because the import endpoint expects multipart/form-data
        const formData = new FormData();
        
        // Convert accounts to CSV string and add as a file
        const csv = Papa.unparse(importData);
        const file = new Blob([csv], { type: 'text/csv' });
        formData.append('file', file, 'accounts_import.csv');
        
        // Add selections as a JSON string - CRITICAL: This is what controls which accounts get processed
        formData.append('selections', JSON.stringify(selections));
        
        // VERIFICATION: Explicitly log the payload being sent to ensure only checked accounts are included
        console.log("EXPLICIT VERIFICATION - Frontend is sending ONLY these explicitly selected accounts:", {
          newAccountCodes: filteredNewAccountCodes,
          modifiedAccountCodes: filteredModifiedAccountCodes,
          missingAccountCodes: filteredMissingAccountCodes,
          updateStrategy: 'selected', // Always force selected mode
          removeStrategy: removeStrategy
        });
        
        console.log("EXPLICIT VERIFICATION - Complete selections object:", selections);
        
        // Use the import mutation but pass the FormData manually
        importAccounts.mutate(formData as any);
      } catch (error) {
        console.error("DEBUG: handleImportConfirm - Error preparing import:", error);
        toast({
          title: "Import preparation failed",
          description: `Error setting up import: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    }
  };

  const columns = [
    { 
      header: "Code", 
      accessor: "accountCode", 
      type: "text",
      render: (row: Record<string, any>) => {
        const displayCode = row.accountCode || "";
        
        return (
          <span className={row.active ? "" : "text-gray-400 italic"}>
            {displayCode}
          </span>
        );
      } 
    },
    { 
      header: "Name", 
      accessor: "name", 
      type: "text",
      render: (row: Record<string, any>) => {
        // Calculate indentation based on depth
        const paddingLeft = row.depth ? `${row.depth * 1.5}rem` : '0';
        
        // Determine if the account has children
        const hasChildren = row.children && row.children.length > 0;
        
        return (
          <div className="flex items-center" style={{ paddingLeft }}>
            {/* Show expand/collapse icon if the account has children */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-1 p-0 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(row.id);
                }}
              >
                {expandedNodes[row.id] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {/* Add indentation for accounts without children */}
            {!hasChildren && <span className="w-6"></span>}
            <span className={row.active ? "" : "text-gray-400 italic"}>{row.name}</span>
          </div>
        );
      }
    },
    { 
      header: "Type", 
      accessor: "type", 
      type: "text",
      render: (row: Record<string, any>) => (
        <span className={row.active ? "" : "text-gray-400 italic"}>
          {row.type}
        </span>
      )
    },
    { 
      header: "Subtype", 
      accessor: "subtype", 
      type: "text",
      render: (row: Record<string, any>) => (
        <span className={row.active ? "" : "text-gray-400 italic"}>
          {row.subtype || ""}
        </span>
      )
    },
    { 
      header: "Subledger", 
      accessor: "isSubledger", 
      type: "boolean",
      render: (row: Record<string, any>) => (
        <span className={row.active ? "" : "text-gray-400 italic"}>
          {row.isSubledger ? "Yes" : "No"}
        </span>
      )
    },
    { 
      header: "Status", 
      accessor: "active", 
      type: "boolean",
      render: (row: Record<string, any>) => (
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {row.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      type: "actions",
      render: (row: Record<string, any>) => (
        <div className="flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditAccount(row)}
            className="text-blue-800 hover:text-blue-900 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      )
    }
  ];

  if (!currentEntity) {
    return (
      <div className="py-6">
        <PageHeader 
          title="Chart of Accounts" 
          description="Manage your chart of accounts"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No client selected</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Please select a client from the header dropdown to view and manage the Chart of Accounts.</p>
                  <p>
                    Please select an entity using the "Select entity" dropdown in the header.
                  </p>
                  <p className="mt-1">
                    The Chart of Accounts is shared across all entities belonging to the same client, 
                    allowing consistent account structure across multiple entities.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center py-10">
            <h1 className="text-xl font-semibold text-gray-900">Select an entity to view the Chart of Accounts</h1>
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
          <div className="relative group">
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                className="inline-flex items-center text-sm font-medium text-gray-700"
                onClick={handleExportToExcel}
              >
                <FileSpreadsheet className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Export Excel
              </Button>
              <Button 
                variant="outline"
                className="inline-flex items-center text-sm font-medium text-gray-700"
                onClick={() => {
                  console.log("DEBUG: CSV export button clicked, selectedClientId =", selectedClientId);
                  if (selectedClientId) {
                    console.log(`DEBUG: Initiating CSV export to /api/clients/${selectedClientId}/accounts/export`);
                    window.location.href = `/api/clients/${selectedClientId}/accounts/export`;
                    toast({
                      title: "Export initiated",
                      description: "Your CSV file download should begin shortly.",
                    });
                  } else {
                    console.log("DEBUG: CSV export failed - no client selected");
                    toast({
                      title: "No client selected",
                      description: "Please select a client before exporting accounts.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Export CSV
              </Button>
            </div>
          </div>
          
          <div className="relative group">
            <input
              type="file"
              id="file-input"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
            <Button 
              variant="outline"
              className="inline-flex items-center text-sm font-medium text-gray-700"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Import
            </Button>
          </div>
          
          <Button
            variant="outline"
            className="inline-flex items-center text-sm font-medium text-gray-700"
            onClick={handleGenerateTemplate}
          >
            <FileText className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Template
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-4 flex justify-end">
          <Button
            variant="default"
            className="inline-flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            onClick={handleNewAccount}
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Account
          </Button>
        </div>
        {/* VERIFICATION STEP 3: Log data table props */}
        {/* Using a self-executing function to avoid React node issues */}
        {(() => {
          console.log("VERIFICATION STEP 3: DataTable Props", {
            columnsCount: columns.length,
            dataCount: allFlattenedAccounts?.length || 0,
            activeCount: activeAccounts?.length || 0,
            inactiveCount: inactiveAccounts?.length || 0,
            isLoading,
            sample: allFlattenedAccounts?.slice(0, 2) || [],
            timestamp: new Date().toISOString()
          });
          return null; // Return null to avoid rendering issues
        })()}
        
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4 mt-2">
          <div className="relative flex-grow">
            <Input
              placeholder="Search accounts by name, code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex space-x-2 items-center">
            <div className="flex items-center space-x-2 mr-4">
              <Switch
                id="show-inactive"
                checked={showInactiveAccounts}
                onCheckedChange={setShowInactiveAccounts}
              />
              <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                Show Inactive
              </Label>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={expandAllNodes}
              className="flex items-center"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Expand
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={collapseAllNodes}
              className="flex items-center"
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              Collapse
            </Button>
          </div>
        </div>
        
        {/* Display active accounts with adjustable page size */}
        <DataTable 
          columns={columns} 
          data={filteredActiveAccounts || []} 
          isLoading={isLoading}
          pageSize={25}
          pagination={activePagination}
          onPaginationChange={setActivePagination}
        />
        
        {/* Display inactive accounts if toggle is enabled */}
        {showInactiveAccounts && inactiveAccounts.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Inactive Accounts</h3>
            <DataTable 
              columns={columns} 
              data={filteredInactiveAccounts || []} 
              isLoading={isLoading}
              pageSize={25}
              pagination={inactivePagination}
              onPaginationChange={setInactivePagination}
            />
          </div>
        )}
      </div>

      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Account" : "Create New Account"}</DialogTitle>
          </DialogHeader>
          
          {isEditMode && accountHasTransactions && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    This account has transactions
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Account Code and Account Type cannot be modified for accounts with transaction history.
                    Other fields can still be updated.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
                        disabled={isEditMode && accountHasTransactions}
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
                      {isEditMode && accountHasTransactions && (
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
                              <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                              <SelectItem value="rent">Rent & Facilities</SelectItem>
                              <SelectItem value="payroll">Payroll & Benefits</SelectItem>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="equipment">Equipment & Supplies</SelectItem>
                              <SelectItem value="professional_services">Professional Services</SelectItem>
                              <SelectItem value="travel">Travel & Entertainment</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="taxes">Taxes & Licenses</SelectItem>
                              <SelectItem value="depreciation">Depreciation & Amortization</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountCode">Account Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="accountCode"
                        name="accountCode"
                        value={accountData.accountCode}
                        onChange={handleCodeManualChange}
                        required
                        disabled={isEditMode && accountHasTransactions}
                      />
                      {isEditMode && accountHasTransactions && (
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Account</Label>
                    <Popover onOpenChange={(open) => {
                      // Reset expanded state and search query when dropdown is closed
                      if (!open) {
                        setParentAccountExpandedNodes({});
                        setParentAccountSearchQuery("");
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                          id="parentId"
                        >
                          {accountData.parentId && allAccounts.some(account => account.id === accountData.parentId)
                            ? `${allAccounts.find(account => account.id === accountData.parentId)?.accountCode} - ${allAccounts.find(account => account.id === accountData.parentId)?.name}`
                            : "Select a parent account (optional)"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <div className="relative">
                            <CommandInput 
                              placeholder="Search accounts..." 
                              className="h-9 pr-8" 
                              value={parentAccountSearchQuery}
                              onValueChange={(value) => {
                                // Update search query
                                setParentAccountSearchQuery(value);
                                
                                // When search is cleared, collapse all accounts
                                if (!value.trim()) {
                                  setParentAccountExpandedNodes({});
                                }
                                // When searching, automatically expand all parent accounts 
                                // that have matching children
                                else {
                                  // Find all matching accounts (case insensitive search)
                                  const lowerQuery = value.toLowerCase();
                                  const matchingAccounts = allAccounts
                                    .filter(account => account.active) // Only show active accounts
                                    .filter(account => account.id !== accountData.id) // Prevent selecting self
                                    .filter(account => 
                                      `${account.accountCode} ${account.name}`.toLowerCase().includes(lowerQuery)
                                    );
                                  
                                  // Get IDs of parent accounts whose children match the query
                                  const parentIdsToExpand = new Set<number>();
                                  
                                  // Find parents that need to be expanded
                                  matchingAccounts.forEach(account => {
                                    if (account.parentId) {
                                      parentIdsToExpand.add(account.parentId);
                                      
                                      // Also try to find grandparents (for deep hierarchies)
                                      let currentParentId = account.parentId;
                                      while (currentParentId) {
                                        const parent = allAccounts.find(a => a.id === currentParentId);
                                        if (parent?.parentId) {
                                          parentIdsToExpand.add(parent.parentId);
                                          currentParentId = parent.parentId;
                                        } else {
                                          break;
                                        }
                                      }
                                    }
                                  });
                                  
                                  // Expand these parents if they're not already expanded
                                  if (parentIdsToExpand.size > 0) {
                                    setParentAccountExpandedNodes(prev => {
                                      const newState = { ...prev };
                                      parentIdsToExpand.forEach(id => {
                                        newState[id] = true;
                                      });
                                      return newState;
                                    });
                                  }
                                }
                              }}
                            />
                            {parentAccountSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setParentAccountSearchQuery("");
                                  setParentAccountExpandedNodes({});
                                }}
                                className="absolute right-2 top-2.5 h-4 w-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
                                aria-label="Clear search"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <CommandEmpty>No account found.</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[300px] overflow-auto">
                              <CommandItem
                                key="none"
                                value="No Parent (Top Level)"
                                onSelect={() => {
                                  setAccountData(prev => ({
                                    ...prev,
                                    parentId: null
                                  }));
                                }}
                              >
                                <span className="font-medium">No Parent (Top Level)</span>
                              </CommandItem>
                              
                              {(() => {
                                // Step 1: Get active accounts and filter out self
                                const activeFilteredAccounts = allAccounts.filter(account => 
                                  account.active && account.id !== accountData.id
                                );
                                
                                // Step 2: Organize accounts by type
                                const typeOrder: Record<string, number> = {
                                  'asset': 1,
                                  'assets': 1,
                                  'liability': 2,
                                  'liabilities': 2,
                                  'equity': 3,
                                  'revenue': 4,
                                  'expense': 5,
                                  'expenses': 5
                                };
                                
                                // Step 3: Group accounts by type
                                const accountsByType: Record<string, AccountTreeNode[]> = {};
                                
                                activeFilteredAccounts.forEach(account => {
                                  const type = account.type.toLowerCase();
                                  if (!accountsByType[type]) {
                                    accountsByType[type] = [];
                                  }
                                  accountsByType[type].push(account);
                                });
                                
                                // Step 4: Build hierarchical trees for each type
                                const accountsWithParentInfo = activeFilteredAccounts.map(account => {
                                  const hasParent = account.parentId !== null;
                                  const hasChildren = account.children && account.children.length > 0;
                                  
                                  return {
                                    ...account,
                                    hasParent,
                                    hasChildren,
                                    isParent: hasChildren,
                                    // A node should be visible if:
                                    // 1. It has no parent (root node)
                                    // 2. Its parent is expanded
                                    // 3. We're searching and it matches the search or its children do
                                    isVisible: 
                                      !hasParent || 
                                      !!parentAccountExpandedNodes[account.parentId || 0] ||
                                      !!parentAccountSearchQuery
                                  };
                                });
                                
                                // Step 5: Render accounts by type for better organization
                                return Object.keys(accountsByType)
                                  .sort((a, b) => (typeOrder[a] || 99) - (typeOrder[b] || 99))
                                  .map(type => {
                                    // For each type, return its accounts in hierarchical order
                                    const accountsOfType = accountsWithParentInfo.filter(a => 
                                      a.type.toLowerCase() === type &&
                                      (
                                        // If we're searching, show all matching accounts
                                        parentAccountSearchQuery ? 
                                        `${a.accountCode} ${a.name}`.toLowerCase().includes(parentAccountSearchQuery.toLowerCase()) : 
                                        // Otherwise only show top-level ones initially
                                        !a.parentId || parentAccountExpandedNodes[a.parentId]
                                      )
                                    );
                                    
                                    if (accountsOfType.length === 0) return null;
                                    
                                    return (
                                      <div key={type} className="account-type-group">
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase">
                                          {type}
                                        </div>
                                        {accountsOfType.map(account => {
                                          const { id, accountCode, name, hasParent, hasChildren, isParent } = account;
                                          
                                          return (
                                            <CommandItem
                                              key={id}
                                              value={`${accountCode} ${name}`}
                                              onSelect={() => {
                                                // Always select the account as parent (even if it has children)
                                                setAccountData(prev => ({
                                                  ...prev,
                                                  parentId: id
                                                }));
                                                
                                                // If this is a parent account, also expand it to show its children
                                                if (isParent) {
                                                  setParentAccountExpandedNodes(prev => ({
                                                    ...prev,
                                                    [id]: true
                                                  }));
                                                }
                                              }}
                                              className={cn(
                                                "account-item flex items-center",
                                                // Hide child accounts if parent is collapsed (unless searching)
                                                hasParent && !parentAccountExpandedNodes[account.parentId || 0] && !parentAccountSearchQuery ? "hidden" : "",
                                                // Add left padding for child accounts
                                                hasParent ? "pl-6" : "", 
                                                // Apply account type styling if available
                                                type ? `account-type-${type.toLowerCase().replace(/\s+/g, '-')}` : ""
                                              )}
                                            >
                                              {/* Show expand/collapse arrow for parent accounts */}
                                              {isParent ? (
                                                parentAccountExpandedNodes[id] ? 
                                                  <ChevronDown
                                                    className="mr-2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setParentAccountExpandedNodes(prev => {
                                                        const newState = { ...prev };
                                                        delete newState[id];
                                                        return newState;
                                                      });
                                                    }}
                                                  /> : 
                                                  <ChevronRight
                                                    className="mr-2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setParentAccountExpandedNodes(prev => ({
                                                        ...prev,
                                                        [id]: true
                                                      }));
                                                    }}
                                                  />
                                              ) : hasParent ? (
                                                <span className="w-4 h-4 inline-block mr-2"></span>
                                              ) : (
                                                <span className="w-4 h-4 inline-block mr-2"></span>
                                              )}
                                              
                                              <span className="font-mono text-xs opacity-70 mr-2">{accountCode}</span>
                                              <span className={cn(
                                                isParent ? "font-medium" : "",
                                                accountData.parentId === id ? "font-bold" : ""
                                              )}>
                                                {name}
                                              </span>
                                            </CommandItem>
                                          );
                                        })}
                                      </div>
                                    );
                                  }).filter(Boolean); // Filter out null entries
                              })()}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                  
                  {/* Delete button removed as requested */}
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
            <div className="mt-4 text-center py-8">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a file to import</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload an Excel file with your chart of accounts data.
              </p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
              <div className="mt-4">
                <Button
                  variant="link"
                  onClick={handleGenerateTemplate}
                  className="mx-auto text-blue-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Changes Preview Dialog */}
      <Dialog 
        open={showPreviewDialog} 
        onOpenChange={(open) => {
          setShowPreviewDialog(open);
          if (!open) {
            // Close the entire import process when the preview dialog is closed
            setShowImportDialog(false);
            // Reset all import-related state
            setChangesPreview({
              additions: [],
              modifications: [],
              removals: [],
              unchanged: 0
            });
            setImportData([]);
            setImportErrors([]);
            setSelectedNewAccounts([]);
            setSelectedModifiedAccounts([]);
            setSelectedMissingAccounts([]);
            setUpdateStrategy('all');
            setRemoveStrategy('inactive');
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Preview Changes Before Import
            </DialogTitle>
            <DialogDescription>
              Review the changes that will be made to your Chart of Accounts before confirming the import.
              <span className="font-bold text-red-600 block mt-1">
                IMPORTANT: You must explicitly check boxes next to accounts you want to process - 
                only checked accounts will be imported, modified, or removed.
              </span>
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
                        console.log("Select All New Accounts clicked. New state:", checked);
                        if (checked) {
                          // Set all addition account codes directly
                          const allCodes = changesPreview.additions
                            .map(a => a.accountCode || a.code);
                          
                          console.log("Adding ALL new account codes:", allCodes);
                          setSelectedNewAccounts(allCodes); // Replace with all codes directly
                        } else {
                          // Clear all addition account codes
                          console.log("Clearing ALL new account codes");
                          setSelectedNewAccounts([]);
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
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtype</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {changesPreview.additions.map((account, index) => (
                        <tr key={index} className="bg-green-50 hover:bg-green-100 transition-colors">
                          <td className="px-3 py-2 text-sm text-center">
                            <Checkbox 
                              id={`add-${account.accountCode || account.code}`}
                              checked={selectedNewAccounts.includes(account.accountCode || account.code)}
                              onCheckedChange={(checked) => {
                                const accountId = account.accountCode || account.code;
                                if (checked) {
                                  setSelectedNewAccounts(prev => [...prev, accountId]);
                                } else {
                                  setSelectedNewAccounts(prev => prev.filter(code => code !== accountId));
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.accountCode || account.code}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.type}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.subtype || 'None'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.active ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {changesPreview.modifications.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-gray-900">Modified Accounts ({changesPreview.modifications.length})</h3>
                  <div className="flex items-center">
                    <Checkbox 
                      id="select-all-modifications"
                      checked={changesPreview.modifications.every(mod => 
                        selectedModifiedAccounts.includes(mod.original.accountCode || mod.original.code)
                      )}
                      onCheckedChange={(checked) => {
                        console.log("Select All Modifications clicked. New state:", checked);
                        if (checked) {
                          // Add all modification account codes that aren't already in the selection
                          const allCodes = changesPreview.modifications
                            .map(m => m.original.accountCode || m.original.code);
                          
                          console.log("Adding ALL modification codes:", allCodes);
                          setSelectedModifiedAccounts(allCodes); // Replace with all codes directly
                        } else {
                          // Clear all modification account codes
                          console.log("Clearing ALL modification codes");
                          setSelectedModifiedAccounts([]);
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
                          Changes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {changesPreview.modifications.map((mod, index) => (
                        <tr key={index} className="bg-yellow-50 hover:bg-yellow-100 transition-colors">
                          <td className="px-3 py-2 text-sm text-center">
                            <Checkbox 
                              id={`mod-${mod.original.accountCode || mod.original.code}`}
                              checked={selectedModifiedAccounts.includes(mod.original.accountCode || mod.original.code)}
                              onCheckedChange={(checked) => {
                                const accountId = mod.original.accountCode || mod.original.code;
                                if (checked) {
                                  setSelectedModifiedAccounts(prev => [...prev, accountId]);
                                } else {
                                  setSelectedModifiedAccounts(prev => prev.filter(code => code !== accountId));
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-medium">{mod.original.accountCode || mod.original.code} - {mod.original.name}</div>
                            <div className="text-gray-500 text-xs">{mod.original.type}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <ul className="text-gray-700 space-y-1 list-disc pl-5">
                              {mod.changes.map((change, i) => (
                                <li key={i}>{change}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {changesPreview.removals.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-gray-900">Missing Accounts ({changesPreview.removals.length})</h3>
                  <div className="flex items-center">
                    <Checkbox 
                      id="select-all-removals"
                      checked={changesPreview.removals.every(account => {
                        const accountCode = (account.accountCode || account.code || '').toLowerCase();
                        return accountCode && selectedMissingAccounts.some(code => code.toLowerCase() === accountCode);
                      })}
                      onCheckedChange={(checked) => {
                        console.log("Select All Missing Accounts clicked. New state:", checked);
                        if (checked) {
                          // Set all removal account codes directly
                          const allCodes = changesPreview.removals
                            .map(a => a.accountCode || a.code);
                          
                          console.log("Adding ALL missing account codes:", allCodes);
                          setSelectedMissingAccounts(allCodes); // Replace with all codes directly
                        } else {
                          // Clear all removal account codes
                          console.log("Clearing ALL missing account codes");
                          setSelectedMissingAccounts([]);
                        }
                      }}
                      className="mr-2 h-4 w-4"
                    />
                    <Label htmlFor="select-all-removals" className="text-sm font-medium text-gray-700">
                      Select All
                    </Label>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          Include
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {changesPreview.removals.map((account, index) => (
                        <tr key={index} className="bg-red-50 hover:bg-red-100 transition-colors">
                          <td className="px-3 py-2 text-sm text-center">
                            <Checkbox 
                              id={`remove-${account.accountCode || account.code}`}
                              checked={selectedMissingAccounts.some(code => 
                                code.toLowerCase() === (account.accountCode || account.code || '').toLowerCase()
                              )}
                              onCheckedChange={(checked) => {
                                const accountId = account.accountCode || account.code || '';
                                if (checked) {
                                  // Only add if not already in list (case-insensitive check)
                                  if (!selectedMissingAccounts.some(code => code.toLowerCase() === accountId.toLowerCase())) {
                                    setSelectedMissingAccounts(prev => [...prev, accountId]);
                                  }
                                } else {
                                  // Filter out case-insensitively
                                  setSelectedMissingAccounts(prev => prev.filter(code => 
                                    code.toLowerCase() !== accountId.toLowerCase())
                                  );
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-medium">{account.accountCode || account.code} - {account.name}</div>
                            <div className="text-gray-500 text-xs">{account.type}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <RadioGroup 
                              value={missingAccountActions[account.accountCode || account.code] || 'inactive'} 
                              onValueChange={(value) => {
                                const accountId = account.accountCode || account.code;
                                setMissingAccountActions(prev => ({
                                  ...prev,
                                  [accountId]: value as 'inactive' | 'delete'
                                }));
                              }}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center">
                                <RadioGroupItem value="inactive" id={`inactive-${account.accountCode || account.code}`} className="mr-2" />
                                <Label 
                                  htmlFor={`inactive-${account.accountCode || account.code}`}
                                  className="text-sm text-gray-700"
                                >
                                  Mark as inactive
                                </Label>
                              </div>
                              <div className="flex items-center">
                                <RadioGroupItem value="delete" id={`delete-${account.accountCode || account.code}`} className="mr-2" />
                                <Label 
                                  htmlFor={`delete-${account.accountCode || account.code}`}
                                  className="text-sm text-gray-700"
                                >
                                  Delete (if no transactions exist)
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Hidden settings for import functionality - using defaults */}
            <div className="hidden">
              <input 
                type="hidden" 
                name="import-strategy" 
                value="all" 
                checked={updateStrategy === 'all'} 
                onChange={() => setUpdateStrategy('all')} 
              />
              <input 
                type="hidden" 
                name="remove-strategy" 
                value="inactive" 
                checked={removeStrategy === 'inactive'}
                onChange={() => setRemoveStrategy('inactive')} 
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Close both dialogs completely and reset all import-related state
                  setShowPreviewDialog(false);
                  setShowImportDialog(false);
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
                  setUpdateStrategy('all');
                  setRemoveStrategy('inactive');
                }}
              >
                Cancel Import
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
    </>
  );
}

export default ChartOfAccounts;
