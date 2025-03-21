import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { useEntity } from '../contexts/EntityContext';

// Entity interface that matches the context type
interface Entity {
  id: number;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  entityType?: string | null;
  industry?: string | null;
  isActive?: boolean;
  [key: string]: any;
}

interface EntitySelectorProps {
  entities?: Entity[];
  selectedEntityIds?: number[];
  onChange?: (entityIds: number[]) => void;
}

export default function EntitySelector({ 
  entities: propEntities, 
  selectedEntityIds = [], 
  onChange 
}: EntitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { entities: contextEntities = [] } = useEntity();
  
  // Use props entities if provided, otherwise use entities from context
  const entities = propEntities || contextEntities || [];
  
  // Only filter if entities is defined and not empty
  const filteredEntities = entities && entities.length > 0 ? entities.filter(entity => {
    const query = searchQuery.toLowerCase();
    return (
      entity.name.toLowerCase().includes(query) ||
      (entity.legalName && entity.legalName.toLowerCase().includes(query)) ||
      (entity.industry && entity.industry.toLowerCase().includes(query)) ||
      (entity.entityType && entity.entityType.toLowerCase().includes(query))
    );
  }) : [];

  const handleToggleEntity = (entityId: number) => {
    // If no onChange handler provided, do nothing
    if (!onChange) return;
    
    let newSelectedIds;
    
    if (selectedEntityIds.includes(entityId)) {
      // Remove if already selected
      newSelectedIds = selectedEntityIds.filter(id => id !== entityId);
    } else {
      // Add if not selected
      newSelectedIds = [...selectedEntityIds, entityId];
    }
    
    onChange(newSelectedIds);
  };

  const handleSelectAll = () => {
    // If no onChange handler provided, do nothing
    if (!onChange) return;
    
    if (filteredEntities.length === selectedEntityIds.length) {
      // If all are selected, deselect all
      onChange([]);
    } else {
      // Select all filtered entities
      onChange(filteredEntities.map(entity => entity.id));
    }
  };

  const areAllSelected = filteredEntities.length > 0 && 
    filteredEntities.every(entity => selectedEntityIds.includes(entity.id));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    id="select-all"
                    checked={areAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all entities"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Industry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    {entities.length === 0 
                      ? "No entities available. Create entities first."
                      : "No entities match your search query."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntities.map(entity => (
                  <TableRow key={entity.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleToggleEntity(entity.id)}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEntityIds.includes(entity.id)}
                        onCheckedChange={() => handleToggleEntity(entity.id)}
                        aria-label={`Select ${entity.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entity.name}</div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        {entity.entityType}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entity.entityType}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entity.industry || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-2 text-sm text-muted-foreground">
          {selectedEntityIds.length > 0 
            ? `${selectedEntityIds.length} ${selectedEntityIds.length === 1 ? 'entity' : 'entities'} selected` 
            : 'No entities selected'}
        </div>
      </CardContent>
    </Card>
  );
}