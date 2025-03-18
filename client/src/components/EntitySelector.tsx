import React from 'react';
import { useEntity } from '../contexts/EntityContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function EntitySelector() {
  const { entities, currentEntity, setCurrentEntity, isLoading } = useEntity();

  if (isLoading) {
    return (
      <div className="relative w-48">
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading entities..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="relative w-48">
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="No entities available" />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  const handleEntityChange = (entityId: string) => {
    const entity = entities.find(e => e.id.toString() === entityId);
    if (entity) {
      setCurrentEntity(entity);
    }
  };

  return (
    <div className="relative w-48">
      <Select 
        value={currentEntity?.id.toString()} 
        onValueChange={handleEntityChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select entity" />
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id.toString()}>
              {entity.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default EntitySelector;
