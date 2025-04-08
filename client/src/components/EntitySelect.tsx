import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEntity } from '../contexts/EntityContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface Entity {
  id: number;
  name: string;
  code: string;
}

function EntitySelect() {
  const [open, setOpen] = React.useState(false);
  const { currentEntity, setCurrentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch entities for the current client
  const { data, isLoading, error } = useQuery({
    queryKey: user ? ['/api/entities'] : null,
    enabled: !!user,
  });

  const entities = data?.entities || [];

  // Set first entity as current entity if none is selected
  useEffect(() => {
    if (!currentEntity && entities.length > 0) {
      setCurrentEntity(entities[0]);
    }
  }, [entities, currentEntity, setCurrentEntity]);

  const handleSelectEntity = (entity: Entity) => {
    setCurrentEntity(entity);
    setOpen(false);
    
    toast({
      title: "Entity changed",
      description: `Selected entity: ${entity.name} (${entity.code})`,
    });
  };

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full md:w-[200px] h-10 justify-between opacity-70">
        <span>Loading entities...</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant="outline" className="w-full md:w-[200px] h-10 justify-between text-red-500">
        <span>Error loading entities</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  // We'll handle no entities in the dropdown menu instead of showing a separate component
  // This allows us to have a consistent UI between states

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[200px] h-10 justify-between"
        >
          {currentEntity
            ? `${currentEntity.code} - ${currentEntity.name}`
            : "Select entity..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search entity..." />
          <CommandEmpty>No entity found.</CommandEmpty>
          <CommandGroup>
            {entities.map((entity) => (
              <CommandItem
                key={entity.id}
                value={`${entity.code} ${entity.name}`}
                onSelect={() => handleSelectEntity(entity)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentEntity?.id === entity.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="font-medium">{entity.code}</span>
                <span className="ml-2 text-sm text-gray-600 truncate">{entity.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default EntitySelect;