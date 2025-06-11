import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEntity } from '@/contexts/EntityContext';
import { apiRequest } from '@/lib/queryClient';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  const { data: dimensions = [], isLoading, error } = useQuery<Dimension[]>({
    queryKey: ['dimensions', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      return apiRequest(`/api/clients/${selectedClientId}/dimensions`);
    },
    enabled: !!selectedClientId,
  });

  return (
    <div className="py-6">
      <PageHeader
        title="Dimensions"
        description="Manage dimensions to categorize transactions for powerful reporting."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Dimension
        </Button>
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
                  <h4 className="font-semibold mb-2">Values ({dimension.values.length}):</h4>
                  <div className="space-y-1">
                    {dimension.values.slice(0, 5).map(value => (
                      <div key={value.id} className="text-sm p-2 bg-gray-50 rounded-md">
                        {value.name} ({value.code})
                      </div>
                    ))}
                    {dimension.values.length > 5 && <div className="text-sm text-muted-foreground p-2">...and {dimension.values.length - 5} more.</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DimensionsPage;