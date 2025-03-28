import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientEditForm } from "./ClientEditForm";
import { EntityEditModal } from "./EntityEditModal";
import { Loader2, Pencil, Power, AlertCircle } from "lucide-react";
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
  const [selectedEntityForEdit, setSelectedEntityForEdit] = useState<Entity | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [entityToToggle, setEntityToToggle] = useState<Entity | null>(null);

  const { data: clientData, isLoading, isError, error } = useQuery({
    queryKey: ["clientDetails", clientId],
    queryFn: () => fetchClientDetails(clientId!),
    enabled: !!clientId && isOpen, // Only fetch when modal is open and clientId is valid
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create a mutation for toggling entity status
  const toggleEntityStatusMutation = useMutation({
    mutationFn: async (entity: Entity) => {
      const response = await fetch(`/api/admin/entities/${entity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entity,
          active: !entity.active
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update entity status');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the client details to update the entity list
      queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });

      toast({
        title: "Success",
        description: `Entity ${entityToToggle?.active ? 'deactivated' : 'activated'} successfully.`,
      });

      // Reset states
      setIsStatusDialogOpen(false);
      setEntityToToggle(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entity status. Please try again.",
        variant: "destructive",
      });
      setIsStatusDialogOpen(false);
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

  const handleToggleEntityStatus = (entity: Entity) => {
    setEntityToToggle(entity);
    setIsStatusDialogOpen(true);
  };

  const confirmToggleStatus = () => {
    if (entityToToggle) {
      toggleEntityStatusMutation.mutate(entityToToggle);
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
                <h2 className="text-lg font-semibold mb-4">Associated Entities</h2>
                
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
                          <TableRow key={entity.id}>
                            <TableCell className="font-medium">{entity.name}</TableCell>
                            <TableCell>
                              <Badge variant={entity.active ? "default" : "outline"}>
                                {entity.active ? 'Active' : 'Inactive'}
                              </Badge>
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
                                <Button 
                                  variant={entity.active ? "destructive" : "outline"} 
                                  size="sm"
                                  onClick={() => handleToggleEntityStatus(entity)}
                                >
                                  <Power className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">{entity.active ? 'Deactivate' : 'Activate'}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                    No associated entities found.
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

      {/* Confirmation Dialog for Status Toggle */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {entityToToggle?.active ? 'Deactivate' : 'Activate'} Entity
            </AlertDialogTitle>
            <AlertDialogDescription>
              {entityToToggle?.active
                ? `Are you sure you want to deactivate "${entityToToggle?.name}"? This will mark the entity as inactive in the system.`
                : `Are you sure you want to activate "${entityToToggle?.name}"? This will mark the entity as active in the system.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmToggleStatus}
              className={entityToToggle?.active ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {toggleEntityStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              {entityToToggle?.active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}