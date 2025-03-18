import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldAlert, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAuditSuggestions } from '@/lib/ai';

interface AuditSuggestionsGeneratorProps {
  transactionData?: string;
  title?: string;
  description?: string;
  onSuggestionsGenerated?: (suggestions: string) => void;
}

export function AuditSuggestionsGenerator({
  transactionData = '',
  title = 'Audit Suggestions',
  description = 'Get AI-generated audit suggestions based on transaction data',
  onSuggestionsGenerated
}: AuditSuggestionsGeneratorProps) {
  const [inputData, setInputData] = useState(transactionData);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    if (!inputData || inputData.trim() === '') {
      toast({
        title: "Input Required",
        description: "Please provide transaction data for analysis",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateAuditSuggestions(inputData);
      setSuggestions(result);
      
      if (onSuggestionsGenerated) {
        onSuggestionsGenerated(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate audit suggestions');
      toast({
        title: "Error",
        description: `Failed to generate suggestions: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSuggestions(null);
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldAlert className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Input Area */}
          <div>
            <Textarea
              placeholder="Enter transaction data, financial records, or journal entries to analyze..."
              className="min-h-[150px]"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              For best results, include detailed transaction data with dates, amounts, accounts, and descriptions.
            </p>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Generating audit suggestions...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            (() => {
              const isApiKeyError = error.includes('API key') || error.includes('AI integration not available');
              
              return (
                <div className={`p-4 rounded-md border ${isApiKeyError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex">
                    <ShieldAlert className={`h-5 w-5 mr-2 ${isApiKeyError ? 'text-yellow-500' : 'text-red-500'}`} />
                    <div className={`text-sm ${isApiKeyError ? 'text-yellow-700' : 'text-red-700'}`}>
                      <p>{error}</p>
                      {isApiKeyError && (
                        <p className="mt-2 font-medium">
                          Please contact your administrator to configure AI integration.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
          
          {/* Results */}
          {suggestions && !isLoading && (
            <div className="bg-green-50 p-4 rounded-md border border-green-100">
              <div className="flex items-start">
                <Lightbulb className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-900 whitespace-pre-wrap">
                  {suggestions}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {suggestions && (
          <Button 
            variant="outline" 
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </Button>
        )}
        
        <Button 
          onClick={handleGenerateSuggestions}
          disabled={isLoading || !inputData}
          className={suggestions ? 'ml-auto' : 'w-full'}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : suggestions ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Regenerate
            </>
          ) : (
            <>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Generate Audit Suggestions
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}