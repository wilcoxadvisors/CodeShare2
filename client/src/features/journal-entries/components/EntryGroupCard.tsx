import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronsUpDown, AlertCircle, Lightbulb } from 'lucide-react';

// Using 'any' for now as the exact type will be refined
interface EntryGroupCardProps {
  group: any;
  index: number;
}

export const EntryGroupCard: React.FC<EntryGroupCardProps> = ({ group, index }) => {
  const errorCount = group.errors?.length || 0;
  const suggestionCount = group.aiSuggestions?.length || 0;

  return (
    <Card className={!group.isValid ? 'border-red-400' : 'border-gray-200'}>
      <Collapsible defaultOpen={!group.isValid}>
        <CollapsibleTrigger asChild>
          <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
            <div>
              <h4 className="font-semibold">
                Entry Group #{index + 1}
                <span className="ml-4 font-normal text-sm text-muted-foreground">Date: {new Date(group.header.Date).toLocaleDateString()}</span>
              </h4>
              <p className="text-sm text-muted-foreground">{group.header.Description || 'No description'}</p>
            </div>
            <div className="flex items-center space-x-4">
              {errorCount > 0 && <Badge variant="destructive">{errorCount} Error(s)</Badge>}
              {suggestionCount > 0 && <Badge variant="default" className="bg-yellow-400 text-black">{suggestionCount} Suggestion(s)</Badge>}
              <Button variant="ghost" size="sm">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Row</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Dimensions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.lines.map((line: any) => (
                    <TableRow key={line.originalRow} className={group.errors.some((e: any) => e.originalRow === line.originalRow) ? 'bg-red-50' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{line.originalRow}</TableCell>
                      <TableCell>{line.accountCode}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right font-mono">{line.amount.isPositive() ? line.amount.toFixed(2) : ''}</TableCell>
                      <TableCell className="text-right font-mono">{line.amount.isNegative() ? line.amount.abs().toFixed(2) : ''}</TableCell>
                      <TableCell>
                        {/* Logic to display dimensions will go here */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Error and Suggestion Details */}
            {errorCount > 0 && (
              <div className="mt-4 space-y-2">
                {group.errors.map((error: any, i: number) => (
                  <div key={i} className="text-xs text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Row {error.originalRow} ({error.field}): {error.message}</span>
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