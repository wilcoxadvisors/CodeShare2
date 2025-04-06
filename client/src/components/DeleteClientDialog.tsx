import React, { useState } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Loader2, Trash, Trash2 } from "lucide-react";

interface DeleteClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number | null;
  clientName: string;
  isDeleted?: boolean; // Whether the client is already deleted (soft-deleted)
  onConfirm?: () => void;
}

const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  isDeleted = false,
  onConfirm,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [permanentDelete, setPermanentDelete] = useState(false);

  // Create the soft delete mutation
  const softDeleteClientMutation = useMutation({
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
        description: `The client "${clientName}" has been soft-deleted. It can be restored later if needed.`,
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

  // Create the permanent delete mutation
  const permanentDeleteClientMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Client ID is required");
      
      const response = await fetch(`/api/admin/clients/${clientId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to permanently delete client");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      toast({
        title: "Success",
        description: `The client "${clientName}" has been permanently deleted. This action cannot be undone.`,
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
      console.error("Permanent delete client error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to permanently delete client. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Determine which mutation to use based on current state
  const handleDelete = () => {
    if (isDeleted && permanentDelete) {
      permanentDeleteClientMutation.mutate();
    } else {
      softDeleteClientMutation.mutate();
    }
  };

  // Determine if any mutation is in progress
  const isLoading = softDeleteClientMutation.isPending || permanentDeleteClientMutation.isPending;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeleted ? "Permanently Delete Client" : "Delete Client"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {isDeleted ? (
              <>
                <p>
                  This client "{clientName}" is already soft-deleted.
                </p>
                <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-900">
                  <AlertOctagon className="h-5 w-5 text-amber-500" />
                  <span className="text-sm">
                    You can choose to permanently delete this client, which will remove all associated data and cannot be undone.
                  </span>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="permanent-delete" 
                    checked={permanentDelete} 
                    onCheckedChange={() => setPermanentDelete(!permanentDelete)}
                  />
                  <Label 
                    htmlFor="permanent-delete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I understand that permanently deleting this client will remove all its data and cannot be undone
                  </Label>
                </div>
              </>
            ) : (
              <p>
                Are you sure you want to delete the client "{clientName}"? 
                This will soft-delete the client and all its associated data.
                You can restore it later if needed.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isLoading || (isDeleted && !permanentDelete)}
            className={`${
              isDeleted && permanentDelete
                ? "bg-red-600 hover:bg-red-700"
                : "bg-destructive hover:bg-destructive/90"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isDeleted && permanentDelete ? (
              <Trash className="h-4 w-4 mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isDeleted && permanentDelete ? "Permanently Delete" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteClientDialog;