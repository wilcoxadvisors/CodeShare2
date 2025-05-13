import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  /** 
   * Set to false to hide entity selection - useful for features like Chart of Accounts
   * where the entities under a client share the same chart
   */
  showEntities?: boolean;
}

export default function GlobalContextSelector({ clients, entities, showEntities = true }: GlobalContextSelectorProps) {
  const { selectedClientId, setSelectedClientId, currentEntity, setCurrentEntity } = useEntity();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // CRITICAL FIX: Only expand the selected client initially 
  // Per Creator/Owner feedback - "entities for the currently active client are immediately visible"
  const initialExpandedState = useMemo(() => {
    // Start with empty object - no clients expanded by default
    const result: Record<number, boolean> = {};
    
    // If there's a selected client, only expand that one
    if (selectedClientId) {
      result[selectedClientId] = true;
      console.log(`ARCHITECT_DEBUG_SELECTOR_INIT: Initially expanding only selected client ${selectedClientId}`);
    }
    
    return result;
  }, [selectedClientId]);
  
  // Track which clients are expanded - only the selected client expanded by default
  const [expandedClients, setExpandedClients] = useState<Record<number, boolean>>(initialExpandedState);
  const [initialClientAutoSelectedDone, setInitialClientAutoSelectedDone] = useState(false);
  // Reference to current selectedClientId to avoid stale references
  const selectedClientIdRef = React.useRef<number | null>(selectedClientId);

  // Determine what context is selected for display
  const hasClientContext = selectedClientId !== null;
  const hasEntityContext = currentEntity !== null;
  
  // Find the current client's name if a client is selected
  const selectedClient = Array.isArray(clients) 
    ? clients.find(client => client.id === selectedClientId)
    : undefined;
  
  // Determine the button text with enhanced display
  let buttonText: React.ReactNode = "Select Client...";
  
  if (!showEntities) {
    // Special case for Chart of Accounts (no entity selection needed)
    if (hasClientContext && selectedClient) {
      buttonText = (
        <div className="flex items-center overflow-hidden">
          <div className="flex-1 truncate flex flex-col">
            <span className="font-medium truncate">
              <Building className="h-4 w-4 inline mr-1" />
              {selectedClient.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Chart of Accounts
            </span>
          </div>
        </div>
      );
    } else {
      buttonText = (
        <div className="flex items-center overflow-hidden">
          <Building className="h-4 w-4 inline mr-1 text-primary" />
          <span>Select Client for Chart of Accounts</span>
        </div>
      );
    }
  } else if (hasEntityContext && currentEntity) {
    // Standard case with entity selection
    buttonText = (
      <div className="flex items-center overflow-hidden">
        <div className="flex-1 truncate flex flex-col">
          <span className="font-medium truncate">
            <Layers className="h-4 w-4 inline mr-1" />
            {currentEntity.name}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            <Building className="h-3 w-3 inline mr-1" />
            {selectedClient?.name || 'Unknown Client'}
            {currentEntity.code && ` • Code: ${currentEntity.code}`}
          </span>
        </div>
      </div>
    );
  } else if (hasClientContext && selectedClient) {
    // Client selected but no entity yet
    buttonText = (
      <div className="flex items-center overflow-hidden">
        <div className="flex-1 truncate flex flex-col">
          <span className="font-medium truncate">
            <Building className="h-4 w-4 inline mr-1" />
            {selectedClient.name}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {showEntities ? "No entity selected" : ""}
          </span>
        </div>
      </div>
    );
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
        // Only show active clients (not inactive or deleted) and always include the currently selected client
        .filter(client => 
          (client.active === true && client.deletedAt === null) || 
          client.id === selectedClientId)
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
  // Handle client selection - Improved version to fix client switching bug
  const selectClient = useCallback((newClientId: number) => {
    const currentSelectedClientId = selectedClientIdRef.current;
    console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Client selection triggered. New ClientId: ${newClientId}, Previous ClientId: ${currentSelectedClientId}`);
    
    // Find client name for logging
    const clientName = clients.find(c => c.id === newClientId)?.name || 'Unknown';
    console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Setting client context: ${newClientId} (${clientName})`);
    
    // Show detailed debugging for prior state
    console.log('ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: BEFORE client selection - Current state:', {
      selectedClientId,
      currentEntity: currentEntity ? {
        id: currentEntity.id,
        name: currentEntity.name,
        clientId: currentEntity.clientId
      } : null
    });
    
    // If changing to a different client, update client selection
    if (newClientId !== currentSelectedClientId) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Setting new client to ${newClientId}. Clearing current entity.`);
      setCurrentEntity(null); // Clear entity when client changes
      setSelectedClientId(newClientId); // Set the new client directly - NO intermediate null state
      
      // Per Creator/Owner feedback: "entities for the currently active client are immediately visible"
      // Auto-expand the client we just selected (other clients may be collapsed or expanded based on user interaction)
      setExpandedClients(prev => {
        // Simply ensure this client is expanded without changing others' state
        const newState = { ...prev, [newClientId]: true };
        console.log(`ARCHITECT_DEBUG_SELECTOR_EXPAND: Setting client ${newClientId} expanded state to true to show its entities immediately`);
        return newState;
      });
      
      // CRITICAL: Keep dropdown behavior appropriate for the context
      setTimeout(() => {
        if (showEntities) {
          // For normal case, keep dropdown open when selecting a new client to allow immediate entity selection
          console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Keeping dropdown open to show entities for client ${newClientId}`);
          setOpen(true);
        } else {
          // For features like Chart of Accounts where entities aren't needed, close the dropdown
          console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Closing dropdown after client selection for non-entity feature`);
          setOpen(false);
        }
      }, 50);
    } else {
      // If clicking the same client that's already selected, just toggle its expansion state
      console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Client ${newClientId} is already selected. Toggling expansion.`);
      
      if (showEntities) {
        setExpandedClients(prev => {
          const isCurrentlyExpanded = !!prev[newClientId];
          const newState = { ...prev, [newClientId]: !isCurrentlyExpanded };
          console.log(`ARCHITECT_DEBUG_SELECTOR_EXPAND: Toggling client ${newClientId} expansion from ${isCurrentlyExpanded} to ${!isCurrentlyExpanded}`);
          return newState;
        });
        
        // Always keep the dropdown open when toggling expansion
        setTimeout(() => {
          setOpen(true);
        }, 50);
      } else {
        // For features like Chart of Accounts where entities aren't needed, close the dropdown
        setOpen(false);
      }
    }
    
    // Show detailed debugging after client selection
    console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_CHANGE: Client selection completed - Selected client set to: ${newClientId}`);
  }, [clients, currentEntity, selectedClientId, open, showEntities]);

  // Handle entity selection
  const selectEntity = (entity: Entity) => {
    console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Entity selection triggered - entityId: ${entity.id}, clientId: ${entity.clientId}`);
    
    // CRITICAL - Verify entity has valid clientId
    if (!entity.clientId) {
      console.error(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: ERROR - Entity ${entity.id} (${entity.name}) has no clientId!`);
      return;
    }
    
    // Find client name for logging
    const clientName = clients.find(c => c.id === entity.clientId)?.name || 'Unknown';
    console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Setting context to entity: ${entity.id} (${entity.name}), client: ${entity.clientId} (${clientName})`);
    
    // Show detailed debugging for prior state
    console.log('ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: BEFORE entity selection - Current state:', {
      selectedClientId,
      currentEntity: currentEntity ? {
        id: currentEntity.id,
        name: currentEntity.name,
        clientId: currentEntity.clientId
      } : null
    });
    
    // Critical - only set the client ID if it's different from current 
    if (selectedClientId !== entity.clientId) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Updating client context to: ${entity.clientId} (${clientName})`);
      setSelectedClientId(entity.clientId);
    } else {
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Client context already set to: ${entity.clientId}, skipping update`);
    }
    
    // CRITICAL FIX: Force a complete re-render cycle by first clearing the entity
    // This ensures that all components dependent on the entity context are notified of the change
    console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Clearing current entity to force re-render cycle`);
    setCurrentEntity(null);
    
    // Then set entity context with a delay to ensure the null state is processed
    setTimeout(() => {
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Setting entity context to:`, {
        id: entity.id,
        name: entity.name, 
        clientId: entity.clientId
      });
      setCurrentEntity(entity);
      
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: AFTER entity selection completed - clientId: ${entity.clientId}, entityId: ${entity.id}`);
    }, 50); // Short timeout to ensure state update is processed
    
    // Close popover immediately
    setOpen(false);
    
    console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: AFTER entity selection initiated - clientId: ${entity.clientId}, entityId: ${entity.id}`);
  };

  // Toggle client expansion - improved with logging
  const toggleClientExpansion = (e: React.MouseEvent, clientId: number) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`ARCHITECT_DEBUG_SELECTOR_EXPAND: toggleClientExpansion called for client ${clientId}`);
    setExpandedClients(prev => {
      const newState = { ...prev, [clientId]: !prev[clientId] };
      console.log(`ARCHITECT_DEBUG_SELECTOR_EXPAND: New expansion state for client ${clientId}:`, newState[clientId]);
      return newState;
    });
  };

  // Auto-expand the selected client and ensure its entities are immediately visible
  useEffect(() => {
    if (selectedClientId) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_UI: Auto-expanding selected client ${selectedClientId} to show entities`);
      
      // Instead of updating all clients, we'll focus on keeping the selected client expanded
      setExpandedClients(prev => ({ ...prev, [selectedClientId]: true }));
      
      // Update reference for later comparisons
      selectedClientIdRef.current = selectedClientId;
    }
  }, [selectedClientId]);
  
  // Auto-expand the selected client when dropdown opens
  // Per Creator/Owner feedback: "When the dropdown is opened, entities for the currently active client are immediately visible"
  useEffect(() => {
    if (open && selectedClientId) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_UI: Dropdown opened - ensuring selected client ${selectedClientId} is expanded to show its entities`);
      
      // Only ensure the selected client is expanded, leave others in user-controlled state
      setExpandedClients(prev => ({ ...prev, [selectedClientId]: true }));
    }
  }, [open, selectedClientId]);

  // Also ensure the selected client is expanded whenever it changes (not just when dropdown opens)
  useEffect(() => {
    if (selectedClientId) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_UI: Selected client changed to ${selectedClientId} - ensuring it's expanded to show its entities`);
      
      // Only ensure the selected client is expanded, leave others in user-controlled state
      setExpandedClients(prev => ({ ...prev, [selectedClientId]: true }));
    }
  }, [selectedClientId]);
  
  // Auto-selection of first client has been removed as requested
  // No automatic client selection will occur

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
          aria-label="Select client"
          className="w-[280px] justify-between text-ellipsis overflow-hidden"
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
            placeholder="Search clients..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[60vh] overflow-y-auto">
            <CommandEmpty>No matches found.</CommandEmpty>

            {filteredClients.map((client) => {
              // CRITICAL: Get entities for this client - more explicit filter with enhanced logging
              console.log(`ARCHITECT_DEBUG_SELECTOR_RENDER: Rendering entities for Client ${client.id} (${client.name}). Expanded: ${!!expandedClients[client.id]}`);
              console.log(`ARCHITECT_DEBUG_SELECTOR_RENDER: Full entities list length: ${entities?.length}`);
              
              // First ensure entities is an array and filter based on clientId
              // Per Creator/Owner request: only show active entities (plus the current entity)
              const filteredByClient = Array.isArray(entities) 
                ? entities.filter(e => 
                    e.clientId === client.id && 
                    ((e.active === true && e.deletedAt === null) || 
                     (currentEntity && e.id === currentEntity.id)))
                : [];
              
              console.log(`ARCHITECT_DEBUG_SELECTOR_RENDER: Filtered list for Client ${client.id}. Length: ${filteredByClient.length}`, 
                filteredByClient.map(e => ({ id: e.id, name: e.name })));
                
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
              console.log(`ARCHITECT_DEBUG_SELECTOR_RENDER: Final result - Client ${client.id} (${client.name}): Found ${filteredByClient.length} entities, ${clientEntities.length} after search filter`);
              
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
                        console.log('ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: Selecting client', id, 'showEntities=', showEntities);
                        
                        // Select the client in context
                        selectClient(id);
                        
                        // If entities shouldn't be shown (Chart of Accounts case), close dropdown immediately
                        if (!showEntities) {
                          console.log('ARCHITECT_DEBUG_SELECTOR_BEHAVIOR: Entities hidden (Chart of Accounts mode) - closing dropdown after client selection');
                          setOpen(false);
                        } else {
                          console.log('ARCHITECT_DEBUG_SELECTOR_BEHAVIOR: Keeping dropdown open for entity selection');
                          // Ensure this client is expanded
                          setExpandedClients(prev => ({ ...prev, [id]: true }));
                        }
                      }}
                      className="cursor-pointer font-medium bg-primary/5 hover:bg-primary/10 border-l-2 border-primary/70 rounded-sm mb-1"
                    >
                      <div className="flex items-center w-full overflow-hidden">
                        {showEntities && clientEntities.length > 0 ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log(`ARCHITECT_DEBUG_SELECTOR_EXPAND: Toggling expansion for client ${client.id}`);
                              
                              // Toggle expansion state directly here
                              setExpandedClients(prev => {
                                const isCurrentlyExpanded = !!prev[client.id];
                                const newState = { ...prev, [client.id]: !isCurrentlyExpanded };
                                console.log(`ARCHITECT_DEBUG_SELECTOR_EXPAND: Toggling client ${client.id} expansion from ${isCurrentlyExpanded} to ${!isCurrentlyExpanded}`);
                                return newState;
                              });
                              
                              // Keep dropdown open after toggling expansion
                              setTimeout(() => {
                                setOpen(true);
                              }, 50);
                            }}
                            className="mr-2 flex-shrink-0 p-1 hover:bg-primary/30 rounded-md cursor-pointer border border-primary/40 transition-colors duration-200"
                            aria-label={isExpanded ? "Collapse client" : "Expand client"}
                          >
                            {isExpanded ? 
                              <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200" /> : 
                              <ChevronRight className="h-4 w-4 text-primary transition-transform duration-200" />
                            }
                          </div>
                        ) : (
                          <span className="w-6 mr-2"></span>
                        )}
                        <Building className="mr-2 h-4 w-4 text-primary" />
                        <span className="truncate font-semibold">{client.name}</span>
                        {selectedClientId === client.id && (!hasEntityContext || !showEntities) && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </div>
                    </CommandItem>
                    
                    {/* Only show entities section if showEntities prop is true */}
                    {/* CRITICAL FIX: Now preloading all entities but conditionally showing them */}
                    {showEntities && clientEntities.length > 0 && (
                      <div 
                        className={`pt-1 pb-1 border-l-2 border-primary/30 ml-4 transition-all duration-300 ease-in-out ${
                          isExpanded 
                            ? 'max-h-[500px] opacity-100 translate-y-0' 
                            : 'max-h-0 opacity-0 translate-y-[-8px] pointer-events-none overflow-hidden'
                        }`}
                        aria-hidden={!isExpanded}
                      >
                        {clientEntities.map((entity) => {
                          // Per Creator/Owner request: color indicators for entity status are not needed
                          // We already filter out inactive and deleted entities above
                          
                          // Basic styling classes for all entities (no status colors)
                          const statusClasses = entity.id === currentEntity?.id
                            ? "border-primary/50 bg-primary/5" 
                            : "border-muted/40 hover:border-primary/30";
                          
                          return (
                            <CommandItem
                              key={`entity-${entity.id}`}
                              value={`entity-${entity.id}-${entity.name} ${entity.code || ''}`} // Use unique identifier + name/code for better search
                              onSelect={(currentValue) => {
                                // Parse the entity ID from the value string
                                const id = parseInt(currentValue.split('-')[1]);
                                // Find the entity by ID
                                const selectedEntity = entities.find(e => e.id === id);
                                if (selectedEntity) {
                                  console.log('ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Entity selected, setting context:', 
                                    { id: selectedEntity.id, name: selectedEntity.name, clientId: selectedEntity.clientId });
                                  selectEntity(selectedEntity);
                                } else {
                                  console.error(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: ERROR - Could not find entity with ID ${id} in entities list of ${entities?.length} items`);
                                }
                              }}
                              className={`cursor-pointer pl-4 py-1 my-1 mx-2 rounded-sm border-l-2 hover:bg-muted/50 ${statusClasses}`}
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
                          );
                        })}
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