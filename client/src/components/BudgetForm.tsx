import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { BudgetPeriodType } from '@shared/schema';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

// Create form schema
const budgetFormSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  description: z.string().optional(),
  fiscalYear: z.coerce.number().min(2000, 'Enter a valid year').max(2100, 'Enter a valid year'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  periodType: z.enum([
    BudgetPeriodType.MONTHLY, 
    BudgetPeriodType.QUARTERLY, 
    BudgetPeriodType.ANNUAL, 
    BudgetPeriodType.CUSTOM
  ])
});

interface BudgetFormProps {
  entityId: number;
  onComplete: () => void;
  onCancel: () => void;
  existingBudget?: any; // For editing existing budgets
}

export default function BudgetForm({ entityId, onComplete, onCancel, existingBudget }: BudgetFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  
  // Set up form
  const form = useForm<z.infer<typeof budgetFormSchema>>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: existingBudget ? {
      name: existingBudget.name,
      description: existingBudget.description || '',
      fiscalYear: existingBudget.fiscalYear,
      startDate: existingBudget.startDate.substring(0, 10), // Format as YYYY-MM-DD
      endDate: existingBudget.endDate.substring(0, 10),     // Format as YYYY-MM-DD
      periodType: existingBudget.periodType,
    } : {
      name: `Budget ${currentYear}`,
      description: '',
      fiscalYear: currentYear,
      startDate: `${currentYear}-01-01`, // Default to current year's start
      endDate: `${currentYear}-12-31`,   // Default to current year's end
      periodType: BudgetPeriodType.MONTHLY,
    },
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof budgetFormSchema>) => {
      return apiRequest(`/api/entities/${entityId}/budgets`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Budget created',
        description: 'Your budget has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets'] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'There was an error creating your budget. Please try again.',
        variant: 'destructive',
      });
      console.error('Error creating budget:', error);
    },
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof budgetFormSchema>) => {
      return apiRequest(`/api/entities/${entityId}/budgets/${existingBudget.id}`, {
        method: 'PUT',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Budget updated',
        description: 'Your budget has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budgets', existingBudget.id] });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'There was an error updating your budget. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating budget:', error);
    },
  });

  const onSubmit = (data: z.infer<typeof budgetFormSchema>) => {
    if (existingBudget) {
      updateBudgetMutation.mutate(data);
    } else {
      createBudgetMutation.mutate(data);
    }
  };
  
  const isPending = createBudgetMutation.isPending || updateBudgetMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter budget name" {...field} />
              </FormControl>
              <FormDescription>
                Give your budget a descriptive name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="fiscalYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiscal Year</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="periodType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Period</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={BudgetPeriodType.MONTHLY} />
                    </FormControl>
                    <FormLabel className="font-normal">Monthly</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={BudgetPeriodType.QUARTERLY} />
                    </FormControl>
                    <FormLabel className="font-normal">Quarterly</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={BudgetPeriodType.ANNUAL} />
                    </FormControl>
                    <FormLabel className="font-normal">Annual</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={BudgetPeriodType.CUSTOM} />
                    </FormControl>
                    <FormLabel className="font-normal">Custom</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter budget description"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Additional details about this budget.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingBudget ? 'Update Budget' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </Form>
  );
}