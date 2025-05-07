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

  // Store all entities without filtering
  const allEntities = entitiesData as Entity[];
  
  // Get filtered entities based on selected client
  const entities = selectedClientId 
    ? allEntities.filter(entity => entity.clientId === selectedClientId)
    : allEntities;
  
  // Update our loading state whenever the query state changes
  useEffect(() => {
    // If query is done loading (success or error), set our loading to false
    if (!queryIsLoading) {
      setIsLoading(false);
    }
  }, [queryIsLoading, isError]);
  
  // Debug log when entities data changes
  useEffect(() => {
    console.log(`DEBUG: Entities data updated - received ${allEntities.length} entities, isLoading=${isLoading}`);
    console.log(`DEBUG: Client filter: selectedClientId=${selectedClientId}, filtered entities=${entities.length}`);
  }, [allEntities, entities, selectedClientId, isLoading]);

  // Auto-select the first client and entity when entities load and none are selected
  useEffect(() => {
    if (queryIsLoading) return;
    if (!allEntities.length) return;

    // If no client is selected yet, pick the first client with entities
    if (selectedClientId === null) {
      const firstClient = allEntities[0].clientId;
      console.log(`DEBUG: Auto-selecting first client: ${firstClient}`);
      setSelectedClientId(firstClient);
    }

    // If no entity is selected yet and we have entities, pick the first one
    if (currentEntity === null && entities.length > 0) {
      console.log(`DEBUG: Auto-selecting first entity: ${entities[0].id}`);
      setCurrentEntity(entities[0]);
    }
  }, [queryIsLoading, allEntities, entities, selectedClientId, currentEntity]);

  // When client selection changes: clear entity selection and refetch entities
  useEffect(() => {
    console.log("DEBUG: Client selection changed:", selectedClientId);
    
    // Clear entity selection if it doesn't match the new client
    if (currentEntity && selectedClientId && currentEntity.clientId !== selectedClientId) {
      console.log("DEBUG: Clearing current entity as it belongs to a different client");
      setCurrentEntity(null);
    }
    
    // Auto-select first entity when client changes
    if (selectedClientId && !currentEntity) {
      const clientEntities = allEntities.filter(entity => entity.clientId === selectedClientId);
      if (clientEntities.length > 0) {
        console.log(`DEBUG: Auto-selecting first entity for client ${selectedClientId}:`, clientEntities[0].id);
        setCurrentEntity(clientEntities[0]);
      }
    }
    
    // Refetch entities to ensure we have the latest data for the selected client
    if (user && selectedClientId && typeof refetchEntities === 'function') {
      console.log("DEBUG: Refetching entities for client:", selectedClientId);
      refetchEntities();
    }
  }, [selectedClientId, currentEntity, user, refetchEntities, allEntities]);

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
      allEntities,
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
