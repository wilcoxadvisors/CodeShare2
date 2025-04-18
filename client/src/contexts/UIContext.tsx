// src/contexts/UIContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Context interface
interface UIContextInterface {
  showConsultationForm: boolean;
  setShowConsultationForm: React.Dispatch<React.SetStateAction<boolean>>;
  showLoginModal: boolean;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create the context with a default value
const UIContext = createContext<UIContextInterface | null>(null);

// Provider component
export function UIProvider({ children }: { children: ReactNode }) {
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Value object to be provided to consumers
  const value: UIContextInterface = {
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