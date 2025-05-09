import React, { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEntity } from "@/contexts/EntityContext";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/Spinner";
import NoEntitySelected from "@/components/NoEntitySelected";

interface JournalRedirectorProps {
  mode?: 'list' | 'detail' | 'edit' | 'delete';
}

/**
 * A component that handles the journal entry context and routing.
 * - Shows a loading spinner while waiting for initial data
 * - Shows a placeholder when no client/entity is selected
 * - Renders the journal entry components when an entity is selected
 */
const JournalRedirector: React.FC<JournalRedirectorProps> = ({ mode = 'list' }) => {
  const { 
    entities, 
    allEntities, 
    currentEntity, 
    isInitialLoading, 
    isLoading, 
    setCurrentEntityById 
  } = useEntity();
  const { isLoading: isAuthLoading, user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  
  console.log('DEBUG: JR guards', { 
    isInitialLoading, 
    isLoading,
    isAuthLoading,
    entitiesLen: entities.length,
    allEntitiesLen: allEntities.length,
    hasCurrent: !!currentEntity,
    hasUser: !!user,
    params
  });

  // Auto-set current entity from URL if available
  useEffect(() => {
    // Only try to set entity once auth and entities have loaded
    if (isAuthLoading || isLoading || !allEntities.length || !user) {
      return;
    }

    // If we have an entity ID in the URL but no current entity, try to set it
    const urlEntityId = params.entityId ? parseInt(params.entityId, 10) : null;
    
    if (urlEntityId && !currentEntity) {
      console.log('DEBUG: Auto-setting entity from URL:', urlEntityId);
      setCurrentEntityById(urlEntityId);
    }
  }, [params.entityId, currentEntity, isAuthLoading, isLoading, allEntities, user, setCurrentEntityById]);

  // 1. If we're still loading auth or initial data, show a spinner
  if (isAuthLoading || isInitialLoading || isLoading) {
    return <Spinner label="Loading data..." />;
  }

  // 2. If no authentication, entity context cannot be properly initialized
  if (!user) {
    return <Spinner label="Checking authentication..." />;
  }

  // 3. If no client or entity is selected, show the placeholder
  if (!entities.length || !currentEntity) {
    return <NoEntitySelected />;
  }
  
  // 4. If we have a specific ID in the URL but no nested route, redirect to the hierarchical URL
  const entryId = params.id;
  
  if (entryId && Object.keys(params).length === 1) {
    // This means we're at a direct URL like /journal-entries/123 which needs redirection
    const clientId = currentEntity.clientId;
    const entityId = currentEntity.id;
    const path = `/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}`;
    navigate(path, { replace: true });
    return <Spinner label="Redirecting..." />;
  }

  // 5. Happy path: Entity is selected, render the journal entry components
  return <Outlet />;
};

export default JournalRedirector;