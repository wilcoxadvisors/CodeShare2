import { useState } from "react";
import { useEntity } from "../contexts/EntityContext";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EntitySelector() {
  const { entities, currentEntity, setCurrentEntity, selectedClientId } = useEntity();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter entities based on selected client and search query
  const filteredEntities = entities?.filter(entity => {
    // First filter by selected client if one is selected
    if (selectedClientId && entity.clientId !== selectedClientId) {
      return false;
    }
    
    // Then filter by search query
    const query = searchQuery.toLowerCase();
    return (
      entity.name?.toLowerCase().includes(query) ||
      entity.code?.toLowerCase().includes(query)
    );
  }) || [];

  // Handle entity selection
  const handleSelectEntity = (entity: any) => {
    setCurrentEntity(entity);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select entity"
          className="w-[200px] justify-between"
          disabled={!selectedClientId}
        >
          {currentEntity 
            ? currentEntity.name 
            : (selectedClientId ? "Select entity" : "Select client first")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search entities..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {selectedClientId 
                ? "No entities found for selected client." 
                : "Please select a client first."}
            </CommandEmpty>
            <CommandGroup>
              {filteredEntities.map((entity) => (
                <CommandItem
                  key={entity.id}
                  value={entity.id.toString()}
                  onSelect={() => handleSelectEntity(entity)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentEntity?.id === entity.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{entity.name}</span>
                    {entity.code && (
                      <span className="text-xs text-muted-foreground">{entity.code}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}