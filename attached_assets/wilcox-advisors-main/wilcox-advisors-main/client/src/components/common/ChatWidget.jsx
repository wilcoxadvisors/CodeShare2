// src/components/common/ChatWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';

export default function ChatWidget({ isOpen, setIsOpen }) {
  const [chatMessages, setChatMessages] = useState([
    { text: "Hi there! How can I help with your financial needs today?", sender: 'ai' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMessage = { text: chatInput, sender: 'user' };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/chat`, { message: chatInput }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setChatMessages(prev => [...prev, { text: response.data.reply, sender: 'ai' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { text: 'Sorry, something went wrong.', sender: 'ai' }]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button onClick={() => setIsOpen(!isOpen)} className="bg-blue-800 text-white p-3 rounded-full shadow-lg hover:bg-blue-900 transition duration-200">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h8m-4-4v8m9 4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold text-blue-800">Chat with Us</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <div ref={chatRef} className="h-64 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`p-2 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="border-t p-4 flex">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ask us anything..."
            />
            <button type="submit" className="bg-blue-800 text-white px-4 py-2 rounded-r-md hover:bg-blue-900 transition duration-200">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
