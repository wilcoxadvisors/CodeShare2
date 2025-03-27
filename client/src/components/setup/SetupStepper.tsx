import { useState, useEffect, useRef } from "react";
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
 * Including only the three essential steps
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

// CRITICAL FIX: Storage keys for localStorage persistence
const STORAGE_KEYS = {
  CURRENT_STEP: "setup_current_step",
  CLIENT_DATA: "setup_client_data",
  ENTITY_DATA: "setup_entity_data"
};

/**
 * Setup stepper component that guides users through the onboarding process
 */
export default function SetupStepper({ onComplete }: SetupStepperProps) {
  // CRITICAL DEBUG: Tracking component instance ID to detect remounting
  const instanceId = useRef<string>(`setup-${Math.random().toString(36).substr(2, 9)}`);
  console.log(`DEBUG: SetupStepper INITIALIZING - instance ${instanceId.current}`);

  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize state either from localStorage or with defaults
  const [currentStep, setCurrentStep] = useState<string>(() => {
    try {
      const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      console.log(`DEBUG: Retrieved saved step from localStorage: ${savedStep}`);
      return savedStep || "client";
    } catch (error) {
      console.error("Failed to retrieve step from localStorage:", error);
      return "client";
    }
  });
  
  const [clientData, setClientData] = useState<any>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEYS.CLIENT_DATA);
      console.log(`DEBUG: Retrieved saved client data from localStorage: ${savedData ? "exists" : "none"}`);
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error("Failed to retrieve client data from localStorage:", error);
      return null;
    }
  });
  
  const [entityData, setEntityData] = useState<any[]>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEYS.ENTITY_DATA);
      console.log(`DEBUG: Retrieved saved entity data from localStorage: ${savedData ? "exists" : "none"}`);
      return savedData ? JSON.parse(savedData) : [];
    } catch (error) {
      console.error("Failed to retrieve entity data from localStorage:", error);
      return [];
    }
  });
  
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // CRITICAL FIX: Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      console.log(`DEBUG: Persisting current step to localStorage: ${currentStep}`);
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep);
    } catch (error) {
      console.error("Failed to save current step to localStorage:", error);
    }
  }, [currentStep]);
  
  useEffect(() => {
    if (clientData) {
      try {
        console.log(`DEBUG: Persisting client data to localStorage`);
        localStorage.setItem(STORAGE_KEYS.CLIENT_DATA, JSON.stringify(clientData));
      } catch (error) {
        console.error("Failed to save client data to localStorage:", error);
      }
    }
  }, [clientData]);
  
  useEffect(() => {
    if (entityData.length > 0) {
      try {
        console.log(`DEBUG: Persisting entity data to localStorage: ${entityData.length} entities`);
        localStorage.setItem(STORAGE_KEYS.ENTITY_DATA, JSON.stringify(entityData));
      } catch (error) {
        console.error("Failed to save entity data to localStorage:", error);
      }
    }
  }, [entityData]);
  
  // Initialize state only once when component is mounted
  useEffect(() => {
    // Track mounting/unmounting for debugging
    console.log(`DEBUG: SetupStepper MOUNTED - instance ${instanceId.current}`);
    
    // Check for inconsistent state and ensure step is set correctly
    if (clientData && currentStep === "client") {
      console.log(`DEBUG: Found client data but step is still 'client', updating to 'entities'`);
      setCurrentStep("entities");
    }
    
    // Return cleanup function to track unmounting
    return () => {
      console.log(`DEBUG: SetupStepper UNMOUNTING - instance ${instanceId.current}`);
    };
  }, []);
  
  // Calculate current step index
  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep);
  
  // Handler to move to the next step
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    console.log("handleNext called - current step:", currentStep, "currentStepIndex:", currentStepIndex, "nextIndex:", nextIndex);
    if (nextIndex < SETUP_STEPS.length) {
      const nextStepId = SETUP_STEPS[nextIndex].id;
      console.log(`Moving to next step: ${nextStepId}`);
      setCurrentStep(nextStepId);
    } else {
      console.log("At final step, setting setupComplete");
      setSetupComplete(true);
    }
  };
  
  // Handler to move to the previous step
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    console.log("handleBack called - current step:", currentStep, "currentStepIndex:", currentStepIndex, "prevIndex:", prevIndex);
    if (prevIndex >= 0) {
      const prevStepId = SETUP_STEPS[prevIndex].id;
      console.log(`Moving to previous step: ${prevStepId}`);
      
      // IMPORTANT: Keep the entityData when navigating back from summary to entities
      // or from entities to client
      console.log(`Preserving entity data when going back: ${entityData.length} entities`);
      
      // Just change the step without clearing entity data
      setCurrentStep(prevStepId);
    } else {
      console.log("Already at first step, can't go back");
    }
  };
  
  // Handle client data from ClientSetupCard 
  const handleClientDataSaved = (data: any) => {
    console.log(`DEBUG: Parent (instance ${instanceId.current}) handleClientDataSaved received:`, data);
    console.log(`DEBUG: Parent current step BEFORE update: ${currentStep}`);
    
    try {
      // CRITICAL FIX: Immediately save to localStorage before any state updates
      // This ensures we don't lose data if a remount happens during state updates
      localStorage.setItem(STORAGE_KEYS.CLIENT_DATA, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "entities");
      console.log(`DEBUG: Saved client data and step='entities' directly to localStorage`);
      
      // Now update React state
      console.log(`DEBUG: Updating React state for clientData and currentStep`);
      setClientData(data);
      setCurrentStep("entities");
    } catch (error) {
      console.error(`DEBUG: Error in handleClientDataSaved:`, error);
    }
  };
  
  // Handle entity data from EntityManagementCard
  const handleEntityDataSaved = (entities: any[]) => {
    console.log("🔷 handleEntityDataSaved called with entities:", entities);
    
    try {
      // CRITICAL FIX: Immediately save to localStorage before any state updates
      localStorage.setItem(STORAGE_KEYS.ENTITY_DATA, JSON.stringify(entities));
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "summary");
      console.log(`DEBUG: Saved entity data and step='summary' directly to localStorage`);
      
      // Now update React state
      setEntityData(entities);
      setCurrentStep("summary");
      console.log("🔷 Updated React state: entityData and currentStep='summary'");
    } catch (error) {
      console.error(`DEBUG: Error in handleEntityDataSaved:`, error);
    }
  };
  
  // When client data changes, run verification to ensure consistency
  useEffect(() => {
    console.log("DEBUG: State change detected - currentStep:", currentStep, "clientData:", !!clientData);
    
    // Ensure we're on the correct step based on data availability
    if (clientData && currentStep === "client") {
      console.log("DEBUG: Inconsistent state detected - have client data but on client step");
      setCurrentStep("entities");
    }
  }, [clientData, currentStep]);
  
  // Final component cleanup on unmount - consider removing localStorage data on complete
  useEffect(() => {
    return () => {
      if (setupComplete) {
        console.log("DEBUG: Setup complete, clearing localStorage data");
        localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
        localStorage.removeItem(STORAGE_KEYS.ENTITY_DATA);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
      }
    };
  }, [setupComplete]);
  
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
                        index < currentStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                  
                  {/* Step indicator */}
                  <div 
                    className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                      index < currentStepIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : index === currentStepIndex
                        ? "border-primary text-primary"
                        : "border-muted bg-background text-muted-foreground"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  
                  {/* Step label */}
                  <div 
                    className={`mt-2 text-sm font-medium text-center ${
                      index === currentStepIndex ? "text-primary" : "text-muted-foreground"
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
                {SETUP_STEPS[currentStepIndex]?.description}
              </p>
            </div>
          </div>
          
          {/* Current step content */}
          <div className="mt-8">
            {currentStep === "client" && (
              <ClientSetupCard 
                onNext={handleClientDataSaved} 
                setClientData={setClientData}
                initialData={clientData}
              />
            )}
            
            {currentStep === "entities" && (
              <EntityManagementCard 
                onNext={handleEntityDataSaved}
                onBack={handleBack}
                clientData={clientData}
                setEntityData={setEntityData}
                entityData={entityData} // Pass entityData to restore previous state
              />
            )}
            
            {currentStep === "summary" && (
              <SetupSummaryCard
                clientData={clientData}
                entityData={entityData}
                onBack={handleBack}
                onFinish={() => {
                  // Complete the setup and close the dialog
                  setSetupComplete(true);
                  
                  // Clean up localStorage on completion
                  localStorage.removeItem(STORAGE_KEYS.CLIENT_DATA);
                  localStorage.removeItem(STORAGE_KEYS.ENTITY_DATA);
                  localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
                  
                  // Call the onComplete callback if provided
                  if (onComplete) {
                    onComplete();
                  }
                }}
              />
            )}
          </div>
          
          {/* Navigation buttons - only show for steps that don't have their own navigation */}
          {currentStep !== "summary" && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                Back
              </Button>
              
              {/* Skip button could be added here if needed */}
              
              {currentStep !== "client" && currentStep !== "entities" && (
                <Button onClick={handleNext}>
                  {currentStepIndex === SETUP_STEPS.length - 1 ? "Finish" : "Next"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}