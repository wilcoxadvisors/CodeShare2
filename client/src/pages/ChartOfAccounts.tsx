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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AccountType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, Trash2, Download, Upload, Plus, FileSpreadsheet, 
  FileText, Info, AlertTriangle, ChevronRight, ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

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
  const { currentEntity, selectedClientId } = useEntity();
  const { toast } = useToast();
  
  console.log("DEBUG - ChartOfAccounts rendering with context:", {
    hasEntity: !!currentEntity,
    entityId: currentEntity?.id,
    entityName: currentEntity?.name,
    entityClientId: currentEntity?.clientId,
    selectedClientId,
    timestamp: new Date().toISOString()
  });
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [formTab, setFormTab] = useState("basic");
  const [accountCodePrefix, setAccountCodePrefix] = useState("");
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importData, setImportData] = useState<Array<Record<string, any>>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
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

  // Get hierarchical account tree data using client-based API
  // Use selectedClientId as fallback when no entity is selected
  const clientIdToUse = currentEntity?.clientId || selectedClientId;
  
  const { data: accountsTree = { status: "", data: [] }, isLoading, refetch } = useQuery<{ status: string, data: AccountTreeNode[] }>({
    queryKey: clientIdToUse ? [`/api/clients/${clientIdToUse}/accounts/tree`] : ["no-client-selected"],
    enabled: !!clientIdToUse
  });
  
  // Fetch clients data for export functionality
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: true
  });
  
  // Debug output for entity context and refresh data when client selection changes
  useEffect(() => {
    console.log("DEBUG: Entity context in ChartOfAccounts", { 
      entityExists: !!currentEntity,
      currentEntity,
      clientId: currentEntity?.clientId,
      selectedClientId,
      clientIdToUse,
      time: new Date().toISOString()
    });
    
    // Refetch account data when client or entity changes
    if (clientIdToUse) {
      console.log("DEBUG: Triggering account data refetch due to client/entity change", { clientIdToUse });
      // Using a small timeout to ensure the client context is fully updated
      setTimeout(() => {
        refetch();
      }, 100);
    }
  }, [currentEntity, selectedClientId, clientIdToUse, refetch]);
  
  // Extract the actual accounts array from the response
  const accountTreeData = accountsTree?.data || [];
  
  // Debug output to understand the account tree structure
  console.log("DEBUG: Account Tree Data", {
    rawData: accountsTree,
    extractedData: accountTreeData,
    count: accountTreeData.length,
    sample: accountTreeData.length > 0 ? accountTreeData[0] : null,
    clientId: clientIdToUse
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
  const toggleNodeExpansion = (nodeId: number) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // Function to flatten the hierarchical tree into a flat array with depth information
  const flattenAccountTree = (nodes: AccountTreeNode[], depth = 0, result: Array<AccountTreeNode & { depth: number }> = []): Array<AccountTreeNode & { depth: number }> => {
    for (const node of nodes) {
      // Add current node with its depth
      result.push({ ...node, depth });
      
      // If node is expanded and has children, recursively add them with increased depth
      if (expandedNodes[node.id] && node.children && node.children.length > 0) {
        flattenAccountTree(node.children, depth + 1, result);
      }
    }
    return result;
  };
  
  // Memoize the flattened account list to prevent unnecessary recalculations
  const flattenedAccounts = useMemo(() => {
    return flattenAccountTree(accountTreeData);
  }, [accountTreeData, expandedNodes]);

  // Auto-generate account code based on type selection
  useEffect(() => {
    if (!isEditMode && accountData.type && currentEntity) {
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
        const accountsOfType = flattenedAccounts.filter(account => account.type === accountData.type);
        const existingCodes = accountsOfType
          .map((a) => a.accountCode || a.code) // Support both formats for backward compatibility
          .filter((code): code is string => 
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
  }, [accountData.type, isEditMode, currentEntity, flattenedAccounts]);

  // Custom hook for adding an account
  const useAddAccount = () => {
    return useMutation({
      mutationFn: async (data: AccountData & { clientId: number }) => {
        console.log("DEBUG: useAddAccount - Mutate called with:", data);
        
        // Enhanced validation for clientId
        if (!data.clientId || typeof data.clientId !== 'number' || isNaN(data.clientId) || data.clientId <= 0) {
          console.error("DEBUG: useAddAccount - Invalid clientId:", data.clientId, "type:", typeof data.clientId);
          throw new Error(`Invalid client ID: ${data.clientId}. Please select a valid client before creating an account.`);
        }
        
        const url = `/api/clients/${data.clientId}/accounts`;
        console.log("DEBUG: useAddAccount - API URL:", url, "Data:", JSON.stringify(data));
        
        try {
          // Additional logging for the API call
          console.log(`DEBUG: useAddAccount - Making POST request to ${url} with data:`, JSON.stringify(data, null, 2));
          
          const result = await apiRequest(url, {
            method: 'POST',
            data
          });
          console.log("DEBUG: useAddAccount - API response:", result);
          return result;
        } catch (error: any) { // Explicitly type error as any to handle different properties safely
          console.error("DEBUG: useAddAccount - API error:", error);
          console.error("DEBUG: useAddAccount - Error message:", error.message);
          console.error("DEBUG: useAddAccount - Error name:", error.name);
          
          if (error.response) {
            console.error("DEBUG: useAddAccount - API error status:", error.response.status);
            console.error("DEBUG: useAddAccount - API error data:", error.response.data);
            console.error("DEBUG: useAddAccount - API error headers:", error.response.headers);
          }
          
          if (error.request) {
            console.error("DEBUG: useAddAccount - Request was made but no response received");
            console.error("DEBUG: useAddAccount - Request:", error.request);
          }
          
          throw error;
        }
      },
      onSuccess: (data) => {
        console.log("DEBUG: useAddAccount - onSuccess triggered", data);
        toast({
          title: "Account created",
          description: "The account has been created successfully.",
        });
        setShowAccountForm(false);
        
        // Invalidate relevant queries to refresh UI
        if (clientIdToUse) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts/tree`] });
        }
      },
      onError: (error: Error) => {
        console.log("DEBUG: useAddAccount - onError triggered:", error);
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
      mutationFn: async (data: AccountData & { clientId: number, id: number }) => {
        console.log("DEBUG: useUpdateAccount - Mutate called with:", data);
        return await apiRequest(
          `/api/clients/${data.clientId}/accounts/${data.id}`, 
          {
            method: 'PUT',
            data
          }
        );
      },
      onSuccess: (data) => {
        console.log("DEBUG: useUpdateAccount - onSuccess triggered", data);
        toast({
          title: "Account updated",
          description: "The account has been updated successfully.",
        });
        setShowAccountForm(false);
        
        // Invalidate relevant queries to refresh UI
        if (clientIdToUse) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts/tree`] });
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
        setShowDeleteConfirm(false);
        setAccountToDelete(null);
        
        // Invalidate relevant queries to refresh UI
        if (clientIdToUse) {
          console.log(`DEBUG: useDeleteAccount - Invalidating queries for clientId: ${clientIdToUse}`);
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts/tree`] });
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
    console.log("DEBUG - handleSubmit - Client validation:", { 
      currentEntity, 
      selectedClientId,
      clientIdToUse,
      clientIdToUseType: typeof clientIdToUse
    });
    
    if (!clientIdToUse) {
      console.error("DEBUG - handleSubmit - No client ID available");
      toast({
        title: "Client required",
        description: "Please select a client from the header dropdown first.",
        variant: "destructive"
      });
      return;
    }
    
    if (typeof clientIdToUse !== 'number' || isNaN(clientIdToUse) || clientIdToUse <= 0) {
      console.error("DEBUG - handleSubmit - Invalid client ID:", clientIdToUse);
      toast({
        title: "Invalid client",
        description: "The selected client appears to be invalid. Please try selecting a different client.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!accountData.name || !accountData.accountCode || !accountData.type) {
      console.error("DEBUG - handleSubmit - Missing required fields:", { 
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
      clientId: clientIdToUse,
      submitData,
      isEditMode
    });
    
    try {
      if (isEditMode && submitData.id !== null) {
        // For edit mode, ensure we have a valid ID and it's not null
        // Create a new object with only the properties expected by the updateAccount mutation
        const updateData = {
          id: submitData.id as number, // Type assertion since we've verified it's not null
          clientId: clientIdToUse,
          accountCode: submitData.accountCode,
          name: submitData.name,
          type: submitData.type,
          subtype: submitData.subtype,
          isSubledger: submitData.isSubledger,
          subledgerType: submitData.subledgerType,
          active: submitData.active,
          description: submitData.description,
          parentId: submitData.parentId
        };
        updateAccount.mutate(updateData);
      } else {
        // For create mode
        createAccount.mutate({
          ...submitData,
          clientId: clientIdToUse
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
      deleteAccount.mutate(accountToDelete.id);
    }
  };
  
  // Excel export functionality
  // Function to fetch all accounts for export (not just visible ones)
  const fetchAllAccountsForExport = async () => {
    if (!clientIdToUse) {
      toast({
        title: "No client selected",
        description: "Please select a client to export accounts.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      // Use the regular accounts API to get all accounts for the client
      const response = await fetch(`/api/clients/${clientIdToUse}/accounts`);
      
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
    if (!Array.isArray(flattenedAccounts) || flattenedAccounts.length === 0) {
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
      } else if (clientIdToUse && Array.isArray(clients)) {
        const client = clients.find((c: any) => c.id === clientIdToUse);
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
      // Use accountCode if available, fall back to code for backward compatibility
      const accountIdentifier = account.accountCode || account.code;
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
        code: string;
        name: string;
        type: string;
        subtype: string | null;
        isSubledger: boolean;
        subledgerType: string | null;
        active: boolean;
        description: string | null;
        parentId?: number | null;
      } = {
        code: row.Code?.toString().trim(),
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
      if (!validatedRow.code) {
        errors.push(`Row ${rowNum}: Code is required`);
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
      
      // If no match by ID, try to match by code
      if (!existingAccount) {
        existingAccount = flatAccounts.find(acc => 
          (acc.accountCode && acc.accountCode.toLowerCase() === importedAccount.code.toLowerCase()) || 
          (acc.code && acc.code.toLowerCase() === importedAccount.code.toLowerCase())
        );
        console.log(`Matching by code ${importedAccount.code} - match found: ${Boolean(existingAccount)}`);
      }
      
      if (!existingAccount) {
        // New account
        additions.push(importedAccount);
      } else {
        // Check for modifications in existing account
        const changes: string[] = [];
        
        // Check each field for changes, starting with accountCode
        const existingCode = existingAccount.accountCode || existingAccount.code || '';
        if (importedAccount.code !== existingCode) {
          changes.push(`Account Code: "${existingCode}" → "${importedAccount.code}"`);
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
    const importAccountCodes = new Set(importData.map(row => row.accountCode));
    const removals = flatAccounts.filter(account => {
      const accountCode = account.accountCode || account.code;
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
        console.log("DEBUG: useImportAccounts - Starting import with clientIdToUse:", clientIdToUse);
        
        // Enhanced client validation
        if (!clientIdToUse) {
          console.error("DEBUG: useImportAccounts - No client ID available");
          throw new Error("No client selected. Please select a client before importing accounts.");
        }
        
        if (typeof clientIdToUse !== 'number' || isNaN(clientIdToUse) || clientIdToUse <= 0) {
          console.error("DEBUG: useImportAccounts - Invalid client ID:", clientIdToUse);
          throw new Error(`Invalid client ID: ${clientIdToUse}. Please select a valid client.`);
        }
        
        console.log(`DEBUG: useImportAccounts - Using endpoint /api/clients/${clientIdToUse}/accounts/import`);
        
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
          const response = await fetch(`/api/clients/${clientIdToUse}/accounts/import`, {
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
        toast({
          title: "Accounts imported",
          description: result.message || `Successfully imported ${importData.length} accounts.`,
        });
        setShowImportDialog(false);
        setImportData([]);
        setImportErrors([]);
        
        // Invalidate relevant queries to refresh UI
        if (clientIdToUse) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientIdToUse}/accounts/tree`] });
        }
      },
      onError: (error: any) => {
        toast({
          title: "Import failed",
          description: `Failed to import accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    });
  };
  
  // Initialize the import accounts mutation
  const importAccounts = useImportAccounts();
  
  // Updated state and types for more granular selective imports
  interface ImportSelections {
    // Account inclusion/exclusion strategies
    updateStrategy?: 'all' | 'none' | 'selected';
    removeStrategy?: 'inactive' | 'delete' | 'none';
    includedCodes?: string[];
    excludedCodes?: string[];
    
    // Specific accounts to include in each category
    newAccountCodes: string[];
    modifiedAccountCodes: string[];
    missingAccountCodes: string[];
    
    // For missing accounts, specify the action for each account
    missingAccountActions: Record<string, 'inactive' | 'delete'>;
  }
  
  // State for selected accounts in each category
  const [selectedNewAccounts, setSelectedNewAccounts] = useState<string[]>([]);
  const [selectedModifiedAccounts, setSelectedModifiedAccounts] = useState<string[]>([]);
  const [selectedMissingAccounts, setSelectedMissingAccounts] = useState<string[]>([]);
  const [missingAccountActions, setMissingAccountActions] = useState<Record<string, 'inactive' | 'delete'>>({});
  
  // Legacy state to keep compatibility - will be removed in future refactors
  const [updateStrategy, setUpdateStrategy] = useState<'all' | 'none' | 'selected'>('all');
  const [removeStrategy, setRemoveStrategy] = useState<'inactive' | 'delete' | 'none'>('inactive');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const handleImportConfirm = () => {
    if (importData.length > 0) {
      console.log("DEBUG: handleImportConfirm - About to import accounts with granular selections");
      
      // Create selections object to pass to backend
      const selections: ImportSelections = {
        // Account inclusion/exclusion strategies
        updateStrategy: updateStrategy,
        removeStrategy: removeStrategy,
        
        // Specific accounts to include in each category
        newAccountCodes: selectedNewAccounts,
        modifiedAccountCodes: selectedModifiedAccounts,
        missingAccountCodes: selectedMissingAccounts,
        
        // For missing accounts, specify the action for each account
        missingAccountActions: missingAccountActions
      };
      
      console.log(`DEBUG: handleImportConfirm - Selected ${selectedNewAccounts.length} new accounts, ${selectedModifiedAccounts.length} modified accounts, and ${selectedMissingAccounts.length} missing accounts`);
      
      
      try {
        // Need to create FormData because the import endpoint expects multipart/form-data
        const formData = new FormData();
        
        // Convert accounts to CSV string and add as a file
        const csv = Papa.unparse(importData);
        const file = new Blob([csv], { type: 'text/csv' });
        formData.append('file', file, 'accounts_import.csv');
        
        // Add selections as a JSON string
        formData.append('selections', JSON.stringify(selections));
        
        console.log("DEBUG: handleImportConfirm - Prepared form data with selections:", selections);
        
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
        // Support both accountCode and code fields for backward compatibility
        const displayCode = row.accountCode || row.code || "";
        
        // Debug output to understand what code is being displayed
        console.log("DEBUG: Rendering account code", { 
          id: row.id, 
          accountCode: row.accountCode, 
          code: row.code, 
          displayCode,
          clientId: clientIdToUse
        });
        
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
    { header: "Type", accessor: "type", type: "text" },
    { header: "Subtype", accessor: "subtype", type: "text" },
    { 
      header: "Subledger", 
      accessor: "isSubledger", 
      type: "boolean",
      render: (row: Record<string, any>) => row.isSubledger ? "Yes" : "No"
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
                  console.log("DEBUG: CSV export button clicked, clientIdToUse =", clientIdToUse);
                  if (clientIdToUse) {
                    console.log(`DEBUG: Initiating CSV export to /api/clients/${clientIdToUse}/accounts/export`);
                    window.location.href = `/api/clients/${clientIdToUse}/accounts/export`;
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
        <DataTable 
          columns={columns} 
          data={flattenedAccounts || []} 
          isLoading={isLoading} 
        />
      </div>

      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Account" : "Create New Account"}</DialogTitle>
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
                      />
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
                    <Select
                      value={accountData.parentId?.toString() || "none"}
                      onValueChange={(value) => {
                        const parentId = value === "none" ? null : parseInt(value, 10);
                        setAccountData(prev => ({
                          ...prev,
                          parentId
                        }));
                      }}
                    >
                      <SelectTrigger id="parentId">
                        <SelectValue placeholder="Select a parent account (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Parent (Top Level)</SelectItem>
                        {flattenedAccounts
                          .filter(account => account.id !== accountData.id) // Prevent selecting self as parent
                          .map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountCode} - {account.name}
                            </SelectItem>
                          ))
                        }
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
                  
                  {isEditMode && (
                    <div className="pt-6 border-t mt-4">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => handleDeleteClick({
                          id: accountData.id,
                          name: accountData.name,
                          accountCode: accountData.accountCode
                        })}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        Warning: This will permanently delete the account. This action cannot be undone.
                      </p>
                    </div>
                  )}
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
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
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
                        if (checked) {
                          // Add all modification account codes that aren't already in the selection
                          const newCodes = changesPreview.modifications
                            .map(m => m.original.accountCode || m.original.code)
                            .filter(code => !selectedModifiedAccounts.includes(code));
                          
                          setSelectedModifiedAccounts(prev => [...prev, ...newCodes]);
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
                      checked={changesPreview.removals.every(account => 
                        selectedMissingAccounts.includes(account.accountCode || account.code)
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Add all removal account codes that aren't already in the selection
                          const newCodes = changesPreview.removals
                            .map(a => a.accountCode || a.code)
                            .filter(code => !selectedMissingAccounts.includes(code));
                          
                          setSelectedMissingAccounts(prev => [...prev, ...newCodes]);
                        } else {
                          // Remove all removal account codes from the selection
                          const removalCodes = changesPreview.removals.map(a => a.accountCode || a.code);
                          setSelectedMissingAccounts(prev => prev.filter(code => !removalCodes.includes(code)));
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
                              checked={selectedMissingAccounts.includes(account.accountCode || account.code)}
                              onCheckedChange={(checked) => {
                                const accountId = account.accountCode || account.code;
                                if (checked) {
                                  setSelectedMissingAccounts(prev => [...prev, accountId]);
                                } else {
                                  setSelectedMissingAccounts(prev => prev.filter(code => code !== accountId));
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
            
            {/* Import Strategy Selection */}
            <div className="mt-6 border rounded-md p-4 bg-gray-50">
              <h3 className="text-base font-medium text-gray-900 mb-3">Import Options</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Update Strategy</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="strategy-all"
                        name="import-strategy"
                        type="radio"
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={updateStrategy === 'all'}
                        onChange={() => setUpdateStrategy('all')}
                      />
                      <label htmlFor="strategy-all" className="ml-2 block text-sm text-gray-700">
                        Import all changes (default)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="strategy-selected"
                        name="import-strategy"
                        type="radio"
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={updateStrategy === 'selected'}
                        onChange={() => setUpdateStrategy('selected')}
                      />
                      <label htmlFor="strategy-selected" className="ml-2 block text-sm text-gray-700">
                        Import selected changes only
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="strategy-none"
                        name="import-strategy"
                        type="radio"
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={updateStrategy === 'none'}
                        onChange={() => setUpdateStrategy('none')}
                      />
                      <label htmlFor="strategy-none" className="ml-2 block text-sm text-gray-700">
                        Don't update existing accounts, only add new ones
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Missing Accounts Strategy
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      (What to do with accounts in the database that are not in the import file)
                    </span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="remove-inactive"
                        name="remove-strategy"
                        type="radio"
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={removeStrategy === 'inactive'}
                        onChange={() => setRemoveStrategy('inactive')}
                      />
                      <label htmlFor="remove-inactive" className="ml-2 block text-sm text-gray-700">
                        Mark as inactive (default)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="remove-delete"
                        name="remove-strategy"
                        type="radio"
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={removeStrategy === 'delete'}
                        onChange={() => setRemoveStrategy('delete')}
                      />
                      <label htmlFor="remove-delete" className="ml-2 block text-sm text-gray-700">
                        Delete permanently (if no transactions exist)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="remove-none"
                        name="remove-strategy"
                        type="radio"
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        checked={removeStrategy === 'none'}
                        onChange={() => setRemoveStrategy('none')}
                      />
                      <label htmlFor="remove-none" className="ml-2 block text-sm text-gray-700">
                        Leave unchanged
                      </label>
                    </div>
                  </div>
                </div>
                
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
    </>
  );
}

export default ChartOfAccounts;
