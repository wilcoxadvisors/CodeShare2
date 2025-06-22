import React, { useEffect } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
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
    selectedClientId,
    isInitialLoading, 
    isLoading, 
    setCurrentEntityById 
  } = useEntity();
  const { isLoading: isAuthLoading, user, isGuestUser } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  
  // Comprehensive debug log capturing essential state for redirector
  console.log('ARCHITECT_DEBUG_REDIRECTOR_STATE:', { 
    mode,
    isInitialLoading, 
    isLoading,
    isAuthLoading,
    entitiesLen: entities?.length || 0,
    allEntitiesLen: allEntities?.length || 0,
    currentEntityId: currentEntity?.id,
    currentEntityClientId: currentEntity?.clientId,
    hasUser: !!user,
    userId: user?.id,
    isGuestUser,
    params,
    url: window.location.pathname
  });

  // Auto-set current entity from URL if available
  useEffect(() => {
    // Only try to set entity once auth and entities have loaded
    if (isAuthLoading || isLoading || !allEntities?.length || !user) {
      console.log('ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: Waiting for prerequisites:', {
        isAuthLoading,
        isLoading,
        entitiesLoaded: !!(allEntities?.length),
        entitiesCount: allEntities?.length || 0,
        userAuthenticated: !!user,
        userId: user?.id,
        isGuestUser: isGuestUser,
        urlEntityId: params.entityId ? parseInt(params.entityId, 10) : null
      });
      return;
    }

    // If we have an entity ID in the URL but no current entity, try to set it
    const urlEntityId = params.entityId ? parseInt(params.entityId, 10) : null;
    
    if (urlEntityId && !currentEntity) {
      console.log('ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: Auto-setting entity from URL:', urlEntityId);
      
      // Check if the entity exists in our loaded entities
      const entityExists = allEntities.some(e => e?.id === urlEntityId);
      
      if (entityExists) {
        console.log('ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: Found matching entity, setting current entity');
        setCurrentEntityById(urlEntityId);
      } else {
        console.warn(`ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: Entity ID ${urlEntityId} from URL not found in loaded entities (${allEntities.length} available)`);
        
        // Log first few entities for debugging
        if (allEntities.length > 0) {
          console.log('ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: First few available entities:', 
            allEntities.slice(0, 3).map(e => ({ id: e.id, name: e.name, clientId: e.clientId })));
        }
      }
    } else if (currentEntity) {
      console.log('ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: Entity already selected:', {
        id: currentEntity.id,
        name: currentEntity.name,
        clientId: currentEntity.clientId
      });
    } else if (!urlEntityId) {
      console.log('ARCHITECT_DEBUG_REDIRECTOR_URL_ENTITY: No entity ID in URL parameters');
    }
  }, [params.entityId, currentEntity, isAuthLoading, isLoading, allEntities, user, setCurrentEntityById]);

  // SMART SESSION NAVIGATION: Only redirect Journal Entries to entity-specific pages
  // DISABLED auto-redirect for client-only pages to prevent client switching issues
  useEffect(() => {
    // Only handle Journal Entries auto-redirect to entity-specific pages
    if (selectedClientId && !params.clientId && !isAuthLoading && !isLoading) {
      const currentPath = location.pathname;
      
      // Only auto-redirect for Journal Entries to entity-specific pages
      if (currentPath === '/journal-entries') {
        console.log(`ARCHITECT_DEBUG_SMART_REDIRECT: Checking journal entries redirect for client ${selectedClientId}`);
        
        if (currentEntity && currentEntity.clientId === selectedClientId) {
          // We have matching client and entity - redirect to full path
          const targetPath = `/clients/${selectedClientId}/entities/${currentEntity.id}/journal-entries`;
          console.log(`ARCHITECT_DEBUG_SMART_REDIRECT: Auto-redirecting to entity-specific journal entries: ${targetPath}`);
          navigate(targetPath, { replace: true });
          return;
        } else if (allEntities && allEntities.length > 0) {
          // Find first entity for the selected client
          const clientEntities = allEntities.filter(e => e.clientId === selectedClientId && e.active);
          if (clientEntities.length > 0) {
            const firstEntity = clientEntities[0];
            const targetPath = `/clients/${selectedClientId}/entities/${firstEntity.id}/journal-entries`;
            console.log(`ARCHITECT_DEBUG_SMART_REDIRECT: Auto-selecting first entity and redirecting: ${targetPath}`);
            navigate(targetPath, { replace: true });
            return;
          }
        }
        console.log(`ARCHITECT_DEBUG_SMART_REDIRECT: No suitable entity found for journal entries, staying on generic page`);
      }
      
      // REMOVED: Auto-redirect for client-only pages (Chart of Accounts, Dimensions)
      // This was causing client switching issues
    }
  }, [selectedClientId, currentEntity, allEntities, params.clientId, location.pathname, navigate, isAuthLoading, isLoading]);

  // Decision tree for rendering - with detailed logs at each step
  
  // 1. If we're still loading auth or initial data, show a spinner
  if (isAuthLoading || isInitialLoading || isLoading) {
    console.log('ARCHITECT_DEBUG_REDIRECTOR_RENDER: Showing loading spinner due to:', {
      isAuthLoading,
      isInitialLoading,
      isLoading
    });
    return <Spinner label="Loading data..." />;
  }

  // 2. If no authentication, entity context cannot be properly initialized
  if (!user) {
    console.log('ARCHITECT_DEBUG_REDIRECTOR_RENDER: No user authenticated');
    return <Spinner label="Checking authentication..." />;
  }

  // 3. If no client or entity is selected, show the placeholder
  if (!entities?.length || !currentEntity) {
    console.log('ARCHITECT_DEBUG_REDIRECTOR_RENDER: No entity selected, showing placeholder', {
      filteredEntitiesLength: entities?.length || 0,
      hasCurrentEntity: !!currentEntity
    });
    return <NoEntitySelected />;
  }
  
  // 4. If we have a specific ID in the URL but no nested route, redirect to the hierarchical URL
  const entryId = params.id;
  
  if (entryId && Object.keys(params).length === 1) {
    // This means we're at a direct URL like /journal-entries/123 which needs redirection
    const clientId = currentEntity.clientId;
    const entityId = currentEntity.id;
    const path = `/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}`;
    
    console.log('ARCHITECT_DEBUG_REDIRECTOR_RENDER: Redirecting to hierarchical URL:', {
      from: window.location.pathname,
      to: path,
      clientId,
      entityId,
      entryId
    });
    
    navigate(path, { replace: true });
    return <Spinner label="Redirecting..." />;
  }

  // 5. Happy path: Entity is selected, render the journal entry components
  console.log('ARCHITECT_DEBUG_REDIRECTOR_RENDER: Rendering outlet with selected entity:', {
    entityId: currentEntity.id,
    entityName: currentEntity.name,
    clientId: currentEntity.clientId,
    mode
  });
  
  return <Outlet />;
};

export default JournalRedirector;