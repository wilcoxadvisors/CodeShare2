import { 
  summarizeFinancialDocument,
  analyzeFinancialStatement,
  categorizeTransaction as categorizeTxn,
  explainFinancialConcept,
  generateAuditSuggestions as genAuditSuggestions,
  analyzeFinancialDocument,
  checkAiStatus
} from './grok';

// For backward compatibility and maintaining the same API
export interface ApiResponse<T> {
  [key: string]: T;
}

/**
 * Analyze financial data and provide insights
 * @param text - The financial data text to analyze
 * @returns Promise containing the analysis result
 */
export async function analyzeFinancialData(text: string): Promise<string> {
  return analyzeFinancialStatement(text);
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
    const response = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to analyze sentiment: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      rating: Math.max(1, Math.min(5, Math.round(data.rating || 3))),
      confidence: Math.max(0, Math.min(1, data.confidence || 0))
    };
  } catch (error) {
    console.error('Failed to analyze sentiment:', error);
    return { rating: 3, confidence: 0 };
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
  return categorizeTxn(description);
}

/**
 * Generate a summary of a financial report
 * @param reportData - The report data to summarize
 * @returns Promise containing the summary
 */
export async function generateReportSummary(reportData: string): Promise<string> {
  return summarizeFinancialDocument(reportData);
}

/**
 * Explain an accounting concept
 * @param concept - The accounting concept to explain
 * @returns Promise containing the explanation
 */
export async function explainAccountingConcept(concept: string): Promise<string> {
  return explainFinancialConcept(concept);
}

/**
 * Analyze document image (receipt/invoice)
 * @param imageBase64 - The base64-encoded image data
 * @returns Promise containing the analysis
 */
export async function analyzeDocumentImage(imageBase64: string): Promise<string> {
  return analyzeFinancialDocument(imageBase64);
}

/**
 * Generate audit suggestions based on transaction data
 * @param transactionData - The transaction data to analyze
 * @returns Promise containing the audit suggestions
 */
export async function generateAuditSuggestions(transactionData: string): Promise<string> {
  return genAuditSuggestions(transactionData);
}

/**
 * Check if AI features are available
 * @returns Promise resolving to object with availability status and message
 */
export async function checkAIAvailability(): Promise<{ available: boolean; message: string }> {
  return checkAiStatus();
}