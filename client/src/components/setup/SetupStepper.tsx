import React, { useState, useCallback } from 'react';
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
 * Simplified state management without sessionStorage dependencies
 */
export default function SetupStepper({ onComplete }: SetupStepperProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // DRASTIC SIMPLIFICATION: Initialize states with simple values
  console.log("DEBUG SetupStepper: Mounting/Rendering");
  
  const [activeStep, setActiveStep] = useState<number>(() => {
    console.log("DEBUG SetupStepper: Initializing activeStep state to 0");
    return 0; // ALWAYS START AT STEP 0
  });
  
  const [clientData, setClientData] = useState<ClientData | null>(() => {
    console.log("DEBUG SetupStepper: Initializing clientData state to null");
    return null;
  });
  
  const [setupEntities, setSetupEntities] = useState<Entity[]>(() => {
    console.log("DEBUG SetupStepper: Initializing setupEntities state to []");
    return [];
  });
  
  // Create stable callback functions using useCallback
  const handleClientSave = useCallback((data: ClientData) => {
    console.log("DEBUG SetupStepper: handleClientSave received:", data);
    setClientData(data);
    // --- IMPORTANT: Update step AFTER data is set ---
    const nextStep = 1;
    console.log(`DEBUG SetupStepper: Setting activeStep to ${nextStep}`);
    setActiveStep(nextStep);
  }, []);
  
  const handleEntityAdd = useCallback((newEntity: Entity) => {
    console.log("DEBUG SetupStepper: handleEntityAdd received:", newEntity);
    setSetupEntities(prev => {
      const newState = [...prev, newEntity];
      console.log("DEBUG SetupStepper: New setupEntities state:", newState);
      return newState;
    });
  }, []);
  
  const handleEntityDelete = useCallback((entityId: number) => {
    console.log("DEBUG SetupStepper: handleEntityDelete called for ID:", entityId);
    setSetupEntities(prev => {
      const newState = prev.filter(e => e.id !== entityId);
      console.log("DEBUG SetupStepper: New setupEntities state after delete:", newState);
      return newState;
    });
  }, []);
  
  const handleBack = useCallback(() => {
    console.log(`DEBUG SetupStepper: handleBack called. Current: ${activeStep}. Going to ${activeStep - 1}`);
    setActiveStep(prev => Math.max(0, prev - 1));
  }, [activeStep]);
  
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
  }, [activeStep, setupEntities.length, toast]);
  
  // Simple completion handler
  const handleCompleteSetup = useCallback(() => {
    console.log("DEBUG SetupStepper: handleCompleteSetup called.");
    console.log("DEBUG SetupStepper: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
    console.log("DEBUG SetupStepper: setupEntities:", setupEntities ? setupEntities.length : 'null', "entities");
    
    // Directly call onComplete callback without any session storage operations
    if (onComplete) {
      onComplete();
    }
  }, [clientData, setupEntities, onComplete]);
  
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