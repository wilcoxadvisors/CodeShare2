import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { enhancedConsolidationGroupSchema } from '@/lib/validation';
import { apiRequest } from '@/lib/queryClient';
import EntitySelector from './EntitySelector';

// Define currency options for the form
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
];

// Define period type options
const PERIOD_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' },
];

// Define report type options (allows multiple selection)
const REPORT_TYPE_OPTIONS = [
  { id: 'balance_sheet', label: 'Balance Sheet' },
  { id: 'income_statement', label: 'Income Statement' },
  { id: 'cash_flow', label: 'Cash Flow Statement' },
  { id: 'trial_balance', label: 'Trial Balance' },
];

// Create the form schema for consolidation groups
const consolidationGroupFormSchema = enhancedConsolidationGroupSchema;

// Infer the type from the schema
type ConsolidationGroupFormValues = z.infer<typeof consolidationGroupFormSchema>;

// Interfaces for our data
interface Entity {
  id: number;
  name: string;
  code: string;
  [key: string]: any;
}

interface ConsolidationGroup {
  id: number;
  name: string;
  description: string | null;
  currency: string;
  periodType: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: number;
  ownerId: number;
  entityIds: number[];
  reportTypes?: string[];
  rules?: any;
  createdAt: string;
  updatedAt: string | null;
  lastGeneratedAt: string | null;
}

// Main component
export default function ConsolidationSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [consolidationGroups, setConsolidationGroups] = useState<ConsolidationGroup[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ConsolidationGroup | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>([]);

  // Form setup
  const form = useForm<ConsolidationGroupFormValues>({
    resolver: zodResolver(consolidationGroupFormSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'USD',
      periodType: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
      isActive: true,
      entityIds: [],
      reportTypes: [],
    },
  });

  // Load consolidation groups and entities on component mount
  useEffect(() => {
    fetchConsolidationGroups();
    fetchEntities();
  }, []);

  // When selectedGroup changes, update the form values for editing
  useEffect(() => {
    if (selectedGroup && isEditMode) {
      form.reset({
        name: selectedGroup.name,
        description: selectedGroup.description || '',
        currency: selectedGroup.currency,
        periodType: selectedGroup.periodType,
        startDate: selectedGroup.startDate,
        endDate: selectedGroup.endDate,
        isActive: selectedGroup.isActive,
        entityIds: selectedGroup.entityIds,
        reportTypes: selectedGroup.reportTypes || [],
      });
      
      setSelectedReportTypes(selectedGroup.reportTypes || []);
    }
  }, [selectedGroup, isEditMode, form]);

  // Fetch consolidation groups from the API
  const fetchConsolidationGroups = async () => {
    try {
      const response = await apiRequest('/api/consolidation-groups', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setConsolidationGroups(data);
      }
    } catch (error) {
      console.error('Error fetching consolidation groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch consolidation groups. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Fetch entities from the API
  const fetchEntities = async () => {
    try {
      const response = await apiRequest('/api/entities', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch entities. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: ConsolidationGroupFormValues) => {
    setIsLoading(true);
    
    try {
      // Include selected report types
      data.reportTypes = selectedReportTypes;
      
      // Determine if we're creating or updating a group
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `/api/consolidation-groups/${selectedGroup?.id}` 
        : '/api/consolidation-groups';
      
      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast({
          title: isEditMode ? 'Group Updated' : 'Group Created',
          description: isEditMode
            ? 'The consolidation group has been updated successfully.'
            : 'The consolidation group has been created successfully.',
          variant: 'default',
        });
        
        // Refetch groups and reset form
        await fetchConsolidationGroups();
        resetForm();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving consolidation group:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'create'} consolidation group. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a consolidation group
  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this consolidation group?')) {
      return;
    }
    
    try {
      const response = await apiRequest(`/api/consolidation-groups/${groupId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: 'Group Deleted',
          description: 'The consolidation group has been deleted successfully.',
          variant: 'default',
        });
        
        // Refetch groups
        await fetchConsolidationGroups();
      }
    } catch (error) {
      console.error('Error deleting consolidation group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete consolidation group. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Edit a consolidation group
  const handleEditGroup = (group: ConsolidationGroup) => {
    setSelectedGroup(group);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Reset the form and state
  const resetForm = () => {
    form.reset({
      name: '',
      description: '',
      currency: 'USD',
      periodType: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
      isActive: true,
      entityIds: [],
      reportTypes: [],
    });
    setSelectedGroup(null);
    setIsEditMode(false);
    setSelectedReportTypes([]);
  };

  // Handle report type checkbox changes
  const handleReportTypeChange = (reportTypeId: string, checked: boolean) => {
    if (checked) {
      setSelectedReportTypes([...selectedReportTypes, reportTypeId]);
    } else {
      setSelectedReportTypes(selectedReportTypes.filter(id => id !== reportTypeId));
    }
  };

  // Helper to get entity name by ID
  const getEntityName = (entityId: number) => {
    const entity = entities.find(e => e.id === entityId);
    return entity ? `${entity.name} (${entity.code})` : `Entity ID: ${entityId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Consolidation Groups</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              Create New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Consolidation Group</DialogTitle>
              <DialogDescription>
                Set up a group of entities for consolidated financial reporting.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group name" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this consolidation group
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter a description for this group" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The currency for consolidated reports
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="periodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select period type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERIOD_TYPE_OPTIONS.map((period) => (
                              <SelectItem key={period.value} value={period.value}>
                                {period.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How often reports will be generated
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Active
                        </FormLabel>
                        <FormDescription>
                          Enable or disable this consolidation group
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel>Report Types</FormLabel>
                  <FormDescription className="mb-2">
                    Select which report types will be generated for this group
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_TYPE_OPTIONS.map((reportType) => (
                      <div key={reportType.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`report-type-${reportType.id}`}
                          checked={selectedReportTypes.includes(reportType.id)}
                          onCheckedChange={(checked) => 
                            handleReportTypeChange(reportType.id, checked === true)
                          }
                        />
                        <label
                          htmlFor={`report-type-${reportType.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {reportType.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="entityIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entities</FormLabel>
                      <FormDescription className="mb-2">
                        Select entities to include in this consolidation group
                      </FormDescription>
                      <FormControl>
                        <EntitySelector
                          entities={entities}
                          selectedEntityIds={field.value}
                          onChange={field.onChange}
                          allowMultiple={true}
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
                    onClick={() => {
                      resetForm();
                      setIsModalOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : isEditMode ? 'Update Group' : 'Create Group'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* List of consolidation groups */}
      {consolidationGroups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No consolidation groups have been created yet. Click "Create New Group" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {consolidationGroups.map((group) => (
            <Card key={group.id} className={group.isActive ? '' : 'opacity-70'}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group.isActive ? 'Active' : 'Inactive'} • {group.entityIds.length} entities
                    </CardDescription>
                  </div>
                  {group.isActive && (
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditGroup(group)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>
                    <span className="font-medium">Currency:</span>{' '}
                    {group.currency}
                  </div>
                  <div>
                    <span className="font-medium">Period:</span>{' '}
                    {group.periodType}
                  </div>
                  <div>
                    <span className="font-medium">Start Date:</span>{' '}
                    {new Date(group.startDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>{' '}
                    {new Date(group.endDate).toLocaleDateString()}
                  </div>
                </div>
                
                <h4 className="font-medium mb-2">Entities</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {group.entityIds.length > 0 ? (
                    group.entityIds.map((entityId) => (
                      <li key={entityId}>{getEntityName(entityId)}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No entities added</li>
                  )}
                </ul>
                
                {group.reportTypes && group.reportTypes.length > 0 && (
                  <>
                    <h4 className="font-medium mt-4 mb-2">Report Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {group.reportTypes.map((reportType) => {
                        const reportOption = REPORT_TYPE_OPTIONS.find(rt => rt.id === reportType);
                        return (
                          <span key={reportType} className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {reportOption?.label || reportType}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">View Reports</Button>
                <Button size="sm">Generate Report</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}