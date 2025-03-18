import { apiRequest } from './queryClient';

interface AnalysisResponse {
  analysis: string;
}

interface SentimentResponse {
  rating: number;
  confidence: number;
}

interface CategoryResponse {
  category: string;
  confidence: number;
}

interface SummaryResponse {
  summary: string;
}

interface ExplanationResponse {
  explanation: string;
}

interface DocumentAnalysisResponse {
  analysis: string;
}

interface AuditSuggestionsResponse {
  suggestions: string;
}

/**
 * Analyze financial data and provide insights
 * @param text - The financial data text to analyze
 * @returns Promise containing the analysis result
 */
export async function analyzeFinancialData(text: string): Promise<string> {
  try {
    const response = await apiRequest<AnalysisResponse>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.analysis || 'No analysis available';
  } catch (error) {
    console.error('Failed to analyze financial data:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze financial data');
  }
}

/**
 * Analyze sentiment of text
 * @param text - The text to analyze
 * @returns Promise containing sentiment rating and confidence
 */
export async function analyzeSentiment(text: string): Promise<{
  rating: number;
  confidence: number;
}> {
  try {
    const response = await apiRequest<SentimentResponse>('/api/ai/sentiment', {
      method: 'POST',
      body: JSON.stringify({ text }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.rating || !response.confidence) {
      return { rating: 0, confidence: 0 };
    }
    
    return {
      rating: Math.max(1, Math.min(5, Math.round(response.rating))),
      confidence: Math.max(0, Math.min(1, response.confidence))
    };
  } catch (error) {
    console.error('Failed to analyze sentiment:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze sentiment');
  }
}

/**
 * Categorize a transaction based on its description
 * @param description - The transaction description
 * @returns Promise containing the suggested category
 */
export async function categorizeTransaction(description: string): Promise<{
  category: string;
  confidence: number;
}> {
  try {
    const response = await apiRequest<CategoryResponse>('/api/ai/categorize', {
      method: 'POST',
      body: JSON.stringify({ description }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return {
      category: response.category || 'Uncategorized',
      confidence: response.confidence || 0
    };
  } catch (error) {
    console.error('Failed to categorize transaction:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to categorize transaction');
  }
}

/**
 * Generate a summary of a financial report
 * @param reportData - The report data to summarize
 * @returns Promise containing the summary
 */
export async function generateReportSummary(reportData: string): Promise<string> {
  try {
    const response = await apiRequest<SummaryResponse>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ reportData }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.summary || 'No summary available';
  } catch (error) {
    console.error('Failed to generate report summary:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate report summary');
  }
}

/**
 * Explain an accounting concept
 * @param concept - The accounting concept to explain
 * @returns Promise containing the explanation
 */
export async function explainAccountingConcept(concept: string): Promise<string> {
  try {
    const response = await apiRequest<ExplanationResponse>('/api/ai/explain', {
      method: 'POST',
      body: JSON.stringify({ concept }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.explanation || 'No explanation available';
  } catch (error) {
    console.error('Failed to explain accounting concept:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to explain accounting concept');
  }
}

/**
 * Analyze document image (receipt/invoice)
 * @param imageBase64 - The base64-encoded image data
 * @returns Promise containing the analysis
 */
export async function analyzeDocumentImage(imageBase64: string): Promise<string> {
  try {
    const response = await apiRequest<DocumentAnalysisResponse>('/api/ai/analyze-document', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.analysis || 'No document analysis available';
  } catch (error) {
    console.error('Failed to analyze document image:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze document image');
  }
}

/**
 * Generate audit suggestions based on transaction data
 * @param transactionData - The transaction data to analyze
 * @returns Promise containing the audit suggestions
 */
export async function generateAuditSuggestions(transactionData: string): Promise<string> {
  try {
    const response = await apiRequest<AuditSuggestionsResponse>('/api/ai/audit-suggestions', {
      method: 'POST',
      body: JSON.stringify({ transactionData }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.suggestions || 'No audit suggestions available';
  } catch (error) {
    console.error('Failed to generate audit suggestions:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate audit suggestions');
  }
}