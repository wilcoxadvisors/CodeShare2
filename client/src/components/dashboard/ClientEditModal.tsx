import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientEditForm } from "./ClientEditForm";
import { EntityEditModal } from "./EntityEditModal";
import { EntityAddModal } from "./EntityAddModal";
import { Loader2, Pencil, Power, AlertCircle, PlusCircle, Trash2, ArchiveRestore } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ClientEditModalProps {
  clientId: number | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface Entity {
  id: number;
  name: string;
  active: boolean;
  industry?: string;
  clientId?: number;
  deletedAt?: Date | null;
  [key: string]: any; // For other properties
}

// Fetch function for client details
const fetchClientDetails = async (clientId: number): Promise<any> => {
  const response = await fetch(`/api/admin/clients/${clientId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch client details');
  }
  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'API returned non-success status');
  }
  return result.data;
};

export function ClientEditModal({ clientId, isOpen, onOpenChange }: ClientEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEntityEditModalOpen, setIsEntityEditModalOpen] = useState(false);
  const [isEntityAddModalOpen, setIsEntityAddModalOpen] = useState(false);
  const [selectedEntityForEdit, setSelectedEntityForEdit] = useState<Entity | null>(null);
  
  // Dialog states
  const [isSetInactiveDialogOpen, setIsSetInactiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  const { data: clientData, isLoading, isError, error } = useQuery({
    queryKey: ["clientDetails", clientId],
    queryFn: () => fetchClientDetails(clientId!),
    enabled: !!clientId && isOpen, // Only fetch when modal is open and clientId is valid
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create a mutation for setting entity inactive
  const setEntityInactiveMutation = useMutation({
    mutationFn: async (entityId: number) => {
      const response = await fetch(`/api/entities/${entityId}/set-inactive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set entity inactive');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the client details to update the entity list
      queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });

      toast({
        title: "Success",
        description: `Entity set to inactive successfully.`,
      });

      // Reset states
      setIsSetInactiveDialogOpen(false);
      setSelectedEntity(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set entity inactive. Please try again.",
        variant: "destructive",
      });
      setIsSetInactiveDialogOpen(false);
    }
  });

  // Create a mutation for soft-deleting entity
  const softDeleteEntityMutation = useMutation({
    mutationFn: async (entityId: number) => {
      const response = await fetch(`/api/entities/${entityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete entity');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the client details to update the entity list
      queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });

      toast({
        title: "Success",
        description: `Entity deleted successfully.`,
      });

      // Reset states
      setIsDeleteDialogOpen(false);
      setSelectedEntity(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity. Please try again.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  });

  // Create a mutation for restoring entity
  const restoreEntityMutation = useMutation({
    mutationFn: async (entityId: number) => {
      const response = await fetch(`/api/entities/${entityId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore entity');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the client details to update the entity list
      queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });

      toast({
        title: "Success",
        description: `Entity restored successfully.`,
      });

      // Reset states
      setIsRestoreDialogOpen(false);
      setSelectedEntity(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore entity. Please try again.",
        variant: "destructive",
      });
      setIsRestoreDialogOpen(false);
    }
  });

  const handleUpdateSuccess = () => {
    console.log('Client update successful, closing modal.');
    onOpenChange(false); // Close modal on success
  };

  const handleEditEntity = (entity: Entity) => {
    setSelectedEntityForEdit(entity);
    setIsEntityEditModalOpen(true);
  };

  const handleSetEntityInactive = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsSetInactiveDialogOpen(true);
  };

  const handleDeleteEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsDeleteDialogOpen(true);
  };

  const handleRestoreEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsRestoreDialogOpen(true);
  };

  // Determine entity status for display
  const getEntityStatusBadge = (entity: Entity) => {
    if (entity.deletedAt) {
      return <Badge variant="destructive">Deleted</Badge>;
    } else if (!entity.active) {
      return <Badge variant="outline">Inactive</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Modify the client's details below.</DialogDescription>
          </DialogHeader>
          
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading client data...</span>
            </div>
          )}
          
          {isError && (
            <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
              <p className="font-medium">Error loading data:</p>
              <p>{error?.message || "Unknown error occurred"}</p>
            </div>
          )}
          
          {clientData && clientId && (
            <>
              <ClientEditForm
                clientData={clientData}
                clientId={clientId}
                onUpdateSuccess={handleUpdateSuccess}
              />
              
              {/* Entities section */}
              <div className="mt-8 border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Associated Entities</h2>
                  <Button 
                    size="sm" 
                    onClick={() => setIsEntityAddModalOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Entity
                  </Button>
                </div>
                
                {clientData.entities && clientData.entities.length > 0 ? (
                  <div className="overflow-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/4">Entity Name</TableHead>
                          <TableHead className="w-1/6">Status</TableHead>
                          <TableHead className="w-1/4">Industry</TableHead>
                          <TableHead className="text-right w-1/3">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientData.entities.map((entity: Entity) => (
                          <TableRow key={entity.id} className={entity.deletedAt ? "opacity-60" : ""}>
                            <TableCell className="font-medium">{entity.name}</TableCell>
                            <TableCell>
                              {getEntityStatusBadge(entity)}
                            </TableCell>
                            <TableCell>{entity.industry || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEditEntity(entity)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                                
                                {/* Conditional action buttons based on entity state */}
                                {entity.deletedAt ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRestoreEntity(entity)}
                                  >
                                    <ArchiveRestore className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Restore</span>
                                  </Button>
                                ) : (
                                  <>
                                    {entity.active && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleSetEntityInactive(entity)}
                                      >
                                        <Power className="h-4 w-4 mr-1" />
                                        <span className="hidden sm:inline">Set Inactive</span>
                                      </Button>
                                    )}
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteEntity(entity)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      <span className="hidden sm:inline">Delete</span>
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                    No associated entities found. Click the "Add Entity" button to create one.
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Entity Edit Modal */}
      {selectedEntityForEdit && (
        <EntityEditModal 
          entity={selectedEntityForEdit}
          isOpen={isEntityEditModalOpen}
          onOpenChange={setIsEntityEditModalOpen}
          onUpdateSuccess={() => {
            setIsEntityEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
          }}
        />
      )}
      
      {/* Entity Add Modal */}
      {clientId && (
        <EntityAddModal 
          clientId={clientId}
          isOpen={isEntityAddModalOpen}
          onOpenChange={setIsEntityAddModalOpen}
          onAddSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
          }}
        />
      )}

      {/* Confirmation Dialog for Set Inactive */}
      <AlertDialog open={isSetInactiveDialogOpen} onOpenChange={setIsSetInactiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Entity Inactive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set "{selectedEntity?.name}" to inactive? 
              This will mark the entity as inactive in the system but it will still be available for viewing and reporting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedEntity && setEntityInactiveMutation.mutate(selectedEntity.id)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {setEntityInactiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              Set Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEntity?.name}"? 
              This will soft-delete the entity from the system. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedEntity && softDeleteEntityMutation.mutate(selectedEntity.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {softDeleteEntityMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Restore */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore "{selectedEntity?.name}"? 
              This will restore the deleted entity and make it available in the system again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedEntity && restoreEntityMutation.mutate(selectedEntity.id)}
            >
              {restoreEntityMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArchiveRestore className="h-4 w-4 mr-2" />
              )}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}