import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  
  // CRITICAL FIX: Much more comprehensive debugging for entity data in summary
  console.log("SUMMARY: Component mounted/updated with entityData:", 
    entityData ? entityData.length : 'null', 
    "entities. First entity ID:", entityData && entityData.length > 0 ? entityData[0].id : 'none');
    
  // Track client and entity data with more detail
  console.log("SUMMARY: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
  
  // Log entity data details for debugging, with much more information
  if (entityData) {
    console.log("SUMMARY: Entity data type:", typeof entityData);
    console.log("SUMMARY: Is entity data an array?", Array.isArray(entityData));
    
    if (Array.isArray(entityData) && entityData.length > 0) {
      // Log info about each entity (limited to first 3 to avoid overwhelming the console)
      const entitiesToLog = entityData.slice(0, 3); // Only log first 3
      entitiesToLog.forEach((entity, index) => {
        console.log(`SUMMARY: Entity #${index+1} ID:`, entity.id);
        console.log(`SUMMARY: Entity #${index+1} Name:`, entity.name);
        console.log(`SUMMARY: Entity #${index+1} Properties:`, Object.keys(entity).join(', '));
      });
      
      // Log specifically what properties we'll be using in the render
      if (entityData[0]) {
        console.log("SUMMARY: First entity critical properties:", {
          id: entityData[0].id,
          name: entityData[0].name,
          entityType: entityData[0].entityType,
          industry: entityData[0].industry,
          taxId: entityData[0].taxId,
          code: entityData[0].code
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
      console.log("DEBUG: Finishing setup with entity data:", entityData); 
      
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
                    <p>{clientData.industry}</p>
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
              Entities {(entityData && Array.isArray(entityData)) ? `(${entityData.length})` : '(0)'}
            </h3>
            <div className="bg-muted/20 p-4 rounded-lg space-y-4">
              {/* CRITICAL FIX: Improved null/empty check with explicit array validation */}
              {(!entityData || !Array.isArray(entityData) || entityData.length === 0) ? (
                <div className="text-center p-4 border border-dashed rounded">
                  <p className="text-muted-foreground">No entities have been added.</p>
                  {/* Add debug info if there's a problem with the entityData format */}
                  {entityData && !Array.isArray(entityData) && (
                    <p className="text-xs text-destructive mt-2">
                      Error: Entity data is not in the correct format. Please go back and try again.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* CRITICAL FIX: Extra safety check and debugging for entity rendering */}
                  {console.log("DEBUG: About to render entity list with type checks:", {
                    isEntityDataDefined: Boolean(entityData),
                    isArray: Array.isArray(entityData),
                    length: entityData ? entityData.length : 0
                  })}
                  
                  {/* Make absolutely sure entityData is an array before calling map */}
                  {Array.isArray(entityData) && entityData.map((entity, index) => (
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
                          <p>{entity.industry || "N/A"}</p>
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