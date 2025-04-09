import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useEntity } from '@/contexts/EntityContext';
import { JournalEntryStatus } from '@shared/schema';

// Define line item interface for journal entry lines
export interface JournalLine {
  id?: number;
  accountId: string;
  entityCode: string;
  description: string;
  debit: string;
  credit: string;
}

// Define journal entry interface
export interface JournalEntry {
  id?: number;
  entityId: number;
  clientId?: number;
  date: string;
  description: string;
  reference?: string;
  journalType: string;
  status: string;
  reversalDate?: string | null;
  lines: JournalLine[];
}

// Define hook for journal entry operations
export function useJournalEntry() {
  const { toast } = useToast();
  const { currentEntity } = useEntity();
  
  // Default empty journal entry with current entity
  const defaultJournalEntry = useMemo(() => ({
    entityId: currentEntity?.id || 0,
    clientId: currentEntity?.clientId || 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    journalType: 'JE',
    status: JournalEntryStatus.DRAFT,
    reversalDate: null,
    lines: [
      {
        accountId: '',
        entityCode: currentEntity?.code || '',
        description: '',
        debit: '',
        credit: '',
      }
    ]
  }), [currentEntity]);
  
  // API hooks for journal entry CRUD operations
  const createJournalEntry = useMutation({
    mutationFn: async (journalEntry: JournalEntry) => {
      return await apiRequest('/api/journal-entries', {
        method: 'POST',
        data: journalEntry
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Journal entry created successfully',
      });
      
      // Invalidate journal entries queries
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] 
        });
      }
      
      return data.journalEntry;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to create journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const updateJournalEntry = useMutation({
    mutationFn: async ({ id, journalEntry }: { id: number, journalEntry: JournalEntry }) => {
      return await apiRequest(`/api/journal-entries/${id}`, {
        method: 'PUT',
        data: journalEntry
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Success',
        description: 'Journal entry updated successfully',
      });
      
      // Invalidate journal entry and journal entries queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/journal-entries/${variables.id}`]
      });
      
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] 
        });
      }
      
      return data.journalEntry;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const deleteJournalEntry = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/journal-entries/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, id) => {
      toast({
        title: 'Success',
        description: 'Journal entry deleted successfully',
      });
      
      // Invalidate journal entries queries
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] 
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Utility for adding a new line to journal entry
  const addNewLine = useCallback((lines: JournalLine[], entityCode: string = '') => {
    return [
      ...lines,
      {
        accountId: '',
        entityCode: entityCode || lines[0]?.entityCode || '',
        description: '',
        debit: '',
        credit: '',
      }
    ];
  }, []);
  
  // Utility for removing a line from journal entry
  const removeLine = useCallback((lines: JournalLine[], index: number) => {
    return lines.filter((_, i) => i !== index);
  }, []);
  
  // Post journal entry 
  const postJournalEntry = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/journal-entries/${id}/post`, {
        method: 'POST'
      });
    },
    onSuccess: (data, id) => {
      toast({
        title: 'Success',
        description: 'Journal entry posted successfully',
      });
      
      // Invalidate journal entry and journal entries queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/journal-entries/${id}`]
      });
      
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] 
        });
      }
      
      return data.journalEntry;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to post journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Helper for calculating totals
  const calculateTotals = useCallback((lines: JournalLine[]) => {
    const totals = lines.reduce((acc, line) => {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      
      return {
        totalDebit: acc.totalDebit + debit,
        totalCredit: acc.totalCredit + credit
      };
    }, { totalDebit: 0, totalCredit: 0 });
    
    const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 0.001;
    
    return {
      ...totals,
      isBalanced
    };
  }, []);
  
  // Utility for calculating entity balances (for intercompany transactions)
  const calculateEntityBalances = useCallback((lines: JournalLine[]) => {
    // Get unique entity codes
    const entityCodes = Array.from(new Set(lines.map(line => line.entityCode)));
    
    // Calculate balance for each entity
    return entityCodes.map(code => {
      if (!code) return null;
      
      const entityLines = lines.filter(line => line.entityCode === code);
      const { totalDebit, totalCredit } = calculateTotals(entityLines);
      const difference = Math.abs(totalDebit - totalCredit);
      const isBalanced = difference < 0.001;
      
      return {
        entityCode: code,
        totalDebit,
        totalCredit,
        difference,
        isBalanced
      };
    }).filter(balance => balance !== null); // Remove null entries (for empty entity codes)
  }, [calculateTotals]);
  
  // Utility for validating a journal entry
  const validateJournalEntry = useCallback((journalEntry: JournalEntry) => {
    const errors: Record<string, string> = {};
    
    // Basic validation
    if (!journalEntry.entityId) {
      errors.entityId = 'Entity is required';
    }
    
    if (!journalEntry.date) {
      errors.date = 'Date is required';
    }
    
    if (!journalEntry.description) {
      errors.description = 'Description is required';
    }
    
    // Line validation
    if (!journalEntry.lines || journalEntry.lines.length === 0) {
      errors.lines = 'At least one line is required';
    } else {
      // Check if any line is incomplete
      journalEntry.lines.forEach((line, index) => {
        if (!line.accountId) {
          errors[`lines.${index}.accountId`] = 'Account is required';
        }
        
        if (!line.debit && !line.credit) {
          errors[`lines.${index}.amount`] = 'Either debit or credit amount is required';
        }
        
        if (line.debit && line.credit) {
          errors[`lines.${index}.amount`] = 'Cannot have both debit and credit on the same line';
        }
        
        // Convert string amounts to numbers for validation
        if (line.debit && isNaN(parseFloat(line.debit))) {
          errors[`lines.${index}.debit`] = 'Debit must be a valid number';
        }
        
        if (line.credit && isNaN(parseFloat(line.credit))) {
          errors[`lines.${index}.credit`] = 'Credit must be a valid number';
        }
        
        if (!line.entityCode) {
          errors[`lines.${index}.entityCode`] = 'Entity code is required';
        }
      });
      
      // Check if the journal entry is balanced
      const { totalDebit, totalCredit, isBalanced } = calculateTotals(journalEntry.lines);
      
      if (!isBalanced) {
        errors.balance = `Journal entry is not balanced. Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`;
      }
      
      // Check if each entity is balanced for intercompany transactions
      const entityBalances = calculateEntityBalances(journalEntry.lines);
      const unbalancedEntities = entityBalances.filter(balance => !balance.isBalanced);
      
      if (unbalancedEntities.length > 0) {
        errors.entityBalance = `Entity balances are not correct. The following entities are unbalanced: ${unbalancedEntities.map(e => e.entityCode).join(', ')}`;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [calculateTotals, calculateEntityBalances]);
  
  return {
    defaultJournalEntry,
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    postJournalEntry,
    addNewLine,
    removeLine,
    calculateTotals,
    calculateEntityBalances,
    validateJournalEntry
  };
}