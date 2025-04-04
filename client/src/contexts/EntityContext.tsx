import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
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
  isLoading: boolean;
  selectedClientId: number | null;
  setSelectedClientId: (clientId: number | null) => void;
}

// Create context with default values
export const EntityContext = createContext<EntityContextType>({
  entities: [],
  currentEntity: null,
  setCurrentEntity: () => {},
  isLoading: true,
  selectedClientId: null,
  setSelectedClientId: () => {}
});

export function EntityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Get all entities for the user with refetch capability when client changes
  const { data: entitiesData = [], isLoading, refetch: refetchEntities } = useQuery<Entity[]>({
    queryKey: user ? ['/api/entities'] : [],
    enabled: !!user
  });

  // Just use the entities from the general list but trigger a refetch when client changes
  const entities = entitiesData as Entity[];
  
  // Debug log when entities data changes
  useEffect(() => {
    console.log(`DEBUG: Entities data updated - received ${entities?.length || 0} entities`);
    if (selectedClientId && entities?.length > 0) {
      const clientEntities = entities.filter(entity => entity.clientId === selectedClientId);
      console.log(`DEBUG: After entities update, found ${clientEntities.length} entities for selected client ${selectedClientId}`);
    }
  }, [entities, selectedClientId]);

  // When client selection changes: clear entity selection and refetch entities
  useEffect(() => {
    console.log("DEBUG: Client selection changed:", selectedClientId);
    
    // Clear entity selection if it doesn't match the new client
    if (currentEntity && selectedClientId && currentEntity.clientId !== selectedClientId) {
      console.log("DEBUG: Clearing current entity as it belongs to a different client");
      setCurrentEntity(null);
    }
    
    // Refetch entities to ensure we have the latest data for the selected client
    if (user && selectedClientId) {
      console.log("DEBUG: Refetching entities for client:", selectedClientId);
      refetchEntities();
    }
  }, [selectedClientId, currentEntity, user, refetchEntities]);

  // Auto-select first entity only if it belongs to the selected client
  useEffect(() => {
    if (entities.length > 0 && !currentEntity && selectedClientId) {
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

  const value = {
    entities,
    currentEntity,
    setCurrentEntity,
    isLoading,
    selectedClientId,
    setSelectedClientId
  };

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
}

export function useEntity(): EntityContextType {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
}
