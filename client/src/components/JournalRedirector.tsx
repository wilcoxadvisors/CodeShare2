import React, { useEffect, useState } from 'react';
import { Navigate, useParams, useNavigate } from "react-router-dom";
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
  const { currentEntity, entities, setCurrentEntityById, isLoading } = useEntity();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  
  console.log("JournalRedirector: mode =", mode, "params =", params);
  console.log("JournalRedirector: currentEntity =", currentEntity);
  console.log("JournalRedirector: entities count =", entities?.length || 0);
  console.log("JournalRedirector: isLoading =", isLoading);
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // Handle all redirects in useEffect to avoid React warnings about state updates during render
  useEffect(() => {
    // Wait for entities to finish loading
    if (isLoading) {
      console.log("JournalRedirector: Still loading entities, waiting...");
      return;
    }
    
    // Auto-select the first entity if none is selected but entities are available
    if (!currentEntity && entities && entities.length > 0) {
      console.log("JournalRedirector: Auto-selecting first entity:", entities[0].id);
      try {
        setCurrentEntityById(entities[0].id);
        // Let the effect run again after setting the entity
        return;
      } catch (err) {
        console.error("Error auto-selecting entity:", err);
      }
    }
    
    // If we don't have a current entity, but we do have available entities in context
    if (!currentEntity && entities && entities.length > 0) {
      console.log("JournalRedirector: No current entity but entities are available");
      toast({
        title: "Entity Selection Required",
        description: "Please select an entity to view journal entries",
        variant: "default",
      });
      
      // Redirect to dashboard where they can select an entity
      setRedirectPath("/dashboard");
      return;
    }
    
    // If we don't have any entities at all
    if (!currentEntity && (!entities || entities.length === 0)) {
      console.log("JournalRedirector: No entities available at all");
      toast({
        title: "No Entities Available",
        description: "You need to create an entity before you can work with journal entries",
        variant: "destructive",
      });
      
      setRedirectPath("/dashboard");
      return;
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
      
      console.log("JournalRedirector: Setting hierarchical path:", path);
      setRedirectPath(path);
      return;
    }
    
    // Fallback - shouldn't reach here, but just in case
    console.error("JournalRedirector: Unexpected state - falling back to dashboard");
    setRedirectPath("/dashboard");
    
  }, [currentEntity, entities, setCurrentEntityById, isLoading, entryId, mode, toast]);
  
  // Use another useEffect to handle the actual navigation when redirectPath changes
  useEffect(() => {
    if (redirectPath) {
      console.log("JournalRedirector: Navigating to:", redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [redirectPath, navigate]);
  
  // Render a loading state while waiting for entities or the redirect to happen
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-pulse text-sm text-muted-foreground">
        Preparing journal entries...
      </div>
    </div>
  );
};

export default JournalRedirector;