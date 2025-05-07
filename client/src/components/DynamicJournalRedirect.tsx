import React from 'react';
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { useEntity } from "@/contexts/EntityContext";
import { useToast } from "@/hooks/use-toast";
// Added comment to force rebuild

interface DynamicJournalRedirectProps {
  mode?: 'list' | 'detail' | 'edit' | 'delete';
}

/**
 * A component that dynamically redirects journal entry URLs to the 
 * hierarchical structure using the current entity in context or falls back
 * to prompting the user to select an entity if none is selected
 */
const DynamicJournalRedirect: React.FC<DynamicJournalRedirectProps> = ({ mode = 'list' }) => {
  const params = useParams();
  const { currentEntity, entities } = useEntity();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  console.log("DynamicJournalRedirect: mode =", mode, "params =", params);
  console.log("DynamicJournalRedirect: currentEntity =", currentEntity);
  console.log("DynamicJournalRedirect: entities.length =", entities.length);
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // If we don't have a current entity, but we do have available entities in context
  if (!currentEntity && entities.length > 0) {
    console.log("DynamicJournalRedirect: No current entity but entities are available");
    // Prompt the user to select an entity
    toast({
      title: "Entity Selection Required",
      description: "Please select an entity from the dropdown to view journal entries",
    });
    
    // Redirect to dashboard where they can select an entity
    return <Navigate to="/dashboard" replace />;
  }
  
  // If we don't have any entities at all, navigate to client onboarding
  if (!currentEntity && entities.length === 0) {
    console.log("DynamicJournalRedirect: No entities available at all");
    toast({
      title: "No Entities Available",
      description: "You need to create an entity before you can work with journal entries",
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
    
    console.log("DynamicJournalRedirect: Redirecting to", redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  
  // Fallback if none of the conditions are met - shouldn't happen
  console.error("DynamicJournalRedirect: Unexpected state - no redirect path found");
  return <Navigate to="/dashboard" replace />;
};

export default DynamicJournalRedirect;