import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  /** 
   * Set to false to hide entity selection - useful for features like Chart of Accounts
   * where the entities under a client share the same chart
   */
  showEntities?: boolean;
}

export default function GlobalContextSelector({ showEntities = true }: GlobalContextSelectorProps) {
  const { selectedClientId, setSelectedClientId, currentEntity, setCurrentEntity, clients, allEntities: entities } = useEntity();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Debug logging to track data availability
  useEffect(() => {
    console.log('ARCHITECT_DEBUG_SELECTOR_DATA_FLOW:', {
      clientsLength: clients?.length || 0,
      entitiesLength: entities?.length || 0,
      selectedClientId,
      currentEntity: currentEntity?.id,
      timestamp: new Date().toISOString()
    });
  }, [clients, entities, selectedClientId, currentEntity]);
  
  // Detect if we're on a client-only page (like dimensions or chart of accounts)
  const location = useLocation();
  const navigate = useNavigate();
  const isClientOnlyView = location.pathname.includes('/chart-of-accounts') || location.pathname.includes('/manage/dimensions');
  
  // TRUE USER-CONTROLLED EXPANSION: Creator/Owner's exact requirements
  // Track which clients are expanded - start collapsed, allow restoration for selected client
  const [expandedClients, setExpandedClients] = useState<Record<number, boolean>>({});
  
  // PERSISTENCE RESTORATION: If there's a selected client from localStorage, expand it initially
  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      setExpandedClients(prev => ({ ...prev, [selectedClientId]: true }));
      console.log(`ARCHITECT_DEBUG_SELECTOR_INIT_EXPAND: Restored selectedClientId ${selectedClientId}, expanding it for user convenience`);
    }
  }, [selectedClientId, clients.length]);
  const [initialClientAutoSelectedDone, setInitialClientAutoSelectedDone] = useState(false);
  // Reference to current selectedClientId to avoid stale references
  const selectedClientIdRef = React.useRef<number | null>(selectedClientId);

  // Determine what context is selected for display
  const hasClientContext = selectedClientId !== null;
  const hasEntityContext = currentEntity !== null;
  
  // Simplified display logic that reads directly from context
  const selectedClientName = useMemo(() => clients.find(c => c.id === selectedClientId)?.name, [clients, selectedClientId]);
  const currentEntityName = useMemo(() => entities.find(e => e.id === currentEntity?.id)?.name, [entities, currentEntity]);

  let buttonText: React.ReactNode = "Select Client...";

  if (isClientOnlyView) {
    const contextLabel = location.pathname.includes('/chart-of-accounts') ? "Chart of Accounts" : "Dimensions";
    if (selectedClientName) {
      buttonText = `${selectedClientName} / ${contextLabel}`;
    } else {
      buttonText = `Select Client for ${contextLabel}`;
    }
  } else {
    if (currentEntityName && selectedClientName) {
      buttonText = `${selectedClientName} / ${currentEntityName}`;
    } else if (selectedClientName) {
      buttonText = `${selectedClientName} / Select Entity...`;
    }
  }
  
  // Filter function for search
  const filterBySearchQuery = (item: { name: string; code?: string }) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(query);
    const codeMatch = item.code ? item.code.toLowerCase().includes(query) : false;
    
    return nameMatch || codeMatch;
  };
  
  // Explicitly pre-fetch and filter entities by client immediately
  const entitiesByClient = useMemo(() => {
    const map: Record<number, Entity[]> = {};
    clients.forEach(client => {
      map[client.id] = entities.filter(
        e => e.clientId === client.id && e.active && !e.deletedAt
      );
    });
    return map;
  }, [clients, entities]);

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
  
  const selectClient = (clientId: number) => {
    console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: Selecting client ${clientId}, current path: ${location.pathname}`);
    
    // CONTEXT-AWARE NAVIGATION: Intelligent routing based on current page
    const currentPath = location.pathname;
    
    // Navigate to the appropriate URL based on current page context
    if (currentPath.includes('/chart-of-accounts')) {
      // Rule 1: Chart of Accounts page - navigate to Chart of Accounts for new client
      const newPath = `/clients/${clientId}/chart-of-accounts`;
      console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: Navigating to chart of accounts: ${newPath}`);
      navigate(newPath);
    } else if (currentPath.includes('/manage/dimensions')) {
      // Rule 2: Dimensions page - navigate to Dimensions for new client
      const newPath = `/clients/${clientId}/manage/dimensions`;
      console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: Navigating to dimensions: ${newPath}`);
      navigate(newPath);
    } else {
      // Rule 3: All other cases - find first entity and navigate to Journal Entries
      console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: Finding first entity for client ${clientId}`);
      
      // Filter entities for the selected client
      const clientEntities = entities.filter((entity: Entity) => entity.clientId === clientId && entity.active);
      
      if (clientEntities.length > 0) {
        // Navigate to first entity's Journal Entries page
        const firstEntity = clientEntities[0];
        const newPath = `/clients/${clientId}/entities/${firstEntity.id}/journal-entries`;
        console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: Navigating to first entity's journal entries: ${newPath} (Entity: ${firstEntity.name})`);
        navigate(newPath);
      } else {
        // Fallback: no entities found, navigate to client dashboard
        const newPath = `/clients/${clientId}`;
        console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_SELECT: No entities found, navigating to client dashboard: ${newPath}`);
        navigate(newPath);
      }
    }
    
    // Close popover immediately
    setOpen(false);
  };

  const toggleClientExpansion = (e: React.MouseEvent, clientId: number) => {
    e.stopPropagation();
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  const handleExpandAll = useCallback(() => {
    if (!showEntities) return; // Only act if entities are shown
    console.log("ARCHITECT_DEBUG_SELECTOR_EXPAND_ALL: Expanding all visible clients");
    const allExpanded: Record<number, boolean> = {};
    filteredClients.forEach(client => {
      // Ensure client has entities to expand before marking for expansion
      const clientEntities = entitiesByClient[client.id] || [];
      if (clientEntities.length > 0) {
        allExpanded[client.id] = true;
      }
    });
    setExpandedClients(allExpanded);
  }, [filteredClients, entitiesByClient, showEntities]);

  const handleCollapseAll = useCallback(() => {
    if (!showEntities) return; // Only act if entities are shown
    console.log("ARCHITECT_DEBUG_SELECTOR_COLLAPSE_ALL: Collapsing all clients");
    setExpandedClients({}); // Reset to all collapsed
  }, [showEntities]);

  // Handle entity selection with stabilized navigation
  const selectEntity = (entity: Entity) => {
    console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Entity selection triggered - entityId: ${entity.id}, clientId: ${entity.clientId}`);
    
    // CRITICAL - Verify entity has valid clientId
    if (!entity.clientId) {
      console.error(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: ERROR - Entity ${entity.id} (${entity.name}) has no clientId!`);
      return;
    }

    // STABILIZED NAVIGATION - prevent rapid state changes
    if (currentEntity?.id === entity.id) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Same entity selected, ignoring to prevent oscillation`);
      setOpen(false);
      return;
    }
    
    // URL-BASED NAVIGATION: Update URL to drive state changes
    const currentPath = location.pathname;
    console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Current path: ${currentPath}`);
    
    // Navigate to the appropriate URL based on current page
    if (currentPath.includes('/journal-entries')) {
      const newPath = `/clients/${entity.clientId}/entities/${entity.id}/journal-entries`;
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Navigating to journal entries: ${newPath}`);
      navigate(newPath, { replace: true }); // Use replace to prevent back/forward issues
    } else if (currentPath.includes('/chart-of-accounts')) {
      const newPath = `/clients/${entity.clientId}/chart-of-accounts`;
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Navigating to chart of accounts: ${newPath}`);
      navigate(newPath, { replace: true });
    } else {
      // Default to journal entries for the selected entity
      const newPath = `/clients/${entity.clientId}/entities/${entity.id}/journal-entries`;
      console.log(`ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Default navigation to journal entries: ${newPath}`);
      navigate(newPath, { replace: true });
    }
    
    // Close popover immediately
    setOpen(false);
  };



  useEffect(() => {
    if (selectedClientId) {
      console.log(`ARCHITECT_DEBUG_SELECTOR_UI: Selected client changed to ${selectedClientId} - ensuring it's expanded`);
      
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
          {showEntities && !isClientOnlyView && (
            <div className="flex justify-end space-x-2 p-2 border-b">
              <Button
                variant="link"
                size="sm"
                onClick={handleExpandAll}
                className="text-xs h-auto py-1 px-2"
              >
                Expand All
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={handleCollapseAll}
                className="text-xs h-auto py-1 px-2"
              >
                Collapse All
              </Button>
            </div>
          )}
          <CommandList className="max-h-[60vh] overflow-y-auto">
            <CommandEmpty>No matches found.</CommandEmpty>

            {filteredClients.map((client) => {
              // Use the explicitly pre-filtered entities map
              const clientEntities = entitiesByClient[client.id] || [];
              
              // Apply search filter and sort by selected entity first
              const filteredEntities = clientEntities
                .filter(filterBySearchQuery)
                .sort((a, b) => {
                  // Always put the selected entity at the top
                  if (currentEntity && a.id === currentEntity.id) return -1;
                  if (currentEntity && b.id === currentEntity.id) return 1;
                  // Otherwise sort alphabetically
                  return a.name.localeCompare(b.name);
                });
              
              // Skip if no matches
              if (!filterBySearchQuery(client) && filteredEntities.length === 0) {
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
                        
                        // If entities shouldn't be shown (Chart of Accounts case) or we're on dimensions page, close dropdown immediately
                        if (!showEntities || isClientOnlyView) {
                          console.log('ARCHITECT_DEBUG_SELECTOR_BEHAVIOR: Entities hidden (Chart of Accounts mode or dimensions page) - closing dropdown after client selection');
                          setOpen(false);
                        } else {
                          console.log('ARCHITECT_DEBUG_SELECTOR_BEHAVIOR: Keeping dropdown open for entity selection');
                          // IMPORTANT: Do NOT auto-expand this client - per Creator/Owner: "I want to be able to see and expand clients 
                          // without selecting entities"
                          console.log(`ARCHITECT_DEBUG_SELECTOR_CLIENT_BEHAVIOR: Client ${id} selected, but NOT auto-expanded per Creator/Owner request. User must explicitly expand via chevron.`);
                        }
                      }}
                      className="cursor-pointer font-medium bg-primary/5 hover:bg-primary/10 border-l-2 border-primary/70 rounded-sm mb-1"
                    >
                      <div className="flex items-center w-full overflow-hidden">
                        {/* Only show expansion controls when showEntities is true */}
                        {showEntities ? (
                          <div 
                            onClick={(e) => toggleClientExpansion(e, client.id)}
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
                    
                    {/* CRITICAL UX FIX: Only show entities section when ALL conditions are met:
                       1. showEntities prop is true (not in CoA mode)
                       2. This client has entities to show
                       3. This client is explicitly expanded by user action 
                    */}
                    {showEntities && !isClientOnlyView && filteredEntities.length > 0 && isExpanded && (
                      <div 
                        className="pt-1 pb-1 border-l-2 border-primary/30 ml-4 transition-all duration-300 ease-in-out max-h-[500px] opacity-100 translate-y-0"
                        aria-hidden="false"
                      >
                        {filteredEntities.map((entity) => {
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
                                console.log('ARCHITECT_DEBUG_GLOBAL_SELECTOR_ENTITY_ONSELECT: onSelect triggered for:', currentValue);
                                // Parse the entity ID from the value string
                                const id = parseInt(currentValue.split('-')[1]);
                                // Find the entity by ID
                                const selectedEntity = entities.find(e => e.id === id);
                                if (selectedEntity) {
                                  console.log('ARCHITECT_DEBUG_GLOBAL_SELECTOR_ENTITY_ONSELECT: Entity selected, navigating to URL:', 
                                    { id: selectedEntity.id, name: selectedEntity.name, clientId: selectedEntity.clientId });
                                  
                                  // PART 1: Use URL navigation as single source of truth
                                  navigate(`/clients/${selectedEntity.clientId}/entities/${selectedEntity.id}/journal-entries`);
                                  setOpen(false);
                                } else {
                                  console.error(`ARCHITECT_DEBUG_GLOBAL_SELECTOR_ENTITY_ONSELECT: ERROR - Could not find entity with ID ${id} in entities list of ${entities?.length} items`);
                                }
                              }}
                              onClick={() => {
                                console.log('ARCHITECT_DEBUG_GLOBAL_SELECTOR_ENTITY_ONCLICK: onClick triggered for entity:', entity.id, entity.name);
                                
                                // PART 1: Use URL navigation as single source of truth
                                navigate(`/clients/${entity.clientId}/entities/${entity.id}/journal-entries`);
                                setOpen(false);
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