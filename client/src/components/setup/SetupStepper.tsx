import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import ClientSetupCard from "./ClientSetupCard";
import EntityManagementCard from "./EntityManagementCard";
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

/**
 * Setup stepper component that guides users through the onboarding process
 */
export default function SetupStepper() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<string>("client");
  const [clientData, setClientData] = useState<any>(null);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  
  // Calculate current step index
  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep);
  
  // Handler to move to the next step
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < SETUP_STEPS.length) {
      setCurrentStep(SETUP_STEPS[nextIndex].id);
    } else {
      setSetupComplete(true);
    }
  };
  
  // Handler to move to the previous step
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(SETUP_STEPS[prevIndex].id);
    }
  };
  
  // Handle client data from ClientSetupCard
  const handleClientDataSaved = (data: any) => {
    setClientData(data);
    handleNext();
  };
  
  // When client data changes, conditionally update the step
  useEffect(() => {
    // If we have client data and we're on the first step, auto-advance
    if (clientData && currentStep === "client") {
      handleNext();
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
                onNext={handleNext}
                onBack={handleBack}
                clientData={clientData}
              />
            )}
            
            {/* Consolidation step removed - now available as a separate module */}
            
            {currentStep === "summary" && (
              <div className="text-center p-8 space-y-6">
                <h3 className="text-xl font-medium">Setup Summary</h3>
                
                <div className="bg-muted/20 p-4 rounded-lg space-y-4 text-left">
                  {clientData && (
                    <div>
                      <h4 className="font-semibold">Client Information</h4>
                      <ul className="mt-2 space-y-1">
                        <li><span className="font-medium">Name:</span> {clientData.name}</li>
                        <li><span className="font-medium">Legal Name:</span> {clientData.legalName}</li>
                        <li><span className="font-medium">Industry:</span> {clientData.industry}</li>
                      </ul>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => {
                    // Actually complete the setup and close the dialog
                    setSetupComplete(true);
                    
                    // Show toast notification
                    toast({
                      title: "Setup Complete!",
                      description: "Client added successfully",
                    });
                  }}
                >
                  Finish & Add Client
                </Button>
              </div>
            )}
          </div>
          
          {/* Navigation buttons */}
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
        </CardContent>
      </Card>
    </div>
  );
}