import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, CheckCircle, Lightbulb, Loader2 } from 'lucide-react';
import { ReviewToolbar, FilterState } from './ReviewToolbar';
import { EntryGroupCard } from './EntryGroupCard';
import { validateEntryGroup, createAccountsMap, createDimensionsMap } from '../utils/batchValidation';

// Placeholder type, will be refined in future missions
type BatchAnalysisResult = any;

interface IntelligentReviewScreenProps {
  analysisResult: BatchAnalysisResult;
  onReturnToConfig: () => void;
  onProcess: () => void; // Placeholder for future processing logic
}

export const IntelligentReviewScreen: React.FC<IntelligentReviewScreenProps> = ({
  analysisResult,
  onReturnToConfig,
  onProcess,
}) => {
  const { batchSummary, entryGroups } = analysisResult;
  
  // Extract route parameters for API calls
  const params = useParams();
  const clientId = params.clientId;
  const entityId = params.entityId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State management for filtering and sorting
  const [filter, setFilter] = useState<FilterState>({ showValid: true, showErrors: true });
  const [sort, setSort] = useState('default');

  // Add this new state to hold the mutable data for editing
  const [editableGroups, setEditableGroups] = useState(analysisResult.entryGroups);
  const [selectionState, setSelectionState] = useState<{ [key: string]: boolean }>({});

  // Add a useEffect to reset the editable data if a new analysis result comes in
  useEffect(() => {
    setEditableGroups(analysisResult.entryGroups);
    // Initialize selection state - by default, only valid entries are selected for processing
    const initialSelection: { [key: string]: boolean } = {};
    analysisResult.entryGroups.forEach((group: any) => {
      initialSelection[group.groupKey] = group.isValid;
    });
    setSelectionState(initialSelection);
  }, [analysisResult]);

  // Fetch accounts and dimensions data for real-time validation
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn: () => apiRequest(`/api/clients/${clientId}/accounts`),
    enabled: !!clientId,
  });

  const { data: dimensionsData } = useQuery({
    queryKey: ['dimensions', clientId],
    queryFn: () => apiRequest(`/api/clients/${clientId}/dimensions`),
    enabled: !!clientId,
  });

  // Create lookup maps for efficient validation
  const accountsMap = React.useMemo(() => {
    return accountsData ? createAccountsMap(accountsData) : new Map();
  }, [accountsData]);

  const dimensionsMap = React.useMemo(() => {
    return dimensionsData ? createDimensionsMap(dimensionsData) : new Map();
  }, [dimensionsData]);

  // Batch processing mutation
  const processBatchMutation = useMutation({
    mutationFn: (payload: { approvedEntries: any[] }) => {
      return apiRequest(`/api/clients/${clientId}/journal-entries/batch-process`, {
        method: 'POST',
        data: { ...payload, entityId }, // Pass the entityId for entry creation
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Batch Processed Successfully",
        description: response.message,
      });
      // On success, invalidate the main JE list and return the user to the starting point
      queryClient.invalidateQueries({ queryKey: ['journal-entries', clientId, entityId] });
      onReturnToConfig(); // Go back to the upload form
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error?.error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Create dimension value mutation for seamless error resolution
  const createDimensionValueMutation = useMutation({
    mutationFn: (data: { dimensionId: number; name: string; code: string }) => {
      return apiRequest(`/api/dimensions/${data.dimensionId}/values`, {
        method: 'POST',
        data: { name: data.name, code: data.code },
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "New dimension value created." });
      // The MOST important step: invalidate the dimensions query so our
      // client-side validation engine has the fresh data.
      queryClient.invalidateQueries({ queryKey: ['dimensions', clientId] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error?.error?.message || "Could not create the new dimension value.",
        variant: "destructive",
      });
    },
  });

  // AI suggestion acceptance handler
  const handleAcceptSuggestion = (groupIndex: number, lineIndex: number, action: any) => {
    if (!action || !action.type || !action.payload) return;

    const { type, payload } = action;
    const newGroups = JSON.parse(JSON.stringify(editableGroups));
    const targetLine = newGroups[groupIndex].lines[lineIndex];

    console.log("Accepting AI Suggestion:", { type, payload });

    // Apply the change based on the action type
    if (type === 'CHANGE_ACCOUNT_CODE') {
      targetLine.accountCode = payload.newAccountCode;
    } else if (type === 'SET_DIMENSION_TAG') {
      targetLine.dimensions[payload.dimensionCode] = payload.newValueCode;
    }

    // After applying the change, we must trigger our real-time re-validation
    // to confirm the fix and clear any related errors.
    const accountsMap = createAccountsMap(accountsData || []);
    const dimensionsMap = createDimensionsMap(dimensionsData || []);
    const newErrors = validateEntryGroup(newGroups[groupIndex], accountsMap, dimensionsMap);
    newGroups[groupIndex].errors = newErrors;
    newGroups[groupIndex].isValid = newErrors.length === 0;

    setEditableGroups(newGroups);
  };

  // Create a handler function to update a specific cell with real-time re-validation
  const handleCellUpdate = (groupIndex: number, lineIndex: number, field: string, value: string) => {
    // Deep copy to ensure state updates work correctly
    const newGroups = JSON.parse(JSON.stringify(editableGroups));
    
    // Update the cell value
    newGroups[groupIndex].lines[lineIndex][field] = value;

    // Real-time re-validation: Re-validate just the group that was changed
    if (accountsMap.size > 0 && dimensionsMap.size > 0) {
      const newErrors = validateEntryGroup(newGroups[groupIndex], accountsMap, dimensionsMap);
      newGroups[groupIndex].errors = newErrors;
      newGroups[groupIndex].isValid = newErrors.length === 0;
      
      console.log(`Re-validated group ${groupIndex} after updating ${field}:`, {
        errors: newErrors.length,
        isValid: newGroups[groupIndex].isValid,
        updatedValue: value
      });
    } else {
      console.log('Validation maps not ready yet, skipping re-validation');
    }

    setEditableGroups(newGroups);
  };

  // Add this new handler function to toggle selection for a specific group
  const handleToggleSelection = (groupKey: string) => {
    setSelectionState(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Handle Select All functionality
  const handleSelectAll = (checked: boolean) => {
    const newSelection = { ...selectionState };
    filteredAndSortedGroups.forEach(group => {
      if (group.isValid) { // Only toggle selection for valid entries
        newSelection[group.groupKey] = checked;
      }
    });
    setSelectionState(newSelection);
  };

  // Client-side sorting and filtering logic with performance optimization
  const filteredAndSortedGroups = React.useMemo(() => {
    let processedGroups = [...editableGroups]; // Use editableGroups

    // 1. Apply Filtering
    processedGroups = processedGroups.filter(group => {
      if (filter.showValid && filter.showErrors) {
        return true; // Show all
      }
      if (filter.showValid) {
        return group.isValid;
      }
      if (filter.showErrors) {
        return !group.isValid;
      }
      return false; // Show none if both are unchecked
    });

    // 2. Apply Sorting
    switch (sort) {
      case 'date-desc':
        processedGroups.sort((a, b) => new Date(b.header.Date).getTime() - new Date(a.header.Date).getTime());
        break;
      case 'date-asc':
        processedGroups.sort((a, b) => new Date(a.header.Date).getTime() - new Date(b.header.Date).getTime());
        break;
      case 'errors-first':
        processedGroups.sort((a, b) => (a.isValid === b.isValid) ? 0 : a.isValid ? 1 : -1);
        break;
      case 'default':
      default:
        // The default order is the original parsed order from the file.
        // No sorting needed.
        break;
    }

    return processedGroups;
  }, [editableGroups, filter, sort]); // Update dependency to use editableGroups

  // Real-time batch summary calculation based on current validation state
  const dynamicBatchSummary = React.useMemo(() => {
    const validEntries = editableGroups.filter((group: any) => group.isValid).length;
    const entriesWithErrors = editableGroups.filter((group: any) => !group.isValid).length;
    const newDimensionValues = batchSummary.newDimensionValues || 0; // Keep original count
    
    return {
      validEntries,
      entriesWithErrors,
      newDimensionValues,
      totalEntries: editableGroups.length
    };
  }, [editableGroups, batchSummary.newDimensionValues]);

  // Calculate the number of selected valid entries for processing
  const selectedForProcessingCount = Object.keys(selectionState).filter(key => selectionState[key]).length;

  // Calculate if all valid visible items are selected
  const validVisibleItems = filteredAndSortedGroups.filter(g => g.isValid);
  const isAllSelected = validVisibleItems.length > 0 && validVisibleItems.every(g => selectionState[g.groupKey]);

  console.log("Current Filter State:", filter); // For verification
  console.log("Current Sort State:", sort);   // For verification
  console.log("Dynamic Batch Summary:", dynamicBatchSummary); // For real-time validation tracking
  console.log("Selected for Processing:", selectedForProcessingCount); // For selection tracking

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Review, Reconcile & Approve</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-around items-center text-center">
            <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                    <p className="text-2xl font-bold">{dynamicBatchSummary.validEntries}</p>
                    <p className="text-sm text-muted-foreground">Valid Entries</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                    <p className="text-2xl font-bold">{dynamicBatchSummary.entriesWithErrors}</p>
                    <p className="text-sm text-muted-foreground">Entries with Errors</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Lightbulb className="h-6 w-6 text-yellow-500" />
                <div>
                    <p className="text-2xl font-bold">{batchSummary.newDimensionValues || 0}</p>
                    <p className="text-sm text-muted-foreground">New Dimensions to Create</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <ReviewToolbar
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        itemCount={validVisibleItems.length}
      />

      <div className="space-y-4">
        {filteredAndSortedGroups.map((group: any, index: number) => (
          <EntryGroupCard
            key={group.groupKey}
            group={group}
            index={index}
            onCellUpdate={(lineIndex, field, value) => handleCellUpdate(index, lineIndex, field, value)}
            isSelected={selectionState[group.groupKey] || false}
            onToggleSelected={() => handleToggleSelection(group.groupKey)}
            onCreateDimensionValue={(data) => createDimensionValueMutation.mutate(data)}
            onAcceptSuggestion={handleAcceptSuggestion}
          />
        ))}
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={onReturnToConfig}>Back to Upload</Button>
        <Button
          onClick={() => {
            const payload = {
              // Only include groups that are valid AND selected
              approvedEntries: editableGroups.filter((g: any) => g.isValid && selectionState[g.groupKey])
            };
            processBatchMutation.mutate(payload);
          }}
          disabled={selectedForProcessingCount === 0 || processBatchMutation.isPending}
        >
          {processBatchMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Confirm and Process ${selectedForProcessingCount} Entries`
          )}
        </Button>
      </div>
    </div>
  );
};