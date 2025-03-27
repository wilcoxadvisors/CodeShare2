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

/**
 * Setup stepper component that guides users through the onboarding process
 */
export default function SetupStepper({ onComplete }: SetupStepperProps) {
  // Get persistedSetupData from session storage if available
  const getInitialData = () => {
    try {
      const savedData = sessionStorage.getItem('setupData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log("INIT: Loading setup data from session storage:", parsedData);
        return parsedData;
      }
      return null;
    } catch (error) {
      console.error("Failed to load setup data from sessionStorage:", error);
      return null;
    }
  };
  
  const persistedData = getInitialData();
  
  // Component state
  const { user } = useAuth();
  const { toast } = useToast();
  
  // CRITICAL FIX: Always start with client step if we don't have client data yet
  // This prevents Step 2 from appearing first even if session storage says "entities"
  const determineInitialStep = () => {
    // If we have persisted data with a step, check it
    if (persistedData?.currentStep) {
      // If it says "entities" but we don't have client data, force it back to "client"
      if (persistedData.currentStep === "entities" && 
          (!persistedData.clientData || Object.keys(persistedData.clientData).length === 0)) {
        console.log("INIT: Session says 'entities' step but no client data found, forcing to 'client' step");
        return "client";
      }
      
      // Return the persisted step if it makes sense
      console.log("INIT: Using persisted step:", persistedData.currentStep);
      return persistedData.currentStep;
    }
    
    // Default to client step
    console.log("INIT: No persisted step, defaulting to 'client'");
    return "client";
  };
  
  const [currentStep, setCurrentStep] = useState<string>(determineInitialStep());
  const [clientData, setClientData] = useState<any>(persistedData?.clientData || null);
  const [entityData, setEntityData] = useState<any[]>(persistedData?.entityData || []);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // Save data to session storage whenever it changes
  const saveToSessionStorage = useCallback(() => {
    try {
      const dataToSave = {
        currentStep,
        clientData,
        entityData
      };
      sessionStorage.setItem('setupData', JSON.stringify(dataToSave));
      console.log("Saved setup data to sessionStorage:", dataToSave);
    } catch (error) {
      console.error("Failed to save setup data to sessionStorage:", error);
    }
  }, [currentStep, clientData, entityData]);
  
  // Save state changes to session storage
  useEffect(() => {
    saveToSessionStorage();
  }, [currentStep, clientData, entityData, saveToSessionStorage]);
  
  // Calculate current step index
  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep);
  
  // Handler to move to the next step (basic navigation)
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    console.log("NAVIGATION: handleNext called, current step:", currentStep, "next index:", nextIndex);
    
    if (nextIndex < SETUP_STEPS.length) {
      const nextStepId = SETUP_STEPS[nextIndex].id;
      console.log(`NAVIGATION: Moving to next step: ${nextStepId}`);
      setCurrentStep(nextStepId);
    } else {
      console.log("NAVIGATION: At final step, setting setupComplete");
      setSetupComplete(true);
    }
  };
  
  // Handler to move to the previous step
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    console.log("NAVIGATION: handleBack called, current step:", currentStep, "prev index:", prevIndex);
    
    if (prevIndex >= 0) {
      const prevStepId = SETUP_STEPS[prevIndex].id;
      console.log(`NAVIGATION: Moving to previous step: ${prevStepId}`);
      setCurrentStep(prevStepId);
    }
  };
  
  // CRITICAL FIX: Handle client data submission and navigation separately
  const handleClientDataSaved = (data: any) => {
    console.log("CRITICAL: handleClientDataSaved called with data", data);
    
    // First, update the client data
    setClientData(data);
    
    // Then, navigate to the next step
    console.log("CRITICAL: Advancing from client step to entities step");
    
    // Important: Wait until the next render cycle before changing steps
    setTimeout(() => {
      setCurrentStep("entities");
    }, 10);
  };
  
  // CRITICAL FIX 2.0: More comprehensive entity data handling to prevent data loss
  const handleEntityDataSaved = (entities: any[]) => {
    console.log("CRITICAL FIX 2.0: handleEntityDataSaved called with entities", 
      entities ? entities.length : 'null/undefined');
    
    // Validate incoming data first with detailed checks
    if (!entities) {
      console.error("CRITICAL ERROR: Entity data is undefined or null!");
      toast({
        title: "Error",
        description: "There was a problem with your entity data. Please try again."
      });
      return; // Don't proceed with invalid data
    }
    
    if (!Array.isArray(entities)) {
      console.error("CRITICAL ERROR: Entity data is not an array!", typeof entities);
      toast({
        title: "Error",
        description: "Incorrect entity data format. Please try again."
      });
      return; // Don't proceed with invalid data
    }
    
    if (entities.length === 0) {
      console.warn("WARNING: Received empty entities array. User may need to create at least one entity.");
      toast({
        title: "Warning",
        description: "No entities found. Please add at least one entity before proceeding."
      });
      return; // Don't proceed with empty data
    }
    
    // Make a deep copy to avoid reference issues
    try {
      console.log("CRITICAL FIX 2.0: Creating deep copy of entity data");
      
      // Create deep copy with explicit handling for circular structures
      const entitiesCopy = JSON.parse(JSON.stringify(entities.map(entity => {
        // Ensure each entity has minimal required fields
        return {
          id: entity.id,
          name: entity.name || "Unnamed Entity",
          legalName: entity.legalName || "",
          entityType: entity.entityType || "llc",
          industry: entity.industry || "",
          taxId: entity.taxId || "",
          code: entity.code || "",
          clientId: clientData?.id || entity.clientId,
          // Include any other properties but strip out anything causing issues
          ...Object.fromEntries(
            Object.entries(entity)
              .filter(([key]) => !['__typename', 'createdAt', 'updatedAt'].includes(key))
          )
        };
      })));
      
      console.log("CRITICAL FIX 2.0: Created deep copy of entity data, length:", entitiesCopy.length);
      console.log("CRITICAL FIX 2.0: First entity ID:", entitiesCopy[0]?.id);
      
      // First update local state to ensure UI consistency
      setEntityData(entitiesCopy);
      
      // Then save to sessionStorage for persistence - do this AFTER setting state
      try {
        // Get current saved data
        const savedData = sessionStorage.getItem('setupData') || '{}';
        const parsedData = JSON.parse(savedData);
        
        // Create complete updated state
        const dataToSave = {
          ...parsedData,
          clientData: clientData,
          entityData: entitiesCopy,
          currentStep: "summary" // Pre-set next step
        };
        
        // Save to session storage
        sessionStorage.setItem('setupData', JSON.stringify(dataToSave));
        console.log("CRITICAL FIX 2.0: Saved complete state to session storage (client, entities, step)");
      } catch (error) {
        console.error("CRITICAL FIX 2.0: Failed to save to sessionStorage:", error);
        // Continue without storage since we already updated state
      }
      
      // Navigate to the next step with a longer delay and confirmation of data integrity
      console.log("CRITICAL FIX 2.0: Preparing to advance to summary step");
      
      // Create a promise chain to ensure proper sequencing
      Promise.resolve()
        .then(() => {
          // Log a confirmation that data is ready
          console.log("CRITICAL FIX 2.0: Data is ready for summary step:", {
            clientDataExists: !!clientData,
            entityDataLength: entitiesCopy.length
          });
          
          // Use timeout to ensure state updates complete
          return new Promise(resolve => setTimeout(resolve, 200));
        })
        .then(() => {
          // Do one final verification before transition
          console.log("CRITICAL FIX 2.0: Performing final state verification before navigation");
          
          if (entityData && Array.isArray(entityData) && entityData.length > 0) {
            console.log("CRITICAL FIX 2.0: Verification passed, advancing to summary");
            setCurrentStep("summary");
          } else {
            // If somehow our state didn't update properly, try once more with the copy
            console.warn("CRITICAL FIX 2.0: State verification failed, updating state again before navigation");
            setEntityData(entitiesCopy);
            setTimeout(() => setCurrentStep("summary"), 100);
          }
        });
    } catch (error) {
      console.error("CRITICAL FIX 2.0: Error handling entity data:", error);
      toast({
        title: "Error",
        description: "Failed to process your entity data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
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
  
  // CRITICAL FIX: Add better debugging for all state changes
  useEffect(() => {
    console.log(`DEBUG: currentStep is now: ${currentStep}`);
  }, [currentStep]);
  
  useEffect(() => {
    console.log(`DEBUG: clientData: ${clientData ? 'exists' : 'null'}`);
    if (clientData) {
      console.log("DEBUG: clientData fields:", Object.keys(clientData).join(", "));
    }
  }, [clientData]);
  
  // Add a useEffect to track entityData changes specifically
  useEffect(() => {
    console.log(`DEBUG: entityData: ${entityData ? `array with ${entityData.length} items` : 'null/undefined'}`);
    if (entityData && entityData.length > 0) {
      console.log("DEBUG: First entity ID:", entityData[0].id);
    }
  }, [entityData]);
  
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
                  // CRITICAL FIX 5.0: Before completing, verify data once more and log final state
                  console.log("FINAL: Setup complete triggered with:");
                  console.log("FINAL: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
                  console.log("FINAL: entityData:", entityData ? entityData.length : 'null', "entities");
                  
                  // Force one more sync to session storage before completion
                  try {
                    // This ensures if there's a redirect/refresh during the completion process,
                    // we still have the latest state
                    const finalState = {
                      clientData,
                      entityData,
                      currentStep: "summary", // Keep at summary step
                      setupCompleting: true // Flag to indicate we're in completion process
                    };
                    
                    // Save to session storage
                    sessionStorage.setItem('setupData', JSON.stringify(finalState));
                    console.log("FINAL: Saved final state to session storage");
                  } catch (error) {
                    console.error("FINAL: Failed to save final state to session storage:", error);
                    // Continue anyway since we're going to clear it soon
                  }
                  
                  // Complete the setup and close the dialog
                  setSetupComplete(true);
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