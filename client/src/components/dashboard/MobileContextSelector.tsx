import { useState, useEffect } from "react";
import { Check, ChevronRight, ChevronDown, Building, Layers } from "lucide-react";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
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

interface MobileContextSelectorProps {
  clients: Client[];
  entities: Entity[];
  onSelect?: () => void; // Callback to close the drawer when selection is made
}

export default function MobileContextSelector({ clients, entities, onSelect }: MobileContextSelectorProps) {
  const { selectedClientId, setSelectedClientId, currentEntity, setCurrentEntity } = useEntity();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClients, setExpandedClients] = useState<Record<number, boolean>>({});

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
  const selectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setCurrentEntity(null);
    if (onSelect) onSelect();
  };

  // Handle entity selection
  const selectEntity = (entity: Entity) => {
    // CRITICAL - Verify entity has valid clientId
    if (!entity.clientId) {
      console.error(`ERROR: Entity ${entity.id} (${entity.name}) has no clientId!`);
      return;
    }
    
    // Set client context FIRST to ensure proper state hierarchy
    setSelectedClientId(entity.clientId); 
    
    // Then set entity context
    setCurrentEntity(entity);
    
    // Call onSelect callback to close drawer if provided
    if (onSelect) onSelect();
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
    <Command className="rounded-lg border shadow-md">
      <CommandInput 
        placeholder="Search clients..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[60vh] overflow-y-auto">
        <CommandEmpty>No matches found.</CommandEmpty>

        {filteredClients.map((client) => {
          // Get entities for this client - only show active and non-deleted entities (plus the current entity)
          const filteredByClient = Array.isArray(entities) 
            ? entities.filter(e => 
                e.clientId === client.id && 
                ((e.active === true && e.deletedAt === null) || 
                 (currentEntity && e.id === currentEntity.id)))
            : [];
            
          // Then apply search filter and put selected entity at the top
          const clientEntities = filteredByClient
            .filter(filterBySearchQuery)
            .sort((a, b) => {
              // Always put the selected entity at the top
              if (currentEntity && a.id === currentEntity.id) return -1;
              if (currentEntity && b.id === currentEntity.id) return 1;
              // Otherwise sort alphabetically
              return a.name.localeCompare(b.name);
            });
            
          // Skip if no matches
          if (!filterBySearchQuery(client) && clientEntities.length === 0) {
            return null;
          }
          
          const isExpanded = expandedClients[client.id] || false;
          
          return (
            <div key={`client-group-${client.id}`}>
              <CommandGroup heading={client.name}>
                <CommandItem
                  key={`client-${client.id}`}
                  value={`client-${client.id}-${client.name}`}
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
                    {selectedClientId === client.id && !currentEntity && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </div>
                </CommandItem>
                
                {isExpanded && clientEntities.length > 0 && (
                  <div className="pt-1 pb-1">
                    {clientEntities.map((entity) => (
                      <CommandItem
                        key={`entity-${entity.id}`}
                        value={`entity-${entity.id}-${entity.name} ${entity.code || ''}`}
                        onSelect={(currentValue) => {
                          // Parse the entity ID from the value string
                          const id = parseInt(currentValue.split('-')[1]);
                          // Find the entity by ID
                          const selectedEntity = entities.find(e => e.id === id);
                          if (selectedEntity) {
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
  );
}