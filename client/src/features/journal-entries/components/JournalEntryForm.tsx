import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { JournalEntryStatus, AccountType } from '@shared/schema';

// Define local Account interface compatible with the component needs
interface Account {
  id: number;
  code: string;
  name: string;
  entityId: number;
  type: AccountType;
  description: string | null;
  active: boolean;
  createdAt?: Date;
  subtype?: string | null;
  isSubledger?: boolean;
  subledgerType?: string | null;
  parentId?: number | null;
  [key: string]: any;
}
import { X, Plus, FileUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { z } from 'zod';
import { validateForm } from '@/lib/validation';

interface Location {
  id: number;
  name: string;
  code?: string;
  description?: string | null;
  active: boolean;
}

interface Entity {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
}

interface JournalEntryFormProps {
  entityId: number;
  clientId?: number;  // Added clientId support
  accounts: Account[];
  locations?: Location[]; // Kept for interface compatibility but not used
  onSubmit: () => void;
  onCancel: () => void;
  existingEntry?: any;
  entities?: Entity[];
}

interface JournalLine {
  id?: number;
  accountId: string;
  entityCode: string; // Added for intercompany support
  description: string;
  debit: string;
  credit: string;
  locationId?: string;
}

// Form validation schema
const FormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().min(3, "Reference must be at least 3 characters"),
  description: z.string().optional(),
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).default('JE'),
  supDocId: z.string().optional(),
  reversalDate: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.string().min(1, "Account is required"),
    entityCode: z.string().min(1, "Entity code is required for intercompany support"),
    description: z.string().optional(),
    debit: z.string(),
    credit: z.string(),
    locationId: z.string().optional()
  }))
  .min(2, "Journal entry must have at least 2 lines")
  .refine(lines => {
    // Check if there's at least one debit and one credit line
    const hasDebit = lines.some(line => parseFloat(line.debit) > 0);
    const hasCredit = lines.some(line => parseFloat(line.credit) > 0);
    return hasDebit && hasCredit;
  }, {
    message: "Journal entry must have at least one debit and one credit line"
  })
  .refine(lines => {
    // Check if debits equal credits
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.001;
  }, {
    message: "Total debits must equal total credits"
  })
  .refine(lines => {
    // Check if debits equal credits for each entity code (intercompany validation)
    const entityCodesArray = lines.map(line => line.entityCode);
    const uniqueEntityCodes = entityCodesArray.filter((code, index) => entityCodesArray.indexOf(code) === index);
    
    return uniqueEntityCodes.every(entityCode => {
      const entityLines = lines.filter(line => line.entityCode === entityCode);
      const entityDebit = entityLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
      const entityCredit = entityLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
      return Math.abs(entityDebit - entityCredit) < 0.001;
    });
  }, {
    message: "Debits must equal credits for each entity (intercompany balancing)"
  })
});

function JournalEntryForm({ entityId, clientId, accounts, locations = [], entities = [], onSubmit, onCancel, existingEntry }: JournalEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing] = useState(!!existingEntry);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [journalData, setJournalData] = useState({
    reference: existingEntry?.reference || generateReference(),
    date: existingEntry?.date ? new Date(existingEntry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    description: existingEntry?.description || '',
    status: existingEntry?.status || JournalEntryStatus.DRAFT,
    journalType: existingEntry?.journalType || 'JE',
    supDocId: existingEntry?.supDocId || '',
    reversalDate: existingEntry?.reversalDate ? new Date(existingEntry.reversalDate).toISOString().split('T')[0] : '',
  });
  
  // Get default entity code from entities list based on current entityId
  const defaultEntityCode = React.useMemo(() => {
    if (entities && entities.length > 0) {
      const currentEntity = entities.find(entity => entity.id === entityId);
      return currentEntity ? currentEntity.code : '';
    }
    return '';
  }, [entities, entityId]);

  const [lines, setLines] = useState<JournalLine[]>(
    existingEntry?.lines || [
      { accountId: '', entityCode: defaultEntityCode, description: '', debit: '', credit: '', locationId: 'none' },
      { accountId: '', entityCode: defaultEntityCode, description: '', debit: '', credit: '', locationId: 'none' }
    ]
  );
  
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
  
  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001;
  
  // Calculate entity balances for intercompany validation
  const getEntityBalances = () => {
    // Get unique entity codes without using Set
    const entityCodesArray = lines.map(line => line.entityCode);
    const uniqueEntityCodes = entityCodesArray.filter((code, index) => entityCodesArray.indexOf(code) === index);
    
    return uniqueEntityCodes.map(code => {
      const entityLines = lines.filter(line => line.entityCode === code);
      const entityDebit = entityLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
      const entityCredit = entityLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
      const entityDifference = Math.abs(entityDebit - entityCredit);
      const entityBalanced = entityDifference < 0.001;
      
      return {
        entityCode: code,
        debit: entityDebit,
        credit: entityCredit,
        difference: entityDifference,
        balanced: entityBalanced
      };
    });
  };
  
  const entityBalances = getEntityBalances();
  
  function generateReference() {
    const date = new Date();
    const year = date.getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
    return `JE-${year}-${randomNum}`;
  }
  
  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      console.log('Journal entry submission data:', JSON.stringify(data));
      return await apiRequest(
        `/api/journal-entries`,
        {
          method: "POST",
          data
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Journal entry created",
        description: "The journal entry has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/general-ledger`] });
      onSubmit();
    },
    onError: (error: any) => {
      // Handle structured API errors
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        
        // Format field errors from API
        const formattedErrors: Record<string, string> = {};
        
        apiErrors.forEach((err: any) => {
          const path = err.path.split('.');
          
          // Handle array paths like lines[0].accountId
          if (path[0] === 'lines' && path.length > 1) {
            const match = path[1].match(/\[(\d+)\]/);
            if (match) {
              const lineIndex = parseInt(match[1]);
              const fieldName = path[2] || 'field';
              formattedErrors[`line_${lineIndex}_${fieldName}`] = err.message;
            }
          } else {
            formattedErrors[path[0]] = err.message;
          }
        });
        
        setFieldErrors(formattedErrors);
        setFormError("Please correct the errors in the form.");
      } else {
        // Generic error
        toast({
          title: "Error",
          description: `Failed to create journal entry: ${error.message}`,
          variant: "destructive",
        });
        setFormError(error.message || "An error occurred while creating the journal entry.");
      }
    }
  });
  
  const updateEntry = useMutation({
    mutationFn: async (data: any) => {
      console.log('Journal entry update data:', JSON.stringify(data));
      return await apiRequest(
        `/api/journal-entries/${existingEntry?.id}`,
        {
          method: "PUT",
          data
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Journal entry updated",
        description: "The journal entry has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/general-ledger`] });
      onSubmit();
    },
    onError: (error: any) => {
      // Similar error handling as in createEntry
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const formattedErrors: Record<string, string> = {};
        
        apiErrors.forEach((err: any) => {
          const path = err.path.split('.');
          if (path[0] === 'lines' && path.length > 1) {
            const match = path[1].match(/\[(\d+)\]/);
            if (match) {
              const lineIndex = parseInt(match[1]);
              const fieldName = path[2] || 'field';
              formattedErrors[`line_${lineIndex}_${fieldName}`] = err.message;
            }
          } else {
            formattedErrors[path[0]] = err.message;
          }
        });
        
        setFieldErrors(formattedErrors);
        setFormError("Please correct the errors in the form.");
      } else {
        toast({
          title: "Error",
          description: `Failed to update journal entry: ${error.message}`,
          variant: "destructive",
        });
        setFormError(error.message || "An error occurred while updating the journal entry.");
      }
    }
  });

  const handleSubmit = (saveAsDraft: boolean = true) => {
    // Clear previous errors
    setFormError(null);
    setFieldErrors({});
    
    // Prepare data for validation - only keep lines with account or debit/credit values
    const validLines = lines.filter(line => 
      line.accountId || parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0
    );
    
    const formData = {
      ...journalData,
      lines: validLines
    };
    
    // Validate form data
    const validation = validateForm(formData, FormSchema);
    
    if (!validation.valid) {
      setFieldErrors(validation.errors || {});
      setFormError("Please correct the errors in the form.");
      return;
    }
    
    // Format data for submission
    const formattedLines = validLines.map(line => ({
      accountId: parseInt(line.accountId),
      entityCode: line.entityCode || defaultEntityCode,
      description: line.description,
      debit: line.debit || '0',
      credit: line.credit || '0',
      locationId: line.locationId && line.locationId !== 'none' ? parseInt(line.locationId) : null,
      entityId
    }));
    
    // Use passed clientId or get from accounts as fallback
    const resolvedClientId = clientId || (accounts.length > 0 ? accounts[0].clientId : null);
    
    if (!resolvedClientId) {
      setFormError("Error: Unable to determine client ID. Please refresh the page and try again.");
      return;
    }
    
    const entryData = {
      ...journalData,
      clientId: resolvedClientId,
      entityId,
      status: saveAsDraft ? JournalEntryStatus.DRAFT : JournalEntryStatus.POSTED,
      createdBy: user?.id,
      lines: formattedLines
    };
    
    if (isEditing) {
      updateEntry.mutate(entryData);
    } else {
      createEntry.mutate(entryData);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJournalData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user changes the value
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  const handleLineChange = (index: number, field: string, value: string) => {
    const updatedLines = [...lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    
    // If setting debit and it's positive, clear credit
    if (field === 'debit' && parseFloat(value) > 0) {
      updatedLines[index].credit = '';
    }
    
    // If setting credit and it's positive, clear debit
    if (field === 'credit' && parseFloat(value) > 0) {
      updatedLines[index].debit = '';
    }
    
    setLines(updatedLines);
    
    // Clear field error when user changes the value
    const errorKey = `line_${index}_${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[errorKey];
        return updated;
      });
    }
  };
  
  const addLine = () => {
    setLines([...lines, { accountId: '', entityCode: defaultEntityCode, description: '', debit: '', credit: '', locationId: 'none' }]);
  };
  
  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast({
        title: "Cannot remove line",
        description: "Journal entries must have at least two lines.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedLines = [...lines];
    updatedLines.splice(index, 1);
    setLines(updatedLines);
    
    // Remove any errors associated with this line
    const updatedErrors = { ...fieldErrors };
    Object.keys(updatedErrors).forEach(key => {
      if (key.startsWith(`line_${index}_`)) {
        delete updatedErrors[key];
      }
      
      // Reindex higher indexed errors
      for (let i = index + 1; i < lines.length; i++) {
        const oldKey = `line_${i}_`;
        const newKey = `line_${i-1}_`;
        
        Object.keys(updatedErrors).forEach(errKey => {
          if (errKey.startsWith(oldKey)) {
            const field = errKey.substring(oldKey.length);
            updatedErrors[`${newKey}${field}`] = updatedErrors[errKey];
            delete updatedErrors[errKey];
          }
        });
      }
    });
    
    setFieldErrors(updatedErrors);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "The file size cannot exceed 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPEG, PNG, and PDF files are supported.",
          variant: "destructive",
        });
        return;
      }
      
      setSupportingDoc(file);
    }
  };
  
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        {isEditing ? 'Edit Journal Entry' : 'Manual Journal Entry'}
      </h3>
      
      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label htmlFor="reference">Journal ID</Label>
          <Input
            id="reference"
            name="reference"
            value={journalData.reference}
            onChange={handleChange}
            className={`mt-1 ${fieldErrors.reference ? 'border-red-500' : ''}`}
            readOnly
          />
          {fieldErrors.reference && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.reference}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={journalData.date}
            onChange={handleChange}
            className={`mt-1 ${fieldErrors.date ? 'border-red-500' : ''}`}
          />
          {fieldErrors.date && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.date}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="reference-number">Reference</Label>
          <Input
            id="reference-number"
            name="referenceNumber"
            placeholder="Invoice #, Check #, etc."
            className="mt-1"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={journalData.description}
          onChange={handleChange}
          rows={2}
          placeholder="Enter a description for this journal entry"
          className={`mt-1 ${fieldErrors.description ? 'border-red-500' : ''}`}
        />
        {fieldErrors.description && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.description}</p>
        )}
      </div>
      
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity Code</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {lines.map((line, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select 
                    value={line.accountId} 
                    onValueChange={(value) => handleLineChange(index, 'accountId', value)}
                  >
                    <SelectTrigger className={fieldErrors[`line_${index}_accountId`] ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(account => account.active)
                        .map(account => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors[`line_${index}_accountId`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_accountId`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select 
                    value={line.entityCode} 
                    onValueChange={(value) => handleLineChange(index, 'entityCode', value)}
                  >
                    <SelectTrigger className={fieldErrors[`line_${index}_entityCode`] ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select Entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities
                        .filter(entity => entity.active)
                        .map(entity => (
                        <SelectItem key={entity.id} value={entity.code}>
                          {entity.code} - {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors[`line_${index}_entityCode`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_entityCode`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                    placeholder="Line description"
                    className={fieldErrors[`line_${index}_description`] ? 'border-red-500' : ''}
                  />
                  {fieldErrors[`line_${index}_description`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_description`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    placeholder="0.00"
                    className={fieldErrors[`line_${index}_debit`] ? 'border-red-500' : ''}
                  />
                  {fieldErrors[`line_${index}_debit`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_debit`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    placeholder="0.00"
                    className={fieldErrors[`line_${index}_credit`] ? 'border-red-500' : ''}
                  />
                  {fieldErrors[`line_${index}_credit`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_credit`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select 
                    value={line.locationId || ''} 
                    onValueChange={(value) => handleLineChange(index, 'locationId', value)}
                  >
                    <SelectTrigger className={fieldErrors[`line_${index}_locationId`] ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Location</SelectItem>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.code ? `${location.code} - ` : ''}{location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors[`line_${index}_locationId`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_locationId`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    className="text-red-600 hover:text-red-900"
                    onClick={() => removeLine(index)}
                    aria-label="Remove line"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          
          <tfoot>
            <tr>
              <td colSpan={6} className="px-6 py-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addLine}
                  className="inline-flex items-center"
                >
                  <Plus className="-ml-0.5 mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </td>
            </tr>
            
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Totals:</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
            
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Difference:</td>
              <td colSpan={2} className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
            
            {/* Entity Balance Summary Section - Intercompany Validation */}
            {entityBalances.length > 1 && (
              <>
                <tr className="bg-gray-100">
                  <td colSpan={6} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity Balance Summary (Intercompany)
                  </td>
                </tr>
                {entityBalances.map((balance) => (
                  <tr key={balance.entityCode} className="bg-gray-50">
                    <td colSpan={2} className="px-6 py-2 text-right text-xs font-medium text-gray-900">
                      Entity {balance.entityCode}:
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      DR: {balance.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      CR: {balance.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className={`px-6 py-2 whitespace-nowrap text-xs font-medium ${balance.balanced ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.balanced ? 'Balanced' : `Difference: ${balance.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tfoot>
        </table>
      </div>

      <div className="mt-4">
        <Label htmlFor="file-upload">Supporting Documents</Label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <FileUp className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                <span>Upload a file</span>
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file"
                  onChange={handleFileChange}
                  className="sr-only" 
                  accept="image/jpeg,image/png,application/pdf"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, PDF up to 10MB
            </p>
            {supportingDoc && (
              <p className="text-sm text-primary-600">{supportingDoc.name}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={createEntry.isPending || updateEntry.isPending}
        >
          Cancel
        </Button>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleSubmit(true)}
            disabled={createEntry.isPending || updateEntry.isPending}
          >
            {createEntry.isPending || updateEntry.isPending ? 'Saving...' : 'Save as Draft'}
          </Button>
          
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleSubmit(false)}
            disabled={createEntry.isPending || updateEntry.isPending || !isBalanced}
          >
            {createEntry.isPending || updateEntry.isPending ? 'Posting...' : 'Post Journal Entry'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JournalEntryForm;
