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
import { INDUSTRY_OPTIONS, getIndustryLabel, ensureIndustryValue } from "@/lib/industryUtils";

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
  industry: z.string(), // Allow empty string to fix "other" selection issues
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || val === "" || val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    { message: "Please enter a valid email address if providing one" }
  ),
  ownerId: z.number().optional()
  // Entity code is auto-generated on the server, removed from form
});

type EntityFormValues = z.infer<typeof entitySchema>;

// Utility function to get default form values
// This helps ensure consistent form resets throughout the component
const getDefaultFormValues = (initialValues = {}) => {
  const user = useAuth().user;
  return {
    name: "",
    legalName: "",
    taxId: "",
    entityType: "llc",
    industry: "other", // Default to "other" instead of empty string
    address: "",
    phone: "",
    email: "",
    ownerId: user?.id,
    // code field removed - auto-generated on server
    ...initialValues, // Allow overriding defaults with initialValues
  };
};

interface EntityManagementCardProps {
  onNext: () => void;
  onBack?: () => void;
  clientData?: any;
  onEntityAdded: (entity: any) => void;
  onEntityUpdated?: (entity: any) => void; // Add onEntityUpdated prop
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
  onEntityUpdated,
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
  // FIXED: Always initialize with empty array to prevent persisting unsaved entities
  // Don't use entities prop directly in initial state to avoid persisting unsaved data
  const [setupEntities, setSetupEntities] = useState<any[]>([]);
  
  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Fetch all entities (but we'll only use entities from props for display)
  const { data: allEntities = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/entities'],
    enabled: !!user
  });
  
  // Create a utility function for consistent form resets
  const getDefaultFormValues = (overrides: Partial<EntityFormValues> = {}) => {
    return {
      name: "",
      legalName: "",
      taxId: "",
      entityType: "llc",
      industry: "other", // Default to "other" to ensure it always has a value
      address: "",
      phone: "",
      email: "",
      ownerId: user?.id,
      // code removed - auto-generated on server
      ...overrides // Allow overriding specific fields
    };
  };

  // Initialize form with empty values (not pre-populated from client data)
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: getDefaultFormValues()
  });
  
  // Helper function to determine entity active status consistently
  // This handles the different property names used (active vs isActive)
  const getEntityActiveStatus = (entity: any): boolean => {
    // Check both property names and default to true for new entities
    return entity.isActive === undefined ? 
      (entity.active === undefined ? true : Boolean(entity.active)) : 
      Boolean(entity.isActive);
  };
  
  // Helper function to format industry value to human-readable form
  const getEntityIndustryLabel = (industryValue: string | null | undefined): string => {
    console.log(`DEBUG getEntityIndustryLabel: Received value: "${industryValue}"`);
    
    // If empty, null, or undefined, return formatted "Other" instead of "N/A"
    if (!industryValue) {
      console.log(`DEBUG getEntityIndustryLabel: Null or undefined value, returning "Other"`);
      return "Other";
    }
    
    // Special case for "other" value
    if (industryValue.toLowerCase() === "other") {
      console.log(`DEBUG getEntityIndustryLabel: Found "other" value, returning "Other"`);
      return "Other";
    }
    
    // Find the matching industry option
    const industry = INDUSTRY_OPTIONS.find(opt => opt.value === industryValue);
    const label = industry ? industry.label : industryValue;
    console.log(`DEBUG getEntityIndustryLabel: Returning label: "${label}"`);
    return label;
  };
  
  // Helper function to create entity from client data
  const populateFromClientData = () => {
    console.log("POPULATE: Using client data to pre-fill entity form", clientData);
    if (clientData) {
      // Set form values with client data, ensuring industry has a fallback value
      form.reset(getDefaultFormValues({
        name: clientData.name || "",
        legalName: clientData.legalName || "",
        taxId: clientData.taxId || "",
        entityType: "llc",
        industry: clientData.industry || "other", // Ensure industry has a default value
        address: clientData.address || "",
        phone: clientData.phone || "",
        email: clientData.email || "",
        ownerId: user?.id,
        // code field removed - auto-generated on server
      }));
      
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
  
  // Using imported ensureIndustryValue from industryUtils.ts for consistent industry validation across components

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
        // Use our utility function to ensure industry is valid
        industry: ensureIndustryValue(data.industry),
        active: true, // Using 'active' instead of 'isActive' to match schema
        // Generate a code from the name - auto-generated
        code: data.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100),
        // Set default fiscal year values
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD"
      };
        
      console.log("DEBUG: Industry value being sent to API:", data.industry);

      // Add optional fields only if they have values
      if (data.taxId) cleanedData.taxId = data.taxId;
      if (data.address) cleanedData.address = data.address;
      if (data.phone) cleanedData.phone = data.phone;
      if (data.email) cleanedData.email = data.email;
      
      // Always include owner info
      cleanedData.ownerId = data.ownerId;
      if (user?.id) cleanedData.createdBy = user.id;
      
      // In the setup flow, we don't add a clientId at all
      // The clientId will be added when all entities are saved in the final step
      // This avoids issues with negative or invalid client IDs
      if (clientData && clientData.id && clientData.id > 0) {
        // Only set clientId if it's a positive real ID from an existing client
        cleanedData.clientId = clientData.id;
        console.log("Setting real clientId in entity creation:", clientData.id);
      } else {
        // For setup flow, don't set any client ID yet
        console.log("SETUP FLOW: Not setting clientId for new entity (will be set during final submission)");
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
      
      // Reset form with consistent defaults
      form.reset(getDefaultFormValues());
      
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
            code: respData.code || "",
            // Critical: Add client relationship
            clientId: respData.clientId || clientData?.id,
            // Include all other fields from API response
            ...respData
          };
          
          console.log("ENTITY CREATION: Adding to setupEntities and updating parent:", entityData);
          
          // Simplified approach - directly use the onEntityAdded callback
          console.log("ENTITY CREATION: New entity created:", entityData);
          
          // Call the parent's callback to add the entity (will update SetupStepper's state)
          onEntityAdded(entityData);
          
          // No need to call setSetupEntities as we're now fully relying on
          // the parent component's state, which will flow back to us via props
        }
      };
      
      // SIMPLIFIED APPROACH - Just use the original entity creation logic
      console.log("ENTITY CREATION: Using simple direct approach");
      
      // Simply create the entity object directly from the response
      if (response) {
        // Log the complete response for debugging
        console.log("ENTITY CREATION: Received response:", response);
        
        // Create a clean entity object
        const entityData = {
          id: response.id,
          name: response.name || "",
          legalName: response.legalName || response.name || "",
          entityType: response.entityType || "llc",
          industry: ensureIndustryValue(response.industry),
          active: true,
          isActive: true,
          code: response.code || "",
          clientId: response.clientId || clientData?.id,
          ...response // Include all other fields
        };
        
        console.log("ENTITY CREATION: Created entity object:", entityData);
        
        // Update local state with the new entity
        setSetupEntities(prev => {
          // Create a deep copy to prevent reference issues
          const updatedEntities = [...prev, entityData];
          console.log("ENTITY CREATION: Updated local entities, now have:", updatedEntities.length);
          return updatedEntities;
        });
        
        // Explicitly notify the parent component through the callback
        console.log("ENTITY CREATION: Notifying parent via onEntityAdded");
        onEntityAdded(entityData);
      } else {
        console.error("ENTITY CREATION: Received null/undefined response");
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
      console.log("DEBUG: Starting entity update with form data:", JSON.stringify(data));
      console.log("DEBUG: Entity ID for update:", id);
      
      // CRITICAL FIX: Validate name is not empty, with multiple fallbacks
      if (!data.name || data.name.trim() === "") {
        console.error("CRITICAL ERROR: Entity name is empty in update. This should never happen.");
        
        // Use legal name as fallback or a generated entity ID
        const nameBackup = data.legalName || `Entity ${id}`;
        console.log("CRITICAL FIX: Using fallback name in entity update:", nameBackup);
        data.name = nameBackup;
      }
      
      // Use admin endpoint if user is admin
      const endpoint = isAdmin ? `/api/admin/entities/${id}` : `/api/entities/${id}`;
      
      // Ensure ownerId is set
      if (!data.ownerId && user?.id) {
        data.ownerId = user.id;
      }
      
      // CRITICAL FIX: Initialize with required fields with better validation
      const cleanedData: any = {
        // Force name to be a string and trim whitespace
        name: data.name.toString().trim(), 
        // Ensure legalName is valid with better fallback
        legalName: data.legalName && data.legalName.trim() ? 
                 data.legalName.trim() : 
                 data.name.trim(), 
        // Ensure entityType is valid
        entityType: data.entityType || 'llc',
        // Use our utility function to ensure industry is valid
        industry: ensureIndustryValue(data.industry),
        active: true, // Using 'active' instead of 'isActive' to match schema
        // Auto-generate code - this will be handled server-side
        code: data.name ? data.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100) : "ENT" + id,
        // Set default fiscal year values if updating
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        currency: "USD"
      };
        
      console.log("CRITICAL DEBUG: Entity update API payload:", JSON.stringify(cleanedData));
      console.log("CRITICAL DEBUG: Entity name in API payload:", cleanedData.name);

      // Add optional fields only if they have values
      if (data.taxId) cleanedData.taxId = data.taxId;
      if (data.address) cleanedData.address = data.address;
      if (data.phone) cleanedData.phone = data.phone;
      if (data.email) cleanedData.email = data.email;
      
      // Always include owner info
      cleanedData.ownerId = data.ownerId;
      
      // In the setup flow, we don't add a clientId at all during update
      // The clientId will be added when all entities are saved in the final step
      // This avoids issues with negative or invalid client IDs
      if (clientData && clientData.id && clientData.id > 0) {
        // Only set clientId if it's a positive real ID from an existing client
        cleanedData.clientId = clientData.id;
        console.log("Setting real clientId in entity update:", clientData.id);
      } else {
        // Don't set any client ID for entities in the setup flow
        console.log("SETUP FLOW: Not setting clientId during entity update (will be set during final submission)");
      }

      console.log("Updating entity with data:", cleanedData);
      
      // Make direct fetch call instead of apiRequest
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update entity: ${response.statusText}`);
      }
      
      // Parse the response JSON
      const jsonData = await response.json();
      console.log("Entity update API response:", jsonData);
      
      // Reset form with consistent defaults
      form.reset(getDefaultFormValues());
      
      // Get the updated entity data
      const respData = jsonData.data || jsonData;
      
      // Convert the response to a proper entity structure with required fields
      const entityData = {
        id: respData.id,
        name: respData.name || "",
        legalName: respData.legalName || "",
        entityType: respData.entityType || "llc",
        industry: ensureIndustryValue(respData.industry),
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
        
        // No longer using sessionStorage - parent component handles state persistence using localStorage
        console.log("CRITICAL FIX: Using parent component state management with localStorage instead of sessionStorage");
        
        return updatedEntities;
      });
      
      // Notify parent component of the updated entity
      if (onEntityUpdated) {
        console.log("Calling onEntityUpdated with entity data:", entityData);
        onEntityUpdated(entityData);
      } else {
        // Fallback to onEntityAdded if onEntityUpdated is not available
        console.log("Fallback: calling onEntityAdded with updated entity data:", entityData);
        onEntityAdded(entityData);
      }
      
      // Global data refresh
      refetch();
      setIsEditing(false);
      setCurrentEntityId(null);
      
      return jsonData;
    },
    onError: (error: any) => {
      console.error("DEBUG EntityMC Update: Mutation Error:", error);
      
      // Log additional details for entity update errors
      try {
        console.error("DEBUG EntityMC Update Error Details:");
        console.error("- Error message:", error.message);
        console.error("- Stack trace:", error.stack);
        console.error("- Entity ID that failed to update:", currentEntityId);
        console.error("- Form data at time of error:", JSON.stringify(form.getValues()));
      } catch (logError) {
        console.error("Error while logging entity update error details:", logError);
      }
      
      toast({
        title: "Error Updating Entity",
        description: error.message || "Failed to update entity. Please check the console for details.",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      console.log("DEBUG EntityMC Update: Mutation Success:", data);
      
      // Log detailed success information
      try {
        console.log("DEBUG EntityMC Update Success Details:");
        console.log("- Updated entity ID:", data?.data?.id || currentEntityId);
        console.log("- Updated entity name:", data?.data?.name);
        console.log("- Updated entity industry:", data?.data?.industry);
        console.log("- Current setupEntities length:", setupEntities.length);
        console.log("- Current form values:", JSON.stringify(form.getValues()));
        console.log("- Is still in editing mode?", isEditing);
      } catch (logError) {
        console.error("Error while logging entity update success details:", logError);
      }
      
      toast({
        title: "Entity Updated",
        description: "Entity was successfully updated.",
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
    
    // CRITICAL FIX: Log form data for debugging entity name issues
    console.log("SUBMIT DEBUG: Form data being submitted:", JSON.stringify(data));
    console.log("SUBMIT DEBUG: Entity name in form:", data.name);
    
    // CRITICAL FIX: Validate that entity name is not empty before submission
    if (!data.name || data.name.trim() === "") {
      console.error("CRITICAL ERROR: Entity name cannot be empty");
      toast({
        title: "Error",
        description: "Entity name cannot be empty. Please provide a name for this entity.",
        variant: "destructive",
      });
      return;
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
        setIsSubmitting(false);
        return;
      }
      
      console.log("Submitting entity form:", isEditing ? "UPDATE" : "CREATE", data);
      
      if (isEditing && currentEntityId) {
        // CRITICAL FIX: Make a deep copy of the data to prevent mutation issues
        const dataCopy = JSON.parse(JSON.stringify(data));
        console.log("CRITICAL DEBUG: Update entity data (copy):", dataCopy);
        console.log("CRITICAL DEBUG: Entity name in update copy:", dataCopy.name);
        
        // DEBUG logs as requested in the bug fix instructions
        console.log("DEBUG EntityMC Update: Editing Entity ID:", currentEntityId);
        console.log("DEBUG EntityMC Update: Sending Payload:", JSON.stringify(dataCopy));
        
        // Check if this is a temporary entity (has a large timestamp-based ID)
        const isTemporaryEntity = currentEntityId > 1000000000; // Timestamp IDs are large numbers
        
        if (isTemporaryEntity) {
          console.log("ENTITY UPDATE: Handling local update for temporary entity ID:", currentEntityId);
          
          // Create a validated entity object with the same ID but updated values
          const updatedEntityData = {
            id: currentEntityId, // Keep the same temporary ID
            localId: currentEntityId, // Keep the localId marker
            name: dataCopy.name.trim(),
            legalName: dataCopy.legalName?.trim() || dataCopy.name.trim(),
            taxId: dataCopy.taxId || "",
            entityType: dataCopy.entityType || "llc",
            industry: ensureIndustryValue(dataCopy.industry),
            address: dataCopy.address || "",
            phone: dataCopy.phone || "",
            email: dataCopy.email || "",
            code: dataCopy.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100),
            ownerId: dataCopy.ownerId,
            active: true,
            isActive: true
          };
          
          console.log("ENTITY UPDATE: Created updated local entity:", updatedEntityData);
          
          // Update local state
          setSetupEntities(prev => {
            const newEntities = prev.map(entity => 
              entity.id === currentEntityId ? updatedEntityData : entity
            );
            return newEntities;
          });
          
          // Notify parent component using the new onEntityUpdated callback
          if (onEntityUpdated) {
            console.log("ENTITY UPDATE: Calling onEntityUpdated with local entity:", updatedEntityData);
            onEntityUpdated(updatedEntityData);
          } else {
            // Fallback to onEntityAdded if onEntityUpdated is not available
            console.log("ENTITY UPDATE: Fallback to onEntityAdded for local entity update:", updatedEntityData);
            onEntityAdded(updatedEntityData);
          }
          
          // Show success message
          toast({
            title: "Entity Updated",
            description: "Entity has been updated successfully.",
          });
          
          // Reset form and editing state
          form.reset(getDefaultFormValues());
          setIsEditing(false);
          setCurrentEntityId(null);
        } else {
          // For real database entities, use the mutation for API call
          console.log("ENTITY UPDATE: Updating database entity via API, ID:", currentEntityId);
          await updateEntityMutation.mutateAsync({ id: currentEntityId, data: dataCopy });
        }
      } else {
        // SETUP FLOW: For entity creation during setup, we don't call the API
        // Instead, we create an entity object locally with a temporary ID
        console.log("SETUP FLOW: Creating entity locally without API call");
        
        // Assign a temporary local ID for React keys and state management
        const tempId = Date.now();
        
        // Create a validated entity object with consistent field structure
        const validatedEntityData = {
          id: tempId, // Temporary frontend ID
          localId: tempId, // Additional marker to identify local entities
          name: data.name.trim(),
          legalName: data.legalName?.trim() || data.name.trim(),
          taxId: data.taxId || "",
          entityType: data.entityType || "llc",
          industry: data.industry || "other", 
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          code: data.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100),
          ownerId: data.ownerId,
          active: true,
          isActive: true
        };
        
        console.log("SETUP FLOW: Created local entity object:", validatedEntityData);
        
        // Add to local state
        setSetupEntities(prev => [...prev, validatedEntityData]);
        
        // Notify parent component
        onEntityAdded(validatedEntityData);
        
        // Show success message
        toast({
          title: "Entity Added",
          description: "Entity has been added successfully.",
        });
        
        // Reset form
        form.reset(getDefaultFormValues());
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
    
    // CRITICAL FIX: Enhanced logging for entity edit initialization
    console.log("CRITICAL-DEBUG: Editing entity START:", JSON.stringify(entity));
    console.log("CRITICAL-DEBUG: Original entity name:", entity.name);
    console.log("CRITICAL-DEBUG: Original entity ID:", entity.id);
    
    // CRITICAL FIX: More robust deep cloning with error handling
    let entityClone = null;
    try {
      // First attempt: Full JSON deep clone
      entityClone = JSON.parse(JSON.stringify(entity));
      console.log("CRITICAL-DEBUG: Successfully deep cloned entity via JSON");
    } catch (e) {
      console.error("CRITICAL-DEBUG: JSON deep clone failed, falling back to manual copy:", e);
      
      // Second attempt: Manual deep clone of critical properties
      entityClone = {
        id: entity.id,
        name: entity.name || "",
        legalName: entity.legalName || "",
        entityType: entity.entityType || "llc",
        industry: entity.industry !== null ? entity.industry : "other",
        active: entity.active === undefined ? true : entity.active,
        isActive: entity.isActive === undefined ? true : entity.isActive,
        code: entity.code || "",
        ownerId: entity.ownerId || user?.id,
        clientId: entity.clientId || (clientData ? clientData.id : undefined),
        taxId: entity.taxId || "",
        address: entity.address || "",
        phone: entity.phone || "",
        email: entity.email || "",
      };
    }
    
    // CRITICAL FIX: Double-check clone was successful and name was preserved
    if (!entityClone) {
      console.error("CRITICAL-DEBUG: Both clone methods failed, creating minimal entity");
      entityClone = {
        id: entity.id,
        name: entity.name || "",
        entityType: "llc",
        industry: "other"
      };
    }
    
    // CRITICAL FIX: Verify and fix name field with multiple fallbacks
    if (!entityClone.name || entityClone.name.trim() === "") {
      console.warn("CRITICAL-DEBUG: Entity has empty or missing name, using fallbacks");
      
      // Try multiple fallbacks for name in order of preference
      entityClone.name = entity.name || 
                        entityClone.legalName || 
                        entity.legalName || 
                        entityClone.code || 
                        entity.code || 
                        `Entity ${entity.id || Math.floor(Math.random() * 1000)}`;
                        
      console.log("CRITICAL-DEBUG: Repaired entity name:", entityClone.name);
    }
    
    // CRITICAL FIX: Ensure legalName has a value (fallback to name if missing)
    const entityLegalName = entityClone.legalName || entityClone.name || "";
    
    console.log("CRITICAL-DEBUG: Final entity name for form:", entityClone.name);
    console.log("CRITICAL-DEBUG: Final legal name for form:", entityLegalName);
    
    // CRITICAL FIX: Create stable form values object with clean properties
    // First, ensure we have a valid industry value using our utility function
    const validIndustryValue = ensureIndustryValue(entityClone.industry);
    console.log("CRITICAL-DEBUG: Industry validation:", {
      original: entityClone.industry,
      validated: validIndustryValue
    });
    
    const formValues = {
      name: entityClone.name.trim(), // Ensure no whitespace issues
      legalName: entityLegalName.trim(), // Ensure no whitespace issues
      taxId: entityClone.taxId || "",
      entityType: entityClone.entityType || "llc",
      industry: validIndustryValue, // Use validated industry value
      address: entityClone.address || "",
      phone: entityClone.phone || "",
      email: entityClone.email || "",
      ownerId: entityClone.ownerId || user?.id
      // code field removed - auto-generated on server
    };
    
    console.log("CRITICAL-DEBUG: Final form values being set:", JSON.stringify(formValues));
    console.log("CRITICAL-DEBUG: Form name:", formValues.name);
    
    // CRITICAL FIX: Reset the form with the clean values - simplified without setTimeout
    try {
      form.reset(formValues);
      console.log("CRITICAL-DEBUG: Form reset successful");
      
      // Check values immediately
      const currentValues = form.getValues();
      console.log("CRITICAL-DEBUG: Form values after reset:", JSON.stringify(currentValues));
      
      // If name is missing, directly set it
      if (!currentValues.name || currentValues.name.trim() === "") {
        console.warn("CRITICAL-DEBUG: Name missing after form reset, force-setting it");
        form.setValue("name", formValues.name || "Entity " + entity.id);
      }
    } catch (error) {
      console.error("CRITICAL-DEBUG: Error resetting form:", error);
      // Simplified last resort - just set the name field which is the critical one
      try {
        form.setValue("name", formValues.name || "Entity " + entity.id);
        form.setValue("legalName", formValues.legalName || formValues.name || "");
      } catch (e) {
        console.error("CRITICAL-DEBUG: Failed to set name field individually:", e);
      }
    }
    
    // Store the client ID in the component state if available
    if (entityClone.clientId) {
      console.log("Entity has clientId:", entityClone.clientId);
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
      
      // Check if this is a temporary entity (has a timestamp-based ID)
      const isTemporaryEntity = id > 1000000000; // Timestamp IDs are large numbers
      
      // Call the API to delete it from the database only if it's a real entity
      if (!isTemporaryEntity && id > 0) {
        console.log("DEBUG EntityManagementCard: Calling API to delete entity ID:", id);
        deleteEntityMutation.mutate(id);
      } else {
        console.log("DEBUG EntityManagementCard: Entity had temporary ID, not calling API:", id);
      }
      
      // Update local state to remove the entity
      console.log("DEBUG EntityManagementCard: Updating setupEntities to remove entity with ID:", id);
      setSetupEntities((prevEntities) => prevEntities.filter(entity => 
        (entity.localId !== id && entity.id !== id)
      ));
      
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
    form.reset(getDefaultFormValues());
  };
  
  // Check if we can proceed to next step (at least one entity needed)
  const canProceed = entities && entities.length > 0;
  
  // CRITICAL FIX 10.0: More aggressive loading of entities when component mounts or client data changes
  useEffect(() => {
    // Reset the form whenever clientData changes
    form.reset(getDefaultFormValues());
    
    // FIXED: Reset entities state when setting up a new client (no ID)
    if (!clientData || !clientData.id) {
      console.log("CLIENT RESET: New client setup detected, clearing all entity state");
      setSetupEntities([]);
      return; // No need to try to fetch entities for a new client
    }
    
    // For existing clients with IDs, load their entities
    const loadEntitiesForClient = async () => {
      if (clientData?.id) {
        console.log("CRITICAL FIX 10.0: Component mounted with clientId:", clientData.id);
        
        // FIXED: Don't check setupEntities to avoid using stale data
        // Always start fresh when the clientId changes
        
        // Check if we have entities in entityData prop
        if (entityData && entityData.length > 0) {
          console.log("CRITICAL FIX 10.0: Using entities from props:", entityData.length);
          setSetupEntities(entityData);
          return;
        }
        
        // No entities found in props, try to fetch them directly
        console.log("CRITICAL FIX 10.0: No entities found in props, fetching from API...");
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
            // Explicitly set empty array to clear any previous entities
            setSetupEntities([]);
          }
        } catch (error) {
          console.error("CRITICAL FIX 10.0: Error fetching entities directly:", error);
          // On error, still reset to empty array to avoid showing stale data
          setSetupEntities([]);
        }
      } else {
        console.log("CRITICAL FIX 10.0: No client ID available, clearing entity state");
        setSetupEntities([]);
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
    // Only sync with entities prop if client exists (for editing existing clients)
    // For new clients, we want to start with an empty array
    if (clientData?.id && clientData.id > 0) {
      console.log("ENTITY SYNC: entities prop changed for existing client, updating local setupEntities", entities?.length);
      setSetupEntities(entities || []);
    } else {
      console.log("ENTITY SYNC: Ignoring entities prop for new client setup");
      // Do not update setupEntities for new clients - keep empty array
    }
  }, [entities, clientData]);

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
                
                {/* Entity code field removed - now auto-generated on the server */}
                <div className="p-2 mb-2 rounded-md bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 h-4 w-4">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    An entity code will be automatically generated for you based on the entity name.
                  </p>
                </div>
                
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
                  render={({ field }) => {
                    // CRITICAL FIX: Ensure industry value is valid before rendering
                    // BUGFIX: Better error handling around industry field value
                    let safeValue = "other"; // Default fallback
                    try {
                      safeValue = ensureIndustryValue(field.value);
                      console.log(`CRITICAL-DEBUG Form field industry: Original value: "${field.value}", Safe value: "${safeValue}"`);
                    } catch (err) {
                      console.error("CRITICAL ERROR: Failed to process industry value:", err);
                      console.log("Using default 'other' value for industry");
                    }
                    
                    return (
                      <FormItem className="w-full">
                        <FormLabel>Industry*</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              console.log(`CRITICAL-DEBUG Industry onChange: New value selected: "${value}"`);
                              field.onChange(value);
                            }}
                            value={safeValue} // Use validated value with better error handling
                            defaultValue="other"
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map((industry) => (
                                <SelectItem key={industry.value} value={industry.value}>
                                  {industry.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          The primary industry this entity operates in
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                    <TableHead key="header-code">Entity Code</TableHead>
                    <TableHead key="header-industry">Industry</TableHead>
                    <TableHead key="header-status">Status</TableHead>
                    <TableHead key="header-actions" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity: any) => {
                    // Use either localId, id, or a combination of name+index for the key
                    const entityKey = entity.localId || entity.id || `entity-${entity.name}-${Math.random()}`;
                    
                    return (
                      <TableRow key={entityKey}>
                        <TableCell key={`name-${entityKey}`} className="font-medium">
                          {entity.name}
                          {entity.localId && (
                            <span className="ml-2 text-xs text-gray-400">(Unsaved)</span>
                          )}
                        </TableCell>
                        <TableCell key={`type-${entityKey}`}>{entity.entityType || "LLC"}</TableCell>
                        <TableCell key={`code-${entityKey}`} className="font-mono text-xs">
                          {entity.entityCode ? (
                            <Badge variant="outline" className="px-2">
                              {entity.entityCode}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Auto-generated on save
                            </span>
                          )}
                        </TableCell>
                        <TableCell key={`industry-${entityKey}`}>
                          {/* Display industry as human-readable label, not code */}
                          {(() => {
                            console.log("DEBUG EntityMC: Rendering entity industry:", entity.id, entity.name, entity.industry);
                            return null; // Return null to avoid TypeScript error
                          })()}
                          {(() => {
                            try {
                              return getIndustryLabel(entity.industry);
                            } catch (err) {
                              console.error("Error displaying industry for entity:", entity.name, err);
                              return "Other"; // Default fallback when industry label can't be determined
                            }
                          })()}
                        </TableCell>
                        <TableCell key={`status-cell-${entityKey}`}>
                          <Badge 
                            key={`status-badge-${entityKey}`}
                            variant={getEntityActiveStatus(entity) ? "default" : "outline"} 
                            className="flex items-center w-fit"
                          >
                            {getEntityActiveStatus(entity) ? (
                              <span key={`active-${entityKey}`} className="flex items-center">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span key={`inactive-${entityKey}`} className="flex items-center">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Inactive
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell key={`actions-${entityKey}`} className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              key={`edit-${entityKey}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditEntity(entity)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              key={`delete-${entityKey}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEntity(entity.localId || entity.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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