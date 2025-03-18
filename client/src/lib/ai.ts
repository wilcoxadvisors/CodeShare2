import OpenAI from "openai";

// Create client with xAI API base URL and API key from environment
const openaiClient = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

// Text-only financial analysis using Grok
export async function analyzeFinancialData(text: string): Promise<string> {
  const prompt = `As a financial analysis expert, please analyze the following data and provide insights:\n\n${text}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "No analysis generated";
  } catch (error) {
    console.error("Error analyzing financial data:", error);
    throw new Error(`Failed to analyze financial data: ${error.message}`);
  }
}

// Sentiment analysis of financial reports or market conditions
export async function analyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  analysis: string;
}> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content:
            "You are a financial sentiment analysis expert. Analyze the sentiment of the text and provide a rating of 'positive', 'negative', or 'neutral', a confidence score between 0 and 1, and a brief analysis. Respond with JSON in this format: { 'sentiment': string, 'confidence': number, 'analysis': string }",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      sentiment: result.sentiment || "neutral",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      analysis: result.analysis || "No sentiment analysis available",
    };
  } catch (error) {
    console.error("Failed to analyze sentiment:", error);
    return {
      sentiment: "neutral",
      confidence: 0,
      analysis: `Error analyzing sentiment: ${error.message}`,
    };
  }
}

// Transaction categorization helper
export async function categorizeTransaction(description: string): Promise<{
  category: string;
  confidence: number;
}> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content:
            "You are a financial categorization expert. Analyze the transaction description and categorize it into one of these categories: 'Operating Expense', 'Non-operating Expense', 'Cost of Goods Sold', 'Marketing', 'Rent', 'Payroll', 'Utilities', 'Equipment', 'Professional Services', 'Travel', 'Insurance', 'Taxes', 'Depreciation', 'Revenue', 'Other'. Provide a confidence score between 0 and 1. Respond with JSON in this format: { 'category': string, 'confidence': number }",
        },
        {
          role: "user",
          content: description,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      category: result.category || "Other",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
    };
  } catch (error) {
    console.error("Failed to categorize transaction:", error);
    return {
      category: "Other",
      confidence: 0,
    };
  }
}

// Generate report summaries or executive digests
export async function generateReportSummary(reportData: string): Promise<string> {
  const prompt = `Please generate an executive summary of the following financial report data. Highlight key metrics, trends, and actionable insights:\n\n${reportData}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "No summary generated";
  } catch (error) {
    console.error("Error generating report summary:", error);
    throw new Error(`Failed to generate report summary: ${error.message}`);
  }
}

// Explain accounting concepts or transactions
export async function explainAccountingConcept(concept: string): Promise<string> {
  const prompt = `Please explain the following accounting concept in simple, easy-to-understand terms: ${concept}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "No explanation generated";
  } catch (error) {
    console.error("Error explaining accounting concept:", error);
    throw new Error(`Failed to explain accounting concept: ${error.message}`);
  }
}