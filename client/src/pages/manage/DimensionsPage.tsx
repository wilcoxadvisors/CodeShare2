import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntity } from '@/contexts/EntityContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DimensionForm } from '@/features/manage/DimensionForm';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';

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
}

const DimensionsPage = () => {
  const { selectedClientId } = useEntity();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
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

  const handleCreateDimension = (values: { name: string; code: string; description?: string; }) => {
      createDimensionMutation.mutate(values);
  };

  const { data: dimensions = [], isLoading, error } = useQuery<Dimension[]>({
    queryKey: ['dimensions', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      try {
        const response = await apiRequest(`/api/clients/${selectedClientId}/dimensions`);
        console.log('API Response:', response);
        // Ensure we always return an array
        if (Array.isArray(response)) {
          return response;
        } else {
          console.warn('API response is not an array:', typeof response, response);
          return [];
        }
      } catch (error) {
        console.error('Error fetching dimensions:', error);
        throw error;
      }
    },
    enabled: !!selectedClientId,
  });

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
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${dimension.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {dimension.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{dimension.description || 'No description.'}</p>
                      <h4 className="font-semibold mb-2">Values ({dimension.values?.length || 0}):</h4>
                      <div className="space-y-1">
                        {dimension.values?.length > 0 ? dimension.values.slice(0, 5).map(value => (
                          <div key={value.id} className="text-sm p-2 bg-gray-50 rounded-md">
                            {value.name} ({value.code})
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground p-2 text-center">No values created.</div>
                        )}
                        {dimension.values?.length > 5 && <div className="text-sm text-muted-foreground p-2">...and {dimension.values.length - 5} more.</div>}
                      </div>
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
    </div>
  );
};

export default DimensionsPage;