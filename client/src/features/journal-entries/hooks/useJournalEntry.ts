import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, ApiResponse } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useEntity } from '@/contexts/EntityContext';
import { JournalEntryStatus } from '@shared/schema';
import { getTodayYMD } from '@/utils/dateUtils';
import { 
  getJournalEntriesBaseUrl, 
  getJournalEntryUrl,
} from '@/api/urlHelpers';

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
    date: getTodayYMD(), // Use safer date utility function
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
      console.log('DEBUG: Creating journal entry:', JSON.stringify(journalEntry, null, 2));
      
      if (!journalEntry.clientId || !journalEntry.entityId) {
        throw new Error('Client ID and Entity ID are required for journal entry creation');
      }
      
      // EMERGENCY FIX: Direct URL construction
      const url = `/api/clients/${journalEntry.clientId}/entities/${journalEntry.entityId}/journal-entries`;
      console.log(`DEBUG: Creating journal entry with direct URL: ${url}`);
      return await apiRequest(url, {
        method: 'POST',
        data: journalEntry
      });
    },
    onSuccess: (data) => {
      console.log('DEBUG: Create success response:', JSON.stringify(data, null, 2));
      toast({
        title: 'Success',
        description: 'Journal entry created successfully',
      });
      
      // Invalidate journal entries queries with correct hierarchical URL pattern
      if (currentEntity?.id && currentEntity?.clientId) {
        // Use the hierarchical path structure for invalidation
        queryClient.invalidateQueries({ 
          queryKey: [`/api/clients/${currentEntity.clientId}/entities/${currentEntity.id}/journal-entries`] 
        });
        
        // Also invalidate any legacy URLs for backwards compatibility
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] 
        });
      }
      
      // Handle both response formats
      return data.entry || data;
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
    mutationFn: async (data: any) => {
      // Check if we're being called with the old format ({ id, journalEntry }) or the new format
      // where data is a flat object with id and other properties
      console.log('DEBUG: updateJournalEntry called with data:', JSON.stringify(data, null, 2));
      
      let id: number;
      let payload: any;
      
      if (data.id && data.journalEntry) {
        // Old format
        id = data.id;
        payload = data.journalEntry;
      } else if (data.id) {
        // New format - data is flat with all properties including id
        id = data.id;
        payload = { ...data };
        delete payload.id; // Remove id from the payload since it's in the URL
      } else {
        throw new Error('Invalid parameters - missing id');
      }
      
      // EXPLICITLY ensure all required fields are included - date, description, reference
      if (payload.status === 'posted') {
        console.log('DEBUG: Posting journal entry - ensuring all required fields are included');
        
        // Make sure the payload has all required fields for posting
        if (!payload.date) {
          // If no date provided, use the original entry date or today
          payload.date = getTodayYMD(); // Use safer date utility function
        }
        
        // Bug fix #3: Fix for date posting 1-day early when status changes (draft → posted)
        // Do not convert string date to Date object as it causes timezone issues
        if (payload.date) {
          // If the date is already in YYYY-MM-DD format, keep it as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
            console.log('DEBUG: Date is already in YYYY-MM-DD format, keeping as is:', payload.date);
            // Already correct 'YYYY-MM-DD' – leave untouched
          } else {
            // Only if it's not in YYYY-MM-DD format, convert it carefully
            console.log('DEBUG: Converting date to YYYY-MM-DD format:', payload.date);
            // Just extract the date part without timezone conversion
            payload.date = payload.date.split('T')[0]; // Extract just the YYYY-MM-DD part
          }
        }
        
        // Debugging logs to verify the payload
        console.log('DEBUG: Update payload:', JSON.stringify(payload, null, 2));
      }
      
      console.log('DEBUG: Updating journal entry with ID:', id);
      console.log('DEBUG: Update data:', JSON.stringify(payload, null, 2));
      
      // Ensure we have clientId and entityId for constructing hierarchical URL
      if (!payload.clientId || !payload.entityId) {
        throw new Error('Client ID and Entity ID are required for journal entry update');
      }
      
      // EMERGENCY FIX: Direct URL construction
      const url = `/api/clients/${payload.clientId}/entities/${payload.entityId}/journal-entries/${id}`;
      console.log(`DEBUG: Updating journal entry with direct URL: ${url}`);
      return await apiRequest(url, {
        method: 'PUT',
        data: payload
      });
    },
    onSuccess: (data, variables) => {
      console.log('DEBUG: Update success response:', JSON.stringify(data, null, 2));
      toast({
        title: 'Success',
        description: 'Journal entry updated successfully',
      });
      
      // Get clientId and entityId from variables
      const clientId = variables.clientId || (typeof variables === 'object' && 'payload' in variables ? variables.payload.clientId : null);
      const entityId = variables.entityId || (typeof variables === 'object' && 'payload' in variables ? variables.payload.entityId : null);
      const id = variables.id;
      
      if (clientId && entityId && id) {
        // EMERGENCY FIX: Invalidate using direct URLs
        queryClient.invalidateQueries({ 
          queryKey: ["journal-entry", id]
        });
        
        // Invalidate detail route with direct URL
        queryClient.invalidateQueries({ 
          queryKey: [`/api/clients/${clientId}/entities/${entityId}/journal-entries/${id}`]
        });
        
        // Invalidate list route with direct URL
        queryClient.invalidateQueries({ 
          queryKey: [`/api/clients/${clientId}/entities/${entityId}/journal-entries`]
        });
      }
      
      // Handle both response formats
      return data.entry || data;
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
    mutationFn: async (params: { id: number, clientId: number, entityId: number }) => {
      if (!params.clientId || !params.entityId) {
        throw new Error('Client ID and Entity ID are required for journal entry deletion');
      }
      
      // EMERGENCY FIX: Direct URL construction
      const url = `/api/clients/${params.clientId}/entities/${params.entityId}/journal-entries/${params.id}`;
      console.log(`DEBUG: Deleting journal entry with direct URL: ${url}`);
      return await apiRequest(url, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, params) => {
      toast({
        title: 'Success',
        description: 'Journal entry deleted successfully',
      });
      
      // EMERGENCY FIX: Invalidate using direct URLs
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${params.clientId}/entities/${params.entityId}/journal-entries`]
      });
      
      // ALSO invalidate the entities API to refresh entity list
      queryClient.invalidateQueries({
        queryKey: ['/api/entities']
      });
    },
    onError: (error: any) => {
      // Check for different types of errors
      const errorMessage = error?.response?.data?.message || "";
      
      // Check if it's a foreign key constraint error
      const isForeignKeyError = 
        errorMessage.includes("foreign key constraint") || 
        errorMessage.includes("still referenced");
      
      // Check if it's referenced by a posted entry
      const referencedByPostedMatch = errorMessage.match(/referenced by posted entry #(\d+)/);
      const referencedByPosted = !!referencedByPostedMatch;
      const referencingEntryId = referencedByPostedMatch ? referencedByPostedMatch[1] : null;
      
      let description = '';
      
      if (referencedByPosted) {
        description = `Cannot delete this journal entry because it is referenced by posted entry #${referencingEntryId}. You must use void instead of delete for entries in the audit trail.`;
      } else if (isForeignKeyError) {
        description = 'Cannot delete this journal entry because it is referenced by other entries in the system. Consider using void instead.';
      } else {
        description = `Failed to delete journal entry: ${errorMessage || error.message || 'Unknown error'}`;
      }
      
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
      console.error('Error deleting journal entry:', error);
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
    mutationFn: async (params: { id: number, clientId: number, entityId: number }) => {
      console.log('DEBUG: Posting journal entry with params:', JSON.stringify(params, null, 2));
      
      try {
        if (!params.id) {
          throw new Error('Journal entry ID is required for posting');
        }
        
        if (!params.clientId || !params.entityId) {
          throw new Error('Client ID and Entity ID are required for posting a journal entry');
        }
        
        // Ensure all parameters are actual numbers, not string representations
        const entryId = Number(params.id);
        const clientId = Number(params.clientId);
        const entityId = Number(params.entityId);
        
        // Log normalized parameters
        console.log('DEBUG: Normalized parameters:', { entryId, clientId, entityId });
        
        // Use proper URL construction with correct HTTP method (PUT)
        const url = `/api/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}/post`;
        console.log(`DEBUG: Posting journal entry with direct URL: ${url}`);
        console.log(`DEBUG: Using PUT method as required by the server endpoint`);
        
        // Return the API request with proper error handling
        return await apiRequest(url, {
          method: 'PUT'
        });
      } catch (error) {
        console.error('ERROR in postJournalEntry mutation function:', error);
        throw error; // Re-throw to allow the mutation error handler to process it
      }
    },
    onSuccess: (data, params) => {
      console.log('DEBUG: Post success response:', JSON.stringify(data, null, 2));
      toast({
        title: 'Success',
        description: 'Journal entry posted successfully',
      });
      
      // EMERGENCY FIX: Invalidate using direct URLs
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${params.clientId}/entities/${params.entityId}/journal-entries/${params.id}`]
      });
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/clients/${params.clientId}/entities/${params.entityId}/journal-entries`]
      });
      
      // Handle both response formats
      return data.entry || data;
    },
    onError: (error: any) => {
      console.error('ERROR: Post journal entry mutation failed:', error);
      // Try to extract more detailed error information if available
      const errorDetails = error.response?.data?.message || error.message;
      
      toast({
        title: 'Error',
        description: `Failed to post journal entry: ${errorDetails}`,
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