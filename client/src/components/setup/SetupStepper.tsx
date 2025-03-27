import { useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import ClientSetupCard from "./ClientSetupCard";
import EntityManagementCard from "./EntityManagementCard";
import SetupSummaryCard from "./SetupSummaryCard";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSetup, SETUP_STEPS, SetupProvider } from "../../contexts/SetupContext";

interface SetupStepperProps {
  onComplete?: () => void;
}

// Main wrapper component that provides the context
export default function SetupStepper({ onComplete }: SetupStepperProps) {
  return (
    <SetupProvider onComplete={onComplete}>
      <SetupStepperContent />
    </SetupProvider>
  );
}

// The actual stepper content that uses the context
function SetupStepperContent() {
  // DEBUG: Tracking component instance ID to detect remounting
  const instanceId = useRef<string>(`setup-${Math.random().toString(36).substr(2, 9)}`);
  console.log(`DEBUG: SetupStepperContent INITIALIZING - instance ${instanceId.current}`);

  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use the setup context instead of local state
  const { 
    currentStep, 
    clientData, 
    entityData, 
    handleBack, 
    handleClientDataSaved, 
    handleEntityDataSaved,
    setClientData,
    setEntityData,
    setSetupComplete
  } = useSetup();
  
  // Initialize state only once when component is mounted
  useEffect(() => {
    // Track mounting/unmounting for debugging
    console.log(`DEBUG: SetupStepperContent MOUNTED - instance ${instanceId.current}`);
    
    // Return cleanup function to track unmounting
    return () => {
      console.log(`DEBUG: SetupStepperContent UNMOUNTING - instance ${instanceId.current}`);
    };
  }, []);
  
  // Calculate current step index
  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep);
  
  // CRITICAL FIX: Monitor client data changes to update UI debug info
  useEffect(() => {
    console.log(`DEBUG: SetupStepperContent - clientData changed: ${clientData ? 'exists' : 'null'}`);
  }, [clientData]);
  
  // CRITICAL FIX: Monitor step changes to update UI debug info
  useEffect(() => {
    console.log(`DEBUG: SetupStepperContent - currentStep changed to: ${currentStep}`);
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
                <Button onClick={() => {
                  const nextIndex = currentStepIndex + 1;
                  if (nextIndex < SETUP_STEPS.length) {
                    const nextStepId = SETUP_STEPS[nextIndex].id;
                    console.log(`DEBUG: Moving to next step: ${nextStepId}`);
                  }
                }}>
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