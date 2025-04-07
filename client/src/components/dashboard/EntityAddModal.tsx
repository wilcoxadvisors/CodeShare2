import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { enhancedEntitySchema } from "@/lib/validation";
import { INDUSTRY_OPTIONS, ensureIndustryValue } from "@/lib/industryUtils";

// Entity form schema for create operation
const entityAddSchema = z.object({
  name: z.string().min(2, { message: "Entity name must be at least 2 characters" }),
  code: z.string().min(2, { message: "Entity code must be at least 2 characters" }),
  fiscalYearStart: z.string().default("01-01"),
  fiscalYearEnd: z.string().default("12-31"),
  industry: z.string().min(1, { message: "Please select an industry" }),
  currency: z.string().default("USD"),
  taxId: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().default(true),
});

type EntityAddFormValues = z.infer<typeof entityAddSchema>;

interface EntityAddModalProps {
  clientId: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddSuccess: () => void;
}

export function EntityAddModal({ clientId, isOpen, onOpenChange, onAddSuccess }: EntityAddModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form with default values
  const form = useForm<EntityAddFormValues>({
    resolver: zodResolver(entityAddSchema),
    defaultValues: {
      name: "",
      code: "",
      fiscalYearStart: "01-01",
      fiscalYearEnd: "12-31",
      industry: "",
      currency: "USD",
      taxId: "",
      address: "",
      active: true
    }
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: "",
        code: "",
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        industry: "",
        currency: "USD",
        taxId: "",
        address: "",
        active: true
      });
    }
  }, [isOpen, form]);

  // Create entity mutation
  const createEntityMutation = useMutation({
    mutationFn: async (data: EntityAddFormValues) => {
      const response = await fetch(`/api/admin/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          clientId: clientId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create entity');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entity created successfully",
      });
      
      // Close modal and invalidate queries to refresh data
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
      onAddSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entity. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (data: EntityAddFormValues) => {
    // Generate a code if not provided
    if (!data.code) {
      data.code = data.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100);
    }
    
    // Submit the data
    createEntityMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Entity</DialogTitle>
          <DialogDescription>Add a new entity for this client.</DialogDescription>
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
                      <Input placeholder="Enter entity name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter entity code" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short identifier (will be auto-generated if empty)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
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
                    <FormLabel>Tax ID / EIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tax ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fiscalYearStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year Start</FormLabel>
                    <FormControl>
                      <Input placeholder="MM-DD" {...field} />
                    </FormControl>
                    <FormDescription>
                      Format: MM-DD (e.g., 01-01)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fiscalYearEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year End</FormLabel>
                    <FormControl>
                      <Input placeholder="MM-DD" {...field} />
                    </FormControl>
                    <FormDescription>
                      Format: MM-DD (e.g., 12-31)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Entity Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter entity address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createEntityMutation.isPending}
              >
                {createEntityMutation.isPending && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                Create Entity
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}