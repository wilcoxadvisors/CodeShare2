import { useState, useEffect, useRef } from "react";
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
import { AccountType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, Trash2, Download, Upload, Plus, FileSpreadsheet, 
  FileText, Info, AlertTriangle
} from "lucide-react";
import * as XLSX from "xlsx";

function ChartOfAccounts() {
  const { currentEntity } = useEntity();
  const { toast } = useToast();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [formTab, setFormTab] = useState("basic");
  const [accountCodePrefix, setAccountCodePrefix] = useState("");
  const [accountData, setAccountData] = useState({
    id: null,
    code: "",
    name: "",
    type: "",
    subtype: "",
    isSubledger: false,
    subledgerType: "",
    active: true,
    description: ""
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{id: number, name: string, code: string} | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<Array<Record<string, any>>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get accounts data
  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : ["no-entity-selected"],
    enabled: !!currentEntity,
  });

  // Auto-generate account code based on type selection
  useEffect(() => {
    if (!isEditMode && accountData.type && currentEntity && Array.isArray(accounts)) {
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
        // Get accounts of the current type
        const accountsOfType = accounts.filter(account => account.type === accountData.type);
        const existingCodes = accountsOfType
          .map(a => a.code)
          .filter(code => code.startsWith(prefix))
          .sort();
        
        if (existingCodes.length > 0) {
          const lastCode = existingCodes[existingCodes.length - 1];
          const numericPart = parseInt(lastCode.replace(/\D/g, ''));
          const newCode = `${prefix}${String(numericPart + 1).padStart(3, '0')}`;
          
          // Only update if code is empty or doesn't match our format
          if (!accountData.code || !accountData.code.startsWith(prefix)) {
            setAccountData(prev => ({ ...prev, code: newCode }));
          }
        } else {
          // No existing accounts of this type, start with 001
          const newCode = `${prefix}001`;
          
          // Only update if code is empty or doesn't match our format  
          if (!accountData.code || !accountData.code.startsWith(prefix)) {
            setAccountData(prev => ({ ...prev, code: newCode }));
          }
        }
      }
    }
  }, [accountData.type, isEditMode, currentEntity, accounts]);

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
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
      id: null,
      code: "",
      name: "",
      type: "",
      subtype: "",
      isSubledger: false,
      subledgerType: "",
      active: true,
      description: ""
    });
    setIsEditMode(false);
    setFormTab("basic");
    setShowAccountForm(true);
  };
  
  const handleEditAccount = (account: Record<string, any>) => {
    setAccountData({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: account.subtype || "",
      isSubledger: account.isSubledger,
      subledgerType: account.subledgerType || "",
      active: account.active,
      description: account.description || ""
    });
    setIsEditMode(true);
    setFormTab("basic");
    setShowAccountForm(true);
  };
  
  const handleDeleteClick = (account: Record<string, any>) => {
    setAccountToDelete({
      id: account.id,
      name: account.name,
      code: account.code
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
        code: ""  // Will be auto-generated by effect
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
        code: accountCodePrefix + value.replace(/^\D+/g, '')
      }));
    } else {
      setAccountData(prev => ({
        ...prev,
        code: value
      }));
    }
  };

  const updateAccount = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        `/api/entities/${currentEntity?.id}/accounts/${data.id}`, 
        {
          method: 'PUT',
          data
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Account updated",
        description: "The account has been updated successfully.",
      });
      setShowAccountForm(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update account: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const deleteAccount = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(
        `/api/entities/${currentEntity?.id}/accounts/${id}`, 
        {
          method: 'DELETE'
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "The account has been deleted successfully.",
      });
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
      refetch();
    },
    onError: (error: any) => {
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
            code: accountToDelete.code,
            name: accountToDelete.name,
            type: "",  // Will be filled when fetching account details
            subtype: "",
            isSubledger: false,
            subledgerType: "",
            active: false,  // Set to inactive
            description: ""
          });
          
          // Get full account details before showing the form
          apiRequest(`/api/entities/${currentEntity?.id}/accounts/${accountToDelete.id}`)
            .then((accountDetails: any) => {
              setAccountData(prev => ({
                ...prev,
                type: accountDetails.type,
                subtype: accountDetails.subtype || "",
                isSubledger: accountDetails.isSubledger,
                subledgerType: accountDetails.subledgerType || "",
                description: accountDetails.description || ""
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateAccount.mutate({
        ...accountData,
        entityId: currentEntity?.id
      });
    } else {
      createAccount.mutate({
        ...accountData,
        entityId: currentEntity?.id
      });
    }
  };
  
  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      deleteAccount.mutate(accountToDelete.id);
    }
  };
  
  // Excel export functionality
  const handleExportToExcel = () => {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      toast({
        title: "No accounts to export",
        description: "Please add accounts to the chart of accounts before exporting.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare data for export
      const exportData = accounts.map(account => ({
        Code: account.code,
        Name: account.name,
        Type: account.type,
        Subtype: account.subtype || '',
        IsSubledger: account.isSubledger ? 'Yes' : 'No',
        SubledgerType: account.subledgerType || '',
        Active: account.active ? 'Yes' : 'No',
        Description: account.description || ''
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Column widths for better readability
      const columnWidths = [
        { wch: 10 }, // Code
        { wch: 30 }, // Name
        { wch: 15 }, // Type
        { wch: 20 }, // Subtype
        { wch: 12 }, // IsSubledger
        { wch: 20 }, // SubledgerType
        { wch: 10 }, // Active
        { wch: 40 }  // Description
      ];
      
      worksheet['!cols'] = columnWidths;
      
      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts");
      
      // Generate filename with entity name and current date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `${currentEntity?.name || 'Entity'}_ChartOfAccounts_${date}.xlsx`;
      
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
        description: `Error exporting chart of accounts: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  // Create template for import
  const handleGenerateTemplate = () => {
    try {
      // Create template headers
      const templateHeaders = [
        "Code", "Name", "Type", "Subtype", "IsSubledger", "SubledgerType", "Active", "Description"
      ];
      
      // Create sample data (one row per account type)
      const sampleData = [
        { 
          Code: "1001", 
          Name: "Cash", 
          Type: "asset", 
          Subtype: "current_asset", 
          IsSubledger: "No", 
          SubledgerType: "", 
          Active: "Yes", 
          Description: "Cash on hand" 
        },
        { 
          Code: "2001", 
          Name: "Accounts Payable", 
          Type: "liability", 
          Subtype: "current_liability", 
          IsSubledger: "No", 
          SubledgerType: "", 
          Active: "Yes", 
          Description: "Short-term debt" 
        },
        { 
          Code: "4001", 
          Name: "Service Revenue", 
          Type: "revenue", 
          Subtype: "operating_revenue", 
          IsSubledger: "No", 
          SubledgerType: "", 
          Active: "Yes", 
          Description: "Income from services" 
        },
        { 
          Code: "5001", 
          Name: "Office Supplies", 
          Type: "expense", 
          Subtype: "operating_expense", 
          IsSubledger: "No", 
          SubledgerType: "", 
          Active: "Yes", 
          Description: "Office supplies expense" 
        }
      ];
      
      // Create worksheet with headers and sample data
      const worksheet = XLSX.utils.json_to_sheet([...sampleData], { 
        header: templateHeaders 
      });
      
      // Column widths for better readability
      const columnWidths = [
        { wch: 10 }, // Code
        { wch: 30 }, // Name
        { wch: 15 }, // Type
        { wch: 20 }, // Subtype
        { wch: 12 }, // IsSubledger
        { wch: 20 }, // SubledgerType
        { wch: 10 }, // Active
        { wch: 40 }  // Description
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
        description: `Error creating template: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const binaryString = evt.target?.result as string;
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and process data
        validateAndProcessImportData(data);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          title: "Import failed",
          description: `Error processing Excel file: ${error.message}`,
          variant: "destructive",
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Import failed",
        description: "Failed to read the Excel file. Please check the file format.",
        variant: "destructive",
      });
    };
    
    reader.readAsBinaryString(file);
  };
  
  // Validate and process import data
  const validateAndProcessImportData = (data: any[]) => {
    if (!data || data.length === 0) {
      toast({
        title: "Import failed",
        description: "The Excel file contains no data. Please check the file content.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate required fields
    const errors: string[] = [];
    const processedData = data.map((row, index) => {
      const rowNum = index + 2; // +2 for Excel row number (1-based + header row)
      const validatedRow = {
        code: row.Code?.toString().trim(),
        name: row.Name?.toString().trim(),
        type: row.Type?.toString().toLowerCase().trim(),
        subtype: row.Subtype?.toString().trim() || null,
        isSubledger: row.IsSubledger?.toString().toUpperCase() === 'YES',
        subledgerType: row.SubledgerType?.toString().trim() || null,
        active: row.Active?.toString().toUpperCase() !== 'NO', // Default to active if not specified
        description: row.Description?.toString().trim() || null
      };
      
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
    } else {
      // No errors, prepare for import
      setImportData(processedData);
      setImportErrors([]);
    }
    
    // Show import dialog
    setShowImportDialog(true);
  };
  
  // Import multiple accounts
  const importAccounts = useMutation({
    mutationFn: async (accounts: any[]) => {
      return await apiRequest(
        `/api/entities/${currentEntity?.id}/accounts/batch`, 
        {
          method: 'POST',
          data: { accounts }
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Accounts imported",
        description: `Successfully imported ${importData.length} accounts.`,
      });
      setShowImportDialog(false);
      setImportData([]);
      setImportErrors([]);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import accounts: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleImportConfirm = () => {
    if (importData.length > 0) {
      importAccounts.mutate(importData);
    }
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
      render: (row: Record<string, any>) => row.isSubledger ? "Yes" : "No"
    },
    { 
      header: "Active", 
      accessor: "active", 
      type: "boolean",
      render: (row: Record<string, any>) => row.active ? "Yes" : "No"
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDeleteClick(row)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
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
          <div className="relative group">
            <Button 
              variant="outline" 
              className="inline-flex items-center text-sm font-medium text-gray-700"
              onClick={handleExportToExcel}
            >
              <FileSpreadsheet className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Export
            </Button>
          </div>
          
          <div className="relative group">
            <input
              type="file"
              id="file-input"
              className="hidden"
              accept=".xlsx,.xls"
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
          
          <Button
            variant="default"
            className="inline-flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            onClick={handleNewAccount}
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Account
          </Button>
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
                        handleSelectChange("isSubledger", String(checked === true))
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
                        handleSelectChange("active", String(checked === true))
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
              {accountToDelete && <span className="font-semibold"> {accountToDelete.code} - {accountToDelete.name}</span>}.
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
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{account.code}</td>
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
                <Button
                  onClick={handleImportConfirm}
                  disabled={importAccounts.isPending}
                >
                  {importAccounts.isPending ? "Importing..." : "Import Accounts"}
                </Button>
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
    </>
  );
}

export default ChartOfAccounts;
