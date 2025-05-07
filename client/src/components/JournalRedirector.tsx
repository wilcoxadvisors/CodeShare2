import React, { useEffect } from 'react';
import { Navigate, useParams } from "react-router-dom";
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
  const { currentEntity, entities, setCurrentEntityById } = useEntity();
  const { toast } = useToast();
  
  console.log("JournalRedirector: mode =", mode, "params =", params);
  console.log("JournalRedirector: currentEntity =", currentEntity);
  console.log("JournalRedirector: entities count =", entities?.length || 0);
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // Auto-select the first entity if none is selected but entities are available
  useEffect(() => {
    if (!currentEntity && entities && entities.length > 0) {
      console.log("JournalRedirector: Auto-selecting first entity:", entities[0].id);
      try {
        setCurrentEntityById(entities[0].id);
      } catch (err) {
        console.error("Error auto-selecting entity:", err);
      }
    }
  }, [currentEntity, entities, setCurrentEntityById]);
  
  // If we don't have a current entity, but we do have available entities in context
  // and we haven't auto-selected one yet
  if (!currentEntity && entities && entities.length > 0) {
    console.log("JournalRedirector: No current entity but entities are available");
    toast({
      title: "Entity Selection Required",
      description: "Please select an entity to view journal entries",
      variant: "default",
    });
    
    // Redirect to dashboard where they can select an entity
    return <Navigate to="/dashboard" replace />;
  }
  
  // If we don't have any entities at all
  if (!currentEntity && (!entities || entities.length === 0)) {
    console.log("JournalRedirector: No entities available at all");
    toast({
      title: "No Entities Available",
      description: "You need to create an entity before you can work with journal entries",
      variant: "destructive",
    });
    
    return <Navigate to="/dashboard" replace />;
  }
  
  // If we have a current entity, create the hierarchical URL
  if (currentEntity) {
    const clientId = currentEntity.clientId;
    const entityId = currentEntity.id;
    
    let redirectPath = `/clients/${clientId}/entities/${entityId}/journal-entries`;
    
    // Add entry ID and mode if needed
    if (entryId) {
      redirectPath += `/${entryId}`;
      
      // Add action suffix for edit/delete
      if (mode === 'edit') {
        redirectPath += '/edit';
      } else if (mode === 'delete') {
        redirectPath += '/delete';
      }
    }
    
    console.log("JournalRedirector: Redirecting to hierarchical path:", redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  
  // Fallback - shouldn't reach here, but just in case
  console.error("JournalRedirector: Unexpected state - falling back to dashboard");
  return <Navigate to="/dashboard" replace />;
};

export default JournalRedirector;