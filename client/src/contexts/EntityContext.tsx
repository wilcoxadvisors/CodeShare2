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
  currentEntity: Entity | null;
  setCurrentEntity: (entity: Entity | null) => void;
  setCurrentEntityById: (entityId: number) => void;
  isLoading: boolean;
  selectedClientId: number | null;
  setSelectedClientId: (clientId: number | null) => void;
}

// Create context with initial empty implementation
const EntityContext = createContext<EntityContextType>({
  entities: [],
  currentEntity: null,
  setCurrentEntity: () => {},
  setCurrentEntityById: () => {},
  isLoading: true,
  selectedClientId: null,
  setSelectedClientId: () => {}
});

function EntityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Get all entities for the user with refetch capability when client changes
  const { 
    data: entitiesData = [], 
    isLoading: queryIsLoading,
    isInitialLoading,
    isError,
    refetch: refetchEntities 
  } = useQuery<Entity[]>({
    queryKey: user ? ['/api/entities'] : [],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000, // 1 minute
  });

  // Maintain our own loading state to ensure it's properly set to false
  const [isLoading, setIsLoading] = useState(true);

  // Just use the entities from the general list but trigger a refetch when client changes
  const entities = entitiesData as Entity[];
  
  // Update our loading state whenever the query state changes
  useEffect(() => {
    // If query is done loading (success or error), set our loading to false
    if (!queryIsLoading) {
      setIsLoading(false);
    }
  }, [queryIsLoading, isError]);
  
  // Debug log when entities data changes
  useEffect(() => {
    console.log(`DEBUG: Entities data updated - received ${entities && Array.isArray(entities) ? entities.length : 0} entities, isLoading=${isLoading}`);
    if (selectedClientId && entities && Array.isArray(entities) && entities.length > 0) {
      const clientEntities = entities.filter(entity => entity.clientId === selectedClientId);
      console.log(`DEBUG: After entities update, found ${clientEntities.length} entities for selected client ${selectedClientId}`);
    }
  }, [entities, selectedClientId, isLoading]);

  // When client selection changes: clear entity selection and refetch entities
  useEffect(() => {
    console.log("DEBUG: Client selection changed:", selectedClientId);
    
    // Clear entity selection if it doesn't match the new client
    if (currentEntity && selectedClientId && currentEntity.clientId !== selectedClientId) {
      console.log("DEBUG: Clearing current entity as it belongs to a different client");
      setCurrentEntity(null);
    }
    
    // Refetch entities to ensure we have the latest data for the selected client
    if (user && selectedClientId && typeof refetchEntities === 'function') {
      console.log("DEBUG: Refetching entities for client:", selectedClientId);
      refetchEntities();
    }
  }, [selectedClientId, currentEntity, user, refetchEntities]);

  // Auto-select first entity only if it belongs to the selected client
  useEffect(() => {
    // Make sure entities exists and is an array before checking length
    if (entities && Array.isArray(entities) && entities.length > 0 && !currentEntity && selectedClientId) {
      console.log(`DEBUG: Checking for auto-select of entity for client ${selectedClientId}`);
      const clientEntities = entities.filter((entity: Entity) => entity.clientId === selectedClientId);
      console.log(`DEBUG: Found ${clientEntities.length} entities to potentially auto-select for client ${selectedClientId}`);
      
      if (clientEntities.length > 0) {
        console.log(`DEBUG: Auto-selecting first entity for client ${selectedClientId}:`, {
          id: clientEntities[0].id,
          name: clientEntities[0].name,
          code: clientEntities[0].code
        });
        setCurrentEntity(clientEntities[0]);
      } else {
        console.log(`DEBUG: No entities found for client ${selectedClientId} to auto-select`);
      }
    }
  }, [entities, currentEntity, selectedClientId]);

  // Function to set current entity by ID
  const setCurrentEntityById = (entityId: number) => {
    console.log("Setting current entity by ID:", entityId);
    
    if (!Array.isArray(entities) || entities.length === 0) {
      console.warn("No entities available to select from");
      return;
    }
    
    const entity = entities.find(e => e.id === entityId);
    if (entity) {
      console.log(`Found entity with ID ${entityId}:`, entity.name);
      setCurrentEntity(entity);
      
      // Also set the client ID if it's not already set
      if (entity.clientId !== selectedClientId) {
        console.log(`Also setting client ID to ${entity.clientId}`);
        setSelectedClientId(entity.clientId);
      }
    } else {
      console.warn(`Entity with ID ${entityId} not found among ${entities.length} entities`);
    }
  };

  // Provide all the required values to the context
  return (
    <EntityContext.Provider value={{
      entities,
      currentEntity,
      setCurrentEntity,
      setCurrentEntityById,
      isLoading,
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
