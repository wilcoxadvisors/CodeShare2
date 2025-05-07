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
  const { currentEntity, entities, isInitialLoading } = useEntity();
  const navigate = useNavigate();
  
  console.log("JournalRedirector render state:", { 
    isInitialLoading, 
    hasEntities: entities?.length > 0,
    entitiesCount: entities?.length,
    hasCurrentEntity: !!currentEntity
  });
  
  // If we have an entry ID from params
  const entryId = params.id;
  
  // Wait for initial data load to complete and then handle redirection
  useEffect(() => {
    // Only proceed once the initial data load is done
    if (isInitialLoading) {
      console.log("JournalRedirector: Waiting for initial data load...");
      return;
    }
    
    // If no entities are available (no client selected), show placeholder
    if (!entities.length) {
      console.log("JournalRedirector: No entities available (no client selected), showing placeholder");
      return;
    }
    
    // If no specific entity is selected, show placeholder
    if (!currentEntity) {
      console.log("JournalRedirector: No entity selected, showing placeholder");
      return;
    }
    
    // If we have a current entity, build and navigate to the hierarchical URL
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
    
  }, [currentEntity, entities, isInitialLoading, entryId, mode, navigate]);
  
  // 1. First wait for initial data loading
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
  
  // 2. Then check if there are no entities (client not selected)
  if (!entities.length) {
    return <NoEntitySelected />;
  }
  
  // 3. Then check if there's no current entity selected
  if (!currentEntity) {
    return <NoEntitySelected />;
  }
  
  // 4. If we have an entity, show a brief loading message while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-sm text-muted-foreground">
        Preparing journal entries...
      </div>
    </div>
  );
};

export default JournalRedirector;