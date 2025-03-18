// src/components/ManualJournalEntry.tsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'wouter';
import { useEntity } from '../contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import PageHeader from '../components/PageHeader';
import JournalHeader from './journal/JournalHeader';
import JournalEntriesTable from './journal/JournalEntriesTable';
import ActionButtons from './journal/ActionButtons';
import { AccountType } from '@shared/schema';

interface JournalEntryLine {
  id: string;
  accountId: number;
  accountNo?: string;
  accountTitle?: string;
  description: string | null;
  reference?: string;
  debit: string;
  credit: string;
  vendor?: string;
  documentNo?: string;
  department?: string;
  project?: string;
  lineNo?: number;
}

interface JournalEntryData {
  date: string;
  reference: string;
  description: string | null;
  entries: JournalEntryLine[];
  files: File[];
}

interface EntryErrors {
  [key: string]: {
    accountId?: string;
    amount?: string;
  };
}

interface SupportingDocument {
  name: string;
  size: number;
  file: File;
}

export default function ManualJournalEntry() {
  const { currentEntity } = useEntity();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Query accounts
  const { data: accounts = [] } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : null,
    enabled: !!currentEntity
  });
  
  // State for journal entry form
  const [journalData, setJournalData] = useState<JournalEntryData>({
    date: new Date().toISOString().split('T')[0],
    reference: generateReference(),
    description: null,
    entries: [createEmptyLine(), createEmptyLine()],
    files: []
  });
  
  // UI state
  const [showDetailFields, setShowDetailFields] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportingDocs, setSupportingDocs] = useState<SupportingDocument[]>([]);
  
  // Validation errors
  const [errors, setErrors] = useState<{
    date?: string;
    reference?: string;
    description?: string;
    balance?: string;
  }>({});
  
  const [entryErrors, setEntryErrors] = useState<EntryErrors>({});
  
  // Calculate totals and balance status
  const totals = {
    debit: journalData.entries.reduce((sum, entry) => sum + parseFloat(entry.debit || '0'), 0),
    credit: journalData.entries.reduce((sum, entry) => sum + parseFloat(entry.credit || '0'), 0),
    isBalanced: false
  };
  
  totals.isBalanced = Math.abs(totals.debit - totals.credit) < 0.001 && totals.debit > 0;
  
  // Create a new empty journal entry line
  function createEmptyLine(): JournalEntryLine {
    return {
      id: uuidv4(),
      accountId: 0,
      description: null,
      debit: '',
      credit: '',
      lineNo: journalData.entries.length + 1
    };
  }
  
  // Generate a reference number for the journal entry
  function generateReference(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `JE-${year}${month}${day}-${random}`;
  }
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJournalData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle journal entry line changes
  const handleEntryChange = (id: string, field: string, value: string) => {
    setJournalData(prev => ({
      ...prev,
      entries: prev.entries.map(entry => {
        if (entry.id === id) {
          // If changing debit and there's a value in credit, clear credit
          if (field === 'debit' && parseFloat(value) > 0 && parseFloat(entry.credit) > 0) {
            return { ...entry, [field]: value, credit: '' };
          }
          // If changing credit and there's a value in debit, clear debit
          if (field === 'credit' && parseFloat(value) > 0 && parseFloat(entry.debit) > 0) {
            return { ...entry, [field]: value, debit: '' };
          }
          return { ...entry, [field]: value };
        }
        return entry;
      })
    }));
    
    // Clear any errors for this field
    if (entryErrors[id]?.[field as keyof typeof entryErrors[0]]) {
      const newEntryErrors = { ...entryErrors };
      delete newEntryErrors[id][field as keyof typeof entryErrors[0]];
      setEntryErrors(newEntryErrors);
    }
  };
  
  // Handle account selection
  const handleAccountSelect = (id: string, accountId: number) => {
    const account = accounts.find((a: any) => a.id === accountId);
    
    if (account) {
      setJournalData(prev => ({
        ...prev,
        entries: prev.entries.map(entry => {
          if (entry.id === id) {
            return { 
              ...entry, 
              accountId, 
              accountNo: account.code, 
              accountTitle: account.name 
            };
          }
          return entry;
        })
      }));
    }
  };
  
  // Add a new journal entry line
  const addEntryRow = () => {
    setJournalData(prev => ({
      ...prev,
      entries: [...prev.entries, createEmptyLine()]
    }));
  };
  
  // Remove a journal entry line
  const removeEntryRow = (id: string) => {
    if (journalData.entries.length <= 2) {
      toast({
        title: "Cannot remove line",
        description: "Journal entries must have at least two lines",
        variant: "destructive"
      });
      return;
    }
    
    setJournalData(prev => ({
      ...prev,
      entries: prev.entries.filter(entry => entry.id !== id)
                          .map((entry, index) => ({ ...entry, lineNo: index + 1 }))
    }));
    
    // Clear any errors for this entry
    if (entryErrors[id]) {
      const newEntryErrors = { ...entryErrors };
      delete newEntryErrors[id];
      setEntryErrors(newEntryErrors);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Add file to supporting documents
    setSupportingDocs(prev => [...prev, {
      name: file.name,
      size: file.size,
      file
    }]);
    
    // Add file to journalData.files for submission
    setJournalData(prev => ({
      ...prev,
      files: [...prev.files, file]
    }));
  };
  
  // Optional: subledger badges for display
  const getSubledgerBadge = (accountNo?: string) => {
    if (!accountNo) return null;
    
    const account = accounts.find((a: any) => a.code === accountNo);
    if (account?.isSubledger) {
      return (
        <span className="absolute right-2 top-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
          Subledger
        </span>
      );
    }
    return null;
  };
  
  // Validate form before submission
  const validateForm = () => {
    let isValid = true;
    const newErrors = {} as any;
    const newEntryErrors = {} as EntryErrors;
    
    // Validate header fields
    if (!journalData.date) {
      newErrors.date = "Date is required";
      isValid = false;
    }
    
    if (!journalData.reference) {
      newErrors.reference = "Reference is required";
      isValid = false;
    }
    
    // Validate entry lines
    journalData.entries.forEach((entry, index) => {
      newEntryErrors[entry.id] = {};
      
      if (!entry.accountId) {
        newEntryErrors[entry.id].accountId = "Account is required";
        isValid = false;
      }
      
      if (parseFloat(entry.debit || '0') === 0 && parseFloat(entry.credit || '0') === 0) {
        newEntryErrors[entry.id].amount = "Debit or credit amount is required";
        isValid = false;
      }
    });
    
    // Validate balance
    if (!totals.isBalanced) {
      newErrors.balance = "Journal entry must be balanced (debits must equal credits)";
      isValid = false;
    }
    
    setErrors(newErrors);
    setEntryErrors(newEntryErrors);
    return isValid;
  };
  
  // Submit the journal entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEntity) {
      toast({
        title: "Error",
        description: "Please select an entity",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors before submitting",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format entries for submission
      const formattedEntries = journalData.entries.map(entry => ({
        accountId: entry.accountId,
        description: entry.description,
        debit: entry.debit || '0',
        credit: entry.credit || '0'
      }));
      
      // Create journal entry
      const response = await apiRequest(`/api/entities/${currentEntity.id}/journal-entries`, {
        method: 'POST',
        data: {
          date: journalData.date,
          reference: journalData.reference,
          description: journalData.description,
          status: 'draft', // Default status
          lines: formattedEntries
        }
      });
      
      // Upload supporting documents if any
      if (journalData.files.length > 0 && response.id) {
        const formData = new FormData();
        journalData.files.forEach(file => {
          formData.append('files', file);
        });
        
        await apiRequest(`/api/entities/${currentEntity.id}/journal-entries/${response.id}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          data: formData
        });
      }
      
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
      
      // Navigate back to journal entries list
      setLocation("/journal-entries");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create journal entry. Please try again.",
        variant: "destructive"
      });
      console.error("Error creating journal entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render the component
  if (!currentEntity) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">
            <h1 className="text-xl font-semibold text-gray-900">Please select an entity to continue</h1>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Create Journal Entry"
        description="Create a new manual journal entry"
      />
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <JournalHeader
          journalData={journalData}
          errors={errors}
          handleChange={handleChange}
          showAdvancedFields={showAdvancedFields}
          setShowAdvancedFields={setShowAdvancedFields}
        />
        
        <div className="mt-6">
          <JournalEntriesTable
            journalData={journalData}
            entryErrors={entryErrors}
            handleEntryChange={handleEntryChange}
            handleAccountSelect={handleAccountSelect}
            removeEntryRow={removeEntryRow}
            totals={totals}
            errors={errors}
            showDetailFields={showDetailFields}
            setShowDetailFields={setShowDetailFields}
            showAdvancedFields={showAdvancedFields}
            accountsList={accounts}
            getSubledgerBadge={getSubledgerBadge}
          />
        </div>
        
        <ActionButtons
          addEntryRow={addEntryRow}
          supportingDocs={supportingDocs}
          handleFileUpload={handleFileUpload}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}