import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { ClientEditForm } from "./ClientEditForm";
import { Loader2 } from "lucide-react";

interface ClientEditModalProps {
  clientId: number | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Fetch function for client details
const fetchClientDetails = async (clientId: number): Promise<any> => {
  const response = await fetch(`/api/admin/clients/${clientId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch client details');
  }
  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'API returned non-success status');
  }
  return result.data;
};

export function ClientEditModal({ clientId, isOpen, onOpenChange }: ClientEditModalProps) {
  const { data: clientData, isLoading, isError, error } = useQuery({
    queryKey: ["clientDetails", clientId],
    queryFn: () => fetchClientDetails(clientId!),
    enabled: !!clientId && isOpen, // Only fetch when modal is open and clientId is valid
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleUpdateSuccess = () => {
    console.log('Client update successful, closing modal.');
    onOpenChange(false); // Close modal on success
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>Modify the client's details below.</DialogDescription>
        </DialogHeader>
        
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading client data...</span>
          </div>
        )}
        
        {isError && (
          <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
            <p className="font-medium">Error loading data:</p>
            <p>{error?.message || "Unknown error occurred"}</p>
          </div>
        )}
        
        {clientData && clientId && (
          <ClientEditForm
            clientData={clientData}
            clientId={clientId}
            onUpdateSuccess={handleUpdateSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}