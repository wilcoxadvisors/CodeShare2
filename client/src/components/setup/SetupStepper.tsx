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

/**
 * Setup stepper component that guides users through the onboarding process
 */
export default function SetupStepper({ onComplete }: SetupStepperProps) {
  // CRITICAL DEBUG: Tracking component instance ID to detect remounting
  const instanceId = useRef<string>(`setup-${Math.random().toString(36).substr(2, 9)}`);
  console.log(`DEBUG: SetupStepper INITIALIZING - instance ${instanceId.current}`);

  // CRITICAL FIX: Create a ref to hold client data in case component remounts
  // This will survive component remounts and allow us to restore state
  const persistedClientDataRef = useRef<any>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<string>("client");
  const [clientData, setClientData] = useState<any>(null);
  const [entityData, setEntityData] = useState<any[]>([]);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // Initialize state only once when component is mounted
  useEffect(() => {
    // Track mounting/unmounting for debugging
    console.log(`DEBUG: SetupStepper MOUNTED - instance ${instanceId.current}`);
    
    // CRITICAL FIX: Check if we have persisted data in refs that needs to be restored
    // This handles the case where the component was remounted but we have saved data
    if (persistedClientDataRef.current && !clientData) {
      console.log(`DEBUG: Found persisted client data from previous instance, restoring...`);
      console.log(`DEBUG: Persisted data:`, persistedClientDataRef.current);
      
      // Restore client data from our ref (this survives remounts)
      setClientData(persistedClientDataRef.current);
      
      // Also set the step to entities if we have client data
      console.log(`DEBUG: Also setting step to entities because we have persisted client data`);
      setCurrentStep("entities");
      return;
    }
    
    // Normal initialization for first mount (no persisted data)
    // Only initialize if these states haven't been set yet
    if (currentStep !== "client" || clientData !== null || entityData.length > 0 || setupComplete) {
      console.log(`DEBUG: SetupStepper already initialized (instance ${instanceId.current}), not resetting state`);
      return;
    }
    
    console.log(`DEBUG: SetupStepper initializing state on first mount - instance ${instanceId.current}`);
    // Only set these values if they're at their initial state
    if (currentStep !== "client") setCurrentStep("client");
    if (clientData !== null) setClientData(null);
    if (entityData.length > 0) setEntityData([]);
    if (setupComplete) setSetupComplete(false);
    
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
    console.log(`DEBUG: Parent current activeStep BEFORE update: ${currentStep}`);
    
    // CRITICAL FIX: Store client data in both state and our ref
    // The ref will survive component remounts
    persistedClientDataRef.current = {...data};
    console.log(`DEBUG: Saved clientData to persistedClientDataRef`, persistedClientDataRef.current);
    
    try {
      // We now use our solution that stores and sets steps in correct sequence
      
      // 1. First, set client data
      console.log(`DEBUG: Setting clientData state`);
      setClientData(persistedClientDataRef.current);
      
      // 2. Set step to entities AFTER client data is set
      console.log(`DEBUG: Setting currentStep to 'entities'`);
      setCurrentStep("entities");
      
      // 3. Force detection and recovery from remounts that might lose state
      // We'll do this by checking current state shortly after our updates
      setTimeout(() => {
        console.log(`DEBUG: Running verification - Current step: ${currentStep}`);
        
        // Create a new function to call only if needed
        const forceStateRecovery = () => {
          console.log(`DEBUG: STATE RECOVERY needed for instance ${instanceId.current}`);
          console.log(`DEBUG: Current step (should be 'entities'): ${currentStep}`);
          console.log(`DEBUG: Current clientData:`, clientData);
          
          // Force state recovery by retrying the state updates
          if (currentStep !== "entities") {
            console.log(`DEBUG: Recovering step state - setting to 'entities'`);
            setCurrentStep("entities");
          }
          
          if (!clientData && persistedClientDataRef.current) {
            console.log(`DEBUG: Recovering clientData from ref`);
            setClientData(persistedClientDataRef.current);
          }
        };
        
        // Check and recover if needed
        if (currentStep !== "entities" || !clientData) {
          forceStateRecovery();
        } else {
          console.log(`DEBUG: State verification passed - step: ${currentStep}, clientData present: ${!!clientData}`);
        }
      }, 100);
    } catch (error) {
      console.error(`DEBUG: Error in handleClientDataSaved:`, error);
    }
  };
  
  // Handle entity data from EntityManagementCard
  const handleEntityDataSaved = (entities: any[]) => {
    console.log("🔷 handleEntityDataSaved called with entities:", entities);
    setEntityData(entities);
    
    // IMPORTANT: Directly set the current step instead of calling handleNext
    // This ensures we jump to the next step immediately without relying on state updates
    console.log("🔷 Directly setting currentStep to 'summary'");
    
    // Progress to the summary step in our reduced flow
    setCurrentStep("summary");
    console.log("🔷 Current step set to: summary");
  };
  
  // When client data changes, conditionally update the step
  useEffect(() => {
    console.log("DEBUG: clientData useEffect triggered, clientData:", clientData, "currentStep:", currentStep);
    
    // CRITICAL FIX: This useEffect was causing problems
    // We'll remove the auto-advancing behavior since it's redundant with handleClientDataSaved
    // Only log the data state changes for debugging
    
    // Debugging only - force a check of rendered component state
    console.log(`DEBUG: Current component client step state is: ${currentStep}`);
    console.log(`DEBUG: Current component client data state is:`, clientData);
  }, [clientData, currentStep]);
  
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