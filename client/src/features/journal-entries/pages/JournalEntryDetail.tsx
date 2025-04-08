import React, { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import { useJournalEntry, JournalEntry } from '../hooks/useJournalEntry';
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
  AlertCircle
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
  const [rejectReason, setRejectReason] = useState('');
  
  // Fetch journal entry by ID
  const { 
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: entryId ? [`/api/journal-entries/${entryId}`] : null,
    enabled: !!entryId
  });
  
  const journalEntry = data?.journalEntry;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'posted':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Posted</Badge>;
      case 'void':
      case 'voided':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Calculate totals
  const calculateTotals = () => {
    if (!journalEntry?.lines) return { totalDebit: 0, totalCredit: 0 };
    
    return journalEntry.lines.reduce((acc, line) => {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      
      return {
        totalDebit: acc.totalDebit + debit,
        totalCredit: acc.totalCredit + credit
      };
    }, { totalDebit: 0, totalCredit: 0 });
  };
  
  // Calculate entity balances
  const calculateEntityBalances = () => {
    if (!journalEntry?.lines) return [];
    
    // Get unique entity codes
    const entityCodes = Array.from(
      new Set(journalEntry.lines.map(line => line.entityCode))
    );
    
    // Calculate balance for each entity
    return entityCodes.map(code => {
      if (!code) return null;
      
      const entityLines = journalEntry.lines.filter(line => line.entityCode === code);
      const { totalDebit, totalCredit } = entityLines.reduce((acc, line) => {
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        
        return {
          totalDebit: acc.totalDebit + debit,
          totalCredit: acc.totalCredit + credit
        };
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
    }).filter(Boolean);
  };
  
  // Handle edit button click
  const handleEdit = () => {
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
        data: { reason: rejectReason }
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
      
      return await apiRequest(`/api/journal-entries/${entryId}/void`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Journal entry voided',
      });
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
        
        {status === 'approved' && isAdmin && (
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
        
        {(status === 'posted' || status === 'approved') && isAdmin && (
          <Button
            onClick={() => voidEntry.mutate()}
            size="sm"
            variant="outline"
            className="bg-purple-100 text-purple-800 hover:bg-purple-200"
            disabled={voidEntry.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Void
          </Button>
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
              <div className="flex items-center space-x-2">
                {getStatusBadge(journalEntry.status)}
                {!isBalanced && (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    Unbalanced
                  </Badge>
                )}
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
                  <span className="text-gray-500">Reference:</span>
                  <span>{journalEntry.reference || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <span>{journalEntry.journalType || 'JE'}</span>
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
                  <span>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(totalDebit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Credit:</span>
                  <span>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(totalCredit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-500">Difference:</span>
                  <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(Math.abs(totalDebit - totalCredit))}
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
                  {entityBalances.map((balance, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{balance?.entityCode}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(balance?.totalDebit || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(balance?.totalCredit || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(balance?.difference || 0)}
                      </TableCell>
                      <TableCell>
                        {balance?.isBalanced ? (
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
                {journalEntry.lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{line.accountId}</TableCell>
                    <TableCell>{line.entityCode}</TableCell>
                    <TableCell>{line.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      {line.debit ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(parseFloat(line.debit)) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(parseFloat(line.credit)) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={3} className="text-right">
                    Totals
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(totalDebit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(totalCredit)}
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
    </div>
  );
}

export default JournalEntryDetail;