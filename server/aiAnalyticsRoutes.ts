import { Express, Request, Response, NextFunction } from 'express';
import { asyncHandler } from './errorHandling';
import { db } from './db';
import AiDataService from './aiDataService';
import { storage } from './index';
import axios from 'axios';

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

/**
 * Process AI query with full data access for authenticated users
 * This is used for analytics and internal insights, not for client-facing chat
 */
async function processAiAnalyticsQuery(
  query: string, 
  entityId?: number,
  accountId?: number
) {
  try {
    // Create the AI data service
    const aiDataService = new AiDataService(storage);
    
    // Check if an API key is configured
    const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
    
    if (!AI_API_KEY) {
      return {
        success: false,
        message: "AI service is not configured. Contact your administrator to set up AI analytics.",
      };
    }

    // Gather relevant data based on the query context
    let context = '';
    let contextData = null;
    
    if (entityId) {
      // If analyzing a specific entity
      contextData = await aiDataService.getEntityAnalytics(entityId);
      context = `Entity data: ${JSON.stringify(contextData)}`;
      
      // Add transaction patterns if available
      const patterns = await aiDataService.getTransactionPatterns(entityId);
      if (patterns) {
        context += `\nTransaction patterns: ${JSON.stringify(patterns)}`;
      }
      
      // If account is specified, add account details
      if (accountId) {
        const accountInsights = await aiDataService.getAccountInsights(entityId, accountId);
        context += `\nAccount insights: ${JSON.stringify(accountInsights)}`;
      }
    } else {
      // General entity list for overview
      const entities = await aiDataService.getEntityList();
      context = `Available entities: ${JSON.stringify(entities)}`;
    }
    
    // Make API call to XAI/OpenAI
    const API_URL = process.env.XAI_API_KEY 
      ? 'https://api.xai.com/v1/completions' // Update with actual XAI endpoint 
      : 'https://api.openai.com/v1/chat/completions';
    
    const headers = {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    // Format the request based on whether using XAI or OpenAI
    const apiRequest = process.env.XAI_API_KEY 
      ? {
          prompt: `Context: ${context}\n\nQuestion: ${query}\n\nAnswer:`,
          max_tokens: 1000,
          temperature: 0.3
        }
      : {
          model: 'gpt-4',
          messages: [
            {
              role: "system",
              content: `You are a financial analytics AI with access to company data. Answer questions with detailed insights based on the provided data. The data will be provided as context.`
            },
            {
              role: "user",
              content: `Context: ${context}\n\nQuestion: ${query}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        };
    
    const response = await axios.post(API_URL, apiRequest, { headers });
    
    // Extract response based on API used
    const aiResponse = process.env.XAI_API_KEY
      ? response.data.choices[0].text  // Adjust based on actual XAI response format
      : response.data.choices[0].message.content;
    
    return {
      success: true,
      message: aiResponse,
      data: contextData
    };
  } catch (error) {
    console.error('AI analytics error:', error);
    return {
      success: false,
      message: "I couldn't analyze the data at this time. Please try again later or refine your question.",
    };
  }
}

export function registerAIAnalyticsRoutes(app: Express) {
  // Get AI analytics for an entity
  app.post('/api/ai/analytics', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { query, entityId, accountId } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    const result = await processAiAnalyticsQuery(
      query, 
      entityId ? parseInt(entityId) : undefined,
      accountId ? parseInt(accountId) : undefined
    );
    
    if (result.success) {
      res.json({ 
        insight: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({ message: result.message });
    }
  }));
  
  // Get AI insights for financial statements
  app.post('/api/ai/statement-analysis', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { entityId, reportType, period } = req.body;
    
    if (!entityId || !reportType) {
      return res.status(400).json({ message: 'Entity ID and report type are required' });
    }
    
    const aiDataService = new AiDataService(storage);
    const entityData = await aiDataService.getEntityAnalytics(parseInt(entityId));
    
    const query = `Analyze the ${reportType} for entity ${entityId} ${period ? `for period ${period}` : ''}. Provide key insights, trends, and recommendations based on the financial data.`;
    
    const result = await processAiAnalyticsQuery(query, parseInt(entityId));
    
    if (result.success) {
      res.json({ 
        analysis: result.message,
        data: entityData
      });
    } else {
      res.status(500).json({ message: result.message });
    }
  }));
  
  // Get AI anomaly detection in transactions
  app.post('/api/ai/anomaly-detection', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { entityId } = req.body;
    
    if (!entityId) {
      return res.status(400).json({ message: 'Entity ID is required' });
    }
    
    const query = `Analyze transaction patterns for entity ${entityId} and identify any potential anomalies, unusual patterns, or irregularities in the financial data.`;
    
    const result = await processAiAnalyticsQuery(query, parseInt(entityId));
    
    if (result.success) {
      res.json({ 
        anomalies: result.message
      });
    } else {
      res.status(500).json({ message: result.message });
    }
  }));
  
  // Get AI-powered account reconciliation suggestions
  app.post('/api/ai/reconciliation-help', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const { entityId, accountId } = req.body;
    
    if (!entityId || !accountId) {
      return res.status(400).json({ message: 'Entity ID and Account ID are required' });
    }
    
    const query = `Analyze account ${accountId} for entity ${entityId} and provide reconciliation suggestions. Identify potential issues and steps to resolve them.`;
    
    const result = await processAiAnalyticsQuery(query, parseInt(entityId), parseInt(accountId));
    
    if (result.success) {
      res.json({ 
        suggestions: result.message
      });
    } else {
      res.status(500).json({ message: result.message });
    }
  }));
}