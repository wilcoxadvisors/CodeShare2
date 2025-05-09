import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

interface Entity {
  id: number;
  name: string;
  code: string;
  ownerId: number;
  active: boolean;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  currency: string;
  clientId: number;
  [key: string]: any;
}

interface Client {
  id: number;
  name: string;
  [key: string]: any;
}

interface EntityContextType {
  entities: Entity[];
  allEntities: Entity[];
  currentEntity: Entity | null;
  setCurrentEntity: (entity: Entity | null) => void;
  setCurrentEntityById: (entityId: number) => void;
  isLoading: boolean;
  isInitialLoading: boolean;
  selectedClientId: number | null;
  setSelectedClientId: (clientId: number | null) => void;
}

// Create context with initial empty implementation
const EntityContext = createContext<EntityContextType>({
  entities: [],
  allEntities: [],
  currentEntity: null,
  setCurrentEntity: () => {},
  setCurrentEntityById: () => {},
  isLoading: true,
  isInitialLoading: true,
  selectedClientId: null,
  setSelectedClientId: () => {}
});

function EntityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Our own loading state
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Get all entities for the user
  const { isLoading: isAuthLoading } = useAuth();
  
  const { 
    data: entitiesData = [], 
    isLoading: queryIsLoading,
    isFetching,
    isError,
    isSuccess,
    refetch: refetchEntities 
  } = useQuery<Entity[]>({
    queryKey: ['/api/entities'],
    queryFn: () => {
      console.log("DEBUG: Fetching entities with auth:", !!user);
      return fetch('/api/entities', {
        credentials: 'include' // Ensure cookies are sent for authentication
      }).then(res => {
        if (!res.ok) {
          console.error(`Entities fetch failed with status ${res.status}`);
          throw new Error(`Entities fetch failed: ${res.status}`);
        }
        return res.json();
      });
    },
    enabled: !!user && !isAuthLoading, // Critical: Only run this query when user is authenticated and auth loading is complete
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000, // 1 minute
  });

  // Store all entities without filtering - ensure it's always an array
  const allEntities = Array.isArray(entitiesData) ? entitiesData : [];
  
  // Get filtered entities based on selected client - with null checks
  const entities = selectedClientId && allEntities && allEntities.length > 0
    ? allEntities.filter(entity => entity.clientId === selectedClientId)
    : [];
  
  // Update loading state based on queries and auth state
  useEffect(() => {
    // Be in a loading state if auth is loading OR entities query is loading/fetching
    const loading = isAuthLoading || queryIsLoading || (isFetching && !initialLoadComplete);
    
    // Handle initial loading state - this only happens once
    if (!initialLoadComplete && !loading && isSuccess) {
      console.log("DEBUG: Initial entities loading completed");
      setInitialLoadComplete(true);
    }
    
    // Handle general loading state (for spinners, etc.)
    setIsLoading(loading);
  }, [queryIsLoading, isFetching, isAuthLoading, initialLoadComplete, isSuccess]);
  
  // When client selection changes, clear entity if needed
  useEffect(() => {
    // Skip this effect when we're loading or don't have a client selected
    if (!selectedClientId || isLoading || queryIsLoading || isFetching) return;
    
    console.log("DEBUG: Client selection changed:", selectedClientId);
    
    // Clear entity selection if it doesn't match the new client
    if (currentEntity && currentEntity.clientId !== selectedClientId) {
      console.log("DEBUG: Clearing current entity as it belongs to a different client");
      setCurrentEntity(null);
    }
    
    // Auto-select first entity when client changes but only if none is selected
    // AND we have received entity data from the server
    if (!currentEntity && Array.isArray(allEntities) && allEntities.length > 0 && isSuccess) {
      console.log("DEBUG: Looking for entities to auto-select after client change");
      
      // Add null check for allEntities before filtering
      const clientEntities = allEntities.filter(entity => 
        entity && entity.clientId === selectedClientId
      );
      
      console.log(`DEBUG: Found ${clientEntities.length} entities for client ${selectedClientId}`);
      
      if (clientEntities && clientEntities.length > 0) {
        console.log(`DEBUG: Auto-selecting first entity for client ${selectedClientId}:`, clientEntities[0].id);
        setCurrentEntity(clientEntities[0]);
      }
    }
  }, [selectedClientId, currentEntity, allEntities, isLoading, queryIsLoading, isFetching, isSuccess]);

  // Debug logs for tracking state changes
  useEffect(() => {
    console.log(`DEBUG: Entities context state:
    - Total entities: ${allEntities?.length || 0}
    - Filtered entities: ${entities?.length || 0}
    - Selected client: ${selectedClientId}
    - Current entity: ${currentEntity?.id}
    - Initial loading complete: ${initialLoadComplete}
    - Loading: ${isLoading}
    - Query fetching: ${isFetching}`);
  }, [allEntities, entities, selectedClientId, currentEntity, initialLoadComplete, isLoading, isFetching]);

  // Function to set current entity by ID
  const setCurrentEntityById = (entityId: number) => {
    if (!entityId) {
      console.warn("Cannot set entity: Invalid entity ID");
      return;
    }
    
    console.log("Setting current entity by ID:", entityId);
    
    // First check all entities regardless of client filter
    // Make sure allEntities is an array before calling find
    const entity = Array.isArray(allEntities) && allEntities.length > 0 
      ? allEntities.find(e => e?.id === entityId)
      : undefined;
    
    if (entity) {
      console.log(`Found entity with ID ${entityId}:`, entity.name);
      
      // Set the client ID first to ensure proper filtering
      if (entity.clientId !== selectedClientId) {
        console.log(`Setting client ID to ${entity.clientId}`);
        setSelectedClientId(entity.clientId);
      }
      
      // Then set the entity
      setCurrentEntity(entity);
    } else {
      console.warn(`Entity with ID ${entityId} not found among ${allEntities?.length || 0} entities`);
    }
  };

  // Provide all the required values to the context
  return (
    <EntityContext.Provider value={{
      entities,
      allEntities,
      currentEntity,
      setCurrentEntity,
      setCurrentEntityById,
      isLoading,
      isInitialLoading: !initialLoadComplete,
      selectedClientId,
      setSelectedClientId
    }}>
      {children}
    </EntityContext.Provider>
  );
}

function useEntity() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
}

export { EntityContext, EntityProvider, useEntity };
export type { EntityContextType, Entity, Client };