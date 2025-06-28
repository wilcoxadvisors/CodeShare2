import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronsUpDown, AlertCircle, Lightbulb } from 'lucide-react';
import { JournalEntryLinesTable } from './JournalEntryLinesTable';
import { nanoid } from 'nanoid';

// Journal entry line interface matching the existing system
interface JournalLine {
  id?: number;
  _key?: string;
  accountId: string;
  entityCode: string;
  description: string;
  debit: string;
  credit: string;
  tags?: DimensionTag[];
}

interface DimensionTag {
  dimensionId: number;
  dimensionValueId: number;
  dimensionName: string;
  dimensionValueName: string;
}

interface EntryGroupCardProps {
  group: any;
  index: number;
  accounts: any[];
  entities: any[];
  dimensions: any[];
  onCellUpdate: (lineIndex: number, field: string, value: string) => void;
  isSelected: boolean;
  onToggleSelected: () => void;
  onCreateDimensionValue: (data: { dimensionId: number; name: string; code: string }) => void;
  onAcceptSuggestion: (groupIndex: number, lineIndex: number, action: any) => void;
}

export const EntryGroupCard: React.FC<EntryGroupCardProps> = ({ 
  group, 
  index, 
  accounts,
  entities,
  dimensions,
  onCellUpdate, 
  isSelected, 
  onToggleSelected, 
  onCreateDimensionValue, 
  onAcceptSuggestion 
}) => {
  const errorCount = group.errors?.length || 0;
  const suggestionCount = group.aiSuggestions?.length || 0;

  // Transform batch lines to journal entry lines format
  const transformedLines = useMemo(() => {
    return group.lines.map((line: any, index: number) => {
      // Find the account by account code to get the account ID
      const account = accounts?.find(acc => acc.accountCode === line.accountCode);
      
      // Transform dimensions to tags format
      const tags: DimensionTag[] = [];
      Object.entries(line.dimensions || {}).forEach(([dimKey, dimValue]) => {
        const dimension = dimensions?.find(dim => dim.name === dimKey || dim.code === dimKey);
        if (dimension && dimValue) {
          const dimensionValue = dimension.values?.find((val: any) => 
            val.code === dimValue || val.name === dimValue || 
            val.code?.toLowerCase() === String(dimValue).toLowerCase()
          );
          if (dimensionValue) {
            tags.push({
              dimensionId: dimension.id,
              dimensionValueId: dimensionValue.id,
              dimensionName: dimension.name,
              dimensionValueName: dimensionValue.name
            });
          }
        }
      });

      return {
        _key: nanoid(),
        accountId: account?.id?.toString() || '',
        entityCode: line.entityCode || entities?.[0]?.code || '',
        description: line.description || '',
        debit: line.debit || '0.00',
        credit: line.credit || '0.00',
        tags
      };
    });
  }, [group.lines, accounts, entities, dimensions]);

  // Calculate totals
  const totalDebit = transformedLines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
  const totalCredit = transformedLines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Handle line changes
  const handleLineChange = (index: number, field: string, value: string) => {
    onCellUpdate(index, field, value);
  };

  // Helper to find an error for a specific line and field for highlighting
  const getErrorForCell = (originalRow: number, field: string) => {
    return group.errors?.find((e: any) => e.originalRow === originalRow && e.field === field);
  };

  return (
    <Card className={!group.isValid ? 'border-red-400 border-2' : 'border-gray-200'}>
      <Collapsible defaultOpen={!group.isValid}>
        <CollapsibleTrigger asChild>
          <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-t-lg">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelected}
                disabled={!group.isValid} // Disable checkbox if the entry has errors
              />
              <div className="flex-1">
                <h4 className="font-semibold">
                  Entry Group #{index + 1}
                  {group.header.Date && <span className="ml-4 font-normal text-sm text-muted-foreground">Date: {new Date(group.header.Date).toLocaleDateString()}</span>}
                </h4>
                <p className="text-sm text-muted-foreground truncate pr-4">{group.header.Description || 'No description provided'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {errorCount > 0 && <Badge variant="destructive">{errorCount} Error(s)</Badge>}
              {suggestionCount > 0 && <Badge variant="default" className="bg-yellow-400 text-black hover:bg-yellow-500">{suggestionCount} Suggestion(s)</Badge>}
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 border-t">
            <JournalEntryLinesTable
              lines={transformedLines}
              setLines={() => {}} // Read-only for batch import
              accounts={accounts}
              entities={entities}
              dimensions={dimensions}
              fieldErrors={{}}
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              isBalanced={isBalanced}
            />
            {/* Error and Suggestion Details */}
            {errorCount > 0 && (
              <div className="mt-4 space-y-2">
                {group.errors.map((error: any, i: number) => {
                  const isNewValueSuggestion = error.type === 'DIMENSION_VALUE_NOT_FOUND';
                  return (
                    <div key={i} className="text-xs text-red-600 flex items-center justify-between p-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>Row {error.originalRow} ({error.field}): {error.message}</span>
                      </div>
                      {isNewValueSuggestion && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => onCreateDimensionValue({
                            dimensionId: error.dimensionId, // The backend validation must provide this
                            name: error.value, // The backend validation must provide this
                            code: error.value, // The backend validation must provide this
                          })}
                        >
                          Approve & Create
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI Suggestions */}
            {suggestionCount > 0 && (
              <div className="mt-2 space-y-1">
                {group.aiSuggestions.map((suggestion: any, i: number) => (
                  <div key={`sugg-${i}`} className="text-xs text-yellow-800 bg-yellow-50 p-1 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 flex-shrink-0 text-yellow-600" />
                      <span>Row {suggestion.originalRow} ({suggestion.field}): {suggestion.message}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => onAcceptSuggestion(index, group.lines.findIndex((l: any) => l.originalRow === suggestion.originalRow), suggestion.action)}
                    >
                      Accept
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};