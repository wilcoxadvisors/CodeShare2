import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import BudgetList from '@/components/BudgetList';
import BudgetForm from '@/components/BudgetForm';
import ForecastList from '@/components/ForecastList';
import ForecastGeneration from '@/components/ForecastGeneration';
import DocumentUpload from '@/components/DocumentUpload';
import { checkXaiApiKey } from '@/lib/check-secrets';

export default function BudgetForecastDashboard() {
  const { user } = useAuth();
  const { currentEntity } = useEntity();
  const { toast } = useToast();
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showForecastForm, setShowForecastForm] = useState(false);
  const [hasXaiIntegration, setHasXaiIntegration] = useState(false);

  // Check if XAI integration is available
  useEffect(() => {
    async function checkXaiAvailability() {
      const isAvailable = await checkXaiApiKey();
      setHasXaiIntegration(isAvailable);
    }
    checkXaiAvailability();
  }, []);

  // Query for budgets
  const { 
    data: budgets, 
    isLoading: isLoadingBudgets, 
    error: budgetsError,
    refetch: refetchBudgets
  } = useQuery({
    queryKey: ['/api/entities', currentEntity?.id, 'budgets'],
    enabled: !!currentEntity?.id,
  });

  // Query for forecasts
  const { 
    data: forecasts, 
    isLoading: isLoadingForecasts, 
    error: forecastsError,
    refetch: refetchForecasts
  } = useQuery({
    queryKey: ['/api/entities', currentEntity?.id, 'forecasts'],
    enabled: !!currentEntity?.id,
  });

  // Handle errors
  useEffect(() => {
    if (budgetsError) {
      toast({
        title: "Error loading budgets",
        description: "There was a problem loading your budgets. Please try again.",
        variant: "destructive",
      });
    }
    if (forecastsError) {
      toast({
        title: "Error loading forecasts",
        description: "There was a problem loading your forecasts. Please try again.",
        variant: "destructive",
      });
    }
  }, [budgetsError, forecastsError, toast]);

  // Handle form visibility
  const handleBudgetFormComplete = () => {
    setShowBudgetForm(false);
    refetchBudgets();
  };

  const handleForecastFormComplete = () => {
    setShowForecastForm(false);
    refetchForecasts();
  };

  if (!currentEntity) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader title="Budget & Forecast Dashboard">
          <p>Please select an entity to view budgets and forecasts.</p>
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <PageHeader 
        title="Budget & Forecast Dashboard" 
        description="Create, manage, and analyze budgets and forecasts with AI-powered insights."
      >
        <div className="space-x-2">
          <Button onClick={() => setShowBudgetForm(true)} variant="default">Create Budget</Button>
          <Button onClick={() => setShowForecastForm(true)} variant="outline">Generate Forecast</Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="budgets" className="mt-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="mt-4">
          {showBudgetForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Budget</CardTitle>
                <CardDescription>Enter details for your new budget</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetForm 
                  entityId={currentEntity.id} 
                  onComplete={handleBudgetFormComplete}
                  onCancel={() => setShowBudgetForm(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <div>
              {isLoadingBudgets ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <BudgetList 
                  budgets={budgets || []} 
                  entityId={currentEntity.id}
                  onRefresh={refetchBudgets}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecasts" className="mt-4">
          {showForecastForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate New Forecast</CardTitle>
                <CardDescription>Configure your forecast parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <ForecastGeneration 
                  entityId={currentEntity.id} 
                  onComplete={handleForecastFormComplete}
                  onCancel={() => setShowForecastForm(false)}
                  hasXaiIntegration={hasXaiIntegration}
                />
              </CardContent>
            </Card>
          ) : (
            <div>
              {isLoadingForecasts ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ForecastList 
                  forecasts={forecasts || []} 
                  entityId={currentEntity.id}
                  onRefresh={refetchForecasts}
                  hasXaiIntegration={hasXaiIntegration}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>Upload and manage documents for budget and forecast analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload 
                entityId={currentEntity.id} 
                hasXaiIntegration={hasXaiIntegration}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}