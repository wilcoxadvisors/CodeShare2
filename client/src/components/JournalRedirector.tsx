import React, { useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { useEntity } from "@/contexts/EntityContext";
import NoEntitySelected from './NoEntitySelected';

interface JournalRedirectorProps {
  mode?: 'list' | 'detail' | 'edit' | 'delete';
}

/**
 * A component that dynamically redirects journal entry URLs to the 
 * hierarchical structure using the current entity in context
 */
const JournalRedirector: React.FC<JournalRedirectorProps> = ({ mode = 'list' }) => {
  const params = useParams<{ id?: string }>();
  const { currentEntity, isInitialLoading } = useEntity();
  const navigate = useNavigate();
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // Wait for initial data load to complete and then handle redirection
  useEffect(() => {
    // Only proceed once the initial data load is done
    if (isInitialLoading) {
      console.log("JournalRedirector: Waiting for initial data load...");
      return;
    }
    
    console.log("JournalRedirector: Initial data load complete", { 
      hasCurrentEntity: !!currentEntity,
      currentEntityId: currentEntity?.id,
      entryId
    });
    
    // If we have a current entity, build and navigate to the hierarchical URL
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
      
      console.log("JournalRedirector: Navigating to hierarchical path:", path);
      navigate(path, { replace: true });
    }
    
    // If no entity is selected, we show the NoEntitySelected component
    // The component will render in the return statement when currentEntity is null
    
  }, [currentEntity, isInitialLoading, entryId, mode, navigate]);
  
  // Render a loading spinner while waiting for the initial data load
  if (isInitialLoading) {
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
  }
  
  // Show a "no entity selected" view if the user hasn't chosen an entity
  if (!currentEntity) {
    return <NoEntitySelected />;
  }
  
  // This will only show briefly until the redirect happens
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-sm text-muted-foreground">
        Preparing journal entries...
      </div>
    </div>
  );
};

export default JournalRedirector;