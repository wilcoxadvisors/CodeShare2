import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEntity } from '../contexts/EntityContext';

const EntityUrlSync = () => {
  const { clientId, entityId } = useParams<{ clientId: string; entityId: string }>();
  const { setSelectedClientId, setCurrentEntityById, selectedClientId, currentEntity } = useEntity();

  useEffect(() => {
    const numericClientId = clientId ? parseInt(clientId, 10) : null;
    if (numericClientId && numericClientId !== selectedClientId) {
      setSelectedClientId(numericClientId);
    }
  }, [clientId, selectedClientId, setSelectedClientId]);

  useEffect(() => {
    const numericEntityId = entityId ? parseInt(entityId, 10) : null;
    if (numericEntityId && numericEntityId !== currentEntity?.id) {
      setCurrentEntityById(numericEntityId);
    }
  }, [entityId, currentEntity, setCurrentEntityById]);

  return null; // This component does not render anything
};

export default EntityUrlSync;