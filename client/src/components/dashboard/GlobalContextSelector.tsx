import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Building, Layers, ChevronRight, ChevronDown } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useEntity } from "../../contexts/EntityContext";

interface Client {
  id: number;
  name: string;
  [key: string]: any;
}

interface Entity {
  id: number;
  name: string;
  code: string;
  ownerId: number;
  active: boolean;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  currency: string;
  clientId: number;
  [key: string]: any;
}

interface GlobalContextSelectorProps {
  clients: Client[];
  entities: Entity[];
}

export default function GlobalContextSelector({ clients, entities }: GlobalContextSelectorProps) {
  const { selectedClientId, setSelectedClientId, currentEntity, setCurrentEntity } = useEntity();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClients, setExpandedClients] = useState<Record<number, boolean>>({});

  // Determine what context is selected for display
  const hasClientContext = selectedClientId !== null;
  const hasEntityContext = currentEntity !== null;
  
  // Find the current client's name if a client is selected
  const selectedClient = Array.isArray(clients) 
    ? clients.find(client => client.id === selectedClientId)
    : undefined;
  
  // Determine the button text
  let buttonText = "Select Context...";
  if (hasEntityContext && currentEntity) {
    if (selectedClient) {
      buttonText = `Entity: ${currentEntity.name} (${selectedClient.name})`;
    } else {
      buttonText = `Entity: ${currentEntity.name}`;
    }
  } else if (hasClientContext && selectedClient) {
    buttonText = `Client: ${selectedClient.name}`;
  }
  
  // Filter function for search
  const filterBySearchQuery = (item: { name: string; code?: string }) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(query);
    const codeMatch = item.code ? item.code.toLowerCase().includes(query) : false;
    
    return nameMatch || codeMatch;
  };
  
  // Get filtered and sorted clients
  const filteredClients = Array.isArray(clients) 
    ? clients
        .filter(filterBySearchQuery)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  
  // Handle client selection
  const selectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setCurrentEntity(null);
    setOpen(false);
    console.log(`DEBUG: Client selected: ${clientId}`);
  };

  // Handle entity selection
  const selectEntity = (entity: Entity) => {
    setSelectedClientId(entity.clientId);
    setCurrentEntity(entity);
    setOpen(false);
    console.log(`DEBUG: Entity selected: ${entity.id}, Client: ${entity.clientId}`);
  };

  // Toggle client expansion
  const toggleClientExpansion = (e: React.MouseEvent, clientId: number) => {
    e.stopPropagation();
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  // Auto-expand the client of the currently selected entity
  useEffect(() => {
    if (selectedClientId && !expandedClients[selectedClientId]) {
      setExpandedClients(prev => ({ ...prev, [selectedClientId]: true }));
    }
  }, [selectedClientId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select context"
          className="w-[250px] justify-between"
        >
          {buttonText}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search clients and entities..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No matches found.</CommandEmpty>

            {filteredClients.map((client) => {
              // Get entities for this client
              const clientEntities = Array.isArray(entities) 
                ? entities
                    .filter(entity => entity.clientId === client.id && filterBySearchQuery(entity))
                    .sort((a, b) => a.name.localeCompare(b.name))
                : [];
              
              // Skip if no matches
              if (!filterBySearchQuery(client) && clientEntities.length === 0) {
                return null;
              }
              
              const isExpanded = expandedClients[client.id] || false;
              
              return (
                <div key={`client-group-${client.id}`}>
                  <CommandGroup heading={client.name}>
                    <CommandItem
                      value={`client-${client.id}`}
                      onSelect={() => selectClient(client.id)}
                      className="cursor-pointer font-medium"
                    >
                      <div className="flex items-center w-full overflow-hidden">
                        {clientEntities.length > 0 ? (
                          <button 
                            onClick={(e) => toggleClientExpansion(e, client.id)}
                            className="mr-2 flex-shrink-0"
                          >
                            {isExpanded ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        ) : (
                          <span className="w-4 mr-2"></span>
                        )}
                        <Building className="mr-2 h-4 w-4" />
                        <span className="truncate">{client.name}</span>
                        {selectedClientId === client.id && !hasEntityContext && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </div>
                    </CommandItem>
                    
                    {isExpanded && clientEntities.length > 0 && (
                      <div className="pt-1 pb-1">
                        {clientEntities.map((entity) => (
                          <CommandItem
                            key={`entity-${entity.id}`}
                            value={`entity-${entity.id}`}
                            onSelect={() => selectEntity(entity)}
                            className="cursor-pointer pl-8 py-1"
                          >
                            <div className="flex items-center w-full overflow-hidden">
                              <Layers className="h-4 w-4 mr-2" />
                              <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-sm">{entity.name}</span>
                                {entity.code && (
                                  <span className="text-xs text-muted-foreground truncate">{entity.code}</span>
                                )}
                              </div>
                              {currentEntity?.id === entity.id && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </div>
                    )}
                  </CommandGroup>
                  <CommandSeparator />
                </div>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}