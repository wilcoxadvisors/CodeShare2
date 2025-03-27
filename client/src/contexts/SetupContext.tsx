import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the shape of our context
interface SetupContextType {
  // Step tracking
  currentStep: string;
  setCurrentStep: (step: string) => void;
  
  // Client data
  clientData: any | null;
  setClientData: (data: any) => void;
  
  // Entity data
  entityData: any[];
  setEntityData: (data: any[]) => void;
  
  // Utility functions
  handleClientDataSaved: (data: any) => void;
  handleEntityDataSaved: (entities: any[]) => void;
  handleBack: () => void;
  setupComplete: boolean;
  setSetupComplete: (complete: boolean) => void;
}

// Steps definition
export const SETUP_STEPS = [
  {
    id: "client",
    title: "Client Information",
    description: "Set up your company profile"
  },
  {
    id: "entities",
    title: "Entities",
    description: "Add your business entities"
  },
  {
    id: "summary",
    title: "Summary & Finalize",
    description: "Review and complete setup"
  }
];

// Create the context with default values
const SetupContext = createContext<SetupContextType>({
  currentStep: 'client',
  setCurrentStep: () => {},
  clientData: null,
  setClientData: () => {},
  entityData: [],
  setEntityData: () => {},
  handleClientDataSaved: () => {},
  handleEntityDataSaved: () => {},
  handleBack: () => {},
  setupComplete: false,
  setSetupComplete: () => {}
});

// Create a provider component
export const SetupProvider: React.FC<{children: React.ReactNode, onComplete?: () => void}> = ({ 
  children,
  onComplete
}) => {
  // Step state
  const [currentStep, setCurrentStep] = useState<string>("client");
  const [clientData, setClientData] = useState<any>(null);
  const [entityData, setEntityData] = useState<any[]>([]);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // Debug: Log state changes
  useEffect(() => {
    console.log(`DEBUG: SetupContext currentStep changed to: ${currentStep}`);
  }, [currentStep]);
  
  useEffect(() => {
    console.log(`DEBUG: SetupContext clientData: ${clientData ? 'exists' : 'null'}`);
  }, [clientData]);
  
  useEffect(() => {
    console.log(`DEBUG: SetupContext entityData: ${entityData.length} entities`);
  }, [entityData]);
  
  // Calculate current step index
  const getCurrentStepIndex = () => SETUP_STEPS.findIndex(step => step.id === currentStep);
  
  // Handle client data submission
  const handleClientDataSaved = (data: any) => {
    console.log(`DEBUG: SetupContext handleClientDataSaved with data:`, data);
    
    // Set client data first
    setClientData(data);
    
    // Then set current step to entities
    console.log(`DEBUG: SetupContext advancing to entities step`);
    setCurrentStep("entities");
  };
  
  // Handle entity data submission
  const handleEntityDataSaved = (entities: any[]) => {
    console.log(`DEBUG: SetupContext handleEntityDataSaved with ${entities.length} entities`);
    
    // Set entity data first
    setEntityData(entities);
    
    // Then set current step to summary
    console.log(`DEBUG: SetupContext advancing to summary step`);
    setCurrentStep("summary");
  };
  
  // Handle back navigation
  const handleBack = () => {
    const currentStepIndex = getCurrentStepIndex();
    console.log(`DEBUG: SetupContext handleBack from step ${currentStep} (index ${currentStepIndex})`);
    
    if (currentStepIndex > 0) {
      const prevStepId = SETUP_STEPS[currentStepIndex - 1].id;
      console.log(`DEBUG: SetupContext going back to ${prevStepId}`);
      setCurrentStep(prevStepId);
    }
  };
  
  // Call onComplete callback when setup is completed
  useEffect(() => {
    if (setupComplete && onComplete) {
      console.log(`DEBUG: SetupContext setup completed, calling onComplete`);
      onComplete();
    }
  }, [setupComplete, onComplete]);
  
  const value = {
    currentStep,
    setCurrentStep,
    clientData,
    setClientData,
    entityData,
    setEntityData,
    handleClientDataSaved,
    handleEntityDataSaved,
    handleBack,
    setupComplete,
    setSetupComplete
  };
  
  return (
    <SetupContext.Provider value={value}>
      {children}
    </SetupContext.Provider>
  );
};

// Create a custom hook to use the context
export const useSetup = () => {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
};

export default SetupContext;