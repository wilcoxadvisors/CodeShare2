import OpenAI from "openai";

// Create OpenAI client but point it to xAI's API
const openai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: import.meta.env.XAI_API_KEY });

// Article summarization for financial documents
export async function summarizeFinancialDocument(text: string): Promise<string> {
  const prompt = `Please summarize the following financial document concisely while maintaining key points, numbers, and financial implications:\n\n${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || 'Unable to generate a summary.';
  } catch (error: any) {
    console.error("Error in summarizeFinancialDocument:", error);
    throw new Error(`Failed to summarize document: ${error.message}`);
  }
}

// Financial statement analysis
export async function analyzeFinancialStatement(statementData: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst expert. Analyze the financial statement data and provide insights on key financial metrics, trends, and potential areas of concern or opportunity."
        },
        {
          role: "user",
          content: statementData
        },
      ],
    });

    return response.choices[0].message.content || 'Unable to generate analysis.';
  } catch (error: any) {
    console.error("Error in analyzeFinancialStatement:", error);
    throw new Error(`Failed to analyze financial statement: ${error.message}`);
  }
}

// Transaction categorization with Grok
export async function categorizeTransaction(description: string): Promise<{
  category: string,
  confidence: number
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content:
            "You are a transaction categorization expert. Analyze the transaction description and provide the most appropriate accounting category and a confidence score between 0 and 1. Respond with JSON in this format: { 'category': string, 'confidence': number }",
        },
        {
          role: "user",
          content: description,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{"category": "Uncategorized", "confidence": 0}';
    const result = JSON.parse(content);

    return {
      category: result.category || "Uncategorized",
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
    };
  } catch (error: any) {
    console.error("Error in categorizeTransaction:", error);
    throw new Error(`Failed to categorize transaction: ${error.message}`);
  }
}

// Financial concepts explanation
export async function explainFinancialConcept(concept: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a financial education expert. Explain the provided financial or accounting concept in clear, concise terms that a business professional would understand. Include practical examples where appropriate."
        },
        {
          role: "user",
          content: `Please explain this financial concept: ${concept}`
        },
      ],
    });

    return response.choices[0].message.content || 'Unable to explain this concept.';
  } catch (error: any) {
    console.error("Error in explainFinancialConcept:", error);
    throw new Error(`Failed to explain concept: ${error.message}`);
  }
}

// Audit suggestion generator
export async function generateAuditSuggestions(transactionData: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an auditing expert. Review the provided transaction data and suggest potential audit procedures, areas of concern, or internal control improvements. Focus on practical, actionable suggestions."
        },
        {
          role: "user",
          content: transactionData
        },
      ],
    });

    return response.choices[0].message.content || 'Unable to generate audit suggestions.';
  } catch (error: any) {
    console.error("Error in generateAuditSuggestions:", error);
    throw new Error(`Failed to generate audit suggestions: ${error.message}`);
  }
}

// Image analysis for receipts and invoices
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
              text: "Extract the following information from this financial document (if visible):\n- Document type (invoice, receipt, statement, etc.)\n- Date\n- Total amount\n- Vendor/Payee name\n- Line items with amounts\n- Any tax information\n- Payment method\n\nFormat the information in a clear, structured way."
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
      max_tokens: 1000,
    });

    return visionResponse.choices[0].message.content || 'Unable to analyze document image.';
  } catch (error: any) {
    console.error("Error in analyzeFinancialDocument:", error);
    throw new Error(`Failed to analyze document image: ${error.message}`);
  }
}