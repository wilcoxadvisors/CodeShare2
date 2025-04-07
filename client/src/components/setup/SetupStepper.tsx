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
  id?: number;
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
  
  // Helper function to clear all setup data
  const clearSetupData = useCallback(() => {
    console.log("DEBUG SetupStepper: Clearing all setup data from localStorage");
    try {
      localStorage.removeItem('setupEntities');
      localStorage.removeItem('setupClientData');
      localStorage.removeItem('setupActiveStep');
      
      // Reset states
      setSetupEntities([]);
      setClientData(null);
      setActiveStep(0);
      
      console.log("DEBUG SetupStepper: Successfully cleared all setup data and reset state");
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error clearing localStorage:", e);
    }
  }, []);

  // Add lifecycle monitoring and state restoration from localStorage on mount
  useEffect(() => {
    console.log(`DEBUG SetupStepper: Instance ${instanceId} MOUNTED`);
    
    // CRITICAL FIX: Always clear previous data when this component mounts
    // This ensures we have a fresh start each time the setup process begins
    clearSetupData();
    
    console.log("DEBUG SetupStepper: Setup initialized with clean state");
    
    return () => {
      // Just log that we're unmounting, but don't try to save state
      // The state is already being saved after each action
      console.log(`DEBUG SetupStepper: Instance ${instanceId} unmounting`);
    };
  }, []); // Empty dependency array ensures this runs only once on mount
  
  // Initialize activeStep with better recovery logic
  const [activeStep, setActiveStep] = useState<number>(() => {
    console.log("DEBUG SetupStepper: Initializing activeStep state...");
    
    // CRITICAL FIX: Instead of forcing to 0, check localStorage first
    try {
      const savedStep = localStorage.getItem('setupActiveStep');
      if (savedStep !== null) {
        const step = parseInt(savedStep, 10) || 0;
        console.log(`DEBUG SetupStepper: Using saved step ${step} from localStorage`);
        return step;
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for activeStep", e);
    }
    
    console.log("DEBUG SetupStepper: No saved step found, using default step 0");
    return 0; // Default to 0 when nothing is found
  });
  
  const [clientData, setClientData] = useState<ClientData | null>(() => {
    console.log("DEBUG SetupStepper: Initializing clientData state...");
    
    // CRITICAL FIX: Check localStorage instead of always clearing it
    try {
      const savedClientData = localStorage.getItem('setupClientData');
      if (savedClientData) {
        try {
          const parsedData = JSON.parse(savedClientData);
          console.log(`DEBUG SetupStepper: Using saved client data from localStorage: ${parsedData.name || 'unnamed'}`);
          return parsedData;
        } catch (parseError) {
          console.warn("DEBUG SetupStepper: Error parsing saved client data:", parseError);
        }
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error accessing localStorage for clientData", e);
    }
    
    console.log("DEBUG SetupStepper: No saved client data found, using default null");
    return null;
  });
  
  const [setupEntities, setSetupEntities] = useState<Entity[]>(() => {
    console.log("DEBUG SetupStepper: Initializing setupEntities state...");
    
    // CRITICAL FIX: ALWAYS START WITH EMPTY ARRAY FOR NEW CLIENTS
    // This prevents stale entity data from persisting across different clients
    console.log("DEBUG SetupStepper: Using empty array for initial entity state");
    return [];
    
    // NOTE: Intentionally removing localStorage persistence for entities
    // to prevent entity data from persisting between client setup sessions
  });
  
  // Add a loading state for the client save operation
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Create stable callback functions using useCallback
  const handleClientSave = useCallback(async (data: ClientData) => {
    console.log("DEBUG SetupStepper: handleClientSave received:", data);
    
    // First save data to localStorage
    try {
      localStorage.setItem('setupClientData', JSON.stringify(data));
      console.log("DEBUG SetupStepper: Saved client data to localStorage");
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving to localStorage:", e);
    }
    
    // Update state
    setClientData(data);
    
    // Don't generate an ID at all - we'll create a real one when saving to database
    console.log(`DEBUG SetupStepper: Using client data without an ID for now - will get real ID on final submit`);
    
    // Store the client data without any ID
    const updatedClientData = {
      ...data,
      // No ID field here - we'll get that from the server when we save
    };
    setClientData(updatedClientData);
    
    try {
      localStorage.setItem('setupClientData', JSON.stringify(updatedClientData));
      console.log("DEBUG SetupStepper: Saved clean client data to localStorage without ID");
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving updated client to localStorage:", e);
    }
    
    // No entities at this point - we'll create them in step 2
    setSetupEntities([]);
    
    // Update step to move to entity management
    const nextStep = 1;
    console.log(`DEBUG SetupStepper: Setting activeStep to ${nextStep}`);
    
    // Save the new active step to localStorage
    try {
      localStorage.setItem('setupActiveStep', nextStep.toString());
      console.log(`DEBUG SetupStepper: Saved active step ${nextStep} to localStorage`);
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving step to localStorage:", e);
    }
    
    toast({
      title: "Success",
      description: "Client information saved. Please add business entities in the next step.",
    });
    
    setActiveStep(nextStep);
  }, [toast, setClientData, setSetupEntities]);
  
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
  
  // Handle updating a local entity (particularly for temporary entities)
  const handleEntityUpdated = useCallback((updatedEntity: Entity) => {
    console.log("DEBUG SetupStepper: handleEntityUpdated called with:", updatedEntity);
    
    setSetupEntities(prev => {
      // Find and update the entity with matching ID
      const newState = prev.map(entity => 
        entity.id === updatedEntity.id ? { ...updatedEntity } : entity
      );
      
      console.log("DEBUG SetupStepper: Updated local entity. New state:", newState);
      
      // Save to localStorage
      try {
        localStorage.setItem('setupEntities', JSON.stringify(newState));
        console.log("DEBUG SetupStepper: Saved updated entities to localStorage");
      } catch (e) {
        console.warn("DEBUG SetupStepper: Error saving to localStorage after entity update:", e);
      }
      
      return newState;
    });
  }, []);
  
  const handleBack = useCallback(() => {
    console.log(`DEBUG SetupStepper: handleBack called. Current: ${activeStep}. Going to ${activeStep - 1}`);
    console.log(`DEBUG Stepper: Navigating Back from ${activeStep}. Entities BEFORE state change:`, JSON.stringify(setupEntities));
    
    const newStep = Math.max(0, activeStep - 1);
    
    // Critical Fix: Ensure entity data is preserved in localStorage before navigating back
    // This ensures that if the component remounts, it can restore from localStorage
    try {
      // Save current step to localStorage
      localStorage.setItem('setupActiveStep', newStep.toString());
      console.log(`DEBUG SetupStepper: Saved active step ${newStep} to localStorage during back navigation`);
      
      // CRITICAL FIX: Explicitly save entity data to localStorage during back navigation
      if (setupEntities && setupEntities.length > 0) {
        localStorage.setItem('setupEntities', JSON.stringify(setupEntities));
        console.log(`DEBUG SetupStepper: Explicitly saved ${setupEntities.length} entities to localStorage during back navigation`);
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving data to localStorage during back navigation:", e);
    }
    
    // Set the new active step
    setActiveStep(newStep);
    
    // We'll rely on the re-render to log entities after state change
    // At this point, if the component remounts due to React's behavior, it will
    // restore the entity data from localStorage in the useEffect on mount
  }, [activeStep, setupEntities]);
  
  const handleNextFromEntities = useCallback(() => {
    console.log(`DEBUG SetupStepper: handleNextFromEntities called. Current: ${activeStep}. Entities count: ${setupEntities.length}`);
    console.log("DEBUG Stepper: Navigating Step 2 -> 3. Entities:", JSON.stringify(setupEntities));
    
    // Include both default entities (created in step 1) and any new entities added in step 2
    if (setupEntities.length === 0) {
      console.warn("DEBUG SetupStepper: Blocked navigation - No entities found.");
      toast({
        title: "Cannot proceed",
        description: "Please add at least one entity before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    const nextStep = activeStep + 1;
    console.log(`DEBUG SetupStepper: Setting activeStep to ${nextStep}`);
    
    // Save new step and entity data to localStorage
    try {
      // Save step
      localStorage.setItem('setupActiveStep', nextStep.toString());
      console.log(`DEBUG SetupStepper: Saved active step ${nextStep} to localStorage during entity completion`);
      
      // CRITICAL FIX: Explicitly save entity data to localStorage before proceeding to Step 3
      // This ensures consistent behavior with the back navigation fix
      if (setupEntities && setupEntities.length > 0) {
        localStorage.setItem('setupEntities', JSON.stringify(setupEntities));
        console.log(`DEBUG SetupStepper: Explicitly saved ${setupEntities.length} entities to localStorage during Next navigation`);
      }
    } catch (e) {
      console.warn("DEBUG SetupStepper: Error saving data to localStorage:", e);
    }
    
    setActiveStep(nextStep);
  }, [activeStep, setupEntities, toast]);
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Completion handler - saves or updates the client in database then clears localStorage when done
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
      // We're using a clean approach now - don't rely on any existing client ID
      // but instead always create a new client on final submission
      let newClientId: number | undefined;
      
      // Always create the client in the database on final setup
      // Temporary IDs are negative numbers, real IDs are positive
      // 1. Save the client data via API
      const clientApiUrl = '/api/admin/clients';
      console.log("DEBUG: Saving Client. URL:", clientApiUrl, "Payload:", JSON.stringify(clientData));
      
      // Get the current user data from useAuth
      console.log("DEBUG: Current user:", user ? `ID: ${user.id}, Role: ${user.role}` : "No user found");
      
      // Client API call with detailed logging
      const clientResponse = await fetch(clientApiUrl, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           // Don't include any existing ID field, but extract all other client data
           name: clientData.name,
           legalName: clientData.legalName,
           taxId: clientData.taxId,
           industry: clientData.industry,
           address: clientData.address,
           phone: clientData.phone,
           email: clientData.email,
           website: clientData.website,
           notes: clientData.notes,
           // Add the user ID
           userId: user?.id 
         }),
         credentials: 'include' // Include cookies for authentication
      });
      
      // Log just the status without trying to iterate headers (which causes TypeScript errors)
      console.log("DEBUG: Save Client Response Status:", clientResponse.status);
      
      let savedClient;
      let clientResponseText;
      
      try {
        clientResponseText = await clientResponse.text();
        console.log("DEBUG: Save Client Response Text:", clientResponseText);
        
        if (clientResponseText) {
          savedClient = JSON.parse(clientResponseText);
          console.log("DEBUG: Save Client Response Body:", savedClient);
        }
      } catch (jsonError) {
        console.error("DEBUG: Error parsing client save response JSON:", jsonError, 
          "Response text:", clientResponseText);
        throw new Error(`Client save response invalid: ${clientResponse.status}`);
      }
      
      if (!clientResponse.ok) {
        throw new Error(`Client save failed: ${clientResponse.status} - ${clientResponseText || clientResponse.statusText}`);
      }
      
      // Check for client ID in different possible response structures
      if (savedClient?.data?.id) {
        // Standard response structure: { data: { id: number } }
        newClientId = savedClient.data.id;
        console.log("DEBUG: Found client ID in standard response structure:", newClientId);
      } else if (savedClient?.id) {
        // Alternative response structure: { id: number }
        newClientId = savedClient.id;
        console.log("DEBUG: Found client ID in alternative response structure:", newClientId);
      } else {
        // No recognizable structure found
        console.error("DEBUG: Invalid client response structure:", savedClient);
        throw new Error("Client ID missing from response. Cannot detect a valid ID in the server response.");
      }
      
      // Ensure we have a valid positive client ID before proceeding
      if (!newClientId || newClientId <= 0) {
        console.error("DEBUG: Invalid client ID value:", newClientId);
        throw new Error("Invalid client ID returned from server: " + newClientId);
      }
      
      console.log("DEBUG: Successfully extracted client ID:", newClientId);

      // 2. Save the entities via API, associating with the new client ID
      console.log(`DEBUG: Saving Entities for Client ID: ${newClientId}, Entities:`, 
        JSON.stringify(setupEntities.map(e => e.name)));
      
      // Deep clone entities to avoid circular references and ensure data integrity
      const entitiesDeepCopy = setupEntities.map(entity => {
        // Create a clean entity object with only the necessary properties
        // CRITICAL: Make sure we're using the real client ID returned from the API, not any temporary IDs
        if (!newClientId || newClientId < 1) {
          console.error("DEBUG: ERROR - Invalid client ID for entity creation:", newClientId);
          throw new Error("Invalid client ID for entity creation. Database returned: " + newClientId);
        }
        
        // Create a clean entity without any temporary ID
        return {
          name: entity.name,
          legalName: entity.legalName || entity.name,
          entityType: entity.entityType || "llc",
          industry: entity.industry === null || entity.industry === undefined ? "other" : entity.industry,
          code: entity.code || "",
          taxId: entity.taxId || "",
          clientId: newClientId, // Use the real client ID from the API response
          ownerId: user?.id, // Set owner to current user
          active: true
          // Explicitly not including any entity.id field to avoid sending temporary IDs
        };
      });
      
      console.log(`DEBUG: Processed entity data:`, JSON.stringify(entitiesDeepCopy));
      
      // PERFORMANCE OPTIMIZATION: Use the new batch entity creation endpoint
      console.log(`DEBUG: Setting up optimized BATCH entity creation for ${entitiesDeepCopy.length} entities`);
      
      let entityResults = [];
      
      try {
        // Use the new batch endpoint which is much more efficient than individual calls
        const batchApiUrl = '/api/admin/entities/batch';
        console.log(`DEBUG: Using batch entity creation endpoint for ${entitiesDeepCopy.length} entities`);
        
        const batchResponse = await fetch(batchApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entities: entitiesDeepCopy,
            clientId: newClientId,
            ownerId: user?.id
          }),
          credentials: 'include'
        });
        
        if (!batchResponse.ok) {
          const errorText = await batchResponse.text();
          console.error(`Error in batch entity creation:`, errorText);
          throw new Error(`Batch entity creation failed: ${batchResponse.status} - ${errorText}`);
        }
        
        const batchResult = await batchResponse.json();
        console.log(`DEBUG: Batch entity creation response:`, batchResult);
        
        if (batchResult.status === "success") {
          // All entities were created successfully
          entityResults = batchResult.data.map((entity: any) => ({ 
            success: true, 
            data: entity, 
            name: entity.name 
          }));
          console.log(`DEBUG: Successfully created ${entityResults.length} entities in batch`);
        } else if (batchResult.status === "partial") {
          // Some entities were created, but some failed
          console.warn(`DEBUG: Partial success with batch entity creation: ${batchResult.message}`);
          
          // Map successful entities
          const successful = batchResult.data.map((entity: any) => ({ 
            success: true, 
            data: entity, 
            name: entity.name 
          }));
          
          // Map failed entities
          const failed = (batchResult.errors || []).map((error: any) => ({
            success: false,
            name: error.entity,
            error: error.error
          }));
          
          entityResults = [...successful, ...failed];
        } else {
          // All entities failed
          throw new Error(`Batch entity creation failed: ${batchResult.message}`);
        }
      } catch (err: unknown) {
        // If the batch endpoint fails completely, fall back to the old method of individual creation
        console.error(`Exception using batch entity creation, falling back to individual entity creation:`, err);
        
        // Define the fallback function for individual entity creation
        const createSingleEntity = async (entityPayload: any) => {
          try {
            const entityApiUrl = '/api/admin/entities';
            console.log(`DEBUG: Creating entity ${entityPayload.name} for client ${newClientId}`);
            
            const response = await fetch(entityApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(entityPayload),
              credentials: 'include'
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Error creating entity ${entityPayload.name}:`, errorText);
              return { 
                success: false, 
                name: entityPayload.name,
                error: `Status ${response.status}: ${errorText}`
              };
            }
            
            const data = await response.json();
            return { success: true, data, name: entityPayload.name };
          } catch (err: unknown) {
            console.error(`Exception creating entity ${entityPayload.name}:`, err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            return { 
              success: false, 
              name: entityPayload.name,
              error: errorMessage
            };
          }
        };
        
        // Process entities in parallel batches for better performance without overwhelming the server
        const batchSize = 3; // Process 3 entities at once
        entityResults = [];
        
        // Process entities in batches
        for (let i = 0; i < entitiesDeepCopy.length; i += batchSize) {
          const batch = entitiesDeepCopy.slice(i, i + batchSize);
          const batchPromises = batch.map(entity => createSingleEntity(entity));
          
          // Wait for the current batch to complete before proceeding to the next
          const batchResults = await Promise.all(batchPromises);
          entityResults.push(...batchResults);
          
          console.log(`DEBUG: Completed batch ${Math.floor(i/batchSize) + 1} of entity creation with ${batchResults.length} entities`);
        }
      }
      
      // Check for any failures
      const failures = entityResults.filter(result => !result.success);
      if (failures.length > 0) {
        console.error(`DEBUG: Failed to create ${failures.length} entities:`, failures);
        throw new Error(`Failed to create ${failures.length} entities. First error: ${failures[0].error}`);
      }
      
      // Extract the successful entity data for further processing
      const entitySavePromises = entityResults.map(result => result.data);

      try {
        // Since we've already processed all entities in batches above,
        // we can skip this additional Promise.all step which is now redundant
        console.log("DEBUG: All entity saves completed successfully.", 
          entityResults.filter(result => result.success).length, "entities saved");
        
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
          console.log("DEBUG: Cleared all setup data from localStorage");
        } catch (e) {
          console.warn("DEBUG: Error clearing localStorage:", e);
        }
        
        // Also clear session storage
        try {
          sessionStorage.removeItem('setupData');
          console.log("DEBUG: Cleared all setup data from sessionStorage");
        } catch (e) {
          console.warn("DEBUG: Error clearing sessionStorage:", e);
        }
        
        // 4. Invalidate query cache for dashboard data
        try {
          // Use the imported queryClient directly
          queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
          console.log("DEBUG: Invalidated query cache");
        } catch (e) {
          console.warn("DEBUG: Error invalidating cache:", e);
        }
        
        // 5. Call onComplete callback to trigger dashboard refresh
        if (onComplete) {
          console.log("DEBUG SetupStepper: API saves successful. Calling props.onComplete()...");
          console.log("DEBUG SetupStepper: onComplete callback type:", typeof onComplete);
          
          // Add try/catch to catch any errors in the callback execution
          try {
            onComplete();
            console.log("DEBUG SetupStepper: onComplete callback executed successfully!");
          } catch (callbackError) {
            console.error("DEBUG SetupStepper: Error executing onComplete callback:", callbackError);
          }
        } else {
          // Fallback - redirect to dashboard directly
          console.log("DEBUG: No onComplete callback, redirecting to dashboard");
          // Small delay to allow toasts to be seen
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        }
      } catch (entityError: any) {
        console.error("DEBUG: Error during entity save:", entityError);
        throw new Error(`Failed to save one or more entities: ${entityError.message}`);
      }
    } catch (error: any) {
      console.error("DEBUG: ERROR during handleCompleteSetup API calls:", error);
      // Show error toast
      toast({
        title: "Error Saving Data",
        description: error.message || "Failed to save client or entity data.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [clientData, setupEntities, onComplete, toast, setIsSubmitting, user]);
  
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
                open={true} // Always set to true when rendered in the stepper
              />
            )}
            
            {activeStep === 1 && (
              <>
                {console.log("DEBUG Stepper: Rendering EntityManagementCard with entities:", JSON.stringify(setupEntities))}
                <EntityManagementCard 
                  onNext={handleNextFromEntities}
                  onBack={handleBack}
                  clientData={clientData}
                  onEntityAdded={handleEntityAdd}
                  onEntityUpdated={handleEntityUpdated}
                  onEntityDeleted={handleEntityDelete}
                  entities={setupEntities}
                  entityData={setupEntities}
                  setEntityData={setSetupEntities}
                />
              </>
            )}
            
            {activeStep === 2 && (
              <>
                {console.log("DEBUG Stepper: Rendering SetupSummaryCard (Step 3). Entities:", JSON.stringify(setupEntities))}
                <SetupSummaryCard
                  clientData={clientData}
                  entityData={setupEntities}
                  onBack={handleBack}
                  onFinish={handleCompleteSetup}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}