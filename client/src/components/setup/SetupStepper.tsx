import { useState, useEffect } from "react";
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
 * Add or modify steps as needed
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
    title: "Summary & Activation",
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<string>("client");
  const [clientData, setClientData] = useState<any>(null);
  const [entityData, setEntityData] = useState<any[]>([]);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // Initialize state only once when component is mounted
  useEffect(() => {
    // Only initialize if these states haven't been set yet
    if (currentStep !== "client" || clientData !== null || entityData.length > 0 || setupComplete) {
      console.log("SetupStepper already initialized, not resetting state");
      return;
    }
    
    console.log("SetupStepper initializing state on first mount");
    // Only set these values if they're at their initial state
    if (currentStep !== "client") setCurrentStep("client");
    if (clientData !== null) setClientData(null);
    if (entityData.length > 0) setEntityData([]);
    if (setupComplete) setSetupComplete(false);
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
      setCurrentStep(prevStepId);
    } else {
      console.log("Already at first step, can't go back");
    }
  };
  
  // Handle client data from ClientSetupCard
  const handleClientDataSaved = (data: any) => {
    console.log("🔷 handleClientDataSaved called with data:", data);
    setClientData(data);
    
    // IMPORTANT: Directly set the current step instead of calling handleNext
    // This ensures we jump to the next step immediately without relying on state updates
    console.log("🔷 Directly setting currentStep to 'entities'");
    
    // Directly set to the entities step instead of trying to calculate it
    setCurrentStep("entities");
    console.log("🔷 Current step set to: entities");
  };
  
  // Handle entity data from EntityManagementCard
  const handleEntityDataSaved = (entities: any[]) => {
    console.log("🔷 handleEntityDataSaved called with entities:", entities);
    setEntityData(entities);
    
    // IMPORTANT: Directly set the current step instead of calling handleNext
    // This ensures we jump to the next step immediately without relying on state updates
    console.log("🔷 Directly setting currentStep to 'summary'");
    
    // Directly set to the summary step
    setCurrentStep("summary");
    console.log("🔷 Current step set to: summary");
  };
  
  // When client data changes, conditionally update the step
  useEffect(() => {
    console.log("clientData useEffect triggered, clientData:", clientData, "currentStep:", currentStep);
    // If we have client data and we're on the first step, auto-advance
    if (clientData && currentStep === "client") {
      console.log("Auto-advancing due to clientData change while on client step");
      // *** IMPORTANT: This might be causing a double-advance, commenting out for now ***
      // handleNext();
    }
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
            <div className="flex items-center justify-between">
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
                    className={`mt-2 text-xs font-medium ${
                      index === currentStepIndex ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </div>
                </div>
              ))}
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
              />
            )}
            
            {/* Consolidation step removed - now available as a separate module */}
            
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