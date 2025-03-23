import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConsolidationSetup from '@/components/ConsolidationSetup';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Define types for our consolidation groups and entities
interface ConsolidationGroup {
  id: number;
  name: string;
  description: string | null;
  entity_ids: number[] | null; // Legacy field maintained for backward compatibility
  // New field for entity IDs from junction table
  entityIds?: number[];
  ownerId: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface Entity {
  id: number;
  name: string;
  legalName: string;
  taxId: string | null;
  entityType: string;
  industry: string | null;
  fiscalYearEnd: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Response interfaces
interface ApiResponse<T> {
  status: string;
  data: T;
}

export default function ConsolidationManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('groups');

  // Fetch consolidation groups
  const { data: consolidationGroupsResponse, isLoading: isLoadingGroups } = useQuery<ApiResponse<ConsolidationGroup[]>>({
    queryKey: ['/api/consolidation-groups'],
    retry: 1,
  });

  // Extract consolidation groups from the response
  const consolidationGroups = consolidationGroupsResponse?.data || [];

  // Fetch entities for selection
  const { data: entitiesResponse, isLoading: isLoadingEntities } = useQuery<ApiResponse<Entity[]>>({
    queryKey: ['/api/entities'],
    retry: 1,
  });

  // Extract entities from the response
  const entities = entitiesResponse?.data || [];

  // Function to generate a consolidated report
  const generateConsolidatedReport = async (groupId: number, reportType: string) => {
    try {
      const response = await apiRequest<ApiResponse<any>>(
        `/api/consolidation-groups/${groupId}/reports/${reportType}`,
        { method: 'GET' }
      );
      
      // Handle the report data here (could open in a new tab, download, etc.)
      toast({
        title: 'Report Generated',
        description: 'The consolidated report has been generated successfully',
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Report Generation Failed',
        description: 'There was an error generating the consolidated report',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consolidation Management</h1>
          <p className="text-muted-foreground">Create and manage consolidated reporting groups</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="groups">Consolidation Groups</TabsTrigger>
          <TabsTrigger value="reports">Consolidated Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="groups" className="mt-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Consolidation Group Management</CardTitle>
              <CardDescription>
                Create and manage groups of entities for consolidated reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEntities ? (
                <div className="flex items-center justify-center h-40">
                  <p>Loading entities...</p>
                </div>
              ) : !entities || entities.length === 0 ? (
                <div className="text-center p-6 border rounded-lg bg-muted/50">
                  <h3 className="text-lg font-medium mb-2">No Entities Available</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to create at least one entity before you can set up consolidation groups.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = '/client-onboarding'}>
                    Add Entities
                  </Button>
                </div>
              ) : (
                <ConsolidationSetup />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consolidated Reports</CardTitle>
              <CardDescription>
                Generate consolidated financial reports across multiple entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGroups ? (
                <div className="flex items-center justify-center h-40">
                  <p>Loading consolidation groups...</p>
                </div>
              ) : !consolidationGroups || consolidationGroups.length === 0 ? (
                <div className="text-center p-6 border rounded-lg bg-muted/50">
                  <h3 className="text-lg font-medium mb-2">No Consolidation Groups</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to create at least one consolidation group before you can generate reports.
                  </p>
                  <Button onClick={() => setActiveTab('groups')}>
                    Create Consolidation Group
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Available Consolidation Groups</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {consolidationGroups.map((group: ConsolidationGroup) => (
                      <Card key={group.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 pb-2">
                          <CardTitle className="text-md">{group.name}</CardTitle>
                          <CardDescription>{group.description || 'No description'}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid gap-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Entities:</span>
                              <span className="font-medium">{group.entityIds?.length || group.entity_ids?.length || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Currency:</span>
                              <span className="font-medium">{group.currency}</span>
                            </div>
                            <div className="mt-4 space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => generateConsolidatedReport(group.id, 'balance_sheet')}
                              >
                                Balance Sheet
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => generateConsolidatedReport(group.id, 'income_statement')}
                              >
                                Income Statement
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}