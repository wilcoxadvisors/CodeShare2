import React, { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';
import AppLayout from '@/components/AppLayout';
import NoEntitySelected from '@/components/NoEntitySelected';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
 * Enhanced EntityLayout implementing industry-standard context selection
 * Handles three distinct scenarios:
 * A) Context Loading: Show spinner while initial data loads
 * B) No Client/Entity in URL: Show NoEntitySelected component
 * C) Context Ready: Render the target page
 */
export default function EntityLayout() {
  const { clientId, entityId } = useParams();
  const { entities, isLoading, initialLoadComplete, setCurrentEntity, setSelectedClientId } = useEntity();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Set client ID from URL params for context coordination
  useEffect(() => {
    if (clientId) {
      console.log("EntityLayout: Setting client ID from URL params:", clientId);
      setSelectedClientId(Number(clientId));
    }
  }, [clientId, setSelectedClientId]);

  // Directly fetch entity if needed - as a backup to the main entity loading
  const { data: entityData, isError, error } = useQuery({
    queryKey: [`/api/entities/${entityId}`],
    enabled: !!entityId && (!entities.length || !entities.find(e => e.id === Number(entityId))),
  });

  // Log errors with direct entity fetching for debugging
  useEffect(() => {
    if (isError && error) {
      console.error("EntityLayout: Error fetching specific entity:", error);
      
      // Show toast notification for better UX
      toast({
        title: "Entity Loading Error",
        description: "There was a problem loading the selected entity. Please try again.",
        variant: "destructive"
      });
    }
  }, [isError, error, toast]);

  // Set current entity when found
  useEffect(() => {
    if (!isLoading && entities.length && entityId) {
      const found = entities.find(e => e.id === Number(entityId));
      if (found) {
        console.log("EntityLayout: Found entity in loaded entities, setting current entity:", found.name);
        setCurrentEntity(found);
      } else if (entityData && typeof entityData === 'object' && 'id' in entityData) {
        console.log("EntityLayout: Using directly fetched entity data:", entityData);
        setCurrentEntity(entityData as any);
      }
    }
  }, [entities, isLoading, entityId, setCurrentEntity, entityData]);

  // SCENARIO A: Context Loading - Show spinner while initial data loads
  if (isLoading || !initialLoadComplete) {
    console.log("EntityLayout: Context still loading - showing spinner", { 
      isLoading, 
      initialLoadComplete
    });
    return <FullPageSpinner />;
  }

  // SCENARIO B: No Client/Entity in URL - Show NoEntitySelected component
  if (!clientId || !entityId) {
    console.log("EntityLayout: Missing URL parameters - showing NoEntitySelected", { 
      clientId, 
      entityId 
    });
    return (
      <AppLayout>
        <NoEntitySelected />
      </AppLayout>
    );
  }

  // Verify entity exists
  const entityExists = entities.find(e => e.id === Number(entityId)) || entityData;
  if (!entityExists) {
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

  // SCENARIO C: Context Ready - Render the target page
  console.log("EntityLayout: Context ready - rendering Outlet", { clientId, entityId });
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}