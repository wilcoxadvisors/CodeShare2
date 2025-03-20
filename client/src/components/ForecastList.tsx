import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Trash2, MoreVertical, FileText, LineChart, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ForecastDetail from './ForecastDetail';

interface Forecast {
  id: number;
  name: string;
  entityId: number;
  description: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  baseScenario: boolean;
  createdBy: number;
  modelConfig: any;
  forecastData: any;
  aiInsights: string | null;
}

interface ForecastListProps {
  forecasts: Forecast[];
  entityId: number;
  onRefresh: () => void;
  hasXaiIntegration: boolean;
}

export default function ForecastList({ 
  forecasts, 
  entityId, 
  onRefresh,
  hasXaiIntegration
}: ForecastListProps) {
  const { toast } = useToast();
  const [selectedForecastId, setSelectedForecastId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Delete forecast mutation
  const deleteMutation = useMutation({
    mutationFn: async (forecastId: number) => {
      return apiRequest(`/api/entities/${entityId}/forecasts/${forecastId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Forecast deleted',
        description: 'The forecast has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'forecasts'] });
      onRefresh();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error deleting the forecast.',
        variant: 'destructive',
      });
    },
  });

  // Generate insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async (forecastId: number) => {
      return apiRequest(`/api/entities/${entityId}/forecasts/${forecastId}/insights`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Insights generated',
        description: 'AI insights have been generated for this forecast.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'forecasts'] });
      onRefresh();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error generating insights. Please check XAI integration.',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (forecastId: number) => {
    if (window.confirm('Are you sure you want to delete this forecast? This action cannot be undone.')) {
      deleteMutation.mutate(forecastId);
    }
  };

  const handleGenerateInsights = (forecastId: number) => {
    if (!hasXaiIntegration) {
      toast({
        title: 'XAI Integration Required',
        description: 'To generate AI insights, you need to set up XAI integration first.',
        variant: 'destructive',
      });
      return;
    }
    generateInsightsMutation.mutate(forecastId);
  };

  const handleViewDetails = (forecastId: number) => {
    setSelectedForecastId(forecastId);
  };

  // If a forecast is selected, show its details
  if (selectedForecastId) {
    return (
      <ForecastDetail
        forecastId={selectedForecastId}
        entityId={entityId}
        onBack={() => setSelectedForecastId(null)}
        hasXaiIntegration={hasXaiIntegration}
      />
    );
  }

  if (forecasts.length === 0) {
    return (
      <Alert className="mt-4">
        <AlertTitle>No forecasts found</AlertTitle>
        <AlertDescription>
          You haven't created any forecasts yet. Click the "Generate Forecast" button to get started.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecasts</CardTitle>
        <CardDescription>View and manage your financial forecasts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Base Scenario</TableHead>
              <TableHead>AI Insights</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forecasts.map((forecast) => (
              <TableRow key={forecast.id}>
                <TableCell className="font-medium">{forecast.name}</TableCell>
                <TableCell>
                  {format(new Date(forecast.startDate), 'MMM yyyy')} - {format(new Date(forecast.endDate), 'MMM yyyy')}
                </TableCell>
                <TableCell>
                  {forecast.baseScenario ? 
                    <Badge variant="default">Base</Badge> : 
                    <Badge variant="outline">Alternative</Badge>
                  }
                </TableCell>
                <TableCell>
                  {forecast.aiInsights ? 
                    <Badge variant="success">Available</Badge> : 
                    <Badge variant="outline">None</Badge>
                  }
                </TableCell>
                <TableCell>{format(new Date(forecast.createdAt), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetails(forecast.id)}>
                        <LineChart className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      
                      {!forecast.aiInsights && hasXaiIntegration && (
                        <DropdownMenuItem 
                          onClick={() => handleGenerateInsights(forecast.id)}
                          disabled={generateInsightsMutation.isPending}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate AI Insights
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem 
                        onClick={() => handleDelete(forecast.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}