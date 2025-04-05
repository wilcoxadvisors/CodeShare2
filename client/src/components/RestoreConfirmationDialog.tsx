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

interface RestoreConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemType: 'client' | 'entity';
  itemName: string;
  onConfirm?: () => void;
}

const RestoreConfirmationDialog: React.FC<RestoreConfirmationDialogProps> = ({
  isOpen,
  onClose,
  itemId,
  itemType,
  itemName,
  onConfirm,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine the API endpoint based on the item type
  const endpoint = itemType === 'client' 
    ? `/api/admin/clients/${itemId}/restore` 
    : `/api/admin/entities/${itemId}/restore`;

  // Create the restore mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to restore ${itemType}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      toast({
        title: "Success",
        description: `The ${itemType} "${itemName}" has been successfully restored.`,
        variant: "default",
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error: Error) => {
      console.error(`Restore ${itemType} error:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to restore ${itemType}. Please try again.`,
        variant: "destructive",
      });
    }
  });

  const handleRestore = () => {
    restoreMutation.mutate();
    // Call the onConfirm callback if provided
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore {itemType.charAt(0).toUpperCase() + itemType.slice(1)}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to restore the {itemType} "{itemName}"? 
            This will make it active and visible in the system again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRestore}
            disabled={restoreMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {restoreMutation.isPending ? "Restoring..." : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RestoreConfirmationDialog;