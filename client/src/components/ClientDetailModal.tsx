import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import React from "react";
import { Loader2 } from "lucide-react";

interface ClientDetailModalProps {
  clientId: number | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Function to fetch client details
const fetchClientDetails = async (clientId: number): Promise<any> => { // We'll use any for now as the exact type may vary
  const response = await fetch(`/api/admin/clients/${clientId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch client details: ${response.statusText}`);
  }
  const result = await response.json();
  if (result.status !== 'success') {
     throw new Error(result.message || 'API returned non-success status');
  }
  // Assuming the data is nested under result.data based on adminRoutes.ts
  return result.data;
};

export function ClientDetailModal({ clientId, isOpen, onOpenChange }: ClientDetailModalProps) {
  const { data: clientData, isLoading, error, isError } = useQuery({
    queryKey: ["clientDetails", clientId],
    queryFn: () => fetchClientDetails(clientId!), // Add non-null assertion
    enabled: !!clientId && isOpen, // Only fetch when modal is open and clientId is valid
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Client Details</DialogTitle>
          <DialogDescription>
            Detailed information for the selected client.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading client details...</span>
            </div>
          )}
          
          {isError && (
            <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
              <p className="font-medium">Error fetching details:</p>
              <p>{error?.message || "Unknown error occurred"}</p>
            </div>
          )}
          
          {clientData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="font-medium">{clientData.name}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Legal Name</p>
                  <p>{clientData.legalName || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                  <p>{clientData.contactName || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                  <p>{clientData.contactEmail || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                  <p>{clientData.contactPhone || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p>{clientData.industry || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                  <p>{clientData.taxId || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p>{clientData.active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p>{clientData.address || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Website</p>
                <p>{clientData.website ? (
                  <a href={clientData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {clientData.website}
                  </a>
                ) : 'N/A'}</p>
              </div>
              
              {clientData.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p>{clientData.notes}</p>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Associated Entities:</h4>
                {clientData.entities && clientData.entities.length > 0 ? (
                  <ul className="space-y-1 list-disc list-inside">
                    {clientData.entities.map((entity: any) => (
                      <li key={entity.id}>{entity.name} (ID: {entity.id})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">No entities associated with this client.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
           <DialogClose asChild>
             <Button type="button" variant="secondary">
               Close
             </Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}