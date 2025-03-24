import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Plus, Edit, Trash2, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "@shared/schema";

// Industry options
const INDUSTRY_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "healthcare", label: "Healthcare" },
  { value: "tech", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "construction", label: "Construction" },
  { value: "hospitality", label: "Hospitality" },
  { value: "services", label: "Professional Services" },
  { value: "other", label: "Other" }
];

// Entity type options
const ENTITY_TYPE_OPTIONS = [
  { value: "llc", label: "LLC" },
  { value: "partnership", label: "Partnership" },
  { value: "soleProprietorship", label: "Sole Proprietorship" },
  { value: "corporation", label: "Corporation" },
  { value: "nonprofit", label: "Non-profit" },
  { value: "other", label: "Other" }
];

// Define schema for entity form
const entitySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  legalName: z.string().min(2, { message: "Legal name must be at least 2 characters." }),
  taxId: z.string().optional(),
  entityType: z.string().min(1, { message: "Please select an entity type" }),
  industry: z.string().min(1, { message: "Please select an industry" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }).optional(),
  ownerId: z.number().optional()
});

type EntityFormValues = z.infer<typeof entitySchema>;

interface EntityManagementCardProps {
  onNext: () => void;
  clientData?: any;
}

export default function EntityManagementCard({ onNext, clientData }: EntityManagementCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState<number | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Fetch entities
  const { data: entities = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/entities'],
    enabled: !!user
  });
  
  // Initialize form with empty values (not pre-populated from client data)
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: "",
      legalName: "",
      taxId: "",
      entityType: "llc",
      industry: "",
      address: "",
      phone: "",
      email: "",
      ownerId: user?.id
    }
  });
  
  // Helper function to create entity from client data
  const populateFromClientData = () => {
    if (clientData) {
      form.reset({
        name: clientData.name || "",
        legalName: clientData.legalName || "",
        taxId: clientData.taxId || "",
        entityType: "llc",
        industry: clientData.industry || "",
        address: clientData.address || "",
        phone: clientData.phone || "",
        email: clientData.email || "",
        ownerId: user?.id
      });
      
      toast({
        title: "Form Populated",
        description: "Entity form has been populated with client data.",
      });
    }
  };
  
  // Create entity mutation
  const createEntityMutation = useMutation({
    mutationFn: async (data: EntityFormValues) => {
      // Ensure ownerId is explicitly set
      if (!data.ownerId && user?.id) {
        data.ownerId = user.id;
      }
      
      if (!data.ownerId) {
        throw new Error("Owner ID is required but missing. Please try logging in again.");
      }
      
      // Always use admin endpoint if user is admin 
      const endpoint = isAdmin ? '/api/admin/entities' : '/api/entities';

      const cleanedData = {
        name: data.name,
        legalName: data.legalName,
        entityType: data.entityType || 'llc',
        industry: data.industry,
        taxId: data.taxId,
        address: data.address,
        phone: data.phone,
        email: data.email,
        ownerId: data.ownerId,
        isActive: true,
        createdBy: user?.id
      };
      
      console.log("Creating entity with data:", cleanedData);
      
      return await apiRequest(endpoint, {
        method: 'POST',
        data: cleanedData
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entity created successfully.",
      });
      form.reset({
        name: "",
        legalName: "",
        taxId: "",
        entityType: "llc",
        industry: "",
        address: "",
        phone: "",
        email: "",
        ownerId: user?.id
      });
      refetch();
      setIsEditing(false);
      setCurrentEntityId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entity.",
        variant: "destructive",
      });
    }
  });
  
  // Update entity mutation
  const updateEntityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: EntityFormValues }) => {
      // Use admin endpoint if user is admin
      const endpoint = isAdmin ? `/api/admin/entities/${id}` : `/api/entities/${id}`;
      
      // Ensure ownerId is set
      if (!data.ownerId && user?.id) {
        data.ownerId = user.id;
      }
      
      const cleanedData = {
        name: data.name,
        legalName: data.legalName,
        entityType: data.entityType || 'llc',
        industry: data.industry,
        taxId: data.taxId,
        address: data.address,
        phone: data.phone,
        email: data.email,
        ownerId: data.ownerId,
        isActive: true
      };

      console.log("Updating entity with data:", cleanedData);
      
      return await apiRequest(endpoint, {
        method: 'PUT',
        data: cleanedData
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entity updated successfully.",
      });
      form.reset({
        name: "",
        legalName: "",
        taxId: "",
        entityType: "llc",
        industry: "",
        address: "",
        phone: "",
        email: "",
        ownerId: user?.id
      });
      refetch();
      setIsEditing(false);
      setCurrentEntityId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entity.",
        variant: "destructive",
      });
    }
  });
  
  // Delete entity mutation
  const deleteEntityMutation = useMutation({
    mutationFn: async (id: number) => {
      // Use admin endpoint if user is admin
      const endpoint = isAdmin ? `/api/admin/entities/${id}` : `/api/entities/${id}`;
      return await apiRequest(endpoint, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entity deleted successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entity.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: EntityFormValues) => {
    setIsSubmitting(true);
    
    // Always ensure ownerId is set
    if (!data.ownerId && user?.id) {
      data.ownerId = user.id;
    }
    
    try {
      if (!data.ownerId) {
        toast({
          title: "Error",
          description: "Owner ID is required. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }
      
      if (isEditing && currentEntityId) {
        await updateEntityMutation.mutateAsync({ id: currentEntityId, data });
      } else {
        await createEntityMutation.mutateAsync(data);
      }
    } catch (error: any) {
      console.error("Error submitting entity form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save entity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Edit entity
  const handleEditEntity = (entity: any) => {
    setIsEditing(true);
    setCurrentEntityId(entity.id);
    
    // Reset form with entity data
    form.reset({
      name: entity.name,
      legalName: entity.legalName,
      taxId: entity.taxId || "",
      entityType: entity.entityType || "llc",
      industry: entity.industry,
      address: entity.address || "",
      phone: entity.phone || "",
      email: entity.email || "",
      ownerId: entity.ownerId || user?.id
    });
  };
  
  // Delete entity
  const handleDeleteEntity = (id: number) => {
    if (window.confirm("Are you sure you want to delete this entity?")) {
      deleteEntityMutation.mutate(id);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentEntityId(null);
    form.reset({
      name: "",
      legalName: "",
      taxId: "",
      entityType: "llc",
      industry: "",
      address: "",
      phone: "",
      email: "",
      ownerId: user?.id
    });
  };
  
  // Check if we can proceed to next step (at least one entity needed)
  const canProceed = entities && entities.length > 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          Entity Management
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">Create at least one business entity to continue. Entities represent your businesses or financial units.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Add and manage your business entities. You need at least one entity to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {isEditing ? "Edit Entity" : "Add New Entity"}
            </h3>
            {clientData && !isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={populateFromClientData}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                Use Client Data
              </Button>
            )}
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Business" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name used for this business entity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Business LLC" {...field} />
                      </FormControl>
                      <FormDescription>
                        The legally registered name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ENTITY_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The legal structure of this entity
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an industry" />
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
                      <FormDescription>
                        The primary industry this entity operates in
                      </FormDescription>
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
                        <Input placeholder="XX-XXXXXXX" {...field} />
                      </FormControl>
                      <FormDescription>
                        Tax identification number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="entity@example.com" {...field} />
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
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="123 Main St, City, State, ZIP"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : isEditing ? "Update Entity" : "Add Entity"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Your Entities</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : entities.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground mb-4">
                You haven't created any entities yet. Add your first entity above.
              </p>
              <Badge variant="outline" className="mx-auto">
                At least one entity required
              </Badge>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity: any) => (
                    <TableRow key={entity.id}>
                      <TableCell className="font-medium">{entity.name}</TableCell>
                      <TableCell>{entity.entityType || "LLC"}</TableCell>
                      <TableCell>{entity.industry}</TableCell>
                      <TableCell>
                        <Badge variant={entity.isActive ? "default" : "outline"} className="flex items-center w-fit">
                          {entity.isActive ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntity(entity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntity(entity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {!canProceed ? "Add at least one entity to continue" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}