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
  allEntities: Entity[];
  clients: Client[];
  currentEntity: Entity | null;
  selectedClient: Client | null;
  setCurrentEntity: (entity: Entity | null) => void;
  setCurrentEntityById: (entityId: number) => void;
  setSelectedClient: (client: Client | null) => void;
  isLoading: boolean;
  isInitialLoading: boolean;
  initialLoadComplete: boolean;
  selectedClientId: number | null;
  setSelectedClientId: (clientId: number | null) => void;
}

// Create context with initial empty implementation
const EntityContext = createContext<EntityContextType>({
  entities: [],
  allEntities: [],
  clients: [],
  currentEntity: null,
  selectedClient: null,
  setCurrentEntity: () => {},
  setCurrentEntityById: () => {},
  setSelectedClient: () => {},
  isLoading: true,
  isInitialLoading: true,
  selectedClientId: null,
  setSelectedClientId: () => {}
});

// Local storage keys for persisting selections
const STORAGE_KEY_CLIENT = 'selected_client_id';
const STORAGE_KEY_ENTITY = 'selected_entity_id';

function EntityProvider({ children }: { children: ReactNode }) {
  // Updated to use isGuestUser directly from AuthContext
  const { user, isLoading: isAuthLoadingFromAuthContext, isGuestUser } = useAuth();
  
  // Initialize state to null - no localStorage persistence
  const [selectedClientId, setSelectedClientIdState] = useState<number | null>(null);
  const [currentEntityId, setCurrentEntityIdState] = useState<number | null>(null);
  
  // Our own loading state
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Use a useRef to track whether we've tried to fetch entities after auth
  const entityFetchAttempted = React.useRef(false);
  
  // Simple setter for client ID - no localStorage persistence
  const setSelectedClientId = (clientId: number | null) => {
    console.log(`ARCHITECT_DEBUG_SELECTOR_STATE: Setting client ID to ${clientId}`);
    setSelectedClientIdState(clientId);
  };
  
  // Simple setters - no localStorage persistence
  const setSelectedClient = (client: Client | null) => {
    setSelectedClientIdState(client?.id ?? null);
  };

  const setCurrentEntity = (entity: Entity | null) => {
    setCurrentEntityIdState(entity?.id ?? null);
  };
  
  // Log detailed auth and entity state information
  console.log('ENTITY_CONTEXT_AUTH_STATE:', {
    user: user ? { id: user.id, username: user.username } : null,
    isAuthLoading: isAuthLoadingFromAuthContext,
    entityFetchAttempted: entityFetchAttempted.current
  });
  
  // CRITICAL: Add detailed debugging for entity context query enabling conditions
  // This must match EXACTLY what we use in the enabled: property of useQuery below
  console.log('ARCHITECT_DEBUG_ENTITY_CTX_QUERY_CONFIG: UserExists=', 
    !!user, 'AuthNotLoading=', !isAuthLoadingFromAuthContext, 'QueryEnabled=', 
    !!user && !isAuthLoadingFromAuthContext);
  
  // Add clients query for full object exposure - use standard /api/clients endpoint
  const { data: clientsData = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: () => {
      if (isGuestUser) {
        return Promise.resolve([]);
      }
      return fetch('/api/clients', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(res => {
        if (!res.ok) throw new Error(`Clients fetch failed: ${res.status}`);
        return res.json();
      }).then(data => {
        // Extract clients array from the API response
        const clientsArray = Array.isArray(data) ? data : (data?.data || data?.clients || []);
        console.log('ARCHITECT_DEBUG_ENTITY_CTX_CLIENTS_RECEIVED: Fetched clients length:', clientsArray?.length);
        console.log('ARCHITECT_DEBUG_ENTITY_CTX_CLIENTS_RECEIVED: First few clients:', 
          clientsArray?.slice(0, 2).map((c: any) => ({ id: c.id, name: c.name })));
        return clientsArray;
      });
    },
    enabled: !!user && !isAuthLoadingFromAuthContext,
    retry: isGuestUser ? 0 : 2,
    retryDelay: 1000,
    staleTime: 30000
  });

  // CRITICAL FIX: Special handling for guest users
  // Since guest users (ID=0) will get 401 errors when trying to access entities,
  // we need to skip the actual API call but still maintain the query structure
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
      // Log detailed information about the query execution
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_QUERY_EXECUTION: Query function executing with:");
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_QUERY_EXECUTION: - User:", user ? `ID ${user.id}, Username ${user.username}` : "null");
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_QUERY_EXECUTION: - Auth loading state:", isAuthLoadingFromAuthContext);
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_QUERY_EXECUTION: - Query enabled:", !!user && !isAuthLoadingFromAuthContext);
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_QUERY_EXECUTION: - Is Guest user:", isGuestUser);
      
      entityFetchAttempted.current = true;
      
      // CRITICAL FIX: For guest users, don't actually make the API call
      // This prevents 401 errors for guest users while still maintaining the query structure
      if (isGuestUser) {
        console.log("ARCHITECT_DEBUG_ENTITY_CTX_QUERY_EXECUTION: Guest user detected, skipping actual API call and returning empty array");
        return Promise.resolve([]);
      }
      
      // For regular authenticated users, proceed with the normal API call
      return fetch('/api/entities', {
        credentials: 'include', // Ensure cookies are sent for authentication
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate' // Strong anti-caching headers
        }
      }).then(res => {
        // Log the HTTP response status
        console.log(`ARCHITECT_DEBUG_ENTITY_CTX_QUERY_RESPONSE: Status ${res.status} ${res.statusText}`);
        
        if (!res.ok) {
          console.error(`ARCHITECT_DEBUG_ENTITY_CTX_QUERY_ERROR: Entities fetch failed with status ${res.status}`);
          throw new Error(`Entities fetch failed: ${res.status}`);
        }
        
        console.log('ARCHITECT_DEBUG_ENTITY_CTX_QUERY_SUCCESS: Got successful response, parsing JSON...');
        const data = res.json();
        return data;
      }).then(data => {
        // Log detailed information about the received data
        console.log('ARCHITECT_DEBUG_ENTITY_CTX_DATA_RECEIVED: Fetched entitiesData length:', data?.length);
        console.log('ARCHITECT_DEBUG_ENTITY_CTX_DATA_RECEIVED: First few entities:', 
          data?.slice(0, 2).map((e: any) => ({ id: e.id, name: e.name, clientId: e.clientId })));
        
        return data;
      });
    },
    // CRITICAL: Only run this query when user is authenticated and auth loading is complete
    // This must match EXACTLY the condition in our debug log above
    enabled: !!user && !isAuthLoadingFromAuthContext,
    // Additional props to ensure reliable loading
    retry: isGuestUser ? 0 : 2, // No retry for guest users
    retryDelay: 1000,
    staleTime: 30000 // 30 seconds
  });

  // Store all entities without filtering - ensure it's always an array
  const allEntities = Array.isArray(entitiesData) ? entitiesData : [];
  
  // Get filtered entities based on selected client - with null checks
  const entities = selectedClientId && allEntities && allEntities.length > 0
    ? allEntities.filter((entity: any) => entity.clientId === selectedClientId)
    : [];

  // Expose full objects using useMemo for reliability
  const clients = Array.isArray(clientsData) ? clientsData : [];
  const selectedClient = useMemo(() => {
    const found = clients.find(c => c.id === selectedClientId);
    return found || null;
  }, [clients, selectedClientId]);
  const currentEntity = useMemo(() => {
    const found = entities.find(e => e.id === currentEntityId);
    return found || null;
  }, [entities, currentEntityId]);
    

  
  // Update loading state based on queries and auth state
  useEffect(() => {
    // Be in a loading state if auth is loading OR entities query is loading/fetching
    const loading = isAuthLoadingFromAuthContext || queryIsLoading || (isFetching && !initialLoadComplete);
    
    // Handle initial loading state - this only happens once
    // CRITICAL: Only mark loading as complete if we have successful data AND auth is complete
    if (!initialLoadComplete && !isAuthLoadingFromAuthContext && isSuccess) {
      // Log detailed entity data received
      console.log(`ENTITY_CONTEXT_STATE_POST_FETCH: 
        - Total entities: ${allEntities?.length || 0}
        - Auth loading: ${isAuthLoadingFromAuthContext}
        - Query state: Success=${isSuccess}, Loading=${queryIsLoading}, Error=${isError}`);
      
      // Mark initialization as complete since we have entities and auth is done
      setInitialLoadComplete(true);
      
      // Add detailed current state information for debugging the initial load
      console.log('ARCHITECT_DEBUG_ENTITY_CTX_STATE_POST_FETCH:', {
        allEntitiesLength: allEntities?.length || 0,
        initialLoadComplete: initialLoadComplete,
        isAuthLoading: isAuthLoadingFromAuthContext,
        queryIsLoading: queryIsLoading,
        isFetching: isFetching,
        isSuccess: isSuccess,
        isError: isError
      });
      
      console.log("DEBUG: Initial entities loading completed successfully");
    }
    
    // Handle general loading state (for spinners, etc.)
    setIsLoading(loading);
    
    // Log any loading state changes for debugging
    if (isLoading !== loading) {
      console.log(`ENTITY_CONTEXT_LOADING_STATE_CHANGE: 
        From ${isLoading} to ${loading}
        - Auth loading: ${isAuthLoadingFromAuthContext}
        - Query loading: ${queryIsLoading}
        - Fetching: ${isFetching}
        - Initial load complete: ${initialLoadComplete}`);
    }
  }, [queryIsLoading, isFetching, isAuthLoadingFromAuthContext, initialLoadComplete, isSuccess, isError, allEntities, isLoading]);
  
  // When client selection changes, clear entity if needed and invalidate related queries
  useEffect(() => {
    // Skip this effect when we're loading or don't have a client selected
    if (!selectedClientId) {
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_CLIENT_CHANGE: No client selected, skipping entity selection logic");
      return;
    }

    // CRITICAL FIX: Invalidate client-dependent queries when client changes
    console.log(`ARCHITECT_DEBUG_ENTITY_CTX_CLIENT_CHANGE: Client changed to ${selectedClientId}, invalidating related queries`);
    
    // Import queryClient dynamically to avoid circular dependency
    import('@/lib/queryClient').then(({ queryClient }) => {
      // Invalidate dimensions queries
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      
      // Invalidate chart of accounts queries
      queryClient.invalidateQueries({ queryKey: ['accounts-tree'] });
      
      // Invalidate journal entries queries
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      
      console.log(`ARCHITECT_DEBUG_ENTITY_CTX_CLIENT_CHANGE: Query invalidation completed for client ${selectedClientId}`);
    });
    
    if (isLoading || queryIsLoading || isFetching) {
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_CLIENT_CHANGE: Loading state detected, deferring entity selection logic:", {
        isLoading, queryIsLoading, isFetching
      });
      return;
    }
    
    console.log("ARCHITECT_DEBUG_ENTITY_CTX_CLIENT_CHANGE: Client selection changed:", {
      selectedClientId,
      currentEntityId: currentEntity?.id,
      currentEntityClientId: currentEntity?.clientId,
      entitiesCount: allEntities?.length || 0,
      initialLoadComplete
    });
    
    // Only clear entity selection if it doesn't match the new client
    if (currentEntity && currentEntity.clientId !== selectedClientId) {
      console.log("ARCHITECT_DEBUG_ENTITY_CTX_CLIENT_CHANGE: Clearing current entity as it belongs to a different client");
      setCurrentEntity(null);
      return; // Exit early to prevent immediate auto-selection
    }
    
    // REMOVED: Auto-selection logic that was causing state battles
    // The user's explicit selection from GlobalContextSelector should be the single source of truth
    // Auto-selection has been disabled to prevent fighting with user selections
  }, [selectedClientId, currentEntity, allEntities, isLoading, queryIsLoading, isFetching, isSuccess, initialLoadComplete]);

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
      console.warn("ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Cannot set entity: Invalid entity ID");
      return;
    }
    
    console.log("ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Setting current entity by ID:", entityId);
    console.log("ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Current state:", {
      selectedClientId,
      currentEntityId: currentEntity?.id,
      hasEntities: Array.isArray(allEntities) && allEntities.length > 0,
      entitiesCount: allEntities?.length || 0
    });
    
    // First check all entities regardless of client filter
    // Make sure allEntities is an array before calling find
    const entity = Array.isArray(allEntities) && allEntities.length > 0 
      ? allEntities.find(e => e?.id === entityId)
      : undefined;
    
    if (entity) {
      console.log(`ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Found entity with ID ${entityId}:`, {
        id: entity.id,
        name: entity.name,
        clientId: entity.clientId
      });
      
      // Set the client ID first to ensure proper filtering
      if (entity.clientId !== selectedClientId) {
        console.log(`ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Setting client ID to ${entity.clientId}`);
        setSelectedClientId(entity.clientId);
      }
      
      // Then set the entity
      console.log(`ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Setting current entity to:`, {
        id: entity.id,
        name: entity.name, 
        clientId: entity.clientId
      });
      setCurrentEntity(entity);
    } else {
      console.warn(`ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: Entity with ID ${entityId} not found among ${allEntities?.length || 0} entities`);
      
      // Log the first few entities to help with debugging
      if (Array.isArray(allEntities) && allEntities.length > 0) {
        console.log("ARCHITECT_DEBUG_ENTITY_CTX_SET_BY_ID: First few entities available:", 
          allEntities.slice(0, 3).map(e => ({ id: e.id, name: e.name, clientId: e.clientId })));
      }
    }
  };

  // Provide all the required values to the context
  const contextValue: EntityContextType = {
    entities,
    allEntities,
    clients,
    currentEntity,
    selectedClient,
    setCurrentEntity,
    setCurrentEntityById,
    setSelectedClient,
    isLoading,
    isInitialLoading: !initialLoadComplete,
    selectedClientId,
    setSelectedClientId
  };

  return (
    <EntityContext.Provider value={contextValue}>
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