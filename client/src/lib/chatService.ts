import axios from 'axios';

// Define ChatMessageRole enum locally
export enum ChatMessageRole {
  USER = "user",
  ASSISTANT = "assistant"
}

export interface ChatConversation {
  id: number;
  userId: number;
  entityId: number | null;
  title: string;
  lastMessageAt: string;
  totalMessages: number;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  userId: number | null;
  role: ChatMessageRole;
  content: string;
  tokenCount: number;
  createdAt: string;
}

export interface ChatUsage {
  remainingMessages: number;
  remainingTokens: number;
  maxMessagesPerDay: number;
  maxTokensPerDay: number;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
  conversationId: number;
  remainingMessages: number;
  remainingTokens: number;
}

class ChatService {
  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<ChatConversation[]> {
    try {
      const response = await axios.get('/api/chat/conversations');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Get all messages for a specific conversation
   */
  async getMessages(conversationId: number): Promise<ChatMessage[]> {
    try {
      const response = await axios.get(`/api/chat/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      return [];
    }
  }

  /**
   * Send a new message to get an AI response
   */
  async sendMessage(
    message: string,
    conversationId?: number,
    entityId?: number
  ): Promise<SendMessageResponse> {
    try {
      const payload: any = { message };
      if (conversationId) payload.conversationId = conversationId;
      if (entityId) payload.entityId = entityId;

      const response = await axios.post('/api/chat/send', payload);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Handle rate limiting
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new Error(error.response.data.message || 'You have reached your usage limit. Please try again later.');
      }
      
      throw new Error('Failed to send message. Please try again later.');
    }
  }

  /**
   * Get current chat usage status
   */
  async getUsageStatus(entityId?: number): Promise<ChatUsage> {
    try {
      const url = entityId ? `/api/chat/usage?entityId=${entityId}` : '/api/chat/usage';
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat usage status:', error);
      return {
        remainingMessages: 0,
        remainingTokens: 0,
        maxMessagesPerDay: 0,
        maxTokensPerDay: 0
      };
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: number): Promise<boolean> {
    try {
      await axios.delete(`/api/chat/conversations/${conversationId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting conversation ${conversationId}:`, error);
      return false;
    }
  }
}

// Create a singleton instance
const chatService = new ChatService();
export default chatService;