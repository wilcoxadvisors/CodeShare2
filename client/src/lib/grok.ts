import { checkXaiApiKey } from './check-secrets';

// API response type for parsed JSON responses
interface ApiResponse<T> {
  [key: string]: T;
}

// Utility function to handle API errors and provide fallback messages
async function handleApiRequest<T>(url: string, body: any, errorMessage: string, propertyName: string): Promise<T> {
  try {
    // Check if XAI API is available before making the request
    const apiKeyAvailable = await checkXaiApiKey();
    if (!apiKeyAvailable) {
      console.warn("XAI API key not available");
      throw new Error("AI integration not available. Please add the XAI_API_KEY to your environment variables to enable AI features.");
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json() as ApiResponse<T>;
    return data[propertyName] as T;
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(error instanceof Error ? error.message : errorMessage);
  }
}

/**
 * Summarize a financial document or text
 * @param text - The text to summarize
 * @returns Promise containing the summary
 */
export async function summarizeFinancialDocument(text: string): Promise<string> {
  return handleApiRequest<string>(
    '/api/ai/summarize',
    { reportData: text },
    "Failed to summarize financial document",
    "summary"
  );
}

/**
 * Analyze a financial statement for insights and recommendations
 * @param statementData - The financial statement data to analyze
 * @returns Promise containing the analysis result
 */
export async function analyzeFinancialStatement(statementData: string): Promise<string> {
  return handleApiRequest<string>(
    '/api/ai/analyze',
    { text: statementData },
    "Failed to analyze financial statement",
    "analysis"
  );
}

/**
 * Categorize a transaction based on its description
 * @param description - The transaction description
 * @returns Promise containing the suggested category and confidence
 */
export async function categorizeTransaction(description: string): Promise<{
  category: string;
  confidence: number;
}> {
  try {
    return await handleApiRequest<{ category: string; confidence: number }>(
      '/api/ai/categorize',
      { description },
      "Failed to categorize transaction",
      "category"
    );
  } catch (error) {
    console.error("Failed to categorize transaction:", error);
    return { category: "Uncategorized", confidence: 0 };
  }
}

/**
 * Explain a financial or accounting concept
 * @param concept - The concept to explain
 * @returns Promise containing the explanation
 */
export async function explainFinancialConcept(concept: string): Promise<string> {
  return handleApiRequest<string>(
    '/api/ai/explain',
    { concept },
    "Failed to explain financial concept",
    "explanation"
  );
}

/**
 * Generate audit suggestions based on transaction data
 * @param transactionData - The transaction data to analyze
 * @returns Promise containing the audit suggestions
 */
export async function generateAuditSuggestions(transactionData: string): Promise<string> {
  return handleApiRequest<string>(
    '/api/ai/audit-suggestions',
    { transactionData },
    "Failed to generate audit suggestions",
    "suggestions"
  );
}

/**
 * Analyze document image (receipt/invoice)
 * @param base64Image - The base64-encoded image data
 * @returns Promise containing the analysis
 */
export async function analyzeFinancialDocument(base64Image: string): Promise<string> {
  return handleApiRequest<string>(
    '/api/ai/analyze-document',
    { image: base64Image },
    "Failed to analyze financial document",
    "analysis"
  );
}

/**
 * Check if the AI features are available (API key is present)
 * @returns Promise resolving to a boolean indicating whether AI features are available
 */
export async function checkAiStatus(): Promise<{ available: boolean; message: string }> {
  try {
    // First check locally if the API key exists
    const apiKeyExists = await checkXaiApiKey();
    
    if (!apiKeyExists) {
      return { 
        available: false, 
        message: 'AI integration not available. Please add the XAI_API_KEY to your environment variables to enable AI features.' 
      };
    }
    
    // If API key exists, verify server connectivity
    const response = await fetch('/api/ai/status');
    
    if (!response.ok) {
      throw new Error(`AI status check failed: ${response.statusText}`);
    }
    
    return await response.json() as { available: boolean; message: string };
  } catch (error) {
    console.error("Failed to check AI status:", error);
    return { 
      available: false, 
      message: error instanceof Error ? error.message : "Failed to check AI status"
    };
  }
}