// src/contexts/UIContext.js
import React, { createContext, useContext, useState } from 'react';

// Create the context
const UIContext = createContext(null);

// Provider component
export function UIProvider({ children }) {
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Value object to be provided to consumers
  const value = {
    showConsultationForm,
    setShowConsultationForm,
    showLoginModal,
    setShowLoginModal,
    isChatOpen,
    setIsChatOpen
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// Custom hook to use the UI context
export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
