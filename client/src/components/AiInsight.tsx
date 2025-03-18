import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Lightbulb, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  analyzeFinancialData, 
  categorizeTransaction, 
  generateReportSummary, 
  explainAccountingConcept 
} from '@/lib/ai';

interface AiInsightProps {
  title?: string;
  description?: string;
  initialData?: string;
  insightType: 'analyze' | 'categorize' | 'summarize' | 'explain';
  showInput?: boolean;
  prompt?: string;
  onInsightGenerated?: (insight: string) => void;
}

export function AiInsight({
  title = 'AI Insight',
  description = 'Get AI-powered insights for your financial data',
  initialData = '',
  insightType = 'analyze',
  showInput = true,
  prompt = '',
  onInsightGenerated
}: AiInsightProps) {
  const [input, setInput] = useState(initialData);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateInsight = async () => {
    if (!input && !prompt) {
      toast({
        title: "Input required",
        description: "Please provide text for analysis",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const textToAnalyze = prompt || input;
      let insightResult = '';
      
      switch (insightType) {
        case 'analyze':
          insightResult = await analyzeFinancialData(textToAnalyze);
          break;
        case 'categorize':
          const categoryResult = await categorizeTransaction(textToAnalyze);
          insightResult = categoryResult.category;
          break;
        case 'summarize':
          insightResult = await generateReportSummary(textToAnalyze);
          break;
        case 'explain':
          insightResult = await explainAccountingConcept(textToAnalyze);
          break;
        default:
          insightResult = 'No insight available for this type';
      }
      
      setInsight(insightResult);
      
      if (onInsightGenerated) {
        onInsightGenerated(insightResult);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate insight');
      toast({
        title: "Error",
        description: `Failed to generate insight: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearInsight = () => {
    setInsight(null);
    setError(null);
  };

  // Render functions based on insight type
  const renderInsightContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Generating insight...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <div className="flex">
            <X className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      );
    }

    if (insight) {
      return (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <div className="flex items-start">
            <Lightbulb className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 whitespace-pre-wrap">
              {insightType === 'categorize' ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center">
                    <span className="font-semibold mr-2">Category:</span>
                    <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {insight}
                    </span>
                  </div>
                </div>
              ) : (
                insight
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        {showInput && (
          <div className="mb-4">
            <Textarea
              placeholder="Enter text to analyze..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        )}
        
        {renderInsightContent()}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {insight ? (
          <Button 
            variant="outline" 
            onClick={clearInsight}
            className="text-gray-500"
          >
            Clear
          </Button>
        ) : (
          <div></div>
        )}
        
        <Button 
          onClick={generateInsight}
          disabled={isLoading || (!input && !prompt)}
          className="ml-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : insight ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insight
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}