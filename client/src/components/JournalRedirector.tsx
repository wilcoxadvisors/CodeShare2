import React from 'react';
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEntity } from "@/contexts/EntityContext";
import Spinner from "@/components/Spinner";
import NoEntitySelected from "@/components/NoEntitySelected";

interface JournalRedirectorProps {
  mode?: 'list' | 'detail' | 'edit' | 'delete';
}

/**
 * A component that handles the journal entry context and routing.
 * - Shows a loading spinner while waiting for initial data
 * - Shows a placeholder when no client/entity is selected
 * - Renders the journal entry components when an entity is selected
 */
const JournalRedirector: React.FC<JournalRedirectorProps> = ({ mode = 'list' }) => {
  const { entities, currentEntity, isInitialLoading } = useEntity();
  const navigate = useNavigate();
  const params = useParams();
  
  console.log('JR guards', { 
    isInitialLoading, 
    entitiesLen: entities.length, 
    hasCurrent: !!currentEntity,
    params
  });

  // 1. If we're still loading the initial data, show a spinner
  if (isInitialLoading) {
    return <Spinner />;
  }

  // 2. If no client or entity is selected, show the placeholder
  if (!entities.length || !currentEntity) {
    return <NoEntitySelected />;
  }
  
  // 3. If we have a specific ID in the URL but no nested route, redirect to the hierarchical URL
  const entryId = params.id;
  
  if (entryId && Object.keys(params).length === 1) {
    // This means we're at a direct URL like /journal-entries/123 which needs redirection
    const clientId = currentEntity.clientId;
    const entityId = currentEntity.id;
    const path = `/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}`;
    navigate(path, { replace: true });
    return <Spinner label="Redirecting..." />;
  }

  // 4. Happy path: Entity is selected, render the journal entry components
  return <Outlet />;
};

export default JournalRedirector;