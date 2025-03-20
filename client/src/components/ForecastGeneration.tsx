import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { BudgetPeriodType } from '@shared/schema';
import { addMonths, format } from 'date-fns';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Create form schema
const forecastFormSchema = z.object({
  name: z.string().min(1, 'Forecast name is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  periodType: z.enum([
    BudgetPeriodType.MONTHLY, 
    BudgetPeriodType.QUARTERLY, 
    BudgetPeriodType.ANNUAL
  ]),
  baseScenario: z.boolean().default(true),
  scenarioType: z.enum(['optimistic', 'pessimistic', 'realistic']).default('realistic'),
  confidenceInterval: z.string().default('95'),
  useBudgetData: z.boolean().default(false),
  budgetId: z.string().optional(),
  useHistoricalData: z.boolean().default(true),
  historyMonths: z.number().min(3).max(60).default(12),
  aiAssisted: z.boolean().default(false),
});

type ForecastFormSchema = z.infer<typeof forecastFormSchema>;

interface ForecastGenerationProps {
  entityId: number;
  onComplete: () => void;
  onCancel: () => void;
  hasXaiIntegration: boolean;
}

export default function ForecastGeneration({ 
  entityId, 
  onComplete, 
  onCancel,
  hasXaiIntegration 
}: ForecastGenerationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Current date info
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const nextYear = currentYear + 1;
  
  // Get budgets for dropdown selection
  const { data: budgets } = useQuery({
    queryKey: ['/api/entities', entityId, 'budgets'],
    enabled: !!entityId,
  });
  
  // Set up form
  const form = useForm<ForecastFormSchema>({
    resolver: zodResolver(forecastFormSchema),
    defaultValues: {
      name: `Forecast ${currentYear}-${nextYear}`,
      description: '',
      startDate: format(new Date(currentYear, currentMonth, 1), 'yyyy-MM-dd'),
      endDate: format(new Date(nextYear, currentMonth, 0), 'yyyy-MM-dd'),
      periodType: BudgetPeriodType.MONTHLY,
      baseScenario: true,
      scenarioType: 'realistic',
      confidenceInterval: '95',
      useBudgetData: false,
      useHistoricalData: true,
      historyMonths: 12,
      aiAssisted: false,
    },
  });

  const watchUseBudgetData = form.watch('useBudgetData');
  const watchAiAssisted = form.watch('aiAssisted');
  
  // Generate forecast mutation
  const generateForecastMutation = useMutation({
    mutationFn: async (formData: ForecastFormSchema) => {
      setIsGenerating(true);
      
      // First generate the forecast data
      const generateResponse = await apiRequest(`/api/entities/${entityId}/forecasts/generate`, {
        method: 'POST',
        body: {
          ...formData,
          budgetId: formData.useBudgetData && formData.budgetId 
            ? parseInt(formData.budgetId) 
            : undefined,
          historyMonths: formData.useHistoricalData 
            ? formData.historyMonths 
            : undefined,
        },
      });
      
      // Then create the forecast with the generated data
      return apiRequest(`/api/entities/${entityId}/forecasts/create-from-generated`, {
        method: 'POST',
        body: {
          ...formData,
          forecastData: generateResponse.forecastData,
          modelConfig: generateResponse.modelConfig,
          aiGenerated: formData.aiAssisted,
          budgetId: formData.useBudgetData && formData.budgetId 
            ? parseInt(formData.budgetId) 
            : undefined,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Forecast generated',
        description: 'Your forecast has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'forecasts'] });
      setIsGenerating(false);
      onComplete();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'There was an error generating your forecast. Please try again.',
        variant: 'destructive',
      });
      console.error('Error generating forecast:', error);
      setIsGenerating(false);
    },
  });

  const onSubmit = (data: ForecastFormSchema) => {
    if (data.aiAssisted && !hasXaiIntegration) {
      toast({
        title: 'XAI Integration Required',
        description: 'To use AI-assisted forecasting, you need to set up XAI integration first.',
        variant: 'destructive',
      });
      return;
    }
    
    generateForecastMutation.mutate(data);
  };
  
  const isPending = isGenerating || generateForecastMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forecast Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter forecast name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
                  <FormLabel>Forecast Period</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={BudgetPeriodType.MONTHLY}>Monthly</SelectItem>
                      <SelectItem value={BudgetPeriodType.QUARTERLY}>Quarterly</SelectItem>
                      <SelectItem value={BudgetPeriodType.ANNUAL}>Annual</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Enter forecast description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="baseScenario"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Base Scenario</FormLabel>
                    <FormDescription>
                      Mark this as your base forecast scenario
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="scenarioType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Scenario Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="optimistic" />
                        </FormControl>
                        <FormLabel className="font-normal">Optimistic</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="realistic" />
                        </FormControl>
                        <FormLabel className="font-normal">Realistic</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="pessimistic" />
                        </FormControl>
                        <FormLabel className="font-normal">Pessimistic</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confidenceInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence Interval: {field.value}%</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select confidence interval" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Statistical confidence level for forecast projections
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data Sources</h3>
              
              <FormField
                control={form.control}
                name="useHistoricalData"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use Historical Data</FormLabel>
                      <FormDescription>
                        Include historical transaction data in forecast calculations
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {form.watch('useHistoricalData') && (
                <FormField
                  control={form.control}
                  name="historyMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Months of History: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={3}
                          max={60}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of months of historical data to use
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="useBudgetData"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use Budget Data</FormLabel>
                      <FormDescription>
                        Include budget data as a baseline for forecast calculations
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {watchUseBudgetData && (
                <FormField
                  control={form.control}
                  name="budgetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Budget</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a budget" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {budgets?.map((budget: any) => (
                            <SelectItem key={budget.id} value={budget.id.toString()}>
                              {budget.name} ({budget.fiscalYear})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {hasXaiIntegration && (
                <FormField
                  control={form.control}
                  name="aiAssisted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>AI-Assisted</FormLabel>
                        <FormDescription>
                          Use XAI to enhance forecast accuracy and generate insights
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}
              
              {watchAiAssisted && !hasXaiIntegration && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>XAI Integration Required</AlertTitle>
                  <AlertDescription>
                    To use AI-assisted forecasting, you need to set up XAI integration first.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Generating Forecast...' : 'Generate Forecast'}
          </Button>
        </div>
      </form>
    </Form>
  );
}