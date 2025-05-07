import React from 'react';
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
  const params = useParams();
  const { currentEntity, entities } = useEntity();
  const { toast } = useToast();
  
  console.log("JournalRedirector: mode =", mode, "params =", params);
  console.log("JournalRedirector: currentEntity =", currentEntity);
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // If we don't have a current entity, but we do have available entities in context
  if (!currentEntity && entities.length > 0) {
    console.log("JournalRedirector: No current entity but entities are available");
    toast({
      title: "Entity Selection Required",
      description: "Please select an entity to view journal entries",
    });
    
    return <Navigate to="/dashboard" replace />;
  }
  
  // If we don't have any entities at all
  if (!currentEntity && entities.length === 0) {
    console.log("JournalRedirector: No entities available at all");
    toast({
      title: "No Entities Available",
      description: "You need to create an entity first",
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
    
    console.log("JournalRedirector: Redirecting to", redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  
  // Fallback
  return <Navigate to="/dashboard" replace />;
};

export default JournalRedirector;