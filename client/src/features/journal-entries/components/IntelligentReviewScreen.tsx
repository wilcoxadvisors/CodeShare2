import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, CheckCircle, Lightbulb, Loader2 } from 'lucide-react';
import { ReviewToolbar, FilterState } from './ReviewToolbar';
import { EntryGroupCard } from './EntryGroupCard';

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

  // Add a useEffect to reset the editable data if a new analysis result comes in
  useEffect(() => {
    setEditableGroups(analysisResult.entryGroups);
  }, [analysisResult]);

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

  // Create a handler function to update a specific cell
  const handleCellUpdate = (groupIndex: number, lineIndex: number, field: string, value: string) => {
    const newGroups = [...editableGroups];
    newGroups[groupIndex].lines[lineIndex][field] = value;

    // TODO: Add re-validation logic here in a future step
    console.log(`Updated group ${groupIndex}, line ${lineIndex}, field ${field} to:`, value);

    setEditableGroups(newGroups);
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

  console.log("Current Filter State:", filter); // For verification
  console.log("Current Sort State:", sort);   // For verification

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
                    <p className="text-2xl font-bold">{batchSummary.validEntries}</p>
                    <p className="text-sm text-muted-foreground">Valid Entries</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                    <p className="text-2xl font-bold">{batchSummary.entriesWithErrors}</p>
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
      />

      <div className="space-y-4">
        {filteredAndSortedGroups.map((group: any, index: number) => (
          <EntryGroupCard
            key={group.groupKey}
            group={group}
            index={index}
            onCellUpdate={(lineIndex, field, value) => handleCellUpdate(index, lineIndex, field, value)}
          />
        ))}
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={onReturnToConfig}>Back to Upload</Button>
        <Button
          onClick={() => {
            const payload = {
              approvedEntries: filteredAndSortedGroups.filter(g => g.isValid)
            };
            processBatchMutation.mutate(payload);
          }}
          disabled={batchSummary.entriesWithErrors > 0 || processBatchMutation.isPending}
        >
          {processBatchMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Confirm and Process ${batchSummary.validEntries} Entries`
          )}
        </Button>
      </div>
    </div>
  );
};