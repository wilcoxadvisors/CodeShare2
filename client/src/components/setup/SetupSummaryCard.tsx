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
  
  // CRITICAL FIX: Add debugging for entity data in summary
  console.log("SUMMARY: Component mounted/updated with entityData:", 
    entityData ? entityData.length : 'null', 
    "entities. First entity ID:", entityData && entityData.length > 0 ? entityData[0].id : 'none');
    
  // Track client and entity data
  console.log("SUMMARY: clientData:", clientData ? Object.keys(clientData).length : 'null', "fields");
  
  // Log the full data for debugging
  if (entityData && entityData.length > 0) {
    console.log("SUMMARY: First entity full data:", JSON.stringify(entityData[0]));
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
              Entities {entityData ? `(${entityData.length})` : '(0)'}
            </h3>
            <div className="bg-muted/20 p-4 rounded-lg space-y-4">
              {(!entityData || entityData.length === 0) ? (
                <div className="text-center p-4 border border-dashed rounded">
                  <p className="text-muted-foreground">No entities have been added.</p>
                </div>
              ) : (
                <>
                  {/* Log the entity data being rendered for debugging */}
                  {console.log("DEBUG: Rendering entity data in summary:", JSON.stringify(entityData))}
                  
                  {entityData.map((entity, index) => (
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