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
  onNext: () => void;
  onBack?: () => void;
  clientData?: any;
  onEntityAdded: (entity: any) => void;
  onEntityDeleted: (entityId: number) => void;
  entities: any[];
  entityData?: any[];
  setEntityData?: (entities: any[]) => void;
}

export default function EntityManagementCard({ 
  onNext, 
  onBack, 
  clientData, 
  onEntityAdded,
  onEntityDeleted,
  entities,
  entityData,
  setEntityData
}: EntityManagementCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState<number | null>(null);
  // Use entities from props for local state (for backward compatibility)
  const [setupEntities, setSetupEntities] = useState<any[]>(entities || []);
  
  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Fetch all entities (but we'll only use entities from props for display)
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
  
  // CRITICAL FIX 7.0: Direct API fetch function to get all entities
  const fetchEntitiesDirectly = async (clientId?: number) => {
    try {
      console.log("CRITICAL FIX 7.0: Directly fetching all entities from API");
      
      // Use the clientId if provided, otherwise use the clientData.id
      const effectiveClientId = clientId || (clientData?.id ? clientData.id : undefined);
      
      // Only proceed if we have a clientId to filter by
      if (!effectiveClientId) {
        console.error("CRITICAL FIX 7.0: No client ID available for fetching entities");
        return null;
      }
      
      // Make direct API call to get entities for this client
      const response = await fetch(`/api/admin/dashboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch entities: ${response.status}`);
      }
      
      // Parse the response
      const result = await response.json();
      console.log("CRITICAL FIX 7.0: Fetched dashboard data:", result);
      
      // Extract entities that belong to this client
      if (result.data && result.data.clients && Array.isArray(result.data.clients)) {
        // Find the client we're interested in
        const client = result.data.clients.find((c: any) => c.id === effectiveClientId);
        if (client && client.entities && Array.isArray(client.entities)) {
          console.log(`CRITICAL FIX 7.0: Found ${client.entities.length} entities for client ${effectiveClientId}`);
          return client.entities;
        }
      }
      
      // If we couldn't find entities in the expected structure, try direct entities endpoint
      const entitiesResponse = await fetch("/api/entities", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!entitiesResponse.ok) {
        throw new Error(`Failed to fetch entities directly: ${entitiesResponse.status}`);
      }
      
      const entitiesResult = await entitiesResponse.json();
      console.log("CRITICAL FIX 7.0: Fetched entities directly:", entitiesResult);
      
      if (entitiesResult.data && Array.isArray(entitiesResult.data)) {
        // Filter by clientId
        const clientEntities = entitiesResult.data.filter((e: any) => e.clientId === effectiveClientId);
        console.log(`CRITICAL FIX 7.0: Found ${clientEntities.length} entities for client ${effectiveClientId} via direct API`);
        return clientEntities;
      }
      
      return null;
    } catch (error) {
      console.error("CRITICAL FIX 7.0: Error fetching entities directly:", error);
      return null;
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
    onSuccess: async (response) => {
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
      
      // Define original entity creation logic as a helper function first
      const handleOriginalEntityCreation = (responseData: any) => {
        console.log("CRITICAL FIX 7.0: Using original entity creation flow as fallback");
        
        if (responseData) {
          // Cast the response to any type to access dynamic properties
          const respData = responseData as any;
          
          // Ensure we have the form values for fields that might not be in the response
          const formValues = form.getValues();
          
          // Create a comprehensive entity object with all needed fields for both UI and API
          const entityData = {
            id: respData.id,
            name: respData.name || formValues.name || "",
            legalName: respData.legalName || formValues.legalName || respData.name || "",
            // Map business type to entityType or use form value
            entityType: respData.entityType || respData.businessType || formValues.entityType || "llc",
            industry: respData.industry || formValues.industry || "",
            active: respData.active === undefined ? true : respData.active,
            isActive: true, // UI needs this
            code: respData.code || formValues.code || "",
            // Critical: Add client relationship
            clientId: respData.clientId || clientData?.id,
            // Include all other fields from API response
            ...respData
          };
          
          console.log("ENTITY CREATION: Adding to setupEntities and updating parent:", entityData);
          
          // Update setupEntities state with the new entity
          setSetupEntities(prev => {
            // First make a deep copy of previous state
            const prevCopy = prev ? [...prev] : [];
            
            // Add the new entity if it doesn't exist yet
            const exists = prevCopy.some(e => e.id === entityData.id);
            const updatedEntities = exists 
              ? prevCopy.map(e => e.id === entityData.id ? entityData : e)
              : [...prevCopy, entityData];
              
            console.log("ENTITY CREATION: Local state updated, now have", updatedEntities.length, "entities");
            
            // Update session storage with the updated entities
            try {
              const setupData = sessionStorage.getItem('setupData');
              if (setupData) {
                const parsedData = JSON.parse(setupData);
                parsedData.entityData = updatedEntities;
                sessionStorage.setItem('setupData', JSON.stringify(parsedData));
              }
            } catch (error) {
              console.error("Failed to update sessionStorage:", error);
            }
            
            // Also update parent state if the setter is available
            if (setEntityData) {
              setEntityData([...updatedEntities]);
            }
            
            return updatedEntities;
          });
        }
      };
      
      // CRITICAL FIX 7.0: Completely bypass the old flow and directly fetch entities from API
      console.log("CRITICAL FIX 7.0: Starting direct entity fetch after creation");
      
      // Get the client ID from the response or from props
      const clientId = response?.clientId || clientData?.id;
      
      if (!clientId) {
        console.error("CRITICAL FIX 7.0: No client ID available for entity fetch");
        // Fall back to original approach
        handleOriginalEntityCreation(response);
        return;
      }
      
      // Give the database a moment to update
      setTimeout(async () => {
        try {
          // Directly fetch entities from the API
          const fetchedEntities = await fetchEntitiesDirectly(clientId);
          
          if (fetchedEntities && Array.isArray(fetchedEntities) && fetchedEntities.length > 0) {
            console.log(`CRITICAL FIX 7.0: Successfully fetched ${fetchedEntities.length} entities, using direct fetch`);
            
            // Create a deep copy to avoid reference issues
            const entitiesCopy = JSON.parse(JSON.stringify(fetchedEntities));
            
            // Update local state
            setSetupEntities(entitiesCopy);
            
            // Update parent component
            if (setEntityData) {
              setEntityData(entitiesCopy);
            }
            
            // Update session storage
            try {
              const setupData = sessionStorage.getItem('setupData') || '{}';
              const parsedData = JSON.parse(setupData);
              
              parsedData.entityData = entitiesCopy;
              sessionStorage.setItem('setupData', JSON.stringify(parsedData));
              console.log("CRITICAL FIX 7.0: Updated session storage with fetched entities");
            } catch (error) {
              console.error("CRITICAL FIX 7.0: Error updating session storage:", error);
            }
            
            // Notify parent component of the added entity
            if (response) {
              onEntityAdded(response);
            }
            
            console.log("CRITICAL FIX 7.0: Entity refresh complete");
          } else {
            console.warn("CRITICAL FIX 7.0: Failed to fetch entities directly, falling back to original flow");
            // Fall back to original approach if direct fetch failed
            handleOriginalEntityCreation(response);
          }
        } catch (error) {
          console.error("CRITICAL FIX 7.0: Error during entity fetch:", error);
          // Use fallback if anything goes wrong
          handleOriginalEntityCreation(response);
        }
      }, 500); // Half-second delay to ensure DB has updated
      
      // Global data refresh
      refetch();
      setIsEditing(false);
      setCurrentEntityId(null);
      
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
      
      // Notify parent component of the updated entity
      if (response) {
        onEntityAdded(response);
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
      console.error("DEBUG EntityManagementCard: Cannot delete entity: Invalid ID", id);
      toast({
        title: "Error",
        description: "Cannot delete entity: Invalid ID",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this entity?")) {
      console.log("DEBUG EntityManagementCard: Deleting entity with ID:", id);
      
      // Find the entity to make sure it exists
      const entityToDelete = entities.find(entity => entity.id === id);
      console.log("DEBUG EntityManagementCard: Entity to delete:", entityToDelete);
      
      if (!entityToDelete) {
        console.error("DEBUG EntityManagementCard: Entity not found in entities array:", id);
        toast({
          title: "Error",
          description: "Entity not found. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Call the API to delete it from the database if it's not a new entity (temp ID)
      if (id > 0) {  // Only delete from database if it's a real entity with a positive ID
        console.log("DEBUG EntityManagementCard: Calling API to delete entity ID:", id);
        deleteEntityMutation.mutate(id);
      } else {
        console.log("DEBUG EntityManagementCard: Entity had temporary ID, not calling API");
      }
      
      // Notify parent component of the deletion
      console.log("DEBUG EntityManagementCard: Calling onEntityDeleted with ID:", id);
      onEntityDeleted(id);
      
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
  const canProceed = entities && entities.length > 0;
  
  // CRITICAL FIX 10.0: More aggressive loading of entities when component mounts or client data changes
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
    
    // CRITICAL FIX 10.0: If we have client data and no entities, proactively fetch them
    const loadEntitiesForClient = async () => {
      if (clientData?.id) {
        console.log("CRITICAL FIX 10.0: Component mounted with clientId:", clientData.id);
        
        // Check if we already have entities (from props or local state)
        if (setupEntities && setupEntities.length > 0) {
          console.log("CRITICAL FIX 10.0: Already have entities in component state:", setupEntities.length);
          return;
        }
        
        // Check if we have entities in entityData prop
        if (entityData && entityData.length > 0) {
          console.log("CRITICAL FIX 10.0: Using entities from props:", entityData.length);
          setSetupEntities(entityData);
          return;
        }
        
        // No entities found in state, try to fetch them directly
        console.log("CRITICAL FIX 10.0: No entities found in state, fetching from API...");
        try {
          const fetchedEntities = await fetchEntitiesDirectly(clientData.id);
          if (fetchedEntities && Array.isArray(fetchedEntities) && fetchedEntities.length > 0) {
            console.log("CRITICAL FIX 10.0: Successfully fetched", fetchedEntities.length, "entities from API");
            
            // Update local state
            setSetupEntities(fetchedEntities);
            
            // Also update parent state if the setter is available
            if (setEntityData) {
              console.log("CRITICAL FIX 10.0: Updating parent entityData with fetched entities");
              setEntityData(fetchedEntities);
            }
          } else {
            console.log("CRITICAL FIX 10.0: No entities found for client in API, starting with empty list");
          }
        } catch (error) {
          console.error("CRITICAL FIX 10.0: Error fetching entities directly:", error);
        }
      } else {
        console.log("CRITICAL FIX 10.0: No client ID available, cannot fetch entities");
      }
    };
    
    // Call the function to load entities
    loadEntitiesForClient();
    
    // For debugging - helps identify when form is being reset
    console.log("Entity form reset to default values, entities preserved", {clientId: clientData?.id});
  }, [clientData, form, entityData]); // Depend on clientData, form, and entityData
  
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
  
  // CRITICAL FIX: Sync with entities prop when it changes
  useEffect(() => {
    console.log("ENTITY SYNC: entities prop changed, updating local setupEntities", entities?.length);
    setSetupEntities(entities || []);
  }, [entities]);

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
          ) : entities.length === 0 ? (
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
                  {entities.map((entity: any) => (
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
          // Navigate back directly - entities are already handled by the parent
          console.log("DEBUG: Back button clicked, current entities:", entities.length);
          
          if (onBack) {
            console.log("DEBUG: Calling onBack directly");
            onBack();
          }
        }}>
          Back
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            console.log("ENTITY NAV: Continue button clicked");
            
            // Simplify the flow - use the entities directly from props
            if (setEntityData) {
              // Pass the entities up to the parent component
              setEntityData([...entities]);
            }
            
            // Since we've simplified the state management to use props directly,
            // we can just call onNext immediately
            onNext();
          }} 
          disabled={!canProceed}
        >
          {!canProceed ? "Add at least one entity to continue" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}