import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Entity {
  id: number;
  name: string;
  code: string;
  [key: string]: any;
}

interface EntitySelectorProps {
  entities: Entity[];
  selectedEntityIds: number[];
  onChange: (selectedIds: number[]) => void;
  allowMultiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function EntitySelector({
  entities,
  selectedEntityIds,
  onChange,
  allowMultiple = false,
  disabled = false,
  placeholder = 'Select entities...'
}: EntitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter entities based on search query
  const filteredEntities = entities.filter(
    entity =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get selected entity names for display
  const selectedEntities = entities.filter(entity => 
    selectedEntityIds.includes(entity.id)
  );
  
  // Handle entity selection
  const handleSelect = (id: number) => {
    if (allowMultiple) {
      // If already selected, remove it; otherwise, add it
      if (selectedEntityIds.includes(id)) {
        onChange(selectedEntityIds.filter(entityId => entityId !== id));
      } else {
        onChange([...selectedEntityIds, id]);
      }
    } else {
      // Single select mode
      onChange([id]);
      setOpen(false);
    }
  };
  
  // Clear all selections
  const clearSelections = () => {
    onChange([]);
  };
  
  // Remove a specific entity from selection
  const removeEntity = (id: number) => {
    onChange(selectedEntityIds.filter(entityId => entityId !== id));
  };
  
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
            disabled={disabled}
          >
            {selectedEntityIds.length > 0
              ? allowMultiple
                ? `${selectedEntityIds.length} entity(s) selected`
                : `${selectedEntities[0]?.name} (${selectedEntities[0]?.code})`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-full min-w-[300px]">
          <Command>
            <CommandInput 
              placeholder="Search entities..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No entities found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[200px]">
                  {filteredEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={`${entity.name}-${entity.code}`}
                      onSelect={() => handleSelect(entity.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        {entity.name} 
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({entity.code})
                        </span>
                      </span>
                      {selectedEntityIds.includes(entity.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
              {allowMultiple && selectedEntityIds.length > 0 && (
                <div className="border-t p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      clearSelections();
                      setOpen(false);
                    }}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Show selected entities as badges when in multi-select mode */}
      {allowMultiple && selectedEntityIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedEntities.map((entity) => (
            <Badge 
              key={entity.id} 
              variant="secondary"
              className="flex items-center gap-1 text-sm"
            >
              {entity.name} ({entity.code})
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                onClick={() => removeEntity(entity.id)}
              >
                <span className="sr-only">Remove</span>
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}