import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, ArchiveRestore, Trash2, Power } from "lucide-react";
import { INDUSTRY_OPTIONS } from "@/lib/industryUtils";

// Entity form schema
const entityEditSchema = z.object({
  name: z.string().min(2, { message: "Entity name must be at least 2 characters" }),
  industry: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.string().length(0)),
  active: z.boolean().default(true)
});

type EntityEditFormValues = z.infer<typeof entityEditSchema>;

interface EntityEditModalProps {
  entity: any | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateSuccess: () => void;
}

export function EntityEditModal({ entity, isOpen, onOpenChange, onUpdateSuccess }: EntityEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInactiveDialogOpen, setIsInactiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  // Initialize form with entity data
  const form = useForm<EntityEditFormValues>({
    resolver: zodResolver(entityEditSchema),
    defaultValues: {
      name: entity?.name || "",
      industry: entity?.industry || "",
      taxId: entity?.taxId || "",
      address: entity?.address || "",
      phone: entity?.phone || "",
      email: entity?.email || "",
      active: entity?.active || false
    }
  });

  // Reset form when entity changes
  React.useEffect(() => {
    if (entity && isOpen) {
      form.reset({
        name: entity.name || "",
        industry: entity.industry || "",
        taxId: entity.taxId || "",
        address: entity.address || "",
        phone: entity.phone || "",
        email: entity.email || "",
        active: entity.active || false
      });
    }
  }, [entity, form, isOpen]);

  // Create a mutation to update the entity
  const updateEntityMutation = useMutation({
    mutationFn: async (data: EntityEditFormValues) => {
      const response = await fetch(`/api/admin/entities/${entity?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: entity?.id,
          ...data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update entity');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Invalidate the client details query to update the entity list
      if (entity?.clientId) {
        queryClient.invalidateQueries({ queryKey: ["clientDetails", entity.clientId] });
      }
      
      toast({
        title: "Success",
        description: "Entity updated successfully.",
      });
      
      onUpdateSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entity. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create mutation for setting entity inactive
  const setInactiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/entities/${entity?.id}/set-inactive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set entity inactive');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Invalidate the client details query to update the entity list
      if (entity?.clientId) {
        queryClient.invalidateQueries({ queryKey: ["clientDetails", entity.clientId] });
      }
      
      toast({
        title: "Success",
        description: "Entity set to inactive successfully.",
      });
      
      setIsInactiveDialogOpen(false);
      onUpdateSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set entity inactive. Please try again.",
        variant: "destructive",
      });
      setIsInactiveDialogOpen(false);
    }
  });

  // Create mutation for soft-deleting the entity
  const softDeleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/entities/${entity?.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete entity');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Invalidate the client details query to update the entity list
      if (entity?.clientId) {
        queryClient.invalidateQueries({ queryKey: ["clientDetails", entity.clientId] });
      }
      
      toast({
        title: "Success",
        description: "Entity deleted successfully.",
      });
      
      setIsDeleteDialogOpen(false);
      onUpdateSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity. Please try again.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  });

  // Create mutation for restoring the entity
  const restoreEntityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/entities/${entity?.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore entity');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Invalidate the client details query to update the entity list
      if (entity?.clientId) {
        queryClient.invalidateQueries({ queryKey: ["clientDetails", entity.clientId] });
      }
      
      toast({
        title: "Success",
        description: "Entity restored successfully.",
      });
      
      setIsRestoreDialogOpen(false);
      onUpdateSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore entity. Please try again.",
        variant: "destructive",
      });
      setIsRestoreDialogOpen(false);
    }
  });

  // Handle form submission
  const onSubmit = (data: EntityEditFormValues) => {
    updateEntityMutation.mutate(data);
  };

  // Check if entity is soft-deleted
  const isDeleted = entity?.deletedAt !== null && entity?.deletedAt !== undefined;

  if (!entity) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Entity</DialogTitle>
            <DialogDescription>
              Modify the entity's details below.
              {isDeleted && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-destructive">
                  This entity is currently deleted. Restore it to make it available again.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter entity name" {...field} disabled={isDeleted} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        disabled={isDeleted}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRY_OPTIONS.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tax ID" {...field} disabled={isDeleted} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} disabled={isDeleted} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} disabled={isDeleted} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter entity address" {...field} disabled={isDeleted} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isDeleted}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this entity as active in the system
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between space-x-2 pt-4 border-t mt-6">
                <div className="space-x-2">
                  {!isDeleted ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsInactiveDialogOpen(true)}
                        disabled={updateEntityMutation.isPending || !entity.active}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        Set Inactive
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={updateEntityMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRestoreDialogOpen(true)}
                      disabled={updateEntityMutation.isPending}
                    >
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={updateEntityMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateEntityMutation.isPending || isDeleted}
                  >
                    {updateEntityMutation.isPending && (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Set Inactive Confirmation Dialog */}
      <AlertDialog open={isInactiveDialogOpen} onOpenChange={setIsInactiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Entity Inactive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set "{entity.name}" to inactive? 
              This will mark the entity as inactive in the system but it will still be available for viewing and reporting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => setInactiveMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {setInactiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Set Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entity.name}"? 
              This will soft-delete the entity from the system. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => softDeleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {softDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore "{entity.name}"? 
              This will restore the deleted entity and make it available in the system again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => restoreEntityMutation.mutate()}
            >
              {restoreEntityMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArchiveRestore className="h-4 w-4 mr-2" />
              )}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}