import React, { useState } from 'react';
import { DocumentAnalysis } from '@/components/DocumentAnalysis';
import { AuditSuggestionsGenerator } from '@/components/AuditSuggestionsGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/PageHeader';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { check } from '../lib/check-secrets';

export default function DocumentAnalysisPage() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentEntity } = useEntity();
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Check for XAI API key on component mount
  React.useEffect(() => {
    const checkApiKey = async () => {
      try {
        const hasKey = await check('XAI_API_KEY');
        setHasApiKey(hasKey);
      } catch (error) {
        console.error('Error checking for API key:', error);
        setHasApiKey(false);
      }
    };

    checkApiKey();
  }, []);

  const handleAnalysisComplete = (result: string) => {
    setAnalysis(result);
  };

  // If no entity is selected, show a message
  if (!currentEntity) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <PageHeader
            title="Document Analysis"
            description="AI-powered analysis for financial documents"
          />
          <div className="text-center py-10">
            <h1 className="text-xl font-semibold text-gray-900">Please select an entity to continue</h1>
          </div>
        </div>
      </div>
    );
  }

  // If API key is missing, show a warning
  if (!hasApiKey) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <PageHeader
            title="Document Analysis"
            description="AI-powered analysis for financial documents"
          />
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing API Key</AlertTitle>
            <AlertDescription>
              The XAI API key is missing. Document analysis features require this key to function.
              Please contact your administrator to configure the API key.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <PageHeader
          title="Document Analysis"
          description="AI-powered analysis for financial documents"
        />

        <Tabs defaultValue="document-scanner" className="mt-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="document-scanner">Document Scanner</TabsTrigger>
            <TabsTrigger value="audit-suggestions">Audit Suggestions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="document-scanner" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DocumentAnalysis onAnalysisComplete={handleAnalysisComplete} />
              
              {analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                    <CardDescription>
                      Extracted financial information from the document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm">
                      {analysis}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="audit-suggestions" className="mt-4">
            <AuditSuggestionsGenerator 
              title="Audit Suggestions Generator"
              description="Generate audit suggestions and recommendations based on transaction data"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}