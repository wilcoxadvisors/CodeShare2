import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntity } from '@/contexts/EntityContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DimensionForm } from '@/features/manage/DimensionForm';
import DimensionValuesManager from '@/features/manage/DimensionValuesManager';
import { PlusCircle, Loader2, AlertCircle, Settings, MoreVertical, Edit, Trash2, Upload, Download } from 'lucide-react';

// Define type for a Dimension based on our schema
interface Dimension {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  values: DimensionValue[];
}

interface DimensionValue {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

const DimensionsPage = () => {
  const { selectedClientId } = useEntity();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [managingDimension, setManagingDimension] = useState<Dimension | null>(null);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [deletingDimension, setDeletingDimension] = useState<Dimension | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDimensionMutation = useMutation({
    mutationFn: (newDimension: { name: string; code: string; description?: string; }) => {
      if (!selectedClientId) throw new Error("Client not selected");
      return apiRequest(`/api/clients/${selectedClientId}/dimensions`, {
        method: 'POST',
        data: newDimension,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Dimension created successfully." });
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create dimension.", variant: "destructive" });
    }
  });

  const updateDimensionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; code: string; description?: string; } }) => {
      return apiRequest(`/api/dimensions/${id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Dimension updated successfully." });
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      queryClient.refetchQueries({ queryKey: ['dimensions', selectedClientId] });
      setEditingDimension(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update dimension.", variant: "destructive" });
    }
  });

  const deleteDimensionMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/dimensions/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Dimension deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      queryClient.refetchQueries({ queryKey: ['dimensions', selectedClientId] });
      setDeletingDimension(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete dimension.", variant: "destructive" });
    }
  });

  const handleCreateDimension = (values: { name: string; code: string; description?: string; }) => {
      createDimensionMutation.mutate(values);
  };

  const { data: dimensionsResponse, isLoading, error } = useQuery<any>({
    queryKey: ['dimensions', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      return apiRequest(`/api/clients/${selectedClientId}/dimensions`);
    },
    enabled: !!selectedClientId,
  });

  // Correctly and safely unwrap the nested data array
  const dimensions = (dimensionsResponse && Array.isArray(dimensionsResponse.data))
    ? dimensionsResponse.data
    : [];

  return (
    <div className="py-6">
      <PageHeader
        title="Dimensions"
        description="Manage dimensions to categorize transactions for powerful reporting."
      >
        <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Dimension
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Dimension</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <DimensionForm 
                onSubmit={handleCreateDimension} 
                isSubmitting={createDimensionMutation.isPending} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Master Bulk Management Section */}
        {!isLoading && !error && dimensions && dimensions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Master Bulk Management
              </CardTitle>
              <CardDescription>
                Download a template with all dimension values or upload a master CSV file to manage all dimensions at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    // TODO: Wire to new master template endpoint
                    toast({
                      title: "Coming Soon",
                      description: "Master template download will be implemented next",
                    });
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download Master Template
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    // TODO: Wire to new master upload endpoint
                    toast({
                      title: "Coming Soon", 
                      description: "Master file upload will be implemented next",
                    });
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Upload Master File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
           <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {dimensions && dimensions.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {dimensions.map((dimension) => (
                  <Card key={dimension.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>{dimension.name} ({dimension.code})</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${dimension.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {dimension.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingDimension(dimension)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingDimension(dimension)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{dimension.description || 'No description.'}</p>
                      <h4 className="font-semibold mb-2">Values ({dimension.values?.length || 0}):</h4>
                      <div className="space-y-1 mb-4">
                        {dimension.values?.length > 0 ? dimension.values.slice(0, 5).map(value => (
                          <div key={value.id} className={`text-sm p-2 bg-gray-50 rounded-md flex justify-between items-center ${!value.isActive ? 'opacity-60' : ''}`}>
                            <span>{value.name} ({value.code})</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${value.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {value.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground p-2 text-center">No values created.</div>
                        )}
                        {dimension.values?.length > 5 && <div className="text-sm text-muted-foreground p-2">...and {dimension.values.length - 5} more.</div>}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setManagingDimension(dimension)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Values
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No dimensions found. Create your first dimension to get started.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dimension Values Management Dialog */}
      <Dialog open={!!managingDimension} onOpenChange={(open) => !open && setManagingDimension(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Dimension Values</DialogTitle>
          </DialogHeader>
          {managingDimension && selectedClientId && (
            <DimensionValuesManager 
              dimension={dimensions.find(d => d.id === managingDimension.id) || managingDimension} 
              selectedClientId={selectedClientId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dimension Dialog */}
      <Dialog open={!!editingDimension} onOpenChange={(open) => !open && setEditingDimension(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Dimension</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editingDimension && (
              <DimensionForm 
                onSubmit={(values) => updateDimensionMutation.mutate({ id: editingDimension.id, data: values })}
                isSubmitting={updateDimensionMutation.isPending}
                initialValues={{
                  name: editingDimension.name,
                  code: editingDimension.code,
                  description: editingDimension.description || ''
                }}
                isEditing={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDimension} onOpenChange={(open) => !open && setDeletingDimension(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dimension</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the dimension "{deletingDimension?.name}" ({deletingDimension?.code})? 
              This action cannot be undone and will also delete all associated dimension values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingDimension && deleteDimensionMutation.mutate(deletingDimension.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDimensionMutation.isPending}
            >
              {deleteDimensionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DimensionsPage;