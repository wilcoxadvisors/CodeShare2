import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { INDUSTRY_OPTIONS, ensureIndustryValue } from "@/lib/industryUtils";

// Client form schema
const clientEditSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters" }),
  legalName: z.string().optional(),
  industry: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid email address" }).optional().or(z.string().length(0)),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().optional().refine(
    (val) => !val || val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("www."),
    { message: "Website should start with http://, https://, or www." }
  ),
  notes: z.string().optional(),
  active: z.boolean().default(true)
});

type ClientEditFormValues = z.infer<typeof clientEditSchema>;

interface ClientEditFormProps {
  clientData: any;
  clientId: number;
  onUpdateSuccess: () => void;
}

export function ClientEditForm({ clientData, clientId, onUpdateSuccess }: ClientEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Normalize industry value 
  console.log("ClientEditForm: Raw client data received:", clientData);
  const normalizedIndustry = ensureIndustryValue(clientData.industry);
  console.log("ClientEditForm: Normalized industry value:", normalizedIndustry);
  
  // Initialize form with client data
  const form = useForm<ClientEditFormValues>({
    resolver: zodResolver(clientEditSchema),
    defaultValues: {
      name: clientData.name || "",
      legalName: clientData.legalName || "",
      industry: normalizedIndustry, // Use normalized industry value
      contactName: clientData.contactName || "",
      contactEmail: clientData.contactEmail || "",
      contactPhone: clientData.contactPhone || "",
      address: clientData.address || "",
      taxId: clientData.taxId || "",
      website: clientData.website || "",
      notes: clientData.notes || "",
      active: clientData.active || false
    }
  });
  
  // Debug effect to log form values
  useEffect(() => {
    console.log("Current form values:", form.getValues());
  }, [form]);

  // Create a mutation to update the client
  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientEditFormValues) => {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: clientId,
          ...data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update client');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ["clientDetails", clientId] });
      
      toast({
        title: "Success",
        description: "Client updated successfully.",
      });
      
      onUpdateSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: ClientEditFormValues) => {
    updateClientMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter client name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter legal name" {...field} />
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
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter contact name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter contact email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter contact phone" {...field} />
                </FormControl>
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
                  <Input placeholder="Enter tax ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
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
                <Textarea placeholder="Enter client address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter any additional notes" {...field} />
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
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Mark this client as active in the system
                </p>
              </div>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onUpdateSuccess}
            disabled={updateClientMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateClientMutation.isPending}
          >
            {updateClientMutation.isPending && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}