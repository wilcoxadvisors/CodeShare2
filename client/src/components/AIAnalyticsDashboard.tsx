import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity } from '../contexts/EntityContext';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { checkOpenAiApiKey, checkXaiApiKey } from '../lib/check-secrets';

/**
 * AI Analytics Dashboard Component for staff members
 * This component allows staff to use AI to analyze financial data with full database access
 */
export default function AIAnalyticsDashboard() {
  const { toast } = useToast();
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState<{openai: boolean, xai: boolean}>({ openai: false, xai: false });
  
  // Check if API keys are available
  React.useEffect(() => {
    const checkApiKeys = async () => {
      const openai = await checkOpenAiApiKey();
      const xai = await checkXaiApiKey();
      setHasApiKeys({ openai, xai });
    };
    checkApiKeys();
  }, []);

  // Handle the AI query request
  const handleQuerySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      toast({
        title: "Query is required",
        description: "Please enter a question to analyze.",
        variant: "destructive"
      });
      return;
    }

    if (!hasApiKeys.openai && !hasApiKeys.xai) {
      toast({
        title: "API keys not configured",
        description: "Please contact your administrator to set up the AI analytics feature.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setAiResponse('');

    try {
      let endpoint = '/api/ai/analytics';
      let data: any = { query };
      
      // Add entityId if available
      if (currentEntity) {
        data.entityId = currentEntity.id;
      }

      // Different endpoints based on tab
      if (activeTab === 'statement') {
        endpoint = '/api/ai/statement-analysis';
        data.reportType = 'balance_sheet'; // Default to balance sheet
      } else if (activeTab === 'anomaly') {
        endpoint = '/api/ai/anomaly-detection';
      } else if (activeTab === 'reconciliation') {
        endpoint = '/api/ai/reconciliation-help';
        // If no account selected, show error
        if (!data.accountId) {
          toast({
            title: "Account required",
            description: "Please select an account for reconciliation help.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }

      const response = await axios.post(endpoint, data);
      
      if (activeTab === 'general') {
        setAiResponse(response.data.insight || 'No insights available.');
      } else if (activeTab === 'statement') {
        setAiResponse(response.data.analysis || 'No analysis available.');
      } else if (activeTab === 'anomaly') {
        setAiResponse(response.data.anomalies || 'No anomalies detected.');
      } else if (activeTab === 'reconciliation') {
        setAiResponse(response.data.suggestions || 'No suggestions available.');
      }
    } catch (error) {
      console.error('AI Analytics error:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to get AI analytics. Try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'employee')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Restricted</CardTitle>
          <CardDescription>
            This AI analytics feature is only available to staff members.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Financial Analytics</CardTitle>
          <CardDescription>
            Ask questions about financial data to get AI-powered insights with full data access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General Analysis</TabsTrigger>
              <TabsTrigger value="statement">Statement Analysis</TabsTrigger>
              <TabsTrigger value="anomaly">Anomaly Detection</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation Help</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 pt-4">
              <form onSubmit={handleQuerySubmit} className="space-y-4">
                <div className="grid w-full gap-2">
                  <Label htmlFor="query">Ask a question about your financial data</Label>
                  <Textarea
                    id="query"
                    placeholder="E.g., What trends do you see in our revenue over the last 6 months?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Get Insights'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="statement" className="space-y-4 pt-4">
              <form onSubmit={handleQuerySubmit} className="space-y-4">
                <div className="grid w-full gap-2">
                  <Label htmlFor="statementQuery">Ask about a financial statement</Label>
                  <Textarea
                    id="statementQuery"
                    placeholder="E.g., Analyze our balance sheet and identify areas of concern"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Statement'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="anomaly" className="space-y-4 pt-4">
              <form onSubmit={handleQuerySubmit} className="space-y-4">
                <div className="grid w-full gap-2">
                  <Label htmlFor="anomalyQuery">Find anomalies in transaction data</Label>
                  <Textarea
                    id="anomalyQuery"
                    placeholder="E.g., Identify unusual transactions in the last month"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Detecting Anomalies...
                    </>
                  ) : (
                    'Find Anomalies'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="reconciliation" className="space-y-4 pt-4">
              <form onSubmit={handleQuerySubmit} className="space-y-4">
                <div className="grid w-full gap-4">
                  <div>
                    <Label htmlFor="accountId">Account</Label>
                    <Input
                      id="accountId"
                      type="number"
                      placeholder="Enter account ID for reconciliation"
                      onChange={(e) => {
                        // Update the component state with account ID
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reconciliationQuery">Account reconciliation help</Label>
                    <Textarea
                      id="reconciliationQuery"
                      placeholder="E.g., Help me reconcile this account and identify discrepancies"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Suggestions...
                    </>
                  ) : (
                    'Get Reconciliation Help'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {aiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Results</CardTitle>
            <CardDescription>
              Based on your financial data, here's what the AI found:
            </CardDescription>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
              {aiResponse}
            </div>
          </CardContent>
        </Card>
      )}
      
      {(!hasApiKeys.openai && !hasApiKeys.xai) && (
        <Card className="border-amber-500">
          <CardHeader className="text-amber-500">
            <CardTitle>AI Feature Not Configured</CardTitle>
            <CardDescription className="text-amber-400">
              To enable AI analytics, please contact your administrator to set up the necessary API keys.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}