// src/components/dashboard/ClientChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function ClientChat({ messages, setMessages }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const userMessage = { text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/client/chat`, 
        { message: inputText }, 
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMessages(prev => [...prev, { text: response.data.reply, sender: 'ai' }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: 'For detailed advice, schedule a consultation!', sender: 'ai' }]);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Chat with Us</h3>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition duration-200"
      >
        {isOpen ? 'Close Chat' : 'Open Chat'}
      </button>
      
      {isOpen && (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg shadow-sm">
          <div ref={chatRef} className="h-64 overflow-y-auto space-y-3 mb-4">
            {messages.map((msg, index) => (
              <div key={index} className={`p-2 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ask a question..."
            />
            <button 
              type="submit" 
              className="bg-blue-800 text-white px-4 py-2 rounded-r-md hover:bg-blue-900 transition duration-200"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
