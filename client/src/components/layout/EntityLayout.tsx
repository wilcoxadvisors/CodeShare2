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
  const { entities, isLoading, error, setCurrentEntity } = useEntity();

  useEffect(() => {
    if (!isLoading && !error && entities.length) {
      const found = entities.find(e => e.id === Number(entityId));
      if (found) setCurrentEntity(found);
    }
  }, [entities, isLoading, error, entityId, setCurrentEntity]);

  /* ---------- only render children when entity is ready ---------- */
  if (isLoading || !entities.length) return <FullPageSpinner />;

  if (!entities.find(e => e.id === Number(entityId)))
    return <Navigate to={`/clients/${clientId}`} replace />;

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}