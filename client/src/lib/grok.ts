import OpenAI from "openai";

// Initialize OpenAI client with xAI's API base URL and API key from environment
const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: import.meta.env.XAI_API_KEY || process.env.XAI_API_KEY 
});

/**
 * Summarize a financial document or text
 * @param text - The text to summarize
 * @returns Promise containing the summary
 */
export async function summarizeFinancialDocument(text: string): Promise<string> {
  try {
    const prompt = `Please summarize the following financial information concisely while maintaining key points:\n\n${text}`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "No summary available";
  } catch (error) {
    console.error("Failed to summarize financial document:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to summarize financial document");
  }
}

/**
 * Analyze a financial statement for insights and recommendations
 * @param statementData - The financial statement data to analyze
 * @returns Promise containing the analysis result
 */
export async function analyzeFinancialStatement(statementData: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a financial analysis expert. Analyze the financial statement data and provide insights, trends, and recommendations."
        },
        {
          role: "user",
          content: statementData
        }
      ],
    });

    return response.choices[0].message.content || "No analysis available";
  } catch (error) {
    console.error("Failed to analyze financial statement:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze financial statement");
  }
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
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content:
            "You are a transaction categorization expert. Analyze the transaction description and categorize it. " +
            "Respond with JSON in this format: { 'category': string, 'confidence': number between 0 and 1 }"
        },
        {
          role: "user",
          content: description
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      category: result.category || "Uncategorized",
      confidence: Math.max(0, Math.min(1, result.confidence || 0))
    };
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
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an accounting and finance expert. Explain the following concept in clear, simple terms that a non-expert would understand."
        },
        {
          role: "user",
          content: concept
        }
      ],
    });

    return response.choices[0].message.content || "No explanation available";
  } catch (error) {
    console.error("Failed to explain financial concept:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to explain financial concept");
  }
}

/**
 * Generate audit suggestions based on transaction data
 * @param transactionData - The transaction data to analyze
 * @returns Promise containing the audit suggestions
 */
export async function generateAuditSuggestions(transactionData: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert auditor. Review the transaction data and provide audit suggestions, potential issues to investigate, and compliance considerations."
        },
        {
          role: "user",
          content: transactionData
        }
      ],
    });

    return response.choices[0].message.content || "No audit suggestions available";
  } catch (error) {
    console.error("Failed to generate audit suggestions:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate audit suggestions");
  }
}

/**
 * Analyze document image (receipt/invoice) using vision capabilities
 * @param base64Image - The base64-encoded image data
 * @returns Promise containing the analysis
 */
export async function analyzeFinancialDocument(base64Image: string): Promise<string> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "grok-2-vision-1212",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this financial document in detail. Extract key information including dates, amounts, account numbers, counterparties, and any other relevant financial details."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    return visionResponse.choices[0].message.content || "No document analysis available";
  } catch (error) {
    console.error("Failed to analyze financial document:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to analyze financial document");
  }
}