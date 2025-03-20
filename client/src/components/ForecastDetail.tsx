import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, ChartBar, Sparkles } from 'lucide-react';
import Chart from '@/components/Chart';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
  confidenceInterval: string | null;
}

interface ForecastDetailProps {
  forecastId: number;
  entityId: number;
  onBack: () => void;
  hasXaiIntegration: boolean;
}

export default function ForecastDetail({ 
  forecastId, 
  entityId, 
  onBack,
  hasXaiIntegration 
}: ForecastDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch forecast details
  const { data: forecast, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['/api/entities', entityId, 'forecasts', forecastId],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/${entityId}/forecasts/${forecastId}`);
      return response as Forecast;
    },
  });

  // Generate XAI insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/entities/${entityId}/forecasts/${forecastId}/xai-insights`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Insights generated',
          description: 'AI insights have been generated for this forecast.',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'forecasts', forecastId] });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate insights',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'There was an error generating insights';
      const needsApiKey = error?.response?.data?.needsAPIKey;
      
      toast({
        title: needsApiKey ? 'XAI API Key Required' : 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateInsights = () => {
    if (!hasXaiIntegration) {
      toast({
        title: 'XAI Integration Required',
        description: 'To generate AI insights, you need to set up XAI integration first.',
        variant: 'destructive',
      });
      return;
    }
    generateInsightsMutation.mutate();
  };

  // Function to prepare chart data
  const prepareChartData = () => {
    if (!forecast || !forecast.forecastData) return null;
    
    const forecastData = forecast.forecastData;
    
    // Extract the periods and values
    const labels = forecastData.periods.map((period: any) => period.name);
    
    // Prepare datasets from accounts
    const datasets = forecastData.accounts.map((account: any, index: number) => {
      const colors = [
        'rgba(53, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(153, 102, 255, 0.7)',
      ];
      
      return {
        label: `${account.code} - ${account.name}`,
        data: forecastData.values[account.id],
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.7', '1'),
        borderWidth: 1,
      };
    });
    
    return {
      labels,
      datasets,
    };
  };

  // Function to export forecast data
  const handleExportForecast = () => {
    if (!forecast) return;
    
    const forecastData = {
      name: forecast.name,
      description: forecast.description,
      startDate: forecast.startDate,
      endDate: forecast.endDate,
      data: forecast.forecastData,
      insights: forecast.aiInsights,
      createdAt: forecast.createdAt,
      confidenceInterval: forecast.confidenceInterval,
    };
    
    const blob = new Blob([JSON.stringify(forecastData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast-${forecastId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoadingForecast) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forecasts
          </Button>
          <CardTitle>Loading Forecast...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forecasts
          </Button>
          <CardTitle>Forecast Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested forecast could not be found.</p>
        </CardContent>
      </Card>
    );
  }

  // Check if forecast data is valid for charting
  const chartData = prepareChartData();
  const hasValidData = chartData && chartData.datasets && chartData.datasets.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="w-fit px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forecasts
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportForecast}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            {!forecast.aiInsights && hasXaiIntegration && (
              <Button 
                size="sm" 
                onClick={handleGenerateInsights}
                disabled={generateInsightsMutation.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Insights
              </Button>
            )}
          </div>
        </div>
        <CardTitle>{forecast.name}</CardTitle>
        <CardDescription>
          {format(new Date(forecast.startDate), 'MMM yyyy')} - {format(new Date(forecast.endDate), 'MMM yyyy')} | 
          Created on {format(new Date(forecast.createdAt), 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-wrap gap-2">
          {forecast.baseScenario && <Badge variant="default">Base Scenario</Badge>}
          {forecast.modelConfig?.type && (
            <Badge variant="outline">
              {forecast.modelConfig.type.charAt(0).toUpperCase() + forecast.modelConfig.type.slice(1)}
            </Badge>
          )}
          {forecast.confidenceInterval && (
            <Badge variant="secondary">
              Confidence: {forecast.confidenceInterval}
            </Badge>
          )}
        </div>

        {forecast.description && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-muted-foreground">{forecast.description}</p>
          </div>
        )}

        <Tabs defaultValue="chart" className="mt-6">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="insights" disabled={!forecast.aiInsights}>
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="pt-4">
            {hasValidData ? (
              <div className="h-80">
                <Chart type="bar" data={chartData} />
              </div>
            ) : (
              <Alert>
                <AlertTitle>No chart data available</AlertTitle>
                <AlertDescription>
                  This forecast doesn't have any visualization data available.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="pt-4">
            {forecast.aiInsights ? (
              <div className="p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-medium mb-2">AI-Generated Insights</h3>
                <div className="prose max-w-none">
                  {forecast.aiInsights.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTitle>No AI insights available</AlertTitle>
                <AlertDescription>
                  Click the "Generate AI Insights" button to analyze this forecast with XAI.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="assumptions" className="pt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Model Configuration</h3>
                {forecast.modelConfig ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(forecast.modelConfig).map(([key, value]) => (
                      <div key={key} className="p-3 border rounded-md">
                        <p className="font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-muted-foreground">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No model configuration details available.</p>
                )}
              </div>
              
              {forecast.forecastData?.assumptions && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Forecast Assumptions</h3>
                  <div className="p-4 border rounded-md">
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(forecast.forecastData.assumptions).map(([key, value]) => (
                        <li key={key}>
                          <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-muted-foreground">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}