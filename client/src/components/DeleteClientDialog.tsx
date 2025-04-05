import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number | null;
  clientName: string;
  onConfirm?: () => void;
}

const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onConfirm,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create the delete mutation
  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Client ID is required");
      
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete client");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      toast({
        title: "Success",
        description: `The client "${clientName}" has been successfully deleted.`,
        variant: "default",
      });
      
      // Close the dialog
      onClose();
      
      // Call the onConfirm callback if provided
      if (onConfirm) {
        onConfirm();
      }
    },
    onError: (error: Error) => {
      console.error("Delete client error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    }
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Client</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the client "{clientName}"? 
            This will soft-delete the client and all its associated data.
            You can restore it later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => deleteClientMutation.mutate()}
            disabled={deleteClientMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteClientMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteClientDialog;