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
  [key: string]: any;
}

interface EntityContextType {
  entities: Entity[];
  currentEntity: Entity | null;
  setCurrentEntity: (entity: Entity) => void;
  isLoading: boolean;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  
  const { data: entities = [], isLoading } = useQuery({
    queryKey: user ? ['/api/entities'] : null,
    enabled: !!user,
  });

  // Set first entity as current if none selected
  useEffect(() => {
    if (entities.length > 0 && !currentEntity) {
      setCurrentEntity(entities[0]);
    }
  }, [entities, currentEntity]);

  const value = {
    entities,
    currentEntity,
    setCurrentEntity,
    isLoading
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
