import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useEntity } from './EntityContext';

interface Client {
  id: number;
  name: string;
  code?: string;
  description?: string;
  active: boolean;
  [key: string]: any;
}

interface ClientContextType {
  clients: Client[];
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  isLoading: boolean;
  error: unknown;
}

// Create context with default values
export const ClientContext = createContext<ClientContextType>({
  clients: [],
  currentClient: null,
  setCurrentClient: () => {},
  isLoading: true,
  error: null
});

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setSelectedClientId } = useEntity();
  const [currentClient, setCurrentClientState] = useState<Client | null>(null);

  // Fetch clients from the API
  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: user ? ['/api/admin/clients'] : [],
    enabled: !!user
  });

  // Update entity context when client changes
  const setCurrentClient = (client: Client | null) => {
    setCurrentClientState(client);
    if (client) {
      console.log("Setting selected client ID:", client.id);
      setSelectedClientId(client.id);
    } else {
      console.log("Clearing selected client ID");
      setSelectedClientId(null);
    }
  };

  // Auto-select first client if there's only one and none selected
  useEffect(() => {
    if (clients.length === 1 && !currentClient && !isLoading) {
      console.log("Auto-selecting the only client:", clients[0].name);
      setCurrentClient(clients[0]);
    }
  }, [clients, currentClient, isLoading]);

  return (
    <ClientContext.Provider value={{ clients, currentClient, setCurrentClient, isLoading, error }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient(): ClientContextType {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}