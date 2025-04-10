import React, { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import { useJournalEntry, JournalEntry } from '@/features/journal-entries/hooks/useJournalEntry';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  FileText,
  Info
} from 'lucide-react';

function JournalEntryDetail() {
  const { updateJournalEntry, deleteJournalEntry } = useJournalEntry();
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/journal-entries/:id');
  const entryId = params?.id ? parseInt(params.id) : null;
  
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [voidReason, setVoidReason] = useState('');
  
  // Get client ID for accounts query - use entity's clientId
  const clientId = currentEntity?.clientId;
  
  // Fetch accounts for displaying account information
  const { 
    data: accountsData,
    isLoading: accountsLoading 
  } = useQuery({
    queryKey: clientId ? [`/api/clients/${clientId}/accounts`] : ['no-client-selected'],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Create a map of account IDs to account details for quick lookup
  const accountsMap = React.useMemo(() => {
    if (!accountsData) return {};
    
    // Check if accountsData has accounts property directly or as part of a nested object
    let accounts = [];
    if (Array.isArray(accountsData)) {
      accounts = accountsData;
    } else if (accountsData && typeof accountsData === 'object') {
      // Try to extract accounts from different possible structures
      if (Array.isArray(accountsData.accounts)) {
        accounts = accountsData.accounts;
      } else if (accountsData.data && Array.isArray(accountsData.data.accounts)) {
        accounts = accountsData.data.accounts;
      } else if (accountsData.data && Array.isArray(accountsData.data)) {
        accounts = accountsData.data;
      }
    }
    
    console.log("DEBUG - AccountsMap - Accounts array:", accounts);
    
    return accounts.reduce((acc: {[key: string]: any}, account: any) => {
      if (account && account.id) {
        acc[account.id] = account;
      }
      return acc;
    }, {});
  }, [accountsData]);
  
  // Function to get formatted account display
  const getAccountDisplay = (accountId: string | number) => {
    if (!accountsMap || !accountId) return accountId;
    
    const account = accountsMap[accountId];
    if (!account) return accountId;
    
    // Return formatted account code + name
    return `${account.accountCode} - ${account.name}`;
  };
  
  // Fetch journal entry by ID
  const { 
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: entryId ? [`/api/journal-entries/${entryId}`] : ['dummy-empty-key'],
    enabled: !!entryId
  });
  
  // Define type for a journal entry
  interface JournalEntry {
    id: number;
    date: string;
    description?: string;
    reference?: string;
    journalType?: string;
    status: string;
    lines: JournalEntryLine[];
  }
  
  // API might return the journal entry directly or wrapped in a journalEntry property
  // The explicit cast and nullish coalescing ensure we get a properly typed object or undefined
  const journalEntry = data ? 
    (data && typeof data === 'object' && 'journalEntry' in data ? (data.journalEntry as JournalEntry) : (data as JournalEntry)) 
    : undefined;
  
  console.log("DEBUG - JournalEntryDetail - Data type:", typeof data);
  console.log("DEBUG - JournalEntryDetail - Data structure:", data);
  console.log("DEBUG - JournalEntryDetail - Using journalEntry:", journalEntry);
  
  // Log specific properties to help track format issues
  if (data && typeof data === 'object') {
    console.log("DEBUG - JournalEntryDetail - Data has journalEntry property:", 'journalEntry' in data);
    console.log("DEBUG - JournalEntryDetail - Data has id property:", 'id' in data);
    console.log("DEBUG - JournalEntryDetail - Data has lines property:", 'lines' in data);
  }
  
  // Log line format to help with client/server format detection
  if (journalEntry && journalEntry.lines && journalEntry.lines.length > 0) {
    const firstLine = journalEntry.lines[0];
    console.log("DEBUG - JournalEntryDetail - First line format:", 
      isClientFormatLine(firstLine) ? "Client format (debit/credit)" : 
      isServerFormatLine(firstLine) ? "Server format (type/amount)" : 
      "Unknown format");
    console.log("DEBUG - JournalEntryDetail - First line properties:", Object.keys(firstLine));
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Format currency values consistently with 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Draft
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'posted':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Posted
          </Badge>
        );
      case 'void':
      case 'voided':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <X className="h-3 w-3" />
            Void
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };
  
  // Define types for line formats
  type ClientFormatLine = {
    debit: string;
    credit: string;
    accountId: string | number;
    entityCode?: string;
    description?: string;
  };
  
  type ServerFormatLine = {
    type: 'debit' | 'credit';
    amount: string | number;
    accountId: string | number;
    entityCode?: string;
    description?: string;
  };
  
  // A type guard to check if a line is in client format
  function isClientFormatLine(line: any): line is ClientFormatLine {
    return 'debit' in line && 'credit' in line;
  }
  
  // A type guard to check if a line is in server format
  function isServerFormatLine(line: any): line is ServerFormatLine {
    return 'type' in line && 'amount' in line;
  };
  
  // Union type for both formats
  type JournalEntryLine = ClientFormatLine | ServerFormatLine;
  
  // Type for totals
  type Totals = {
    totalDebit: number;
    totalCredit: number;
  };
  
  // Calculate totals - handling both client format (debit/credit) and server format (type/amount)
  const calculateTotals = (): Totals => {
    if (!journalEntry?.lines) return { totalDebit: 0, totalCredit: 0 };
    
    return (journalEntry.lines as JournalEntryLine[]).reduce((acc: Totals, line: JournalEntryLine) => {
      // Check which format the line data is in and handle accordingly
      if (isClientFormatLine(line)) {
        // Client format (debit/credit)
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        
        return {
          totalDebit: acc.totalDebit + debit,
          totalCredit: acc.totalCredit + credit
        };
      } else if (isServerFormatLine(line)) {
        // Server format (type/amount)
        const amount = parseFloat(line.amount.toString()) || 0;
        if (line.type === 'debit') {
          return {
            totalDebit: acc.totalDebit + amount,
            totalCredit: acc.totalCredit
          };
        } else if (line.type === 'credit') {
          return {
            totalDebit: acc.totalDebit,
            totalCredit: acc.totalCredit + amount
          };
        }
      }
      
      // Default case if neither format is detected
      return acc;
    }, { totalDebit: 0, totalCredit: 0 });
  };
  
  // Type definition for entity balance
  type EntityBalance = {
    entityCode: string;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  
  // Calculate entity balances - handling both client format (debit/credit) and server format (type/amount)
  const calculateEntityBalances = (): EntityBalance[] => {
    if (!journalEntry?.lines) return [];
    
    // Get unique entity codes
    const entityCodes = Array.from(
      new Set((journalEntry.lines as JournalEntryLine[]).map(line => line.entityCode))
    );
    
    // Calculate balance for each entity
    return entityCodes.map(code => {
      if (!code) return null;
      
      const entityLines = (journalEntry.lines as JournalEntryLine[]).filter(line => line.entityCode === code);
      const { totalDebit, totalCredit } = entityLines.reduce((acc: Totals, line: JournalEntryLine) => {
        // Check which format the line data is in and handle accordingly
        if (isClientFormatLine(line)) {
          // Client format (debit/credit)
          const debit = parseFloat(line.debit) || 0;
          const credit = parseFloat(line.credit) || 0;
          
          return {
            totalDebit: acc.totalDebit + debit,
            totalCredit: acc.totalCredit + credit
          };
        } else if (isServerFormatLine(line)) {
          // Server format (type/amount)
          const amount = parseFloat(line.amount.toString()) || 0;
          if (line.type === 'debit') {
            return {
              totalDebit: acc.totalDebit + amount,
              totalCredit: acc.totalCredit
            };
          } else if (line.type === 'credit') {
            return {
              totalDebit: acc.totalDebit,
              totalCredit: acc.totalCredit + amount
            };
          }
        }
        
        // Default case if neither format is detected
        return acc;
      }, { totalDebit: 0, totalCredit: 0 });
      
      const difference = Math.abs(totalDebit - totalCredit);
      const isBalanced = difference < 0.001;
      
      return {
        entityCode: code,
        totalDebit,
        totalCredit,
        difference,
        isBalanced
      };
    }).filter(Boolean) as EntityBalance[];
  };
  
  // Handle edit button click
  const handleEdit = () => {
    console.log("Edit button clicked for entry ID:", entryId);
    navigate(`/journal-entries/edit/${entryId}`);
  };
  
  // Handle delete button click
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!entryId) return;
    
    try {
      await deleteJournalEntry.mutateAsync(entryId);
      toast({
        title: 'Success',
        description: 'Journal entry deleted successfully',
      });
      navigate('/journal-entries');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to delete journal entry: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };
  
  // Handle back button click
  const handleBack = () => {
    navigate('/journal-entries');
  };
  
  // Handle workflow status changes
  const submitForApproval = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      
      return await apiRequest(`/api/journal-entries/${entryId}/submit`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Journal entry submitted for approval',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to submit journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const approveEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      
      return await apiRequest(`/api/journal-entries/${entryId}/approve`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Journal entry approved',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to approve journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const rejectEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      
      return await apiRequest(`/api/journal-entries/${entryId}/reject`, {
        method: 'POST',
        data: { rejectionReason: rejectReason }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Journal entry rejected',
      });
      setRejectReason('');
      setShowRejectDialog(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to reject journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const postEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      
      return await apiRequest(`/api/journal-entries/${entryId}/post`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Journal entry posted',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to post journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const voidEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      if (!voidReason.trim()) throw new Error('Void reason is required');
      
      // Use the DELETE endpoint with a reason parameter to void the entry
      return await apiRequest(`/api/journal-entries/${entryId}`, {
        method: 'DELETE',
        data: { reason: voidReason }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Journal entry voided',
      });
      setVoidReason('');
      setShowVoidDialog(false);
      
      // Explicitly invalidate the query cache for this specific journal entry
      if (entryId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/journal-entries/${entryId}`] 
        });
      }
      
      // Also invalidate any list queries that may include this entry
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] 
        });
      }
      
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to void journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Mutation for reversing a journal entry
  const reverseEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      
      return await apiRequest(`/api/journal-entries/${entryId}/reverse`, {
        method: 'POST',
        data: { 
          date: new Date().toISOString().split('T')[0], // Today's date
          description: `Reversal of journal entry #${entryId}`,
          createdBy: user?.id
        }
      });
    },
    onSuccess: (data) => {
      let reversalId;
      if (data && typeof data === 'object') {
        reversalId = data.id || data.journalEntryId || data.entryId;
      }
      
      toast({
        title: 'Success',
        description: reversalId 
          ? `Reversal entry created with ID: ${reversalId}` 
          : 'Reversal entry created successfully',
      });
      refetch();
      
      // If we have a reversal ID, navigate to it after a short delay
      if (reversalId) {
        setTimeout(() => {
          navigate(`/journal-entries/${reversalId}`);
        }, 1500);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to reverse journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Determine which action buttons to show based on status
  const renderActionButtons = () => {
    if (!journalEntry) return null;
    
    const status = journalEntry.status;
    const isAdmin = user?.role === 'admin';
    
    // Get totals for validation
    const { totalDebit, totalCredit } = calculateTotals();
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;
    const entityBalances = calculateEntityBalances();
    const entitiesBalanced = entityBalances.every(balance => balance?.isBalanced);
    
    return (
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <>
            <Button 
              onClick={handleEdit}
              size="sm"
              variant="outline"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            
            <Button 
              onClick={() => submitForApproval.mutate()}
              size="sm"
              variant="outline"
              disabled={!isBalanced || !entitiesBalanced || submitForApproval.isPending}
            >
              <Clock className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
            
            <Button 
              onClick={handleDelete}
              size="sm"
              variant="destructive"
              disabled={deleteJournalEntry.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        )}
        
        {status === 'pending_approval' && isAdmin && (
          <>
            <Button
              onClick={() => approveEntry.mutate()}
              size="sm"
              variant="outline"
              className="bg-green-100 text-green-800 hover:bg-green-200"
              disabled={approveEntry.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            
            <Button
              onClick={() => setShowRejectDialog(true)}
              size="sm"
              variant="outline"
              className="bg-red-100 text-red-800 hover:bg-red-200"
              disabled={rejectEntry.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </>
        )}
        
        {(status === 'draft' || status === 'approved') && isAdmin && (
          <Button
            onClick={() => postEntry.mutate()}
            size="sm"
            variant="outline"
            className="bg-blue-100 text-blue-800 hover:bg-blue-200"
            disabled={postEntry.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Post
          </Button>
        )}
        
        {(status === 'posted') && isAdmin && (
          <>
            <Button
              onClick={() => setShowVoidDialog(true)}
              size="sm"
              variant="outline"
              className="bg-purple-100 text-purple-800 hover:bg-purple-200"
              disabled={voidEntry.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Void
            </Button>
            
            <Button
              onClick={() => reverseEntry.mutate()}
              size="sm"
              variant="outline"
              className="bg-orange-100 text-orange-800 hover:bg-orange-200"
              disabled={reverseEntry.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reverse
            </Button>
          </>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="py-6">
        <PageHeader
          title="Journal Entry Details"
          description="Loading journal entry details..."
        >
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading journal entry details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-6">
        <PageHeader
          title="Journal Entry Details"
          description="Error loading journal entry"
        >
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-800">Error loading journal entry</p>
                <p className="text-red-600 text-sm">{(error as Error).message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!journalEntry) {
    return (
      <div className="py-6">
        <PageHeader
          title="Journal Entry Details"
          description="Journal entry not found"
        >
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Journal entry not found</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;
  const entityBalances = calculateEntityBalances();
  
  return (
    <div className="py-6">
      <PageHeader
        title={`Journal Entry #${journalEntry.id}`}
        description={journalEntry.description || 'No description'}
      >
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {renderActionButtons()}
        </div>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(journalEntry.status)}
                  {!isBalanced && (
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      Unbalanced
                    </Badge>
                  )}
                </div>
                
                {/* Workflow visualization */}
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2">Workflow Status</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${journalEntry.status === 'draft' || journalEntry.status === 'pending_approval' || journalEntry.status === 'approved' || journalEntry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1">Draft</span>
                    </div>
                    <div className={`h-0.5 w-12 ${journalEntry.status === 'pending_approval' || journalEntry.status === 'approved' || journalEntry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${journalEntry.status === 'pending_approval' || journalEntry.status === 'approved' || journalEntry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1">Approval</span>
                    </div>
                    <div className={`h-0.5 w-12 ${journalEntry.status === 'approved' || journalEntry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${journalEntry.status === 'approved' || journalEntry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1">Approved</span>
                    </div>
                    <div className={`h-0.5 w-12 ${journalEntry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full ${journalEntry.status === 'posted' ? 'bg-blue-500' : journalEntry.status === 'voided' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1">Posted</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date:</span>
                  <span>{formatDate(journalEntry.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reference Number:</span>
                  <span>{journalEntry.referenceNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Journal ID:</span>
                  <span>{journalEntry.id || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <span>{journalEntry.journalType || 'JE'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Description:</span>
                  <span className="text-right">{journalEntry.description || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entity:</span>
                  <span>{currentEntity?.code || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Debit:</span>
                  <span>{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Credit:</span>
                  <span>{formatCurrency(totalCredit)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-500">Difference:</span>
                  <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(Math.abs(totalDebit - totalCredit))}
                    {isBalanced && ' (Balanced)'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Entity Balances */}
        {entityBalances.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Entity Balances</CardTitle>
              <CardDescription>
                Balance per entity for intercompany transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Code</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entityBalances.map((balance: EntityBalance, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{balance.entityCode}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balance.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balance.totalCredit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balance.difference)}
                      </TableCell>
                      <TableCell>
                        {balance.isBalanced ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            <span>Balanced</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <AlertCircle className="mr-1 h-4 w-4" />
                            <span>Unbalanced</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* Journal Entry Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entry Lines</CardTitle>
            <CardDescription>
              Debit and credit lines of the journal entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(journalEntry.lines as JournalEntryLine[]).map((line: JournalEntryLine, index: number) => {
                  // Determine debit and credit values based on format
                  let debitValue = 0;
                  let creditValue = 0;
                  
                  if (isClientFormatLine(line)) {
                    // Client format (debit/credit)
                    debitValue = parseFloat(line.debit) || 0;
                    creditValue = parseFloat(line.credit) || 0;
                  } else if (isServerFormatLine(line)) {
                    // Server format (type/amount)
                    const amount = parseFloat(line.amount.toString()) || 0;
                    if (line.type === 'debit') {
                      debitValue = amount;
                    } else if (line.type === 'credit') {
                      creditValue = amount;
                    }
                  }
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{getAccountDisplay(line.accountId)}</TableCell>
                      <TableCell>{line.entityCode}</TableCell>
                      <TableCell>{line.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        {debitValue > 0 ? formatCurrency(debitValue) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {creditValue > 0 ? formatCurrency(creditValue) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={3} className="text-right">
                    Totals
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalDebit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the journal entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Journal Entry</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this journal entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
              className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={() => rejectEntry.mutate()}
              disabled={!rejectReason.trim() || rejectEntry.isPending}
            >
              Reject Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Journal Entry</DialogTitle>
            <DialogDescription>
              Please provide a required reason for voiding this journal entry. 
              Once voided, a journal entry cannot be restored.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for voiding (required)"
              className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => voidEntry.mutate()} 
              disabled={!voidReason.trim() || voidEntry.isPending}
            >
              Void Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JournalEntryDetail;