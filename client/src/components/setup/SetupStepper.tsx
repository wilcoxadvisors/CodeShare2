import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import ClientSetupCard from "./ClientSetupCard";
import EntityManagementCard from "./EntityManagementCard";
import SetupSummaryCard from "./SetupSummaryCard";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Step configuration for the setup process
 */
const SETUP_STEPS = [
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

interface SetupStepperProps {
  onComplete?: () => void;
}

// Define proper types for our data
interface ClientData {
  name: string;
  legalName: string;
  taxId?: string;
  industry: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
}

interface Entity {
  id: number;
  name: string;
  legalName: string;
  taxId?: string;
  entityType: string;
  industry: string;
  address?: string;
  phone?: string;
  email?: string;
  code?: string;
  clientId?: number;
  ownerId?: number;
  active?: boolean;
  isActive?: boolean;
}

/**
 * Setup stepper component that guides users through the onboarding process
 */
export default function SetupStepper({ onComplete }: SetupStepperProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // REFACTORED: Centralize state management in SetupStepper
  // Initialize activeStep to 0 (client information step)
  const [activeStep, setActiveStep] = useState(0);
  console.log("DEBUG SetupStepper: Initializing activeStep state to 0");
  
  // Initialize clientData and setupEntities states
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [setupEntities, setSetupEntities] = useState<Entity[]>([]);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // Load initial data from session storage on component mount
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem('setupData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log("DEBUG SetupStepper: Loading data from session storage:", parsedData);
        
        // Only set clientData if it exists and has required fields
        if (parsedData.clientData && parsedData.clientData.name && parsedData.clientData.legalName) {
          setClientData(parsedData.clientData);
        }
        
        // Only set entityData if it's a non-empty array
        if (Array.isArray(parsedData.entityData) && parsedData.entityData.length > 0) {
          setSetupEntities(parsedData.entityData);
        }
        
        // Don't restore step from storage - always start at step 0
      }
    } catch (error) {
      console.error("Failed to load setup data from sessionStorage:", error);
    }
  }, []);
  
  // Save data to session storage whenever it changes
  const saveToSessionStorage = useCallback(() => {
    try {
      const stepId = SETUP_STEPS[activeStep]?.id || "client";
      const dataToSave = {
        currentStep: stepId,
        clientData,
        entityData: setupEntities
      };
      sessionStorage.setItem('setupData', JSON.stringify(dataToSave));
      console.log("DEBUG SetupStepper: Saved data to sessionStorage:", dataToSave);
    } catch (error) {
      console.error("DEBUG SetupStepper: Failed to save to sessionStorage:", error);
    }
  }, [activeStep, clientData, setupEntities]);
  
  // Save state changes to session storage
  useEffect(() => {
    saveToSessionStorage();
  }, [activeStep, clientData, setupEntities, saveToSessionStorage]);
  
  // Create stable callback functions with useCallback
  const handleClientSave = useCallback((data: ClientData) => {
    console.log("DEBUG SetupStepper: handleClientSave received:", data);
    setClientData(data);
    
    // Move to step 2 (entities)
    console.log("DEBUG SetupStepper: Setting activeStep to 1");
    setActiveStep(1);
  }, [setClientData, setActiveStep]);
  
  const handleEntityAdd = useCallback((newEntity: Entity) => {
    console.log("DEBUG SetupStepper: handleEntityAdd received:", newEntity);
    setSetupEntities(prev => [...prev, newEntity]);
  }, [setSetupEntities]);
  
  const handleEntityDelete = useCallback((entityId: number) => {
    console.log("DEBUG SetupStepper: handleEntityDelete called for ID:", entityId);
    setSetupEntities(prev => prev.filter(e => e.id !== entityId));
  }, [setSetupEntities]);
  
  const handleBack = useCallback(() => {
    console.log(`DEBUG SetupStepper: handleBack called. Current: ${activeStep}. Going to ${activeStep - 1}`);
    setActiveStep(prev => Math.max(0, prev - 1));
  }, [activeStep, setActiveStep]);
  
  const handleNextFromEntities = useCallback(() => {
    console.log(`DEBUG SetupStepper: handleNextFromEntities called. Current: ${activeStep}. Entities count: ${setupEntities.length}`);
    if (setupEntities.length === 0) {
      console.warn("DEBUG SetupStepper: Blocked navigation - No entities added.");
      toast({
        title: "Cannot proceed",
        description: "Please add at least one entity before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    const nextStep = activeStep + 1;
    console.log(`DEBUG SetupStepper: Setting activeStep to ${nextStep}`);
    setActiveStep(nextStep);
  }, [activeStep, setupEntities, toast]);
  
  // CRITICAL FIX 5.0: Enhanced completion with better data handling
  useEffect(() => {
    if (setupComplete) {
      console.log("COMPLETION: Setup process complete, handling final steps");
      
      // Instead of immediately removing, get the data one last time 
      // in case we need to recover it
      try {
        const finalData = sessionStorage.getItem('setupData');
        if (finalData) {
          // Store it in localStorage as a backup for recovery if needed
          localStorage.setItem('lastCompletedSetup', finalData);
          console.log("COMPLETION: Backed up final setup data to localStorage for recovery if needed");
        }
      } catch (error) {
        console.error("COMPLETION: Failed to backup setup data:", error);
      }
      
      // Now clear the session storage
      try {
        console.log("COMPLETION: Clearing setup data from sessionStorage");
        sessionStorage.removeItem('setupData');
      } catch (error) {
        console.error("COMPLETION: Failed to clear sessionStorage:", error);
      }
      
      // Finally call the completion callback
      if (onComplete) {
        console.log("COMPLETION: Calling onComplete callback");
        onComplete();
      }
    }
  }, [setupComplete, onComplete]);
  
  // Add better debugging for all state changes
  useEffect(() => {
    const stepId = SETUP_STEPS[activeStep]?.id || "unknown";
    console.log(`DEBUG: activeStep is now: ${activeStep} (${stepId})`);
  }, [activeStep]);
  
  useEffect(() => {
    console.log(`DEBUG: clientData: ${clientData ? 'exists' : 'null'}`);
    if (clientData) {
      console.log("DEBUG: clientData fields:", Object.keys(clientData).join(", "));
    }
  }, [clientData]);
  
  // Add a useEffect to track setupEntities changes specifically
  useEffect(() => {
    console.log(`DEBUG: setupEntities: ${setupEntities ? `array with ${setupEntities.length} items` : 'null/undefined'}`);
    if (setupEntities && setupEntities.length > 0) {
      console.log("DEBUG: First entity ID:", setupEntities[0].id);
    }
  }, [setupEntities]);
  
  // Create a stable handler for finishing setup
  const handleCompleteSetup = useCallback(() => {
    // Before completing, verify data once more and log final state
    console.log("DEBUG SetupStepper: Setup complete triggered with:");
    console.log("DEBUG SetupStepper: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
    console.log("DEBUG SetupStepper: setupEntities:", setupEntities ? setupEntities.length : 'null', "entities");
    
    // Force one more sync to session storage before completion
    try {
      // This ensures if there's a redirect/refresh during the completion process,
      // we still have the latest state
      const finalState = {
        clientData,
        entityData: setupEntities,
        currentStep: SETUP_STEPS[2].id, // Keep at summary step
        setupCompleting: true // Flag to indicate we're in completion process
      };
      
      // Save to session storage
      sessionStorage.setItem('setupData', JSON.stringify(finalState));
      console.log("DEBUG SetupStepper: Saved final state to session storage");
    } catch (error) {
      console.error("DEBUG SetupStepper: Failed to save final state to session storage:", error);
      // Continue anyway since we're going to clear it soon
    }
    
    // Complete the setup and close the dialog
    setSetupComplete(true);
  }, [clientData, setupEntities]);
  
  return (
    <div className="my-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Account Setup</CardTitle>
          <CardDescription>
            Complete these steps to set up your account and start using the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step indicators */}
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4">
              {SETUP_STEPS.map((step, index) => (
                <div 
                  key={step.id} 
                  className="flex flex-col items-center relative"
                >
                  {/* Step connector line */}
                  {index < SETUP_STEPS.length - 1 && (
                    <div 
                      className={`absolute w-full h-0.5 top-3 left-1/2 -z-10 ${
                        index < activeStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                  
                  {/* Step indicator */}
                  <div 
                    className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                      index < activeStep
                        ? "border-primary bg-primary text-primary-foreground"
                        : index === activeStep
                        ? "border-primary text-primary"
                        : "border-muted bg-background text-muted-foreground"
                    }`}
                  >
                    {index < activeStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  
                  {/* Step label */}
                  <div 
                    className={`mt-2 text-sm font-medium text-center ${
                      index === activeStep ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Current step description */}
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {SETUP_STEPS[activeStep]?.description}
              </p>
            </div>
          </div>
          
          {/* Current step content */}
          <div className="mt-8">
            {activeStep === 0 && (
              <ClientSetupCard 
                onNext={handleClientSave} 
                setClientData={setClientData}
                initialData={clientData || undefined}
              />
            )}
            
            {activeStep === 1 && (
              <EntityManagementCard 
                onNext={handleNextFromEntities}
                onBack={handleBack}
                clientData={clientData}
                onEntityAdded={handleEntityAdd}
                onEntityDeleted={handleEntityDelete}
                entities={setupEntities}
              />
            )}
            
            {activeStep === 2 && (
              <SetupSummaryCard
                clientData={clientData}
                entityData={setupEntities}
                onBack={handleBack}
                onFinish={handleCompleteSetup}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}