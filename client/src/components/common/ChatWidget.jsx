import React, { useState } from 'react';

const ChatWidget = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { 
      sender: 'bot', 
      text: 'Hello! I\'m the Wilcox Advisors virtual assistant. How can I help you with your financial needs today?' 
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message to chat
    setChatHistory([
      ...chatHistory,
      { sender: 'user', text: message }
    ]);
    
    // Clear input
    setMessage('');
    
    // Simulate bot response (would be replaced with actual API call)
    setTimeout(() => {
      setChatHistory(prevChat => [
        ...prevChat,
        { 
          sender: 'bot', 
          text: "Thank you for your message. Our team will get back to you shortly. If you'd like to speak with someone directly, please call us at (555) 123-4567."
        }
      ]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl w-80 z-50">
      <div className="bg-[#1E3A8A] text-white p-4 rounded-t-lg flex justify-between items-center">
        <h3 className="font-medium">Chat with Us</h3>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 h-80 overflow-y-auto border-b">
        {chatHistory.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`p-3 rounded-lg inline-block max-w-[80%] ${
                msg.sender === 'user' 
                  ? 'bg-[#1E3A8A] text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..." 
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          />
          <button 
            onClick={handleSendMessage}
            className="ml-2 bg-[#1E3A8A] text-white p-2 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;