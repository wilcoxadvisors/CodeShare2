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
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface Entity {
  id: number;
  name: string;
  legalName?: string;
  taxId?: string | null;
  entityType?: string;
  industry?: string | null;
  isActive?: boolean;
}

interface EntitySelectorProps {
  entities?: Entity[];
  selectedEntityIds?: number[];
  onChange?: (entityIds: number[]) => void;
}

export default function EntitySelector({ 
  entities = [], 
  selectedEntityIds = [], 
  onChange 
}: EntitySelectorProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredEntities = entities?.filter(entity => {
    const query = searchQuery.toLowerCase();
    return (
      entity.name?.toLowerCase().includes(query) ||
      (entity.legalName && entity.legalName.toLowerCase().includes(query)) ||
      (entity.industry && entity.industry.toLowerCase().includes(query)) ||
      (entity.entityType && entity.entityType.toLowerCase().includes(query))
    );
  }) || [];

  const handleToggleEntity = (entityId: number) => {
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
                  {onChange ? (
                    <Checkbox 
                      id="select-all"
                      checked={areAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all entities"
                    />
                  ) : (
                    <span className="w-4 h-4 block"></span>
                  )}
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
                    {!entities || entities.length === 0 
                      ? (
                        <div className="flex flex-col items-center">
                          <span>No entities available</span>
                          {user?.role === 'admin' && (
                            <Link href="/dashboard">
                              <Button variant="link" className="mt-1 p-0 text-primary-600">
                                Manage entities
                              </Button>
                            </Link>
                          )}
                        </div>
                      )
                      : "No entities match your search query."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntities.map(entity => (
                  <TableRow key={entity.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleToggleEntity(entity.id)}>
                    <TableCell>
                      {onChange ? (
                        <Checkbox
                          checked={selectedEntityIds.includes(entity.id)}
                          onCheckedChange={() => handleToggleEntity(entity.id)}
                          aria-label={`Select ${entity.name}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="w-4 h-4 block"></span>
                      )}
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