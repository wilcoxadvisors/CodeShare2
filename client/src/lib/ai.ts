import { apiRequest } from './queryClient';

/**
 * Analyze financial data and provide insights
 * @param text - The financial data text to analyze
 * @returns Promise containing the analysis result
 */
export async function analyzeFinancialData(text: string): Promise<string> {
  try {
    const response = await apiRequest('/api/ai/analyze', {
      method: 'POST',
      data: { text }
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
    const response = await apiRequest('/api/ai/sentiment', {
      method: 'POST',
      data: { text }
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
    const response = await apiRequest('/api/ai/categorize', {
      method: 'POST',
      data: { description }
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
    const response = await apiRequest('/api/ai/summarize', {
      method: 'POST',
      data: { reportData }
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
    const response = await apiRequest('/api/ai/explain', {
      method: 'POST',
      data: { concept }
    });
    
    return response.explanation || 'No explanation available';
  } catch (error) {
    console.error('Failed to explain accounting concept:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to explain accounting concept');
  }
}