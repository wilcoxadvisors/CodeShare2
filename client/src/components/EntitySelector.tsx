import { useState } from "react";
import { useEntity } from "../contexts/EntityContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function EntitySelector() {
  const { entities, currentEntity, setCurrentEntity, selectedClientId } = useEntity();
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
  const handleSelectEntity = (entityId: string) => {
    const entity = filteredEntities.find(e => e.id.toString() === entityId);
    if (!entity) {
      console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Entity not found for ID:", entityId);
      return;
    }
    
    console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: BEFORE entity selection - clientId:", entity.clientId, "entityId:", entity.id);
    console.log("ARCHITECT_DEBUG_SELECTOR_ENTITY_CHANGE: Current location:", location.pathname);
    
    // Update the entity in context
    setCurrentEntity(entity);
    
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
    <div className="w-[300px]">
      {/* Search filter for entities */}
      {filteredEntities.length > 5 && (
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      
      {/* Entity selector */}
      <Select 
        value={currentEntity?.id?.toString() || ""} 
        onValueChange={(value) => {
          console.log("ARCHITECT_DEBUG_SELECTOR_SELECT_CHANGE: Value changed to:", value);
          handleSelectEntity(value);
        }}
        disabled={!selectedClientId}
      >
        <SelectTrigger className="w-full">
          <SelectValue 
            placeholder={selectedClientId ? "Select entity" : "Select client first"} 
          />
        </SelectTrigger>
        <SelectContent>
          {filteredEntities.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              {selectedClientId 
                ? "No entities found for selected client." 
                : "Please select a client first."}
            </div>
          ) : (
            filteredEntities.map((entity) => (
              <SelectItem 
                key={entity.id} 
                value={entity.id.toString()}
                className="cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{entity.name}</span>
                  {entity.code && (
                    <span className="text-sm text-muted-foreground">{entity.code}</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}