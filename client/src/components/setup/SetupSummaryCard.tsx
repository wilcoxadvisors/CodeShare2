import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SetupSummaryCardProps {
  clientData: any;
  entities: any[];
  onComplete: () => void;
  onBack: () => void;
}

export default function SetupSummaryCard({ clientData, entities, onComplete, onBack }: SetupSummaryCardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation to mark setup as complete
  const completeSetupMutation = useMutation({
    mutationFn: async () => {
      // Here you would make an API call to mark the setup as complete
      // For now, we'll just simulate a successful API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: "Setup Complete",
        description: "Your account setup has been completed successfully.",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle completion button click
  const handleComplete = () => {
    setIsSubmitting(true);
    completeSetupMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          Setup Summary
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">Review your setup information before completing the process.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Review the information below and click "Complete Setup" to finish the process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Client Information Section */}
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Client Information
            </h3>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name:</p>
                <p className="font-medium">{clientData?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Legal Name:</p>
                <p className="font-medium">{clientData?.legalName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry:</p>
                <p className="font-medium">{clientData?.industry || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tax ID:</p>
                <p className="font-medium">{clientData?.taxId || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">{clientData?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone:</p>
                <p className="font-medium">{clientData?.phone || "N/A"}</p>
              </div>
              {clientData?.address && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address:</p>
                  <p className="font-medium">{clientData.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Entities Section */}
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Entities ({entities.length})
            </h3>
            <Separator className="my-2" />
            {entities.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No entities have been created yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {entities.map((entity, index) => (
                  <div key={entity.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{entity.name}</h4>
                      <Badge>{entity.entityType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{entity.legalName}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Industry:</p>
                        <p className="text-sm">{entity.industry || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tax ID:</p>
                        <p className="text-sm">{entity.taxId || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Steps Section */}
          <div className="bg-muted/50 p-4 rounded-md">
            <h3 className="text-lg font-medium">Next Steps After Setup</h3>
            <ul className="mt-2 space-y-2 list-disc list-inside text-sm">
              <li>Set up your chart of accounts</li>
              <li>Configure advanced entity settings</li>
              <li>Import existing financial data</li>
              <li>Add team members and assign roles</li>
              <li>Set up consolidation groups (if needed)</li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          onClick={handleComplete} 
          disabled={isSubmitting || entities.length === 0}
        >
          {isSubmitting ? "Completing..." : "Complete Setup"}
        </Button>
      </CardFooter>
    </Card>
  );
}