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
  email: z.string().optional().refine(
    (val) => !val || val === "" || val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    { message: "Please enter a valid email address if providing one" }
  ),
  ownerId: z.number().optional(),
  // Code is required in database schema
  code: z.string().min(2, { message: "Code must be at least 2 characters." })
});

type EntityFormValues = z.infer<typeof entitySchema>;

interface EntityManagementCardProps {
  onNext: (entities: any[]) => void;
  onBack?: () => void;
  clientData?: any;
  setEntityData?: (entities: any[]) => void;
  // Add initial entity data from parent component
  entityData?: any[];
}

export default function EntityManagementCard({ 
  onNext, 
  onBack, 
  clientData, 
  setEntityData,
  entityData // Add the entityData prop to the destructuring 
}: EntityManagementCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState<number | null>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Local state to track entities created in this setup flow
  // Simple state for tracking entities in this component
  const [setupEntities, setSetupEntities] = useState<any[]>(entityData || []);
  
  // Fetch all entities (but we'll only use setupEntities for display)
  const { data: allEntities = [], isLoading, refetch } = useQuery<any[]>({
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
      ownerId: user?.id,
      code: ""
    }
  });
  
  // Helper function to determine entity active status consistently
  // This handles the different property names used (active vs isActive)
  const getEntityActiveStatus = (entity: any): boolean => {
    // Check both property names and default to true for new entities
    return entity.isActive === undefined ? 
      (entity.active === undefined ? true : Boolean(entity.active)) : 
      Boolean(entity.isActive);
  };
  
  // Helper function to create entity from client data
  const populateFromClientData = () => {
    console.log("POPULATE: Using client data to pre-fill entity form", clientData);
    if (clientData) {
      // Set form values
      form.reset({
        name: clientData.name || "",
        legalName: clientData.legalName || "",
        taxId: clientData.taxId || "",
        entityType: "llc",
        industry: clientData.industry || "",
        address: clientData.address || "",
        phone: clientData.phone || "",
        email: clientData.email || "",
        ownerId: user?.id,
        code: clientData.code || ""
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

      // Initialize with required fields
      const cleanedData: any = {
        name: data.name,
        legalName: data.legalName,
        entityType: data.entityType || 'llc',
        industry: data.industry,
        active: true, // Using 'active' instead of 'isActive' to match schema
        // Generate a code from the name if not provided
        code: data.code || data.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100),
        // Set default fiscal year values
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD"
      };

      // Add optional fields only if they have values
      if (data.taxId) cleanedData.taxId = data.taxId;
      if (data.address) cleanedData.address = data.address;
      if (data.phone) cleanedData.phone = data.phone;
      if (data.email) cleanedData.email = data.email;
      
      // Always include owner info
      cleanedData.ownerId = data.ownerId;
      if (user?.id) cleanedData.createdBy = user.id;
      
      // Include clientId from clientData if available (critical for client-entity relationship)
      if (clientData && clientData.id) {
        cleanedData.clientId = clientData.id;
        console.log("Setting clientId in entity creation:", clientData.id);
      }
      
      // Log the complete entity data
      console.log("Creating entity with data:", cleanedData);
      
      // Make API request and parse the JSON response
      const response = await apiRequest(endpoint, {
        method: 'POST',
        data: cleanedData
      });
      
      // Parse the response JSON
      const jsonData = await response.json();
      console.log("Entity creation API response:", jsonData);
      
      // Return the entity data from the response
      return jsonData.data;
    },
    onSuccess: (response) => {
      console.log("Entity created successfully:", response);
      
      toast({
        title: "Success",
        description: "Entity created successfully.",
      });
      
      // Reset form
      form.reset({
        name: "",
        legalName: "",
        taxId: "",
        entityType: "llc",
        industry: "",
        address: "",
        phone: "",
        email: "",
        ownerId: user?.id,
        code: ""
      });
      
      // CRITICAL FIX: Handle entity creation more robustly
      if (response) {
        // Cast the response to any type to access dynamic properties
        const respData = response as any;
        
        // Convert the response to a proper entity structure with required fields
        const entityData = {
          id: respData.id,
          name: respData.name || "",
          legalName: respData.legalName || "",
          entityType: respData.entityType || "llc",
          industry: respData.industry || "",
          active: respData.active === undefined ? true : respData.active,
          isActive: respData.isActive === undefined ? true : respData.isActive,
          code: respData.code || "",
          ...respData // Include any other fields from the response
        };
        
        console.log("ENTITY CREATION: Adding to setupEntities and updating parent:", entityData);
        
        // CRITICAL FIX: Completely rewrite how state is updated
        // This flow fixes the issue with entities being lost
        
        setSetupEntities(prev => {
          // First, make a deep copy of the previous state
          let prevCopy;
          try {
            prevCopy = JSON.parse(JSON.stringify(prev)) || [];
          } catch (e: any) {
            console.error("Failed to deep copy previous entities:", e);
            prevCopy = [];
          }
          
          // Check if the entity already exists by ID to avoid duplicates
          const exists = prevCopy.some((e: any) => e.id === entityData.id);
          
          // Create the new entities array with deep copies to avoid reference issues
          const updatedEntities = exists 
            ? prevCopy.map((e: any) => e.id === entityData.id ? {...entityData} : {...e}) 
            : [...prevCopy, {...entityData}]; 
          
          console.log("ENTITY CREATION: Local state updated, now have", updatedEntities.length, "entities");
          
          // CRITICAL FIX: Save immediately to sessionStorage for safety
          try {
            const setupData = sessionStorage.getItem('setupData');
            if (setupData) {
              const parsedData = JSON.parse(setupData);
              
              // Create a complete fresh copy of the updated entities
              const storageCopy = JSON.parse(JSON.stringify(updatedEntities));
              
              // Update the storage
              parsedData.entityData = storageCopy;
              
              // Save back to sessionStorage
              sessionStorage.setItem('setupData', JSON.stringify(parsedData));
              console.log("CRITICAL FIX: Updated sessionStorage with", storageCopy.length, "entities");
            }
          } catch (error) {
            console.error("CRITICAL ERROR: Failed to update sessionStorage:", error);
          }
          
          // CRITICAL FIX: Also update parent component state with a fresh copy
          if (setEntityData) {
            // Create a completely fresh copy to avoid any shared references
            const parentCopy = JSON.parse(JSON.stringify(updatedEntities));
            console.log("ENTITY CREATION: Updating parent with deep copied entity array:", parentCopy.length, "entities");
            setEntityData(parentCopy);
          }
          
          return updatedEntities;
        });
      }
      
      // Global data refresh
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
      
      // Initialize with required fields
      const cleanedData: any = {
        name: data.name,
        legalName: data.legalName,
        entityType: data.entityType || 'llc',
        industry: data.industry,
        active: true, // Using 'active' instead of 'isActive' to match schema
        // Generate a code from the name if not provided
        code: data.code || data.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100),
        // Set default fiscal year values if updating
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD"
      };

      // Add optional fields only if they have values
      if (data.taxId) cleanedData.taxId = data.taxId;
      if (data.address) cleanedData.address = data.address;
      if (data.phone) cleanedData.phone = data.phone;
      if (data.email) cleanedData.email = data.email;
      
      // Always include owner info
      cleanedData.ownerId = data.ownerId;
      
      // Include clientId from clientData if available (critical for client-entity relationship)
      if (clientData && clientData.id) {
        cleanedData.clientId = clientData.id;
        console.log("Setting clientId in entity update:", clientData.id);
      }

      console.log("Updating entity with data:", cleanedData);
      
      // Make API request and parse the JSON response
      const response = await apiRequest(endpoint, {
        method: 'PUT',
        data: cleanedData
      });
      
      // Parse the response JSON
      const jsonData = await response.json();
      console.log("Entity update API response:", jsonData);
      
      // Return the entity data from the response
      return jsonData.data;
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Entity updated successfully.",
      });
      
      // Reset form
      form.reset({
        name: "",
        legalName: "",
        taxId: "",
        entityType: "llc",
        industry: "",
        address: "",
        phone: "",
        email: "",
        ownerId: user?.id,
        code: ""
      });
      
      // Update the entity in setupEntities
      if (response && currentEntityId) {
        console.log("DEBUG: Update response structure:", JSON.stringify(response));
        
        // Cast the response to any type to access dynamic properties
        const respData = response as any;
        
        // Convert the response to a proper entity structure with required fields
        const entityData = {
          id: respData.id,
          name: respData.name || "",
          legalName: respData.legalName || "",
          entityType: respData.entityType || "llc",
          industry: respData.industry || "",
          active: respData.active === undefined ? true : respData.active,
          isActive: respData.isActive === undefined ? true : respData.isActive,
          code: respData.code || "",
          ...respData // Include any other fields from the response
        };
        
        console.log("DEBUG: Updating entity in setupEntities:", entityData);
        
        // CRITICAL FIX: Better handling of entity updates with proper deep copying
        setSetupEntities(prev => {
          // Create a deep copy of the previous state to avoid reference issues
          let prevCopy;
          try {
            prevCopy = JSON.parse(JSON.stringify(prev)) || [];
          } catch (e: any) {
            console.error("Failed to deep copy previous entities during update:", e);
            prevCopy = [];
          }
          
          // Create updated entities array with deep copies
          const updatedEntities = prevCopy.map((e: any) => 
            e.id === currentEntityId ? JSON.parse(JSON.stringify(entityData)) : {...e}
          );
          
          console.log("DEBUG: Updated entity in setupEntities, now have", updatedEntities.length, "entities");
          
          // CRITICAL FIX: Update parent component state with a fresh copy
          if (setEntityData) {
            // Create a completely fresh copy to avoid any shared references
            const parentCopy = JSON.parse(JSON.stringify(updatedEntities));
            console.log("ENTITY UPDATE: Updating parent with deep copied entity array:", parentCopy.length, "entities");
            setEntityData(parentCopy);
          }
          
          // CRITICAL FIX: Save immediately to sessionStorage for safety
          try {
            const setupData = sessionStorage.getItem('setupData');
            if (setupData) {
              const parsedData = JSON.parse(setupData);
              
              // Create a complete fresh copy of the updated entities
              const storageCopy = JSON.parse(JSON.stringify(updatedEntities));
              
              // Update the storage
              parsedData.entityData = storageCopy;
              
              // Save back to sessionStorage
              sessionStorage.setItem('setupData', JSON.stringify(parsedData));
              console.log("CRITICAL FIX: Updated sessionStorage after entity update with", storageCopy.length, "entities");
            }
          } catch (error) {
            console.error("CRITICAL ERROR: Failed to update sessionStorage during entity update:", error);
          }
          
          return updatedEntities;
        });
      }
      
      // Global data refresh
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
    onSuccess: (_response, variables) => {
      console.log("Entity deleted successfully, ID:", variables);
      
      toast({
        title: "Success",
        description: "Entity deleted successfully.",
      });
      
      // Remove the entity from setupEntities
      // Using the variable (id) passed to mutate()
      setSetupEntities(prev => {
        console.log("Removing entity with ID:", variables, "from", prev);
        return prev.filter(entity => entity.id !== variables);
      });
      
      // Global data refresh
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
    if (isSubmitting) {
      console.log("Form submission already in progress, ignoring duplicate submit");
      return; // Prevent multiple submissions
    }
    
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
      
      console.log("Submitting entity form:", isEditing ? "UPDATE" : "CREATE", data);
      
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
    
    // Log the entity data for debugging
    console.log("Editing entity:", entity);
    
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
      ownerId: entity.ownerId || user?.id,
      code: entity.code || ""
    });
    
    // Store the client ID in the component state if available
    if (entity.clientId) {
      console.log("Entity has clientId:", entity.clientId);
      // We don't need to do anything special here, as the clientId will be passed from 
      // the parent component's clientData prop when updateEntityMutation is called
    }
  };
  
  // Delete entity
  const handleDeleteEntity = (id: number) => {
    if (!id) {
      console.error("Cannot delete entity: Invalid ID", id);
      toast({
        title: "Error",
        description: "Cannot delete entity: Invalid ID",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this entity?")) {
      console.log("DEBUG: Deleting entity with ID:", id, typeof id);
      console.log("DEBUG: Current setupEntities before deletion:", JSON.stringify(setupEntities));
      
      // Find the entity to make sure it exists
      const entityToDelete = setupEntities.find(entity => entity.id === id);
      console.log("DEBUG: Entity to delete:", entityToDelete);
      
      if (!entityToDelete) {
        console.error("Entity not found in setupEntities:", id);
        toast({
          title: "Error",
          description: "Entity not found. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // First update the local setupEntities state to ensure the UI updates immediately
      setSetupEntities(prev => {
        // Convert IDs to numbers to ensure proper comparison
        const filtered = prev.filter(entity => Number(entity.id) !== Number(id));
        console.log("DEBUG: Filtered setupEntities after removal, now have", filtered.length, "entities");
        
        return filtered;
      });
      
      // Then call the API to actually delete it from the database if it's not a new entity (temp ID)
      if (id > 0) {  // Only delete from database if it's a real entity with a positive ID
        console.log("DEBUG: Calling API to delete entity ID:", id);
        deleteEntityMutation.mutate(id);
      } else {
        console.log("DEBUG: Entity had temporary ID, not calling API");
      }
      
      // CRITICAL FIX: Better handling of parent state update for delete
      if (setEntityData) {
        console.log("DEBUG: Updating parent component entity data for deletion");
        
        // Create a deep copy of setupEntities first
        try {
          const deepCopy = JSON.parse(JSON.stringify(
            setupEntities.filter(entity => Number(entity.id) !== Number(id))
          ));
          
          console.log("ENTITY DELETE: Deep copy for parent has", deepCopy.length, "entities");
          setEntityData(deepCopy);
          
          // Also update sessionStorage directly as a safety measure
          const setupData = sessionStorage.getItem('setupData');
          if (setupData) {
            const parsedData = JSON.parse(setupData);
            parsedData.entityData = deepCopy;
            sessionStorage.setItem('setupData', JSON.stringify(parsedData));
            console.log("ENTITY DELETE: Updated sessionStorage with", deepCopy.length, "entities");
          }
        } catch (error) {
          console.error("ENTITY DELETE: Error updating parent data:", error);
          // Fallback with regular filter
          setEntityData(setupEntities.filter(entity => Number(entity.id) !== Number(id)));
        }
      }
      
      toast({
        title: "Success",
        description: "Entity removed from setup",
      });
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
      ownerId: user?.id,
      code: ""
    });
  };
  
  // Check if we can proceed to next step (at least one entity needed)
  const canProceed = setupEntities && setupEntities.length > 0;
  
  // When the component mounts or clientData changes, we should initialize with fresh form and entity data
  useEffect(() => {
    // Reset only the form when clientData changes, not the entities list
    form.reset({
      name: "",
      legalName: "",
      taxId: "",
      entityType: "llc",
      industry: "",
      address: "",
      phone: "",
      email: "",
      ownerId: user?.id,
      code: ""
    });
    
    // IMPORTANT: Do NOT clear setupEntities when navigating back
    // This was causing entity data to be lost when going back to the client step
    // We now preserve entities between navigation steps
    
    // For debugging - helps identify when form is being reset
    console.log("Entity form reset to default values, entities preserved", {clientId: clientData?.id});
  }, [clientData, form]); // Reset when clientData changes, which happens when navigating steps
  
  // Sync setupEntities with allEntities when they change
  // IMPORTANT FIX: Do NOT sync all entities when creating a new client - only do this for editing
  useEffect(() => {
    // Only sync with allEntities if editing an existing client with a defined ID
    // For new client setup, we want to start with an empty array and only add entities created during this flow
    if (clientData?.id && clientData.id > 0 && allEntities && allEntities.length > 0) {
      // When editing an existing client, filter entities to only those belonging to this client
      const clientEntities = allEntities.filter(entity => entity.clientId === clientData.id);
      console.log("Syncing setupEntities with filtered clientEntities:", clientEntities);
      setSetupEntities(clientEntities);
    }
  }, [allEntities, clientData]);
  
  // CRITICAL FIX: Better initialization of setupEntities from parent entityData
  // Now with clearer dependency array and handling of empty/null values
  useEffect(() => {
    console.log("INIT ENTITIES: entityData dependency changed:", 
      entityData ? `Array with ${entityData.length} items` : 'null/undefined',
      "Type:", entityData ? typeof entityData : 'N/A',
      "Is Array:", entityData ? Array.isArray(entityData) : 'N/A');
    
    // Clear validation - ensure entityData is valid before using it
    if (entityData && Array.isArray(entityData)) {
      // Cast to a new array to avoid reference issues
      const entitiesCopy = [...entityData];
      
      if (entitiesCopy.length > 0) {
        console.log("INIT ENTITIES: Loading", entitiesCopy.length, "entities from parent");
        
        // THIS IS CRITICAL: Use the stringified copy to break references
        // This prevents issues where the state isn't properly updated
        const entitiesDeepCopy = JSON.parse(JSON.stringify(entitiesCopy));
        setSetupEntities(entitiesDeepCopy);
      } else {
        console.log("INIT ENTITIES: Parent provided empty entityData array");
        // Still set an empty array to ensure state is consistent
        setSetupEntities([]);
      }
    } else {
      console.log("INIT ENTITIES: No entityData from parent, using empty array");
      setSetupEntities([]);
    }
  }, [entityData]);
  
  // Debug log when setupEntities changes
  useEffect(() => {
    console.log("ENTITY STATE: setupEntities updated, now has", setupEntities.length, "entities");
  }, [setupEntities]);

  // Component mount handler for cleanup purposes
  useEffect(() => {
    // Log for debugging
    console.log("EntityManagementCard mounted, initial entities:", setupEntities.length);
    
    // Cleanup when component unmounts
    return () => {
      setIsEditing(false);
      setCurrentEntityId(null);
    };
  }, []);
  
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
              <div className="grid grid-cols-1 gap-6 w-full max-w-full">
                <FormField
                  key="field-name"
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
                  key="field-legalName"
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
                  key="field-code"
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC123" {...field} />
                      </FormControl>
                      <FormDescription>
                        A unique identifier code for this entity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  key="field-entityType"
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
                  key="field-industry"
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
                  key="field-taxId"
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
                  key="field-email"
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
                  key="field-phone"
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
                
                <FormField
                  key="field-address"
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Main St, City, State, ZIP"
                          className="min-h-[60px] resize-y w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The entity's primary address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <div key="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : setupEntities.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground mb-4">
                You haven't created any entities yet. Add your first entity above.
              </p>
              <Badge key="no-entities-badge" variant="outline" className="mx-auto">
                At least one entity required
              </Badge>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow key="header-row">
                    <TableHead key="header-name">Name</TableHead>
                    <TableHead key="header-type">Type</TableHead>
                    <TableHead key="header-industry">Industry</TableHead>
                    <TableHead key="header-status">Status</TableHead>
                    <TableHead key="header-actions" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setupEntities.map((entity: any) => (
                    <TableRow key={entity.id}>
                      <TableCell key={`name-${entity.id}`} className="font-medium">{entity.name}</TableCell>
                      <TableCell key={`type-${entity.id}`}>{entity.entityType || "LLC"}</TableCell>
                      <TableCell key={`industry-${entity.id}`}>{entity.industry}</TableCell>
                      <TableCell key={`status-cell-${entity.id}`}>
                        <Badge 
                          key={`status-badge-${entity.id}`}
                          variant={getEntityActiveStatus(entity) ? "default" : "outline"} 
                          className="flex items-center w-fit"
                        >
                          {getEntityActiveStatus(entity) ? (
                            <span key={`active-${entity.id}`} className="flex items-center">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span key={`inactive-${entity.id}`} className="flex items-center">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell key={`actions-${entity.id}`} className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            key={`edit-${entity.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntity(entity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            key={`delete-${entity.id}`}
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
        <Button variant="outline" onClick={(e) => {
          e.preventDefault();
          // Important: Also update parent entity data when going back
          // This ensures entities aren't lost when navigating backward
          console.log("DEBUG: Back button clicked, current entities:", JSON.stringify(setupEntities));
          
          if (setEntityData) {
            console.log("DEBUG: Preserving entity data when going back:", JSON.stringify(setupEntities));
            
            try {
              // Create a deep copy of the entities to avoid reference issues
              const entitiesCopy = JSON.parse(JSON.stringify(setupEntities));
              console.log("DEBUG: Created deep copy of entities:", JSON.stringify(entitiesCopy));
              
              // Update parent state FIRST 
              setEntityData(entitiesCopy);
              
              // Use a longer timeout to ensure state updates are fully processed
              setTimeout(() => {
                console.log("DEBUG: Calling onBack after preserving entities");
                // Then call the onBack handler
                if (onBack) {
                  onBack();
                }
              }, 50); // Increased timeout to ensure state update completes
            } catch (error) {
              console.error("DEBUG: Error preserving entity data:", error);
              // If there's an error, still allow navigation but warn user
              toast({
                title: "Warning",
                description: "There was an issue preserving your entity data. You may need to re-add entities.",
                variant: "destructive",
              });
              if (onBack) {
                onBack();
              }
            }
          } else {
            // If setEntityData is not available, just call onBack directly
            console.log("DEBUG: No setEntityData function available, calling onBack directly");
            if (onBack) {
              onBack();
            }
          }
        }}>
          Back
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            console.log("ENTITY NAV: Continue button clicked, saving entities to session storage");
            
            try {
              console.log("CRITICAL FIX 3.0: Continue button clicked, processing entities:", 
                setupEntities?.length || 0, "entities");
                
              // Verify entities array is valid and each entity has minimal required fields
              if (!setupEntities || !Array.isArray(setupEntities) || setupEntities.length === 0) {
                throw new Error("No entities to continue with. Please create at least one entity.");
              }
              
              // Create a deep copy with additional data validation
              const entitiesCopy = JSON.parse(JSON.stringify(setupEntities.map((entity, index) => {
                // Ensure each entity has an ID, even if it's temporary
                const entityId = entity.id || -(index + 1); // Use negative ID for temp entities
                
                // Ensure each entity has minimal required fields
                return {
                  id: entityId,
                  name: entity.name || "Unnamed Entity",
                  legalName: entity.legalName || entity.name || "Unnamed Entity",
                  entityType: entity.entityType || "llc",
                  industry: entity.industry || "",
                  active: true,
                  clientId: clientData?.id || entity.clientId,
                  // Copy all other fields from the original entity
                  ...Object.fromEntries(
                    Object.entries(entity)
                      .filter(([key]) => !['__typename', 'createdAt', 'updatedAt'].includes(key))
                  )
                };
              })));
              
              console.log("CRITICAL FIX 3.0: Created validated entity copy:", entitiesCopy.length);
              
              // CRITICAL FIX: Update our local entities state first
              // This ensures complete ui consistency
              setSetupEntities(entitiesCopy);
              
              // Now save to sessionStorage for persistence
              try {
                // Get existing setup data if any
                const savedData = sessionStorage.getItem('setupData');
                const existingData = savedData ? JSON.parse(savedData) : {};
                
                // Update with validated entities and next step
                const newData = {
                  ...existingData,
                  clientData: clientData, // Include client data for safety
                  entityData: entitiesCopy,
                  currentStep: "summary" // Pre-set the next step
                };
                
                // Save to session storage
                sessionStorage.setItem('setupData', JSON.stringify(newData));
                console.log("ENTITY NAV: Saved entities to sessionStorage for persistence", entitiesCopy.length);
              } catch (storageError) {
                console.error("Failed to save entities to sessionStorage:", storageError);
                // Continue anyway since we have other mechanisms
              }
              
              // Update parent entity data
              if (setEntityData) {
                console.log("ENTITY NAV: Updating parent entity data:", entitiesCopy.length, "entities");
                setEntityData(entitiesCopy);
              }
              
              // CRITICAL FIX: Complete rewrite of Continue button flow
              // This is important for fixing entity persistence between steps
              
              // First update local storage for safety
              console.log("ENTITY NAV: First saving entities to local storage", entitiesCopy.length, "entities");
              
              // Now, very carefully manage the state updates to ensure synchronization
              if (setEntityData) {
                // Update parent component's state with a fresh deep copy first
                console.log("ENTITY NAV: Creating fresh deep copy for parent state update");
                
                // Create a completely detached copy 
                const parentStateCopy = JSON.parse(JSON.stringify(entitiesCopy));
                console.log("ENTITY NAV: Created parentStateCopy with", parentStateCopy.length, "entities");
                
                // First and most important - update parent state
                console.log("ENTITY NAV: Calling setEntityData with fresh entity copy");
                setEntityData(parentStateCopy);
                
                // Now use a two-phase approach with promises to ensure state updates complete
                Promise.resolve().then(() => {
                  console.log("ENTITY NAV: Promise phase 1 - state should be updating");
                  
                  // Create another completely fresh copy for navigation
                  const navigationCopy = JSON.parse(JSON.stringify(entitiesCopy));
                  console.log("ENTITY NAV: Created navigationCopy with", navigationCopy.length, "entities");
                  
                  // Store a reference to navigationCopy in a higher scope
                  const finalNavigationCopy = [...navigationCopy];
                  
                  // Use setTimeout instead of Promise chaining to avoid TypeScript error
                  setTimeout(() => {
                    console.log("ENTITY NAV: Final phase - calling onNext with", 
                      finalNavigationCopy.length, "entities");
                    
                    // Finally call onNext with our navigation copy
                    onNext(finalNavigationCopy);
                  }, 100);
                });
              } else {
                // Fallback if no setEntityData provided - much simpler path
                console.log("ENTITY NAV: No setEntityData function, proceeding directly");
                // Create a fresh copy for navigation
                const navigationCopy = JSON.parse(JSON.stringify(entitiesCopy));
                onNext(navigationCopy);
              }
            } catch (error) {
              console.error("ENTITY NAV: Error preparing entity data:", error);
              // If there's an error, still try to continue with original data
              toast({
                title: "Warning",
                description: "There was an issue processing your entity data. Please check entities on summary screen.",
                variant: "destructive",
              });
              // Continue anyway with original data
              onNext(setupEntities);
            }
          }} 
          disabled={!canProceed}
        >
          {!canProceed ? "Add at least one entity to continue" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}