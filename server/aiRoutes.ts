import { Express, Request, Response } from 'express';
import OpenAI from "openai";

// Create xAI client according to the guidelines
const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export function registerAIRoutes(app: Express) {
  // Route for analyzing financial data - optimized for token efficiency
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text data is required' });
      }
      
      // Limit input text size to reduce token usage
      const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
      
      const prompt = `Please analyze this financial data concisely, focusing on key insights:\n\n${truncatedText}`;
      
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500, // Limit response size to reduce costs
      });
      
      return res.json({ 
        analysis: response.choices[0].message.content 
      });
    } catch (error: any) {
      console.error('Error analyzing with AI:', error);
      return res.status(500).json({ 
        error: `AI analysis failed: ${error.message || 'Unknown error'}` 
      });
    }
  });

  // Route for categorizing transactions - optimized for token efficiency
  app.post('/api/ai/categorize', async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Transaction description is required' });
      }

      // Limit description length to save tokens
      const truncatedDescription = description.length > 300 ? description.substring(0, 300) : description;
      
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: "Categorize this transaction into: 'Operating Expense', 'Non-operating Expense', 'Cost of Goods', 'Marketing', 'Rent', 'Payroll', 'Utilities', 'Equipment', 'Services', 'Travel', 'Insurance', 'Taxes', 'Depreciation', 'Revenue', 'Other'. Respond with JSON: {'category': string, 'confidence': number}"
          },
          {
            role: "user",
            content: truncatedDescription
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 150, // Limit response size
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return res.json({
        category: result.category || "Other",
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
      });
    } catch (error: any) {
      console.error('Error categorizing transaction:', error);
      return res.status(500).json({ 
        error: `Transaction categorization failed: ${error.message || 'Unknown error'}`,
        category: "Other",
        confidence: 0
      });
    }
  });

  // Route for generating report summaries - optimized for token efficiency
  app.post('/api/ai/summarize', async (req: Request, res: Response) => {
    try {
      const { reportData } = req.body;
      
      if (!reportData) {
        return res.status(400).json({ error: 'Report data is required' });
      }
      
      // Limit report data to save tokens
      const truncatedReportData = reportData.length > 3000 ? reportData.substring(0, 3000) + '...' : reportData;
      
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ 
          role: "user", 
          content: `Summarize this financial report briefly (3-5 bullet points):\n\n${truncatedReportData}`
        }],
        temperature: 0.3,
        max_tokens: 400, // Limit response size
      });
      
      return res.json({ 
        summary: response.choices[0].message.content 
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      return res.status(500).json({ 
        error: `Summary generation failed: ${error.message || 'Unknown error'}` 
      });
    }
  });

  // Route for explaining accounting concepts - optimized for token efficiency
  app.post('/api/ai/explain', async (req: Request, res: Response) => {
    try {
      const { concept } = req.body;
      
      if (!concept) {
        return res.status(400).json({ error: 'Concept to explain is required' });
      }
      
      // Limit concept length to save tokens
      const truncatedConcept = concept.length > 100 ? concept.substring(0, 100) : concept;
      
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ 
          role: "user", 
          content: `Explain briefly in 2-3 sentences: ${truncatedConcept}`
        }],
        temperature: 0.3,
        max_tokens: 200, // Limit response size
      });
      
      return res.json({ 
        explanation: response.choices[0].message.content 
      });
    } catch (error: any) {
      console.error('Error explaining concept:', error);
      return res.status(500).json({ 
        error: `Explanation failed: ${error.message || 'Unknown error'}` 
      });
    }
  });
  
  // Add sentiment analysis route as per the blueprint
  app.post('/api/ai/sentiment', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      // Limit text length to save tokens
      const truncatedText = text.length > 500 ? text.substring(0, 500) : text;
      
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: "Analyze sentiment. Provide rating (1-5) and confidence (0-1). Respond with JSON: {'rating': number, 'confidence': number}"
          },
          {
            role: "user",
            content: truncatedText
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 100, // Very limited response size
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return res.json({
        rating: Math.max(1, Math.min(5, Math.round(result.rating || 3))),
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
      });
    } catch (error: any) {
      console.error('Error analyzing sentiment:', error);
      return res.status(500).json({ 
        error: `Sentiment analysis failed: ${error.message || 'Unknown error'}`,
        rating: 3,
        confidence: 0
      });
    }
  });
}