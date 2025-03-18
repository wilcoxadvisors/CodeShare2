import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Account, JournalEntryStatus } from '@shared/schema';
import { X, Plus, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface JournalEntryFormProps {
  entityId: number;
  accounts: Account[];
  onSubmit: () => void;
  onCancel: () => void;
  existingEntry?: any;
}

interface JournalLine {
  id?: number;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

function JournalEntryForm({ entityId, accounts, onSubmit, onCancel, existingEntry }: JournalEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing] = useState(!!existingEntry);
  const [journalData, setJournalData] = useState({
    reference: existingEntry?.reference || generateReference(),
    date: existingEntry?.date ? new Date(existingEntry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    description: existingEntry?.description || '',
    status: existingEntry?.status || JournalEntryStatus.DRAFT,
  });
  
  const [lines, setLines] = useState<JournalLine[]>(
    existingEntry?.lines || [
      { accountId: '', description: '', debit: '', credit: '' },
      { accountId: '', description: '', debit: '', credit: '' }
    ]
  );
  
  const [supportingDoc, setSupportingDoc] = useState<File | null>(null);
  
  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001;
  
  function generateReference() {
    const date = new Date();
    const year = date.getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
    return `JE-${year}-${randomNum}`;
  }
  
  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        "POST", 
        `/api/entities/${entityId}/journal-entries`, 
        data
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
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create journal entry: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const updateEntry = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        "PUT", 
        `/api/entities/${entityId}/journal-entries/${existingEntry.id}`, 
        data
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
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update journal entry: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (saveAsDraft: boolean = true) => {
    // Validate form
    if (!journalData.date) {
      toast({
        title: "Validation Error",
        description: "Please enter a date for this journal entry.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate lines
    const validLines = lines.filter(line => line.accountId && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0));
    if (validLines.length < 2) {
      toast({
        title: "Validation Error",
        description: "You need at least two lines for a valid journal entry.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if balanced
    if (!isBalanced) {
      toast({
        title: "Validation Error",
        description: "Journal entry is unbalanced. Total debits must equal total credits.",
        variant: "destructive",
      });
      return;
    }
    
    // Format data for submission
    const formattedLines = validLines.map(line => ({
      accountId: parseInt(line.accountId),
      description: line.description,
      debit: line.debit || '0',
      credit: line.credit || '0',
      entityId
    }));
    
    const entryData = {
      ...journalData,
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
  };
  
  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: '', credit: '' }]);
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
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSupportingDoc(e.target.files[0]);
    }
  };
  
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        {isEditing ? 'Edit Journal Entry' : 'Manual Journal Entry'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label htmlFor="reference">Journal ID</Label>
          <Input
            id="reference"
            name="reference"
            value={journalData.reference}
            onChange={handleChange}
            className="mt-1"
            readOnly
          />
        </div>
        
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={journalData.date}
            onChange={handleChange}
            className="mt-1"
          />
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
          className="mt-1"
        />
      </div>
      
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select Account</SelectItem>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                    placeholder="Line description"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.01"
                    value={line.debit}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    step="0.01"
                    value={line.credit}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    className="text-red-600 hover:text-red-900"
                    onClick={() => removeLine(index)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          
          <tfoot>
            <tr>
              <td colSpan={5} className="px-6 py-4">
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
              <td colSpan={2} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Totals:</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
            
            <tr className="bg-gray-50">
              <td colSpan={2} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Difference:</td>
              <td colSpan={2} className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
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
