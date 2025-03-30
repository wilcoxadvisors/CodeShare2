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
  isLoading: boolean;
  selectedClientId: number | null;
  setSelectedClientId: (clientId: number | null) => void;
}

export const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  const { data: entitiesData = [], isLoading } = useQuery({
    queryKey: user ? ['/api/entities'] : [],
    enabled: !!user,
  });

  // Cast to Entity[] since we know the API returns this format
  const entities = entitiesData as Entity[];

  // Clear entity selection when changing client
  useEffect(() => {
    if (currentEntity && selectedClientId && currentEntity.clientId !== selectedClientId) {
      setCurrentEntity(null);
    }
  }, [selectedClientId, currentEntity]);

  // Auto-select first entity only if it belongs to the selected client
  useEffect(() => {
    if (entities.length > 0 && !currentEntity && selectedClientId) {
      const clientEntities = entities.filter((entity: Entity) => entity.clientId === selectedClientId);
      if (clientEntities.length > 0) {
        setCurrentEntity(clientEntities[0]);
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
