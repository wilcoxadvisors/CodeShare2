import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

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

      {/* Placeholder for Toolbar */}
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-white">
         <p className="text-muted-foreground">The `ReviewToolbar` component for sorting and filtering will be built here.</p>
      </div>

      <div className="space-y-4">
        {entryGroups.map((group: any, index: number) => (
          // Placeholder for Entry Group Card
          <div key={index} className={`p-4 border-2 border-dashed rounded-lg ${group.isValid ? 'border-gray-300' : 'border-red-400'}`}>
             <p>Entry Group {index + 1} ({group.isValid ? 'Valid' : 'Errors Found'})</p>
             <p className="text-sm text-muted-foreground">The `EntryGroupCard` component will be built here to display lines and errors.</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={onReturnToConfig}>Back to Upload</Button>
        <Button onClick={onProcess} disabled={batchSummary.entriesWithErrors > 0}>
          Confirm and Process {batchSummary.validEntries} Entries
        </Button>
      </div>
    </div>
  );
};