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
  
  // Get filtered and sorted clients with selected client at the top
  const filteredClients = Array.isArray(clients) 
    ? clients
        // Only show active clients and always include the currently selected client
        .filter(client => client.active !== false || client.id === selectedClientId)
        .filter(filterBySearchQuery)
        .sort((a, b) => {
          // Always put the selected client at the top
          if (a.id === selectedClientId) return -1;
          if (b.id === selectedClientId) return 1;
          // Otherwise sort alphabetically
          return a.name.localeCompare(b.name);
        })
    : [];
  
  // Handle client selection
  const selectClient = (clientId: number) => {
    console.log(`DEBUG: Client selection triggered - clientId: ${clientId}`);
    // Find client name for logging
    const clientName = clients.find(c => c.id === clientId)?.name || 'Unknown';
    console.log(`DEBUG: Setting client context: ${clientId} (${clientName})`);
    
    // Show detailed debugging for prior state
    console.log('DEBUG: BEFORE client selection - Current state:', {
      selectedClientId,
      currentEntity: currentEntity ? {
        id: currentEntity.id,
        name: currentEntity.name,
        clientId: currentEntity.clientId
      } : null
    });
    
    // Clear current entity selection first to avoid any state dependencies
    setCurrentEntity(null);
    
    // Then set client ID which will trigger refetch of entities in the EntityContext
    setSelectedClientId(clientId);
    
    // Close the dropdown
    setOpen(false);
    
    // Show detailed debugging for after state change is initiated
    console.log(`DEBUG: AFTER client selection initiated - clientId: ${clientId}, entityId: null`);
  };

  // Handle entity selection
  const selectEntity = (entity: Entity) => {
    console.log(`DEBUG: Entity selection triggered - entityId: ${entity.id}, clientId: ${entity.clientId}`);
    
    // CRITICAL - Verify entity has valid clientId
    if (!entity.clientId) {
      console.error(`ERROR: Entity ${entity.id} (${entity.name}) has no clientId!`);
      return;
    }
    
    // Find client name for logging
    const clientName = clients.find(c => c.id === entity.clientId)?.name || 'Unknown';
    console.log(`DEBUG: Setting context to entity: ${entity.id} (${entity.name}), client: ${entity.clientId} (${clientName})`);
    
    // Show detailed debugging for prior state
    console.log('DEBUG: BEFORE entity selection - Current state:', {
      selectedClientId,
      currentEntity: currentEntity ? {
        id: currentEntity.id,
        name: currentEntity.name,
        clientId: currentEntity.clientId
      } : null
    });
    
    // Critical - only set the client ID if it's different from current 
    if (selectedClientId !== entity.clientId) {
      console.log(`DEBUG: Updating client context to: ${entity.clientId} (${clientName})`);
      setSelectedClientId(entity.clientId);
    } else {
      console.log(`DEBUG: Client context already set to: ${entity.clientId}, skipping update`);
    }
    
    // Then set entity context
    console.log(`DEBUG: Setting entity context to:`, {
      id: entity.id,
      name: entity.name, 
      clientId: entity.clientId
    });
    setCurrentEntity(entity);
    
    // Close popover
    setOpen(false);
    
    console.log(`DEBUG: AFTER entity selection initiated - clientId: ${entity.clientId}, entityId: ${entity.id}`);
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
  
  // Scroll to selected item when the dropdown opens
  useEffect(() => {
    if (open) {
      // Use a small delay to ensure the list is fully rendered
      setTimeout(() => {
        let selector = '';
        
        if (currentEntity) {
          // If an entity is selected, construct selector for the entity
          selector = `[data-value="entity-${currentEntity.id}-${currentEntity.name} ${currentEntity.code || ''}"]`;
        } else if (selectedClientId) {
          // If only a client is selected, construct selector for the client
          selector = `[data-value="client-${selectedClientId}-${clients.find(c => c.id === selectedClientId)?.name || ''}"]`;
        }
        
        if (selector) {
          // Find the selected element
          const element = document.querySelector(selector);
          if (element) {
            // Scroll the element into view
            console.log('Scrolling to selected item', selector);
            element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }, 100); // Short delay to ensure rendering is complete
    }
  }, [open, currentEntity, selectedClientId, clients]);

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
      <PopoverContent 
        className="w-[90vw] sm:w-[300px] p-0 max-h-[70vh]" 
        align="start"
      >
        <Command>
          <CommandInput 
            placeholder="Search clients and entities..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[60vh] overflow-y-auto">
            <CommandEmpty>No matches found.</CommandEmpty>

            {filteredClients.map((client) => {
              // CRITICAL: Get entities for this client - more explicit filter with enhanced logging
              console.log(`DEBUG: Rendering entities for Client ${client.id} (${client.name}). Expanded: ${!!expandedClients[client.id]}`);
              console.log(`DEBUG: Full entities list length: ${entities?.length}`);
              
              // First ensure entities is an array and filter based on clientId
              const filteredByClient = Array.isArray(entities) 
                ? entities.filter(e => e.clientId === client.id)
                : [];
              
              console.log(`DEBUG: Filtered list for Client ${client.id}. Length: ${filteredByClient.length}`, filteredByClient.map(e => e.id));
                
              // Then apply search filter separately and put selected entity at the top
              const clientEntities = filteredByClient
                .filter(filterBySearchQuery)
                .sort((a, b) => {
                  // Always put the selected entity at the top
                  if (currentEntity && a.id === currentEntity.id) return -1;
                  if (currentEntity && b.id === currentEntity.id) return 1;
                  // Otherwise sort alphabetically
                  return a.name.localeCompare(b.name);
                });
                
              // Final entities after all filtering
              console.log(`Final result - Client ${client.id} (${client.name}): Found ${filteredByClient.length} entities, ${clientEntities.length} after search filter`);
              
              // Skip if no matches
              if (!filterBySearchQuery(client) && clientEntities.length === 0) {
                return null;
              }
              
              const isExpanded = expandedClients[client.id] || false;
              
              return (
                <div key={`client-group-${client.id}`}>
                  <CommandGroup heading={client.name}>
                    <CommandItem
                      value={`client-${client.id}-${client.name}`} // Use unique identifier for each client
                      onSelect={(currentValue) => {
                        // Parse the client ID from the value string
                        const id = parseInt(currentValue.split('-')[1]);
                        selectClient(id);
                      }}
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
                            value={`entity-${entity.id}-${entity.name} ${entity.code || ''}`} // Use unique identifier + name/code for better search
                            onSelect={(currentValue) => {
                              // Parse the entity ID from the value string
                              const id = parseInt(currentValue.split('-')[1]);
                              // Find the entity by ID
                              const selectedEntity = entities.find(e => e.id === id);
                              if (selectedEntity) {
                                console.log('Entity selected, setting context:', selectedEntity);
                                selectEntity(selectedEntity);
                              } else {
                                console.error(`ERROR: Could not find entity with ID ${id} in entities list`);
                              }
                            }}
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