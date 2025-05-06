import React, { useEffect } from 'react';
import { Outlet, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';
import AppLayout from '@/components/AppLayout';

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
  const { entities, isLoading, setCurrentEntity } = useEntity();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("EntityLayout: Current entities", entities.length, "Looking for entity ID:", entityId);
    
    if (!isLoading && entities.length) {
      const found = entities.find(e => e.id === Number(entityId));
      if (found) {
        console.log("EntityLayout: Found entity, setting current entity:", found.name);
        setCurrentEntity(found);
      } else {
        console.log("EntityLayout: Entity not found in loaded entities");
      }
    }
  }, [entities, isLoading, entityId, setCurrentEntity]);

  /* ---------- only render children when entity is ready ---------- */
  if (isLoading || !entities.length) {
    console.log("EntityLayout: Still loading entities or no entities loaded");
    return <FullPageSpinner />;
  }

  // Don't redirect if the entity isn't found - simply show a message
  const entityExists = entities.find(e => e.id === Number(entityId));
  if (!entityExists) {
    console.log("EntityLayout: Entity ID not found:", entityId);
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Entity Not Found</h2>
          <p className="mb-4">The entity you're looking for doesn't exist or you don't have access to it.</p>
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