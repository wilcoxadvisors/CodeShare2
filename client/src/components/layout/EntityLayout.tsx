import React from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';
import AppLayout from '@/components/AppLayout';

export default function EntityLayout() {
  const { clientId, entityId } = useParams();
  const { entities, setCurrentEntity } = useEntity();

  // On first mount or when params change, set the current entity from the URL
  React.useEffect(() => {
    if (clientId && entityId) {
      console.log("EntityLayout: Looking for entity with ID:", entityId, "and clientId:", clientId);
      const match = entities.find(
        e => e.id.toString() === entityId && e.clientId.toString() === clientId
      );
      
      if (match) {
        console.log("EntityLayout: Found entity, setting current entity:", match.name);
        setCurrentEntity(match);
      } else {
        console.log("EntityLayout: Entity not found for ID:", entityId, "and clientId:", clientId);
      }
    }
  }, [clientId, entityId, entities, setCurrentEntity]);

  // If no client or entity ID in URL, redirect to dashboard
  if (!clientId || !entityId) {
    console.log("EntityLayout: Missing clientId or entityId, redirecting to dashboard");
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}