import React from 'react';
import { Route, Switch, useParams, useLocation } from 'wouter';
import { useEntity } from '@/contexts/EntityContext';

/**
 * EntityLayout component
 * Provides a layout and parameter handling for entity-specific routes
 */
function EntityLayout() {
  const { clientId, entityId } = useParams();
  const { setCurrentEntity, entities, setSelectedClientId } = useEntity();
  const [, navigate] = useLocation();

  // Set current entity and selected client when component mounts
  React.useEffect(() => {
    if (clientId && entityId) {
      // Set selected client ID
      setSelectedClientId(Number(clientId));
      
      // Find and set the current entity
      const numericEntityId = Number(entityId);
      const entity = entities.find(e => e.id === numericEntityId);
      
      if (entity) {
        setCurrentEntity(entity);
      } else {
        // Entity not found, redirect to dashboard
        console.error(`Entity with ID ${entityId} not found`);
        navigate('/dashboard');
      }
    }
  }, [clientId, entityId, entities, setCurrentEntity, setSelectedClientId, navigate]);

  // Render the child routes
  return <Outlet />;
}

export default EntityLayout;