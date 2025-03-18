import { Express, Request, Response } from 'express';
import OpenAI from "openai";

// Create xAI client
const openaiClient = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export function registerAIRoutes(app: Express) {
  // Route for analyzing financial data
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text data is required' });
      }
      
      const response = await openaiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ 
          role: "user", 
          content: `As a financial analysis expert, please analyze the following data and provide insights:\n\n${text}` 
        }],
        temperature: 0.3,
      });
      
      return res.json({ 
        analysis: response.choices[0].message.content 
      });
    } catch (error: any) {
      console.error('Error analyzing with AI:', error);
      return res.status(500).json({ 
        error: `AI analysis failed: ${error.message}` 
      });
    }
  });

  // Route for categorizing transactions
  app.post('/api/ai/categorize', async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Transaction description is required' });
      }
      
      const response = await openaiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content:
              "You are a financial categorization expert. Analyze the transaction description and categorize it into one of these categories: 'Operating Expense', 'Non-operating Expense', 'Cost of Goods Sold', 'Marketing', 'Rent', 'Payroll', 'Utilities', 'Equipment', 'Professional Services', 'Travel', 'Insurance', 'Taxes', 'Depreciation', 'Revenue', 'Other'. Provide a confidence score between 0 and 1. Respond with JSON in this format: { 'category': string, 'confidence': number, 'accountSubtype': string }"
          },
          {
            role: "user",
            content: description
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return res.json({
        category: result.category || "Other",
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        accountSubtype: result.accountSubtype || null
      });
    } catch (error: any) {
      console.error('Error categorizing transaction:', error);
      return res.status(500).json({ 
        error: `Transaction categorization failed: ${error.message}`,
        category: "Other",
        confidence: 0
      });
    }
  });

  // Route for generating report summaries
  app.post('/api/ai/summarize', async (req: Request, res: Response) => {
    try {
      const { reportData } = req.body;
      
      if (!reportData) {
        return res.status(400).json({ error: 'Report data is required' });
      }
      
      const response = await openaiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ 
          role: "user", 
          content: `Please generate an executive summary of the following financial report data. Highlight key metrics, trends, and actionable insights:\n\n${reportData}`
        }],
        temperature: 0.3,
        max_tokens: 1000,
      });
      
      return res.json({ 
        summary: response.choices[0].message.content 
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      return res.status(500).json({ 
        error: `Summary generation failed: ${error.message}` 
      });
    }
  });

  // Route for explaining accounting concepts
  app.post('/api/ai/explain', async (req: Request, res: Response) => {
    try {
      const { concept } = req.body;
      
      if (!concept) {
        return res.status(400).json({ error: 'Concept to explain is required' });
      }
      
      const response = await openaiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ 
          role: "user", 
          content: `Please explain the following accounting concept in simple, easy-to-understand terms: ${concept}`
        }],
        temperature: 0.3,
      });
      
      return res.json({ 
        explanation: response.choices[0].message.content 
      });
    } catch (error: any) {
      console.error('Error explaining concept:', error);
      return res.status(500).json({ 
        error: `Explanation failed: ${error.message}` 
      });
    }
  });
}