import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronsUpDown, AlertCircle, Lightbulb } from 'lucide-react';

// Using 'any' for now as the exact type will be refined
interface EntryGroupCardProps {
  group: any;
  index: number;
  onCellUpdate: (lineIndex: number, field: string, value: string) => void;
  isSelected: boolean;
  onToggleSelected: () => void;
  onCreateDimensionValue: (data: { dimensionId: number; name: string; code: string }) => void;
  onAcceptSuggestion: (groupIndex: number, lineIndex: number, action: any) => void;
}

export const EntryGroupCard: React.FC<EntryGroupCardProps> = ({ group, index, onCellUpdate, isSelected, onToggleSelected, onCreateDimensionValue, onAcceptSuggestion }) => {
  const errorCount = group.errors?.length || 0;
  const suggestionCount = group.aiSuggestions?.length || 0;

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
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    {/* Dynamically add dimension headers */}
                    {Object.keys(group.lines[0]?.dimensions || {}).map(dimKey => (
                       <TableHead key={dimKey}>{dimKey}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.lines.map((line: any, lineIndex: number) => {
                    const accountError = getErrorForCell(line.originalRow, 'AccountCode');
                    return (
                      <TableRow key={line.originalRow} className={accountError ? 'bg-red-50' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{line.originalRow}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  defaultValue={line.accountCode}
                                  onBlur={(e) => onCellUpdate(lineIndex, 'accountCode', e.target.value)}
                                  className={accountError ? 'border-red-500' : ''}
                                />
                              </TooltipTrigger>
                              {accountError && <TooltipContent><p className="text-red-600">{accountError.message}</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Input
                            defaultValue={line.description}
                            onBlur={(e) => onCellUpdate(lineIndex, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                           <Input
                            type="number"
                            defaultValue={line.amount.isPositive() ? line.amount.toFixed(2) : ''}
                            onBlur={(e) => onCellUpdate(lineIndex, 'debit', e.target.value)}
                            className="text-right font-mono"
                           />
                        </TableCell>
                        <TableCell>
                            <Input
                             type="number"
                             defaultValue={line.amount.isNegative() ? line.amount.abs().toFixed(2) : ''}
                             onBlur={(e) => onCellUpdate(lineIndex, 'credit', e.target.value)}
                             className="text-right font-mono"
                            />
                        </TableCell>
                         {Object.keys(line.dimensions).map(dimKey => {
                           const dimError = getErrorForCell(line.originalRow, dimKey);
                           return (
                            <TableCell key={dimKey}>
                              <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                       <Input
                                        defaultValue={line.dimensions[dimKey]}
                                        onBlur={(e) => onCellUpdate(lineIndex, `dimensions.${dimKey}`, e.target.value)}
                                        className={dimError ? 'border-red-500' : ''}
                                       />
                                    </TooltipTrigger>
                                    {dimError && <TooltipContent><p className="text-red-600">{dimError.message}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                           );
                         })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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