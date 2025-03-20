import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Pencil, Trash2, MoreVertical, FileSpreadsheet, Play, FileDigit } from 'lucide-react';
import { BudgetStatus } from '@shared/schema';
import BudgetDetail from './BudgetDetail';
import { Badge } from '@/components/ui/badge';

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

interface BudgetListProps {
  budgets: Budget[];
  entityId: number;
  onRefresh: () => void;
}

export default function BudgetList({ budgets, entityId, onRefresh }: BudgetListProps) {
  const { toast } = useToast();
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Delete budget mutation
  const deleteMutation = useMutation({
    mutationFn: async (budgetId: number) => {
      return apiRequest(`/api/entities/${entityId}/budgets/${budgetId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Budget deleted',
        description: 'The budget has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets'] });
      onRefresh();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error deleting the budget.',
        variant: 'destructive',
      });
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ budgetId, status }: { budgetId: number; status: string }) => {
      return apiRequest(`/api/entities/${entityId}/budgets/${budgetId}`, {
        method: 'PUT',
        body: { status },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Budget status updated',
        description: 'The budget status has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets'] });
      onRefresh();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error updating the budget status.',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (budgetId: number, newStatus: string) => {
    updateStatusMutation.mutate({ budgetId, status: newStatus });
  };

  const handleDelete = (budgetId: number) => {
    if (window.confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      deleteMutation.mutate(budgetId);
    }
  };

  const handleViewDetails = (budgetId: number) => {
    setSelectedBudgetId(budgetId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case BudgetStatus.DRAFT:
        return <Badge variant="outline">Draft</Badge>;
      case BudgetStatus.ACTIVE:
        return <Badge variant="default">Active</Badge>;
      case BudgetStatus.APPROVED:
        return <Badge variant="success">Approved</Badge>;
      case BudgetStatus.ARCHIVED:
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If the selected budget is open, show the detail view
  if (selectedBudgetId) {
    return (
      <BudgetDetail
        budgetId={selectedBudgetId}
        entityId={entityId}
        onBack={() => setSelectedBudgetId(null)}
      />
    );
  }

  if (budgets.length === 0) {
    return (
      <Alert className="mt-4">
        <AlertTitle>No budgets found</AlertTitle>
        <AlertDescription>
          You haven't created any budgets yet. Click the "Create Budget" button to get started.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        <CardDescription>Manage your organization's budgets.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Fiscal Year</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => (
              <TableRow key={budget.id}>
                <TableCell className="font-medium">{budget.name}</TableCell>
                <TableCell>{budget.fiscalYear}</TableCell>
                <TableCell>
                  {budget.periodType.charAt(0).toUpperCase() + budget.periodType.slice(1)}
                </TableCell>
                <TableCell>{getStatusBadge(budget.status)}</TableCell>
                <TableCell>${budget.totalAmount.toLocaleString()}</TableCell>
                <TableCell>{format(new Date(budget.createdAt), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetails(budget.id)}>
                        <FileDigit className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      
                      {budget.status === BudgetStatus.DRAFT && (
                        <DropdownMenuItem onClick={() => handleStatusChange(budget.id, BudgetStatus.ACTIVE)}>
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      
                      {budget.status === BudgetStatus.ACTIVE && (
                        <DropdownMenuItem onClick={() => handleStatusChange(budget.id, BudgetStatus.APPROVED)}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                      )}
                      
                      {budget.status !== BudgetStatus.ARCHIVED && (
                        <DropdownMenuItem onClick={() => handleStatusChange(budget.id, BudgetStatus.ARCHIVED)}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      
                      {budget.status === BudgetStatus.DRAFT && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(budget.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}