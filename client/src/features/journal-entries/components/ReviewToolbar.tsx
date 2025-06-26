import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ListFilter } from 'lucide-react';

export interface FilterState {
  showValid: boolean;
  showErrors: boolean;
}

interface ReviewToolbarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  sort: string;
  onSortChange: (newSort: string) => void;
}

export const ReviewToolbar: React.FC<ReviewToolbarProps> = ({
  filter,
  onFilterChange,
  sort,
  onSortChange
}) => {
  return (
    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium">Sort by:</span>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select sort order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Order</SelectItem>
            <SelectItem value="date-desc">Date (Newest First)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
            <SelectItem value="errors-first">Errors First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <ListFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Show Entries</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={filter.showValid}
            onCheckedChange={(checked) => onFilterChange({ ...filter, showValid: checked })}
          >
            Valid Entries
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filter.showErrors}
            onCheckedChange={(checked) => onFilterChange({ ...filter, showErrors: checked })}
          >
            Entries with Errors
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};