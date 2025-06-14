import { useState } from "react";
import { useEntity } from "../contexts/EntityContext";
import { useNavigate, useLocation } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();
  
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
    console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: BEFORE entity selection - clientId:", entity.clientId, "entityId:", entity.id);
    console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Current location:", location.pathname);
    
    // Update the entity in context
    setCurrentEntity(entity);
    setOpen(false);
    
    // Navigate to the journal entries for this entity if we're in the journal entries module
    if (location.pathname.includes('/journal-entries')) {
      const newPath = `/clients/${entity.clientId}/entities/${entity.id}/journal-entries`;
      console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Navigating to:", newPath);
      navigate(newPath);
    } else {
      console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Not navigating - not in journal-entries:", location.pathname);
    }
    
    console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: AFTER entity selection completed - clientId:", entity.clientId, "entityId:", entity.id);
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
                  value={`entity-${entity.id}-${entity.name} ${entity.code || ''}`}
                  onSelect={() => {
                    console.log("ARCHITECT_DEBUG_SELECTOR_COMMAND_ITEM: onSelect triggered for entity:", entity.id, entity.name);
                    handleSelectEntity(entity);
                  }}
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