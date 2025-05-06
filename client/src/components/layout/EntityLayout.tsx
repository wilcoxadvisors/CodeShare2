import React, { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';
import AppLayout from '@/components/AppLayout';

/**
 * Wraps every "entity-scoped" route.
 *  – Reads :clientId / :entityId from the URL
 *  – Pushes the matching entity into EntityContext
 *  – Shows child routes (<Outlet/>) inside the normal AppLayout shell
 */
const EntityLayout: React.FC = () => {
  const { clientId: clientIdStr, entityId: entityIdStr } =
    useParams<'clientId' | 'entityId'>();
  const clientId = Number(clientIdStr);
  const entityId = Number(entityIdStr);

  const { currentEntity, entities, setCurrentEntity } = useEntity();
  const navigate = useNavigate();

  /* On mount / param-change: ensure the EntityContext is set */
  useEffect(() => {
    if (!clientId || !entityId) return;                // bad URL

    // Already correct – no work.
    if (currentEntity?.id === entityId) return;

    const match = entities.find(e => e.id === entityId && e.clientId === clientId);
    if (match) {
      setCurrentEntity(match);
    } else {
      // No such entity for this user – bounce them back somewhere safe.
      navigate('/dashboard', { replace: true });
    }
  }, [clientId, entityId, entities, currentEntity, setCurrentEntity, navigate]);

  return (
    <AppLayout>
      {/* children routes render here */}
      <Outlet />
    </AppLayout>
  );
};

export default EntityLayout;