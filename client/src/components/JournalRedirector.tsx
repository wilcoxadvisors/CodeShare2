import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { useEntity } from "@/contexts/EntityContext";
import { useToast } from "@/hooks/use-toast";

interface JournalRedirectorProps {
  mode?: 'list' | 'detail' | 'edit' | 'delete';
}

/**
 * A component that dynamically redirects journal entry URLs to the 
 * hierarchical structure using the current entity in context
 */
const JournalRedirector: React.FC<JournalRedirectorProps> = ({ mode = 'list' }) => {
  const params = useParams<{ id?: string }>();
  const { currentEntity, entities, allEntities, setCurrentEntityById, isLoading } = useEntity();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  
  console.log("JournalRedirector: mode =", mode, "params =", params);
  console.log("JournalRedirector: currentEntity =", currentEntity);
  console.log("JournalRedirector: entities count =", entities?.length || 0);
  console.log("JournalRedirector: isLoading =", isLoading);
  console.log("JR state", { isLoading, entities: entities.length });
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // Handle all redirects in useEffect to avoid React warnings about state updates during render
  useEffect(() => {
    // Wait for entities to finish loading
    if (isLoading) {
      console.log("JournalRedirector: Still loading entities, waiting...");
      return;
    }
    
    console.log("JournalRedirector: Data loaded", { 
      allEntities: allEntities.length,
      filteredEntities: entities.length,
      currentEntity: currentEntity?.id 
    });
    
    // If we don't have any entities at all (check allEntities, not filtered entities)
    if (!allEntities || allEntities.length === 0) {
      console.log("JournalRedirector: No entities available at all");
      toast({
        title: "No Entities Available",
        description: "You need to create an entity before you can work with journal entries",
        variant: "destructive",
      });
      
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // Use all entities if filtered list is empty (when no client is selected)
    const availableEntities = entities.length > 0 ? entities : allEntities;
    
    // Auto-select the first entity if none is selected but entities are available
    if (!currentEntity && availableEntities.length > 0) {
      console.log("JournalRedirector: Auto-selecting first entity:", availableEntities[0].id);
      try {
        setCurrentEntityById(availableEntities[0].id);
        // Let the effect run again after setting the entity
        return;
      } catch (err) {
        console.error("Error auto-selecting entity:", err);
      }
    }
    
    // If we have a current entity, create the hierarchical URL
    if (currentEntity) {
      const clientId = currentEntity.clientId;
      const entityId = currentEntity.id;
      
      let path = `/clients/${clientId}/entities/${entityId}/journal-entries`;
      
      // Add entry ID and mode if needed
      if (entryId) {
        path += `/${entryId}`;
        
        // Add action suffix for edit/delete
        if (mode === 'edit') {
          path += '/edit';
        } else if (mode === 'delete') {
          path += '/delete';
        }
      }
      
      console.log("JournalRedirector: Setting redirect path:", path);
      setRedirectPath(path);
      return;
    }
    
    // Fallback - shouldn't reach here, but just in case
    console.error("JournalRedirector: Unexpected state - falling back to dashboard");
    navigate('/dashboard', { replace: true });
    
  }, [currentEntity, entities, allEntities, setCurrentEntityById, isLoading, entryId, mode, toast, navigate]);
  
  // Use another useEffect to handle the navigation when redirectPath changes
  useEffect(() => {
    if (redirectPath) {
      console.log("JournalRedirector: Navigating to:", redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [redirectPath, navigate]);
  
  // Render a loading spinner while waiting for entities or the redirect to happen
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-sm text-muted-foreground">
          Loading...
        </div>
      </div>
    </div>
  );
};

export default JournalRedirector;