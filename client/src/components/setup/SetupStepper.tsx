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
  
  // Use local storage to persist state across remounts
  const [activeStep, setActiveStep] = useState<number>(() => {
    console.log("DEBUG SetupStepper: Initializing activeStep state");
    try {
      const savedStep = localStorage.getItem('setupActiveStep');
      if (savedStep) {
        console.log(`DEBUG SetupStepper: Found saved step: ${savedStep}`);
        return parseInt(savedStep, 10);
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for activeStep", e);
    }
    console.log("DEBUG SetupStepper: Using default step 0");
    return 0;
  });
  
  const [clientData, setClientData] = useState<ClientData | null>(() => {
    console.log("DEBUG SetupStepper: Initializing clientData state");
    try {
      const savedClientData = localStorage.getItem('setupClientData');
      if (savedClientData) {
        console.log("DEBUG SetupStepper: Found saved client data");
        return JSON.parse(savedClientData);
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for clientData", e);
    }
    console.log("DEBUG SetupStepper: Using default null client data");
    return null;
  });
  
  const [setupEntities, setSetupEntities] = useState<Entity[]>(() => {
    console.log("DEBUG SetupStepper: Initializing setupEntities state");
    try {
      const savedEntities = localStorage.getItem('setupEntities');
      if (savedEntities) {
        console.log("DEBUG SetupStepper: Found saved entities");
        return JSON.parse(savedEntities);
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for setupEntities", e);
    }
    console.log("DEBUG SetupStepper: Using default empty entities array");
    return [];
  });
  
  // Create stable callback functions using useCallback
  const handleClientSave = useCallback((data: ClientData) => {
    console.log("DEBUG SetupStepper: handleClientSave received:", data);
    
    // First save data to localStorage
    try {
      localStorage.setItem('setupClientData', JSON.stringify(data));
      console.log("DEBUG SetupStepper: Saved client data to localStorage");
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving to localStorage:", e);
    }
    
    // Then update state
    setClientData(data);
    
    // Finally update step AFTER data is set
    const nextStep = 1;
    console.log(`DEBUG SetupStepper: Setting activeStep to ${nextStep}`);
    
    // Save the new active step to localStorage
    try {
      localStorage.setItem('setupActiveStep', nextStep.toString());
      console.log(`DEBUG SetupStepper: Saved active step ${nextStep} to localStorage`);
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving step to localStorage:", e);
    }
    
    setActiveStep(nextStep);
  }, []);
  
  const handleEntityAdd = useCallback((newEntity: Entity) => {
    console.log("DEBUG SetupStepper: handleEntityAdd received:", newEntity);
    
    setSetupEntities(prev => {
      const newState = [...prev, newEntity];
      console.log("DEBUG SetupStepper: New setupEntities state:", newState);
      
      // Save updated entities to localStorage
      try {
        localStorage.setItem('setupEntities', JSON.stringify(newState));
        console.log("DEBUG SetupStepper: Saved entities to localStorage");
      } catch (e) {
        console.warn("DEBUG SetupStepper: Error saving entities to localStorage:", e);
      }
      
      return newState;
    });
  }, []);
  
  const handleEntityDelete = useCallback((entityId: number) => {
    console.log("DEBUG SetupStepper: handleEntityDelete called for ID:", entityId);
    
    setSetupEntities(prev => {
      const newState = prev.filter(e => e.id !== entityId);
      console.log("DEBUG SetupStepper: New setupEntities state after delete:", newState);
      
      // Save updated entities to localStorage
      try {
        localStorage.setItem('setupEntities', JSON.stringify(newState));
        console.log("DEBUG SetupStepper: Saved entities to localStorage after deletion");
      } catch (e) {
        console.warn("DEBUG SetupStepper: Error saving entities to localStorage:", e);
      }
      
      return newState;
    });
  }, []);
  
  const handleBack = useCallback(() => {
    console.log(`DEBUG SetupStepper: handleBack called. Current: ${activeStep}. Going to ${activeStep - 1}`);
    
    const newStep = Math.max(0, activeStep - 1);
    
    // Save new step to localStorage
    try {
      localStorage.setItem('setupActiveStep', newStep.toString());
      console.log(`DEBUG SetupStepper: Saved active step ${newStep} to localStorage during back navigation`);
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving step to localStorage:", e);
    }
    
    setActiveStep(newStep);
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
    
    // Save new step to localStorage
    try {
      localStorage.setItem('setupActiveStep', nextStep.toString());
      console.log(`DEBUG SetupStepper: Saved active step ${nextStep} to localStorage during entity completion`);
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving step to localStorage:", e);
    }
    
    setActiveStep(nextStep);
  }, [activeStep, setupEntities.length, toast]);
  
  // Completion handler - clears localStorage when done
  const handleCompleteSetup = useCallback(() => {
    console.log("DEBUG SetupStepper: handleCompleteSetup called.");
    console.log("DEBUG SetupStepper: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
    console.log("DEBUG SetupStepper: setupEntities:", setupEntities ? setupEntities.length : 'null', "entities");
    
    // Clear localStorage items related to the setup
    try {
      localStorage.removeItem('setupActiveStep');
      localStorage.removeItem('setupClientData');
      localStorage.removeItem('setupEntities');
      console.log("DEBUG SetupStepper: Cleared all setup data from localStorage");
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error clearing localStorage:", e);
    }
    
    // Call onComplete callback
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
                entityData={setupEntities}
                setEntityData={setSetupEntities}
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