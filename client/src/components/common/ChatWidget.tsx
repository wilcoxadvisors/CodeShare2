import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import chatService, { 
  ChatMessage as ChatMessageType, 
  ChatConversation,
  SendMessageResponse,
  ChatMessageRole
} from '../../lib/chatService';
import { Loader2, Send, XCircle, User, Bot } from 'lucide-react';

interface FormattedChatMessage {
  id: number;
  isUser: boolean;
  text: string;
  timestamp: Date;
  role: ChatMessageRole;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: number;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose, entityId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<FormattedChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [usageStats, setUsageStats] = useState({ 
    remainingMessages: 0, 
    maxMessagesPerDay: 0,
    remainingTokens: 0,
    maxTokensPerDay: 0 
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Load conversations on open - allow guest users too
  useEffect(() => {
    if (isOpen) {
      // For authenticated users, load conversations
      if (user) {
        loadConversations();
      }
      
      // For everyone, load usage stats and show welcome message
      loadUsageStats();
      
      // If no messages are loaded yet, show welcome message
      if (messages.length === 0) {
        setMessages([
          {
            id: 0,
            isUser: false,
            text: 'Hi there! How can I help with your financial needs today?',
            timestamp: new Date(),
            role: ChatMessageRole.ASSISTANT
          }
        ]);
      }
    }
  }, [isOpen, user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      // Check if conversation exists in the list before trying to load messages
      const conversationExists = conversations.some(convo => convo.id === activeConversation);
      
      if (conversationExists) {
        loadMessages(activeConversation);
      } else {
        // If conversation doesn't exist (might have been deleted), start new conversation
        startNewConversation();
      }
    } else if (conversations.length > 0) {
      // Set first conversation as active if available
      setActiveConversation(conversations[0].id);
    } else {
      // Clear messages if no conversation is active
      setMessages([
        {
          id: 0,
          isUser: false,
          text: 'Hi there! How can I help with your financial needs today?',
          timestamp: new Date(),
          role: ChatMessageRole.ASSISTANT
        }
      ]);
    }
  }, [activeConversation, conversations]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const convos = await chatService.getConversations();
      setConversations(convos);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      setIsLoading(true);
      const chatMessages = await chatService.getMessages(conversationId);
      
      // Format messages for display
      const formattedMessages: FormattedChatMessage[] = chatMessages.map(msg => ({
        id: msg.id,
        isUser: msg.role === ChatMessageRole.USER,
        text: msg.content,
        timestamp: new Date(msg.createdAt),
        role: msg.role
      }));
      
      setMessages(formattedMessages);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setIsLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await chatService.getUsageStatus(entityId);
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // Set default generous limits for users when we can't load stats
      setUsageStats({
        remainingMessages: 1000,
        remainingTokens: 100000,
        maxMessagesPerDay: 1000,
        maxTokensPerDay: 100000
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const sendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    
    // Add user message to chat immediately for better UX
    const userMessage: FormattedChatMessage = {
      id: -1, // Temporary ID
      isUser: true,
      text: inputValue.trim(),
      timestamp: new Date(),
      role: ChatMessageRole.USER
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);
    
    try {
      // Send message to server
      const response: SendMessageResponse = await chatService.sendMessage(
        userMessage.text, 
        activeConversation || undefined,
        entityId
      );
      
      // Replace temporary message with actual one from server
      const updatedUserMessage: FormattedChatMessage = {
        id: response.userMessage.id,
        isUser: true,
        text: response.userMessage.content,
        timestamp: new Date(response.userMessage.createdAt),
        role: ChatMessageRole.USER
      };
      
      // Add AI response
      const aiMessage: FormattedChatMessage = {
        id: response.aiMessage.id,
        isUser: false,
        text: response.aiMessage.content,
        timestamp: new Date(response.aiMessage.createdAt),
        role: ChatMessageRole.ASSISTANT
      };
      
      // Update messages
      setMessages(prev => [
        ...prev.filter(m => m.id !== -1), // Remove temporary message
        updatedUserMessage,
        aiMessage
      ]);
      
      // Update active conversation if this is a new conversation
      if (!activeConversation) {
        setActiveConversation(response.conversationId);
        // Refresh conversations list
        loadConversations();
      }
      
      // Update usage stats
      setUsageStats(prev => ({
        ...prev,
        remainingMessages: response.remainingMessages,
        remainingTokens: response.remainingTokens
      }));
      
      setIsSending(false);
    } catch (error) {
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Remove the temporary message
      setMessages(prev => prev.filter(m => m.id !== -1));
      setIsSending(false);
    }
  };
  
  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([
      {
        id: 0,
        isUser: false,
        text: 'Hi there! How can I help with your financial needs today?',
        timestamp: new Date(),
        role: ChatMessageRole.ASSISTANT
      }
    ]);
  };
  
  const selectConversation = (id: number) => {
    setActiveConversation(id);
  };
  
  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await chatService.deleteConversation(id);
      
      // If the deleted conversation is the active one, start a new conversation
      if (id === activeConversation) {
        startNewConversation();
      }
      
      // Refresh conversation list
      loadConversations();
      
      toast({
        title: 'Success',
        description: 'Conversation deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation.',
        variant: 'destructive'
      });
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl md:w-96 w-80 z-50 overflow-hidden border border-gray-200 flex flex-col" style={{ height: '80vh', maxHeight: '600px' }}>
      <div className="bg-blue-800 text-white p-4 flex justify-between items-center">
        <h3 className="font-semibold">Wilcox AI Assistant</h3>
        <button 
          onClick={onClose} 
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close chat"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`mb-4 ${message.isUser ? 'text-right' : ''}`}
              >
                <div
                  className={`${
                    message.isUser
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-800'
                  } inline-block p-3 rounded-lg max-w-[80%]`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.isUser ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="text-xs font-semibold">
                      {message.isUser ? 'You' : 'Wilcox AI'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <div className="p-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500 px-2">
          <div>
            {usageStats.remainingMessages}/{usageStats.maxMessagesPerDay} messages left today
          </div>
          <button 
            onClick={startNewConversation} 
            className="text-blue-600 hover:text-blue-800"
          >
            {user ? 'New Chat' : 'Reset Chat'}
          </button>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isSending || isLoading}
            className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={isSending || isLoading || !inputValue.trim()}
            className={`bg-blue-800 text-white p-2 rounded-r-lg ${
              (isSending || isLoading || !inputValue.trim()) ? 'opacity-70' : 'hover:bg-blue-900'
            } transition-colors`}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      {/* Conversation sidebar for medium screens and up - only for authenticated users */}
      {user && conversations.length > 0 && (
        <div className="hidden md:block border-l border-gray-200 w-1/3 absolute right-0 top-14 bottom-16 bg-gray-50 overflow-y-auto">
          <div className="p-2">
            <h4 className="font-semibold text-sm px-2 py-1">Conversations</h4>
            <ul className="space-y-1">
              {conversations.map((convo) => (
                <li 
                  key={convo.id}
                  className={`flex justify-between items-center p-2 rounded text-sm cursor-pointer ${
                    activeConversation === convo.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => selectConversation(convo.id)}
                >
                  <div className="truncate flex-1">
                    {convo.title || 'New conversation'}
                  </div>
                  <button 
                    onClick={(e) => deleteConversation(convo.id, e)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;