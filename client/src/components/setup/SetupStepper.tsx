import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import ClientSetupCard from "./ClientSetupCard";
import EntityManagementCard from "./EntityManagementCard";
import SetupSummaryCard from "./SetupSummaryCard";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const instanceId = useRef(Math.random().toString(36).substring(2, 8)).current; // Unique ID per instance
  
  console.log(`DEBUG SetupStepper: Instance ${instanceId} Rendering/Re-rendering START`);
  
  // Add lifecycle monitoring
  useEffect(() => {
    console.log(`DEBUG SetupStepper: Instance ${instanceId} MOUNTED`);
    return () => {
      // THIS IS THE CRITICAL LOG!
      console.error(`DEBUG SetupStepper: Instance ${instanceId} UNMOUNTING! State will be lost.`);
    };
  }, [instanceId]); // Empty dependency array means run on mount, cleanup on unmount
  
  // ALWAYS initialize to step 0 to avoid stale state issues
  const [activeStep, setActiveStep] = useState<number>(() => {
    console.log("DEBUG SetupStepper: Initializing activeStep state to 0 (Ignoring localStorage for step)");
    
    // Ensure we always start with step 0 when the component mounts to avoid stale state
    try {
      // Clear any existing step in localStorage to prevent future stale loads
      localStorage.removeItem('setupActiveStep');
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for activeStep", e);
    }
    
    console.log("DEBUG SetupStepper: Using default step 0");
    return 0; // ALWAYS START AT STEP 0
  });
  
  const [clientData, setClientData] = useState<ClientData | null>(() => {
    console.log("DEBUG SetupStepper: Initializing clientData state to null (fresh start)");
    try {
      // Clear any existing client data in localStorage to prevent stale data
      localStorage.removeItem('setupClientData');
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for clientData", e);
    }
    console.log("DEBUG SetupStepper: Using default null client data");
    return null;
  });
  
  const [setupEntities, setSetupEntities] = useState<Entity[]>(() => {
    console.log("DEBUG SetupStepper: Initializing setupEntities state to empty array (fresh start)");
    try {
      // Clear any existing entity data in localStorage to prevent stale data
      localStorage.removeItem('setupEntities');
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
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Completion handler - saves to database then clears localStorage when done
  const handleCompleteSetup = useCallback(async () => {
    console.log("DEBUG SetupStepper: handleCompleteSetup called.");
    console.log("DEBUG SetupStepper: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
    console.log("DEBUG SetupStepper: setupEntities:", setupEntities ? setupEntities.length : 'null', "entities");
    
    // Enhanced validation
    if (!clientData) {
       console.error("DEBUG SetupStepper: Cannot complete setup - missing client data.");
       toast({
         title: "Cannot Complete Setup",
         description: "Missing client information. Please complete step 1 before proceeding.",
         variant: "destructive"
       });
       return;
    }
    
    if (!setupEntities || !Array.isArray(setupEntities) || setupEntities.length === 0) {
       console.error("DEBUG SetupStepper: Cannot complete setup - missing entity data.");
       toast({
         title: "Cannot Complete Setup",
         description: "You need at least one business entity. Please add an entity in step 2.",
         variant: "destructive"
       });
       return;
    }
    
    // Validate entity names
    const invalidEntities = setupEntities.filter(entity => !entity.name || entity.name.trim() === '');
    if (invalidEntities.length > 0) {
      console.error("DEBUG SetupStepper: Cannot complete setup - found entities with missing names.");
      toast({
        title: "Invalid Entity Data",
        description: "One or more entities are missing names. Please fix before proceeding.",
        variant: "destructive"
      });
      return;
    }
    
    // Set loading state 
    setIsSubmitting(true);
    
    try {
      // 1. Save the client data via API
      console.log("DEBUG SetupStepper: Attempting to save client via API...");
      console.log("DEBUG SetupStepper: Client payload:", JSON.stringify(clientData));
      
      const response = await fetch('/api/admin/clients', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        console.error("DEBUG SetupStepper: Client save API call failed:", response.status, errorText);
        throw new Error(`Failed to save client: ${response.statusText || response.status} (${errorText})`);
      }
      
      const savedClient = await response.json();
      console.log("DEBUG SetupStepper: Client save API call successful. Response:", savedClient);

      if (!savedClient || typeof savedClient !== 'object' || !savedClient.id) {
        console.error("DEBUG SetupStepper: Invalid client response:", savedClient);
        throw new Error("Client ID was not returned after saving.");
      }
      const newClientId = savedClient.id;

      // 2. Save the entities via API, associating with the new client ID
      console.log(`DEBUG SetupStepper: Attempting to save ${setupEntities.length} entities for client ID ${newClientId}...`);
      
      // Deep clone entities to avoid circular references and ensure data integrity
      const entitiesDeepCopy = setupEntities.map(entity => {
        // Create a clean entity object with only the necessary properties
        return {
          name: entity.name,
          legalName: entity.legalName || entity.name,
          entityType: entity.entityType || "llc",
          industry: entity.industry || "other",
          code: entity.code || "",
          taxId: entity.taxId || "",
          clientId: newClientId,
          active: true
        };
      });
      
      console.log(`DEBUG SetupStepper: Processed entity data:`, JSON.stringify(entitiesDeepCopy));
      
      const entitySavePromises = entitiesDeepCopy.map(entityPayload => {
        console.log(`DEBUG SetupStepper: Saving entity: ${entityPayload.name}`);
        
        return fetch('/api/admin/entities', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(entityPayload),
        }).then(async response => {
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details available');
            console.error(`DEBUG SetupStepper: Entity save failed for ${entityPayload.name}:`, response.status, errorText);
            throw new Error(`Failed to save entity ${entityPayload.name}: ${response.statusText || response.status} (${errorText})`);
          }
          return response.json();
        });
      });

      try {
        // Wait for all entity save calls to complete
        const savedEntities = await Promise.all(entitySavePromises);
        console.log("DEBUG SetupStepper: All entities save API calls successful.", 
          savedEntities.length, "entities saved");
        
        // Show success toast
        toast({
          title: "Setup Complete",
          description: "Client and entities have been saved successfully",
        });
  
        // 3. Clear localStorage items related to the setup
        try {
          localStorage.removeItem('setupActiveStep');
          localStorage.removeItem('setupClientData');
          localStorage.removeItem('setupEntities');
          console.log("DEBUG SetupStepper: Cleared all setup data from localStorage");
        } catch (e) {
          console.warn("DEBUG SetupStepper: Error clearing localStorage:", e);
        }
        
        // Also clear session storage
        try {
          sessionStorage.removeItem('setupData');
          console.log("DEBUG SetupStepper: Cleared all setup data from sessionStorage");
        } catch (e) {
          console.warn("DEBUG SetupStepper: Error clearing sessionStorage:", e);
        }
        
        // 4. Invalidate query cache for dashboard data
        try {
          // Use the imported queryClient directly
          queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
          console.log("DEBUG SetupStepper: Invalidated query cache");
        } catch (e) {
          console.warn("DEBUG SetupStepper: Error invalidating cache:", e);
        }
        
        // 5. Call onComplete callback to trigger dashboard refresh
        if (onComplete) {
          console.log("DEBUG SetupStepper: Calling onComplete callback");
          onComplete();
        } else {
          // Fallback - redirect to dashboard directly
          console.log("DEBUG SetupStepper: No onComplete callback, redirecting to dashboard");
          // Small delay to allow toasts to be seen
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
      } catch (entityError: any) {
        console.error("DEBUG SetupStepper: Error during entity save:", entityError);
        throw new Error(`Failed to save one or more entities: ${entityError.message}`);
      }
    } catch (error: any) {
      console.error("DEBUG SetupStepper: Error during final save API calls:", error);
      // Show error toast
      toast({
        title: "Error Saving Data",
        description: error.message || "Failed to save client or entity data.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [clientData, setupEntities, onComplete, toast, setIsSubmitting]);
  
  // Log at the end of the render
  console.log(`DEBUG SetupStepper: Instance ${instanceId} Rendering/Re-rendering END. Current activeStep: ${activeStep}`);
  
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