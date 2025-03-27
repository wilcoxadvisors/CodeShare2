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
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error("Failed to load setup data from sessionStorage:", error);
      return null;
    }
  };
  
  const persistedData = getInitialData();
  
  // Component state
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<string>(persistedData?.currentStep || "client");
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
  
  // Handle entity data from EntityManagementCard
  const handleEntityDataSaved = (entities: any[]) => {
    console.log("CRITICAL: handleEntityDataSaved called with entities", entities.length);
    
    // First, set the entity data
    setEntityData(entities);
    
    // Then, navigate to the next step
    console.log("CRITICAL: Advancing from entities step to summary step");
    
    // Important: Wait until the next render cycle before changing steps
    setTimeout(() => {
      setCurrentStep("summary");
    }, 10);
  };
  
  // Clear session storage on completion
  useEffect(() => {
    if (setupComplete) {
      sessionStorage.removeItem('setupData');
      
      if (onComplete) {
        onComplete();
      }
    }
  }, [setupComplete, onComplete]);
  
  // Debug logging
  useEffect(() => {
    console.log(`DEBUG: currentStep is now: ${currentStep}`);
  }, [currentStep]);
  
  useEffect(() => {
    console.log(`DEBUG: clientData: ${clientData ? 'exists' : 'null'}`);
  }, [clientData]);
  
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