import React, { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';
import AppLayout from '@/components/AppLayout';
import { useQuery } from '@tanstack/react-query';

/**
 * Creates a full-page loading spinner to use while waiting for entities to load
 */
const FullPageSpinner = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

/**
 * Wraps every "entity-scoped" route.
 *  – Reads :clientId / :entityId from the URL
 *  – Pushes the matching entity into EntityContext
 *  – Shows child routes (<Outlet/>) inside the normal AppLayout shell
 *  – Critically: waits until entities are loaded before rendering children
 */
export default function EntityLayout() {
  const { clientId, entityId } = useParams();
  const { entities, isLoading, setCurrentEntity, setSelectedClientId } = useEntity();
  const navigate = useNavigate();
  
  // Set client ID from URL params for better context coordination
  useEffect(() => {
    if (clientId) {
      console.log("EntityLayout: Setting client ID from URL params:", clientId);
      setSelectedClientId(Number(clientId));
    }
  }, [clientId, setSelectedClientId]);

  // Directly fetch entity if needed - as a backup to the main entity loading
  const { data: entityData } = useQuery({
    queryKey: [`/api/clients/${clientId}/entities/${entityId}`],
    enabled: !!clientId && !!entityId && (!entities.length || !entities.find(e => e.id === Number(entityId))),
  });

  useEffect(() => {
    console.log("EntityLayout: Current entities", entities.length, "Looking for entity ID:", entityId);
    console.log("EntityLayout: Client ID from params:", clientId);
    
    // First try to find entity in the already loaded entities
    if (!isLoading && entities.length && entityId) {
      const found = entities.find(e => e.id === Number(entityId));
      if (found) {
        console.log("EntityLayout: Found entity in loaded entities, setting current entity:", found.name);
        setCurrentEntity(found);
      } else {
        console.log("EntityLayout: Entity not found in loaded entities, trying direct fetch");
        
        // If we have direct entity data from the backup query
        if (entityData && typeof entityData === 'object' && 'id' in entityData) {
          console.log("EntityLayout: Using directly fetched entity data:", entityData);
          setCurrentEntity(entityData as any); // Cast as Entity since we've verified key properties
        }
      }
    }
  }, [entities, isLoading, entityId, clientId, setCurrentEntity, entityData]);

  /* ---------- only render children when entity context is being loaded ---------- */
  if (isLoading) {
    console.log("EntityLayout: Still loading entities");
    return <FullPageSpinner />;
  }

  // If we have entities loaded but can't find this specific one, show an error
  // BUT - only if we also don't have a directly fetched entity
  const entityExists = entities.find(e => e.id === Number(entityId)) || entityData;
  if (!entityExists && !isLoading) {
    console.log("EntityLayout: Entity ID not found:", entityId);
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Entity Not Found</h2>
          <p className="mb-4">The entity you're looking for doesn't exist or you don't have access to it.</p>
          <p className="mb-4 text-sm text-gray-500">
            Looking for entity ID: {entityId} for client ID: {clientId}
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Return to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}