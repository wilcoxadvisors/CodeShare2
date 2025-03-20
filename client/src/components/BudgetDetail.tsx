import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, FileText, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Budget {
  id: number;
  name: string;
  entityId: number;
  status: string;
  startDate: string;
  endDate: string;
  fiscalYear: number;
  description: string | null;
  periodType: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface BudgetItem {
  id: number;
  budgetId: number;
  accountId: number;
  amount: string;
  description: string | null;
  periodStart: string;
  periodEnd: string;
  notes: string | null;
  createdAt: string;
}

interface Account {
  id: number;
  name: string;
  code: string;
  type: string;
}

interface BudgetDetailProps {
  budgetId: number;
  entityId: number;
  onBack: () => void;
}

export default function BudgetDetail({ budgetId, entityId, onBack }: BudgetDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    accountId: '',
    amount: '',
    description: '',
    notes: '',
  });

  // Fetch budget details
  const { data: budget, isLoading: isLoadingBudget } = useQuery({
    queryKey: ['/api/entities', entityId, 'budgets', budgetId],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/${entityId}/budgets/${budgetId}`);
      return response as Budget;
    },
  });

  // Fetch budget items
  const { data: budgetItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/entities', entityId, 'budgets', budgetId, 'items'],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/${entityId}/budgets/${budgetId}/items`);
      return response as BudgetItem[];
    },
  });

  // Fetch accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['/api/entities', entityId, 'accounts'],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/${entityId}/accounts`);
      return response as Account[];
    },
  });

  // Add new budget item mutation
  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      return apiRequest(`/api/entities/${entityId}/budgets/${budgetId}/items`, {
        method: 'POST',
        body: itemData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Budget item added',
        description: 'The budget item has been added successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets', budgetId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets', budgetId] });
      setShowNewItemDialog(false);
      setNewItem({
        accountId: '',
        amount: '',
        description: '',
        notes: '',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error adding the budget item.',
        variant: 'destructive',
      });
    },
  });

  // Delete budget item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest(`/api/entities/${entityId}/budgets/${budgetId}/items/${itemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Budget item deleted',
        description: 'The budget item has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets', budgetId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets', budgetId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error deleting the budget item.',
        variant: 'destructive',
      });
    },
  });

  const handleAddItem = () => {
    if (!newItem.accountId || !newItem.amount) {
      toast({
        title: 'Missing fields',
        description: 'Please select an account and enter an amount.',
        variant: 'destructive',
      });
      return;
    }

    // Get budget period dates from the budget
    const startDate = budget?.startDate;
    const endDate = budget?.endDate;

    if (!startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Budget period dates are not available.',
        variant: 'destructive',
      });
      return;
    }

    const itemData = {
      accountId: parseInt(newItem.accountId),
      amount: newItem.amount,
      description: newItem.description || null,
      notes: newItem.notes || null,
      periodStart: startDate,
      periodEnd: endDate,
    };

    addItemMutation.mutate(itemData);
  };

  const handleDeleteItem = (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this budget item? This action cannot be undone.')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const getAccountName = (accountId: number) => {
    const account = accounts?.find(acc => acc.id === accountId);
    return account ? `${account.code} - ${account.name}` : `Account #${accountId}`;
  };

  // Generate a simple budget report for export
  const generateReport = () => {
    if (!budget || !budgetItems) return '';
    
    const header = `Budget Report: ${budget.name}\nFiscal Year: ${budget.fiscalYear}\nPeriod: ${budget.periodType}\nTotal: $${budget.totalAmount}\n\n`;
    const items = budgetItems.map(item => {
      return `${getAccountName(item.accountId)}\n  Amount: $${parseFloat(item.amount).toLocaleString()}\n  Description: ${item.description || 'N/A'}\n  Notes: ${item.notes || 'N/A'}\n`;
    }).join('\n');
    
    return header + items;
  };

  const handleExportReport = () => {
    const reportText = generateReport();
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-report-${budgetId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoadingBudget) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budgets
          </Button>
          <CardTitle>Loading Budget Details...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!budget) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budgets
          </Button>
          <CardTitle>Budget Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested budget could not be found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="w-fit px-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Budgets
            </Button>
            <div className="flex space-x-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Budget Report</SheetTitle>
                    <SheetDescription>
                      Detailed report for {budget.name}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Summary</h3>
                      <div className="mt-2 space-y-1">
                        <p><strong>Budget Name:</strong> {budget.name}</p>
                        <p><strong>Fiscal Year:</strong> {budget.fiscalYear}</p>
                        <p><strong>Period Type:</strong> {budget.periodType}</p>
                        <p><strong>Status:</strong> {budget.status}</p>
                        <p><strong>Total Amount:</strong> ${budget.totalAmount.toLocaleString()}</p>
                        <p><strong>Created:</strong> {format(new Date(budget.createdAt), 'PPP')}</p>
                        <p><strong>Last Updated:</strong> {format(new Date(budget.updatedAt), 'PPP')}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold">Budget Items</h3>
                      <div className="mt-2 space-y-4">
                        {(budgetItems || []).map(item => (
                          <div key={item.id} className="rounded-md border p-3">
                            <p><strong>Account:</strong> {getAccountName(item.accountId)}</p>
                            <p><strong>Amount:</strong> ${parseFloat(item.amount).toLocaleString()}</p>
                            {item.description && <p><strong>Description:</strong> {item.description}</p>}
                            {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                          </div>
                        ))}
                        {(budgetItems || []).length === 0 && (
                          <p className="text-muted-foreground">No budget items found.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button onClick={handleExportReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <CardTitle>{budget.name}</CardTitle>
          <CardDescription>
            Fiscal Year {budget.fiscalYear} | {budget.periodType} budget | 
            Created on {format(new Date(budget.createdAt), 'MMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Budget Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm">{budget.status.toUpperCase()}</p>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="text-sm font-semibold">${budget.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <p className="text-sm">{format(new Date(budget.startDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <p className="text-sm">{format(new Date(budget.endDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Description</h3>
                <p className="text-sm text-muted-foreground">{budget.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Budget Items</h3>
              <Button onClick={() => setShowNewItemDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            
            {isLoadingItems ? (
              <p>Loading budget items...</p>
            ) : (
              <>
                {budgetItems && budgetItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{getAccountName(item.accountId)}</TableCell>
                          <TableCell>{item.description || 'N/A'}</TableCell>
                          <TableCell className="text-right">${parseFloat(item.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No budget items found. Add some items to your budget.</p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>
              Add a new item to your budget. Select an account and enter the amount.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select 
                value={newItem.accountId} 
                onValueChange={(value) => setNewItem({ ...newItem, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}