import { Express, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { asyncHandler } from './errorHandling';
import {
  chatConversations,
  chatMessages,
  chatUsageLimits,
  ChatMessageRole,
  type ChatMessage,
  type InsertChatMessage
} from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { validateRequest } from '../shared/validation';
import { z } from 'zod';
import axios from 'axios';
import { Session, SessionData } from 'express-session';

// Extend the express-session SessionData type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    guestUserId?: number;
    guestCreatedAt?: Date;
  }
}

// Schema for chat message requests
const sendMessageSchema = z.object({
  conversationId: z.number().optional(),
  message: z.string().min(1, "Message cannot be empty"),
  entityId: z.number().optional()
});

const validateMessageSchema = (data: unknown) => {
  return validateRequest(sendMessageSchema, data);
};

// Calculate token count (simplified version)
const countTokens = (text: string): number => {
  // A simple approximation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
};

// Check user's usage limit
const checkUsageLimits = async (userId: number, entityId: number | null = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find or create user's chat usage limits
  let usageLimit = await db.query.chatUsageLimits.findFirst({
    where: entityId 
      ? and(eq(chatUsageLimits.userId, userId), eq(chatUsageLimits.entityId, entityId))
      : eq(chatUsageLimits.userId, userId)
  });

  if (!usageLimit) {
    // Create a new usage limit record
    const limitResetTime = new Date();
    limitResetTime.setHours(0, 0, 0, 0);
    limitResetTime.setDate(limitResetTime.getDate() + 1); // Reset at midnight

    const [newUsageLimit] = await db.insert(chatUsageLimits).values({
      userId,
      entityId,
      maxMessagesPerDay: 10000, // Significantly increased limits for public users
      maxTokensPerDay: 1000000,
      limitResetTime,
      messagesUsedToday: 0,
      tokensUsedToday: 0
    }).returning();

    usageLimit = newUsageLimit;
  }

  // Check if the reset time has passed, and reset counters if needed
  if (usageLimit.limitResetTime < today) {
    await db.update(chatUsageLimits)
      .set({
        messagesUsedToday: 0,
        tokensUsedToday: 0,
        limitResetTime: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Next day
      })
      .where(eq(chatUsageLimits.id, usageLimit.id));
    
    usageLimit.messagesUsedToday = 0;
    usageLimit.tokensUsedToday = 0;
  }

  return {
    canSendMessage: usageLimit.messagesUsedToday < usageLimit.maxMessagesPerDay,
    remainingMessages: usageLimit.maxMessagesPerDay - usageLimit.messagesUsedToday,
    canUseTokens: usageLimit.tokensUsedToday < usageLimit.maxTokensPerDay,
    remainingTokens: usageLimit.maxTokensPerDay - usageLimit.tokensUsedToday,
    usageLimit
  };
};

// Update usage after sending a message
const updateUsage = async (usageLimitId: number, messageTokens: number) => {
  await db.update(chatUsageLimits)
    .set({
      messagesUsedToday: sql`${chatUsageLimits.messagesUsedToday} + 1`,
      tokensUsedToday: sql`${chatUsageLimits.tokensUsedToday} + ${messageTokens}`,
      lastUsedAt: new Date()
    })
    .where(eq(chatUsageLimits.id, usageLimitId));
};

// Authentication middleware with fallback for public chatting
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // Allow all chat endpoints to work even if not authenticated
  if (req.path.startsWith('/api/chat/')) {
    // For unauthenticated users, create a unique session-based guest ID
    if (!req.isAuthenticated()) {
      // Initialize session if not already initialized
      if (!req.session) {
        req.session = {} as any;
      }
      
      // Handle case when existing session has an invalid guest ID (outside integer range)
      if (req.session.guestUserId && (Math.abs(req.session.guestUserId) > 2000000000)) {
        // Reset the ID because the current one is too large for PostgreSQL integer range
        console.log('Resetting invalid guest ID:', req.session.guestUserId);
        req.session.guestUserId = undefined;
      }
      
      // Create unique guest user ID if not already created
      if (!req.session.guestUserId) {
        // Generate a unique negative ID to avoid conflicts with real user IDs
        // Use a smaller number within PostgreSQL integer range (-2,147,483,648 to 2,147,483,647)
        // We'll use a negative number in the range -100000 to -999999 to be safe
        const uniqueId = -(100000 + Math.floor(Math.random() * 900000));
        req.session.guestUserId = uniqueId;
        req.session.guestCreatedAt = new Date();
        console.log('Created new guest user ID:', uniqueId);
      }
      
      // Use the session-specific guest ID
      req.user = {
        id: req.session.guestUserId, // Unique session-based guest ID
        role: 'guest', // Guest role
        username: `guest-${Math.abs(req.session.guestUserId)}`,
        name: 'Guest User',
        email: `guest-${Math.abs(req.session.guestUserId)}@example.com`,
        isGuest: true
      };
    }
    return next();
  }
  
  // For other endpoints, require authentication as usual
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Get AI response based on user message and conversation history
const getAIResponse = async (message: string, conversationHistory: ChatMessage[] = [], userRole: string = 'client', entityId?: number) => {
  try {
    // Check if XAI API key is configured
    const XAI_API_KEY = process.env.XAI_API_KEY;
    
    console.log('Checking XAI_API_KEY:', XAI_API_KEY ? 'API key exists' : 'API key missing');
    
    if (!XAI_API_KEY) {
      return {
        success: false,
        message: "To receive personalized AI responses, please contact Wilcox Advisors to set up AI integration for your account.",
        tokenCount: 0
      };
    }

    // Format conversation history for the API request
    const messages = conversationHistory.map(msg => ({
      role: msg.role.toLowerCase(),
      content: msg.content
    }));

    // Create a system message based on user role to enforce privacy guardrails for clients
    let systemMessage = "";
    
    if (userRole === 'client') {
      systemMessage = `You are a financial assistant for Wilcox Advisors. When speaking with clients:
1. NEVER provide specific client financial data even if asked
2. NEVER disclose transaction details, account numbers, or balances
3. NEVER provide tax identification numbers, SSNs, or other sensitive information
4. If asked for specific financial details, politely suggest contacting their advisor instead
5. Focus on general financial advice, explanations of concepts, and educational information
6. You can discuss general financial principles, accounting terms, and industry best practices
7. NEVER provide actual numbers from financial statements even if they seem to know them
8. When asked about specific financial data, respond: "For security reasons, I cannot provide specific financial information via chat. Please contact your advisor for those details."
9. Do NOT make up financial figures or provide estimates of their financial data.`;
    } else {
      // For admins and employees, allow more data access but still maintain some guardrails
      systemMessage = `You are a financial assistant for Wilcox Advisors. When speaking with staff:
1. You can provide general analytics and insights
2. Be helpful with accounting and financial concepts
3. Do not share client data between different entities
4. Be accurate and concise in your responses`;
    }
    
    // Add system message at the beginning
    messages.unshift({
      role: "system",
      content: systemMessage
    });

    // Add current message
    messages.push({
      role: "user",
      content: message
    });
    
    // XAI specific implementation
    const API_URL = 'https://api.x.ai/v1/chat/completions';
    const model = 'grok-2-latest';  // Updated to use latest model
      
    const response = await axios.post(
      API_URL,
      {
        model: model,
        messages,
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const tokenCount = response.data.usage.total_tokens;

    return {
      success: true,
      message: aiResponse,
      tokenCount
    };
  } catch (error: any) {
    console.error('AI response error:', error);
    // Log detailed error information
    if (error?.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error?.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error?.message || 'Unknown error');
    }
    console.error('Error config:', error?.config);
    
    return {
      success: false,
      message: "I'm having trouble connecting to my knowledge base. Let me relay your message to a human advisor who can help you.",
      tokenCount: 0
    };
  }
};

export function registerChatRoutes(app: Express) {
  // Get user's conversations
  app.get('/api/chat/conversations', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    
    const conversations = await db.query.chatConversations.findMany({
      where: eq(chatConversations.userId, userId),
      orderBy: [desc(chatConversations.lastMessageAt)]
    });
    
    res.json(conversations);
  }));

  // Get messages for a conversation
  app.get('/api/chat/conversations/:id/messages', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const conversationId = parseInt(req.params.id);
    
    // Check if conversation belongs to the user
    const conversation = await db.query.chatConversations.findFirst({
      where: and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      )
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, conversationId),
      orderBy: [sql`${chatMessages.createdAt} asc`]
    });
    
    res.json(messages);
  }));

  // Send a new message
  app.post('/api/chat/send', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Always use the user ID from the authenticated user object
    // This will be a unique session-based ID for guest users after our middleware change
    const userId = (req.user as any).id;
    const userRole = (req.user as any).role || 'guest';
    const isGuest = (req.user as any).isGuest === true;
    const validation = validateMessageSchema(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error });
    }
    
    const { message, conversationId, entityId } = validation.data;
    
    // Check usage limits
    const usageStatus = await checkUsageLimits(userId, entityId || null);
    
    if (!usageStatus.canSendMessage) {
      return res.status(429).json({
        message: 'You have reached your daily message limit. Your limit will reset at midnight.',
        remainingMessages: 0
      });
    }
    
    let activeConversationId = conversationId;
    
    // Create a new conversation if not provided
    if (!activeConversationId) {
      const [newConversation] = await db.insert(chatConversations).values({
        userId,
        entityId: entityId || null,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        active: true
      }).returning();
      
      activeConversationId = newConversation.id;
    }
    
    // Get conversation history (last 10 messages) if using AI
    const conversationHistory = activeConversationId && conversationId 
      ? await db.query.chatMessages.findMany({
          where: eq(chatMessages.conversationId, activeConversationId),
          orderBy: [desc(chatMessages.createdAt)],
          limit: 10
        })
      : [];
    
    // Reverse to get chronological order for the AI
    conversationHistory.reverse();
    
    // Insert user message
    const userMessageTokens = countTokens(message);
    
    const [userMessage] = await db.insert(chatMessages).values({
      conversationId: activeConversationId,
      userId,
      role: ChatMessageRole.USER,
      content: message,
      tokenCount: userMessageTokens
    }).returning();
    
    // Update conversation's last message time and message count
    await db.update(chatConversations)
      .set({
        lastMessageAt: new Date(),
        totalMessages: sql`${chatConversations.totalMessages} + 1`
      })
      .where(eq(chatConversations.id, activeConversationId));
    
    // Update user's usage
    await updateUsage(usageStatus.usageLimit.id, userMessageTokens);
    
    // Get AI response with privacy guardrails based on user role
    const aiResponse = await getAIResponse(message, conversationHistory, userRole, entityId);
    
    // Check token limits for AI response
    if (aiResponse.tokenCount > 0 && !usageStatus.canUseTokens) {
      return res.status(429).json({
        message: 'You have reached your daily token limit. Your limit will reset at midnight.',
        userMessage,
        aiMessage: {
          content: "You've reached your daily usage limit for AI assistance. Please try again tomorrow or contact support for higher limits.",
          role: ChatMessageRole.ASSISTANT
        },
        conversationId: activeConversationId,
        remainingMessages: usageStatus.remainingMessages - 1,
        remainingTokens: 0
      });
    }
    
    // Insert AI response
    const [aiMessage] = await db.insert(chatMessages).values({
      conversationId: activeConversationId,
      userId: null,
      role: ChatMessageRole.ASSISTANT,
      content: aiResponse.message,
      tokenCount: aiResponse.tokenCount
    }).returning();
    
    // Update conversation's last message time and message count again
    await db.update(chatConversations)
      .set({
        lastMessageAt: new Date(),
        totalMessages: sql`${chatConversations.totalMessages} + 1`
      })
      .where(eq(chatConversations.id, activeConversationId));
    
    // Update usage for AI message if needed
    if (aiResponse.tokenCount > 0) {
      await updateUsage(usageStatus.usageLimit.id, aiResponse.tokenCount);
    }
    
    res.json({
      userMessage,
      aiMessage,
      conversationId: activeConversationId,
      remainingMessages: usageStatus.remainingMessages - 1,
      remainingTokens: Math.max(0, usageStatus.remainingTokens - userMessageTokens - aiResponse.tokenCount)
    });
  }));

  // Get user's chat usage status
  app.get('/api/chat/usage', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    // Use the user ID from the authenticated user object (unique for each guest session)
    const userId = (req.user as any).id;
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : null;
    const isGuest = (req.user as any).isGuest === true;
    
    const usageStatus = await checkUsageLimits(userId, entityId);
    
    // For guest users, return generous limits to ensure a good experience
    if (isGuest) {
      return res.json({
        remainingMessages: 10000,
        remainingTokens: 1000000,
        maxMessagesPerDay: 10000,
        maxTokensPerDay: 1000000
      });
    }
    
    res.json({
      remainingMessages: usageStatus.remainingMessages,
      remainingTokens: usageStatus.remainingTokens,
      maxMessagesPerDay: usageStatus.usageLimit.maxMessagesPerDay,
      maxTokensPerDay: usageStatus.usageLimit.maxTokensPerDay
    });
  }));

  // Delete a conversation
  app.delete('/api/chat/conversations/:id', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const conversationId = parseInt(req.params.id);
    
    // Check if conversation belongs to the user
    const conversation = await db.query.chatConversations.findFirst({
      where: and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      )
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Delete conversation (messages will cascade delete)
    await db.delete(chatConversations)
      .where(eq(chatConversations.id, conversationId));
    
    res.json({ success: true });
  }));
}