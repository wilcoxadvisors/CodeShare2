import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Industry options - same as in EntityManagementCard for consistency
const INDUSTRY_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "healthcare", label: "Healthcare" },
  { value: "tech", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "construction", label: "Construction" },
  { value: "hospitality", label: "Hospitality" },
  { value: "services", label: "Professional Services" },
  { value: "other", label: "Other" }
];

interface SetupSummaryCardProps {
  clientData: any;
  entityData?: any[];
  onBack?: () => void;
  onFinish: () => void;
}

export default function SetupSummaryCard({ 
  clientData, 
  entityData = [],
  onBack,
  onFinish 
}: SetupSummaryCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CRITICAL FIX 4.0: Try to recover entity data if it's somehow missing
  const [fixedEntityData, setFixedEntityData] = useState<any[] | null>(null);
  
  // First, try to get entity data from session storage as a last resort if props.entityData is empty
  useEffect(() => {
    console.log("SUMMARY INIT: Checking entity data from props:", 
      entityData ? `array with ${entityData.length} items` : 'null/undefined');
    
    // If entityData is missing or empty but we know we should have some, try to recover from session storage
    if ((!entityData || !Array.isArray(entityData) || entityData.length === 0) && clientData) {
      console.log("SUMMARY RECOVERY: Entity data missing or empty, attempting recovery from sessionStorage");
      
      try {
        const savedData = sessionStorage.getItem('setupData');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          
          if (parsedData.entityData && Array.isArray(parsedData.entityData) && parsedData.entityData.length > 0) {
            console.log("SUMMARY RECOVERY: Found entity data in sessionStorage:", parsedData.entityData.length, "entities");
            setFixedEntityData(parsedData.entityData);
          } else {
            console.log("SUMMARY RECOVERY: No entity data in sessionStorage either");
          }
        }
      } catch (error) {
        console.error("SUMMARY RECOVERY: Failed to recover entities from sessionStorage:", error);
      }
    } else if (entityData && Array.isArray(entityData) && entityData.length > 0) {
      // If we have valid entity data from props, use that
      console.log("SUMMARY INIT: Using entityData from props:", entityData.length, "entities");
      setFixedEntityData(entityData);
    }
  }, [entityData, clientData]);
  
  // Use either the recovered entity data or the original props
  const displayEntityData = fixedEntityData || entityData;
  
  // CRITICAL FIX: Much more comprehensive debugging for entity data in summary
  console.log("SUMMARY: Component mounted/updated with entityData:", 
    displayEntityData ? displayEntityData.length : 'null', 
    "entities. First entity ID:", displayEntityData && displayEntityData.length > 0 ? displayEntityData[0].id : 'none');
    
  // Track client and entity data with more detail
  console.log("SUMMARY: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
  
  // Log entity data details for debugging, with much more information
  if (displayEntityData) {
    console.log("SUMMARY: Entity data type:", typeof displayEntityData);
    console.log("SUMMARY: Is entity data an array?", Array.isArray(displayEntityData));
    
    if (Array.isArray(displayEntityData) && displayEntityData.length > 0) {
      // Log info about each entity (limited to first 3 to avoid overwhelming the console)
      const entitiesToLog = displayEntityData.slice(0, 3); // Only log first 3
      entitiesToLog.forEach((entity, index) => {
        console.log(`SUMMARY: Entity #${index+1} ID:`, entity.id);
        console.log(`SUMMARY: Entity #${index+1} Name:`, entity.name);
        console.log(`SUMMARY: Entity #${index+1} Properties:`, Object.keys(entity).join(', '));
      });
      
      // Log specifically what properties we'll be using in the render
      if (displayEntityData[0]) {
        console.log("SUMMARY: First entity critical properties:", {
          id: displayEntityData[0].id,
          name: displayEntityData[0].name,
          entityType: displayEntityData[0].entityType,
          industry: displayEntityData[0].industry,
          taxId: displayEntityData[0].taxId,
          code: displayEntityData[0].code
        });
      }
    } else {
      console.log("SUMMARY: No entities to display");
    }
  } else {
    console.log("SUMMARY: Entity data is null or undefined");
  }

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // Log setup data being saved for debugging
      console.log("DEBUG: Finishing setup with client data:", clientData);
      console.log("DEBUG: Finishing setup with entity data:", displayEntityData || entityData); 
      
      // CRITICAL FIX 4.0: Save final data to session storage before finishing
      // This ensures that if the finish operation needs to be restarted, 
      // we still have the correct data
      try {
        const setupData = {
          clientData: clientData,
          entityData: displayEntityData || entityData,
          currentStep: "summary" // Keep at summary step
        };
        sessionStorage.setItem('setupData', JSON.stringify(setupData));
        console.log("SUMMARY FINAL: Saved complete final data to session storage");
      } catch (storageError) {
        console.error("SUMMARY FINAL: Failed to save final data to session storage:", storageError);
        // Continue anyway since we will finish the process
      }
      
      // Use a simpler approach - just display a success toast and call onFinish immediately
      // The Dashboard component will handle the cache invalidation and refreshing
      toast({
        title: "Setup Complete!",
        description: "Client added successfully",
      });
      
      // Call onFinish immediately - the parent will handle data refreshing
      onFinish();
    } catch (error: any) {
      console.error("ERROR: Error completing setup:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete setup.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Setup Summary</CardTitle>
        <CardDescription>
          Review your information and complete the setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Client Information Summary */}
          {clientData && (
            <div>
              <h3 className="text-lg font-medium mb-4">Client Information</h3>
              <div className="bg-muted/20 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                    <p>{clientData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Legal Name</p>
                    <p>{clientData.legalName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Industry</p>
                    <p>{INDUSTRY_OPTIONS.find(opt => opt.value === clientData.industry)?.label || clientData.industry || "N/A"}</p>
                  </div>
                  {clientData.taxId && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                      <p>{clientData.taxId}</p>
                    </div>
                  )}
                  {clientData.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p>{clientData.email}</p>
                    </div>
                  )}
                  {clientData.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{clientData.phone}</p>
                    </div>
                  )}
                </div>
                
                {clientData.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{clientData.address}</p>
                  </div>
                )}
                
                {clientData.website && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Website</p>
                    <p>{clientData.website}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Entity Information Summary */}
          <div>
            <h3 className="text-lg font-medium mb-4">
              Entities {(displayEntityData && Array.isArray(displayEntityData)) ? `(${displayEntityData.length})` : '(0)'}
            </h3>
            <div className="bg-muted/20 p-4 rounded-lg space-y-4">
              {/* CRITICAL FIX 4.0: Using displayEntityData which includes recovery mechanism */}
              {(!displayEntityData || !Array.isArray(displayEntityData) || displayEntityData.length === 0) ? (
                <div className="text-center p-4 border border-dashed rounded">
                  <p className="text-muted-foreground">No entities have been added.</p>
                  {/* Add debug info if there's a problem with the entityData format */}
                  {displayEntityData && !Array.isArray(displayEntityData) && (
                    <p className="text-xs text-destructive mt-2">
                      Error: Entity data is not in the correct format. Please go back and try again.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* CRITICAL FIX: Extra safety check and debugging for entity rendering */}
                  {console.log("DEBUG: About to render entity list with type checks:", {
                    isEntityDataDefined: Boolean(displayEntityData),
                    isArray: Array.isArray(displayEntityData),
                    length: displayEntityData ? displayEntityData.length : 0
                  })}
                  
                  {/* Make absolutely sure entityData is an array before calling map */}
                  {Array.isArray(displayEntityData) && displayEntityData.map((entity, index) => (
                    <div key={entity.id || `entity-${index}`} className="p-3 border rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Name</p>
                          <p className="font-medium">{entity.name || "Unnamed Entity"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Type</p>
                          <p>{entity.entityType || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Industry</p>
                          <p>{INDUSTRY_OPTIONS.find(opt => opt.value === entity.industry)?.label || entity.industry || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Entity ID</p>
                          <p>{entity.id || "Not yet assigned"}</p>
                        </div>
                        {entity.taxId && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                            <p>{entity.taxId}</p>
                          </div>
                        )}
                        {entity.code && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Code</p>
                            <p>{entity.code}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          
          <div className="border-t pt-6 text-center">
            <p className="mb-4 text-muted-foreground">
              Click the button below to complete the setup and add this client to your account.
            </p>
            <Button onClick={handleFinish} disabled={isSubmitting} className="min-w-[200px]">
              {isSubmitting ? "Completing..." : "Finish & Add Client"}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </CardFooter>
    </Card>
  );
}