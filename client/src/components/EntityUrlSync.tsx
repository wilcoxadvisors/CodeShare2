import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEntity } from '../contexts/EntityContext';

const EntityUrlSync = () => {
  const { clientId, entityId } = useParams<{ clientId: string; entityId: string }>();
  const { clients, entities, setSelectedClient, setCurrentEntity } = useEntity();

  useEffect(() => {
    const numericClientId = clientId ? parseInt(clientId, 10) : null;
    if (numericClientId) {
      const clientToSet = clients.find(c => c.id === numericClientId);
      if (clientToSet) setSelectedClient(clientToSet);
    }
  }, [clientId, clients, setSelectedClient]);

  useEffect(() => {
    const numericEntityId = entityId ? parseInt(entityId, 10) : null;
    if (numericEntityId) {
      const entityToSet = entities.find(e => e.id === numericEntityId);
      if (entityToSet) setCurrentEntity(entityToSet);
    }
  }, [entityId, entities, setCurrentEntity]);

  return null; // This component does not render anything
};

export default EntityUrlSync;