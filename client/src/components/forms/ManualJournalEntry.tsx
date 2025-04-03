// src/components/forms/ManualJournalEntry.tsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useEntity } from '../../contexts/EntityContext';
import { AccountType } from '@shared/schema';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';

// Line type interfaces
interface JournalEntryLine {
  id: string;
  accountId: number | null;
  type: 'debit' | 'credit';
  amount: string;
  description: string | null;
  locationId?: number | null;
  departmentId?: number | null;
  projectId?: number | null;
}

// Journal entry interface
interface JournalEntryFormData {
  date: Date;
  clientId?: number;
  entityId?: number;
  description: string | null;
  referenceNumber: string | null;
  journalType: string;  // JE, AJ, SJ, CL
  lines: JournalEntryLine[];
}

// Validation errors interface
interface FormErrors {
  date?: string;
  description?: string;
  referenceNumber?: string;
  lines?: string;
  balance?: string;
  lineErrors?: Record<string, { 
    accountId?: string;
    amount?: string;
    type?: string;
  }>;
}

// Account interface for dropdowns
interface Account {
  id: number;
  name: string;
  code: string;
  type: AccountType;
  subtype?: string | null;
}

const ManualJournalEntry: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEntity, currentClient } = useEntity();
  
  // Generate a reference number
  const generateReference = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `JE-${year}${month}${day}-${random}`;
  };
  
  // Create empty line helper
  const createEmptyLine = (): JournalEntryLine => ({
    id: uuidv4(),
    accountId: null,
    type: 'debit',  // default to debit
    amount: '',
    description: null
  });
  
  // Initialize form state
  const [formData, setFormData] = useState<JournalEntryFormData>({
    date: new Date(),
    description: null,
    referenceNumber: generateReference(),
    journalType: 'JE',  // Default to General Journal
    lines: [createEmptyLine(), createEmptyLine()]  // Start with two empty lines
  });
  
  // UI state
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch accounts
  const { data: accounts = [] } = useQuery({
    queryKey: currentEntity 
      ? [`/api/entities/${currentEntity.id}/accounts`] 
      : ['no-entity-accounts'],
    enabled: !!currentEntity,
  });
  
  // Calculate totals and balance status
  const totals = {
    debit: formData.lines.reduce((sum, line) => {
      return line.type === 'debit' ? sum + parseFloat(line.amount || '0') : sum;
    }, 0),
    credit: formData.lines.reduce((sum, line) => {
      return line.type === 'credit' ? sum + parseFloat(line.amount || '0') : sum;
    }, 0)
  };
  
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.001 && (totals.debit > 0 || totals.credit > 0);
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date
      }));
      setShowCalendar(false);
      
      // Clear date error if it exists
      if (errors.date) {
        setErrors(prev => ({
          ...prev,
          date: undefined
        }));
      }
    }
  };
  
  // Handle basic field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // Handle journal type selection
  const handleJournalTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      journalType: value
    }));
  };
  
  // Handle line changes
  const handleLineChange = (id: string, field: keyof JournalEntryLine, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map(line => {
        if (line.id === id) {
          if (field === 'type') {
            // Reset amount if changing between debit/credit
            return {
              ...line,
              [field]: value,
              amount: ''
            };
          }
          return { ...line, [field]: value };
        }
        return line;
      })
    }));
    
    // Clear error for this line if it exists
    if (errors.lineErrors?.[id]?.[field as keyof (typeof errors.lineErrors)[string]]) {
      setErrors(prev => ({
        ...prev,
        lineErrors: {
          ...prev.lineErrors,
          [id]: {
            ...prev.lineErrors?.[id],
            [field]: undefined
          }
        }
      }));
    }
    
    // Clear balance error if it exists
    if (errors.balance) {
      setErrors(prev => ({
        ...prev,
        balance: undefined
      }));
    }
  };
  
  // Add a new line
  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, createEmptyLine()]
    }));
  };
  
  // Remove a line
  const removeLine = (id: string) => {
    if (formData.lines.length <= 2) {
      toast({
        title: "Cannot remove line",
        description: "Journal entries must have at least two lines",
        variant: "destructive"
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter(line => line.id !== id)
    }));
    
    // Remove any errors for this line
    if (errors.lineErrors?.[id]) {
      const newLineErrors = { ...errors.lineErrors };
      delete newLineErrors[id];
      setErrors(prev => ({
        ...prev,
        lineErrors: newLineErrors
      }));
    }
  };
  
  // Validate the form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      lineErrors: {}
    };
    let isValid = true;
    
    // Check date
    if (!formData.date) {
      newErrors.date = "Date is required";
      isValid = false;
    }
    
    // Check reference number
    if (!formData.referenceNumber) {
      newErrors.referenceNumber = "Reference number is required";
      isValid = false;
    }
    
    // Check lines
    formData.lines.forEach(line => {
      if (!newErrors.lineErrors) newErrors.lineErrors = {};
      
      // Check account
      if (!line.accountId) {
        if (!newErrors.lineErrors[line.id]) newErrors.lineErrors[line.id] = {};
        newErrors.lineErrors[line.id].accountId = "Account is required";
        isValid = false;
      }
      
      // Check amount
      if (!line.amount || parseFloat(line.amount) <= 0) {
        if (!newErrors.lineErrors[line.id]) newErrors.lineErrors[line.id] = {};
        newErrors.lineErrors[line.id].amount = "Amount must be greater than zero";
        isValid = false;
      }
    });
    
    // Check balance
    if (!isBalanced) {
      newErrors.balance = "Debits must equal credits";
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Submit form - create journal entry mutation
  const createJournalEntry = useMutation({
    mutationFn: (data: any) => apiRequest('/api/journal-entries', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Journal entry created successfully!",
      });
      
      // Reset form
      setFormData({
        date: new Date(),
        description: null,
        referenceNumber: generateReference(),
        journalType: 'JE',
        lines: [createEmptyLine(), createEmptyLine()]
      });
      
      // Invalidate queries
      if (currentEntity) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`]
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while creating the journal entry.",
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    if (!currentEntity || !currentClient) {
      toast({
        title: "Entity Required",
        description: "Please select an entity before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Format lines for API
    const lines = formData.lines.map(line => ({
      accountId: line.accountId,
      type: line.type,
      amount: line.amount,
      description: line.description,
      locationId: line.locationId,
      departmentId: line.departmentId,
      projectId: line.projectId
    }));
    
    // Submit the data
    createJournalEntry.mutate({
      date: format(formData.date, 'yyyy-MM-dd'),
      clientId: currentClient.id,
      entityId: currentEntity.id,
      description: formData.description,
      referenceNumber: formData.referenceNumber,
      journalType: formData.journalType,
      createdBy: 1, // Assuming user ID 1 is admin/current user
      lines
    });
    
    setIsSubmitting(false);
  };
  
  // If no entity is selected, show a message
  if (!currentEntity) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-muted-foreground">Please select an entity to create a journal entry.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Journal Entry</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Field */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <div className="relative">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${errors.date ? 'border-red-500' : ''}`}
                    >
                      {format(formData.date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>
            </div>
            
            {/* Reference Number Field */}
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number *</Label>
              <Input
                id="referenceNumber"
                name="referenceNumber"
                value={formData.referenceNumber || ''}
                onChange={handleChange}
                className={errors.referenceNumber ? 'border-red-500' : ''}
              />
              {errors.referenceNumber && <p className="text-red-500 text-sm mt-1">{errors.referenceNumber}</p>}
            </div>
            
            {/* Journal Type Field */}
            <div className="space-y-2">
              <Label htmlFor="journalType">Journal Type</Label>
              <Select
                value={formData.journalType}
                onValueChange={handleJournalTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JE">General Journal (JE)</SelectItem>
                  <SelectItem value="AJ">Adjusting Journal (AJ)</SelectItem>
                  <SelectItem value="SJ">Statistical Journal (SJ)</SelectItem>
                  <SelectItem value="CL">Closing Entry (CL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Description Field - Full Width */}
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Enter journal entry description"
                rows={2}
              />
            </div>
          </div>
          
          {/* Journal Entry Lines Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Journal Entry Lines</h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={addLine}
                className="flex items-center text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Add Line
              </Button>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Account *</TableHead>
                    <TableHead>Type *</TableHead>
                    <TableHead>Amount *</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.lines.map((line) => (
                    <TableRow key={line.id}>
                      {/* Account Selector */}
                      <TableCell>
                        <Select
                          value={line.accountId?.toString() || ''}
                          onValueChange={(value) => handleLineChange(line.id, 'accountId', parseInt(value))}
                        >
                          <SelectTrigger className={errors.lineErrors?.[line.id]?.accountId ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account: Account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.lineErrors?.[line.id]?.accountId && (
                          <p className="text-red-500 text-xs mt-1">{errors.lineErrors[line.id].accountId}</p>
                        )}
                      </TableCell>
                      
                      {/* Debit/Credit Selector */}
                      <TableCell>
                        <Select
                          value={line.type}
                          onValueChange={(value) => handleLineChange(line.id, 'type', value as 'debit' | 'credit')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debit</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      {/* Amount Field */}
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.amount}
                          onChange={(e) => handleLineChange(line.id, 'amount', e.target.value)}
                          className={`text-right ${errors.lineErrors?.[line.id]?.amount ? 'border-red-500' : ''}`}
                          placeholder="0.00"
                        />
                        {errors.lineErrors?.[line.id]?.amount && (
                          <p className="text-red-500 text-xs mt-1">{errors.lineErrors[line.id].amount}</p>
                        )}
                      </TableCell>
                      
                      {/* Description Field */}
                      <TableCell>
                        <Input
                          value={line.description || ''}
                          onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                          placeholder="Line description"
                        />
                      </TableCell>
                      
                      {/* Remove Line Button */}
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2} className="text-right font-medium">Totals</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex justify-between">
                        <span>Debit: ${totals.debit.toFixed(2)}</span>
                        <span>Credit: ${totals.credit.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              {/* Balance Status */}
              <div className="p-3 border-t">
                {errors.balance ? (
                  <p className="text-red-500 font-medium">{errors.balance}</p>
                ) : isBalanced && (totals.debit > 0 || totals.credit > 0) ? (
                  <p className="text-green-600 font-medium">✓ Entry is balanced</p>
                ) : (
                  <p className="text-yellow-600 font-medium">Entry must be balanced before submission</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Create Journal Entry'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ManualJournalEntry;