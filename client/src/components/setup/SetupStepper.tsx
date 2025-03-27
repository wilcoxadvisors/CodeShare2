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
  // DEBUG: Tracking component instance ID to detect remounting
  const instanceId = useRef<string>(`setup-${Math.random().toString(36).substr(2, 9)}`);
  console.log(`DEBUG: SetupStepper INITIALIZING - instance ${instanceId.current}`);
  
  // Use a ref to store step change info for debugging
  const stepChangeRef = useRef<{from: string, to: string, timestamp: number} | null>(null);

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
    
    // Return cleanup function to track unmounting
    return () => {
      console.log(`DEBUG: SetupStepper UNMOUNTING - instance ${instanceId.current}`);
    };
  }, []);
  
  // Calculate current step index
  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep);
  
  // Wrapper to track step changes with extra debugging
  const setCurrentStepWithTracking = (newStep: string) => {
    console.log(`DEBUG: setCurrentStepWithTracking called - from ${currentStep} to ${newStep}`);
    
    // Store information about this step change
    stepChangeRef.current = {
      from: currentStep,
      to: newStep,
      timestamp: Date.now()
    };
    
    // Actually update the step
    setCurrentStep(newStep);
    
    // Verify the change in a short while
    setTimeout(() => {
      console.log(`DEBUG: Verifying step change to ${newStep}, current step is ${currentStep}`);
      if (currentStep !== newStep) {
        console.log(`DEBUG: WARNING - Step change verification failed! Expected ${newStep}, found ${currentStep}`);
        // Don't auto-retry here, just log the failure
      } else {
        console.log(`DEBUG: Step change to ${newStep} verified successfully`);
      }
    }, 100);
  };
  
  // Handler to move to the next step
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    console.log(`DEBUG: handleNext called - current step: ${currentStep}, currentStepIndex: ${currentStepIndex}, nextIndex: ${nextIndex}`);
    if (nextIndex < SETUP_STEPS.length) {
      const nextStepId = SETUP_STEPS[nextIndex].id;
      console.log(`DEBUG: Moving to next step: ${nextStepId}`);
      setCurrentStepWithTracking(nextStepId);
    } else {
      console.log("DEBUG: At final step, setting setupComplete");
      setSetupComplete(true);
    }
  };
  
  // Handler to move to the previous step
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    console.log(`DEBUG: handleBack called - current step: ${currentStep}, currentStepIndex: ${currentStepIndex}, prevIndex: ${prevIndex}`);
    if (prevIndex >= 0) {
      const prevStepId = SETUP_STEPS[prevIndex].id;
      console.log(`DEBUG: Moving to previous step: ${prevStepId}`);
      
      // IMPORTANT: Keep the entityData when navigating back from summary to entities
      // or from entities to client
      console.log(`DEBUG: Preserving entity data when going back: ${entityData.length} entities`);
      
      // Just change the step without clearing entity data
      setCurrentStepWithTracking(prevStepId);
    } else {
      console.log("DEBUG: Already at first step, can't go back");
    }
  };
  
  // Handle client data from ClientSetupCard 
  const handleClientDataSaved = (data: any) => {
    console.log(`DEBUG: handleClientDataSaved called with data`);
    console.log(`DEBUG: Current step BEFORE update: ${currentStep}`);
    
    try {
      // CRITICAL FIX: First set client data, then update the step
      // Do the client data update first
      console.log(`DEBUG: Setting clientData`);
      setClientData(data);
      
      // Then update the step - with a direct function call to ensure they happen in order
      console.log(`DEBUG: Step 1 onSubmit completed, calling setCurrentStepWithTracking to 'entities'...`);
      setCurrentStepWithTracking("entities");
    } catch (error) {
      console.error(`DEBUG: Error in handleClientDataSaved:`, error);
    }
  };
  
  // Handle entity data from EntityManagementCard
  const handleEntityDataSaved = (entities: any[]) => {
    console.log("DEBUG: handleEntityDataSaved called with entities:", entities.length);
    
    try {
      // CRITICAL FIX: First set entity data, then update the step
      console.log(`DEBUG: Setting entityData (${entities.length} entities)`);
      setEntityData(entities);
      
      // Then update the step
      console.log(`DEBUG: Calling setCurrentStepWithTracking to 'summary'`);
      setCurrentStepWithTracking("summary");
    } catch (error) {
      console.error(`DEBUG: Error in handleEntityDataSaved:`, error);
    }
  };
  
  // CRITICAL FIX: Monitor client data changes to update UI debug info
  useEffect(() => {
    console.log(`DEBUG: clientData changed: ${clientData ? 'exists' : 'null'}`);
  }, [clientData]);
  
  // CRITICAL FIX: Monitor step changes to update UI debug info
  useEffect(() => {
    console.log(`DEBUG: currentStep changed to: ${currentStep}`);
  }, [currentStep]);
  
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