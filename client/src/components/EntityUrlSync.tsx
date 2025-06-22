import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEntity } from '../contexts/EntityContext';

const EntityUrlSync = () => {
  const { clientId, entityId } = useParams<{ clientId: string; entityId: string }>();
  const { clients, entities, setSelectedClient, setCurrentEntity, setSelectedClientId } = useEntity();

  useEffect(() => {
    const numericClientId = clientId ? parseInt(clientId, 10) : null;
    if (numericClientId) {
      console.log(`EntityUrlSync: Setting client ID from URL: ${numericClientId}`);
      
      // Update both selectedClientId and selectedClient for complete synchronization
      setSelectedClientId(numericClientId);
      
      const clientToSet = clients.find(c => c.id === numericClientId);
      if (clientToSet) {
        console.log(`EntityUrlSync: Found client object: ${clientToSet.name}`);
        setSelectedClient(clientToSet);
      }
    }
  }, [clientId, clients, setSelectedClient, setSelectedClientId]);

  useEffect(() => {
    const numericEntityId = entityId ? parseInt(entityId, 10) : null;
    if (numericEntityId) {
      const entityToSet = entities.find(e => e.id === numericEntityId);
      if (entityToSet) {
        console.log(`EntityUrlSync: Setting entity from URL: ${entityToSet.name}`);
        setCurrentEntity(entityToSet);
      }
    }
  }, [entityId, entities, setCurrentEntity]);

  return null; // This component does not render anything
};

export default EntityUrlSync;