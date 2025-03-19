import React, { useState, useRef, useEffect } from 'react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'bot', 
      text: 'Hi there! 👋 How can the Wilcox Advisors team help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (inputValue.trim() === '') return;
    
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'bot',
        text: botResponse,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1500);
  };
  
  const generateBotResponse = (userMessage) => {
    const lowercaseMessage = userMessage.toLowerCase();
    
    if (lowercaseMessage.includes('pricing') || lowercaseMessage.includes('cost') || lowercaseMessage.includes('fee')) {
      return "Our pricing depends on the specific services you need. We offer customized packages for businesses of all sizes. Would you like to schedule a free consultation to discuss your needs?";
    } else if (lowercaseMessage.includes('tax') || lowercaseMessage.includes('taxes')) {
      return "We offer comprehensive tax planning and preparation services for businesses and individuals. Our tax experts can help minimize your tax liability while ensuring compliance with all regulations.";
    } else if (lowercaseMessage.includes('bookkeeping') || lowercaseMessage.includes('accounting')) {
      return "Our bookkeeping services include monthly financial statements, accounts payable/receivable management, bank reconciliations, and more. We can tailor our services to your specific needs.";
    } else if (lowercaseMessage.includes('consultation') || lowercaseMessage.includes('meeting') || lowercaseMessage.includes('appointment')) {
      return "We'd be happy to schedule a consultation with you! Please call us at (555) 123-4567 or fill out the contact form on this page, and we'll reach out to arrange a meeting.";
    } else if (lowercaseMessage.includes('hello') || lowercaseMessage.includes('hi') || lowercaseMessage.includes('hey')) {
      return "Hello! Thanks for reaching out. How can we assist you with your financial or accounting needs today?";
    } else {
      return "Thank you for your message. To better assist you, would you like to speak with a member of our team? You can schedule a call or fill out our contact form, and we'll get back to you promptly.";
    }
  };
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Format timestamp
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Chat button */}
      <button
        onClick={toggleChat}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg focus:outline-none transition-all duration-300 ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-800 hover:bg-blue-700'
        }`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
          {/* Chat header */}
          <div className="bg-blue-800 text-white p-4">
            <h3 className="font-bold">Wilcox Advisors Support</h3>
            <p className="text-sm text-blue-100">We typically reply within a few minutes</p>
          </div>
          
          {/* Messages container */}
          <div className="flex-1 p-4 overflow-y-auto max-h-72">
            {messages.map(message => (
              <div 
                key={message.id}
                className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white mr-2 flex-shrink-0">
                    <span className="text-xs font-bold">WA</span>
                  </div>
                )}
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <span className={`text-xs mt-1 block ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white mr-2 flex-shrink-0">
                  <span className="text-xs font-bold">WA</span>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input form */}
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-800 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors"
                disabled={inputValue.trim() === ''}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;