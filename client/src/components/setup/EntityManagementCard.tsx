import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

// Entity types
const ENTITY_TYPES = [
  { value: "company", label: "Company" },
  { value: "llc", label: "Limited Liability Company (LLC)" },
  { value: "partnership", label: "Partnership" },
  { value: "corporation", label: "Corporation" },
  { value: "s_corporation", label: "S Corporation" },
  { value: "nonprofit", label: "Non-profit Organization" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" }
];

// Define schema for entity form
const entitySchema = z.object({
  name: z.string().min(2, { message: "Entity name must be at least 2 characters." }),
  legalName: z.string().min(2, { message: "Legal name must be at least 2 characters." }),
  taxId: z.string().optional(),
  entityType: z.string({ required_error: "Please select an entity type" }),
  industry: z.string({ required_error: "Please select an industry" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address" }).optional()
});

type EntityFormValues = z.infer<typeof entitySchema>;

interface Entity extends EntityFormValues {
  id: number;
  isActive: boolean;
}

interface EntityManagementCardProps {
  onNext: () => void;
  setEntitiesData: (entities: Entity[]) => void;
  initialEntities?: Entity[];
}

export default function EntityManagementCard({
  onNext,
  setEntitiesData,
  initialEntities = []
}: EntityManagementCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>(initialEntities);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!currentEntity;

  // Form for adding/editing entities
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: currentEntity || {
      name: "",
      legalName: "",
      taxId: "",
      entityType: "",
      industry: "",
      address: "",
      phone: "",
      email: ""
    }
  });

  // Reset form when dialog opens/closes or current entity changes
  const openNewEntityDialog = () => {
    form.reset({
      name: "",
      legalName: "",
      taxId: "",
      entityType: "",
      industry: "",
      address: "",
      phone: "",
      email: ""
    });
    setCurrentEntity(null);
    setIsDialogOpen(true);
  };

  const openEditEntityDialog = (entity: Entity) => {
    form.reset({
      name: entity.name,
      legalName: entity.legalName,
      taxId: entity.taxId || "",
      entityType: entity.entityType,
      industry: entity.industry,
      address: entity.address || "",
      phone: entity.phone || "",
      email: entity.email || ""
    });
    setCurrentEntity(entity);
    setIsDialogOpen(true);
  };

  const handleDeleteEntity = (entityId: number) => {
    if (entities.length <= 1) {
      toast({
        title: "Error",
        description: "You must have at least one entity.",
        variant: "destructive"
      });
      return;
    }

    // Filter out the entity to delete
    const updatedEntities = entities.filter(entity => entity.id !== entityId);
    setEntities(updatedEntities);
    
    toast({
      title: "Entity Deleted",
      description: "The entity has been removed successfully."
    });
  };

  const onSubmit = (data: EntityFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditMode && currentEntity) {
        // Update existing entity
        const updatedEntities = entities.map(entity => 
          entity.id === currentEntity.id 
            ? { ...entity, ...data }
            : entity
        );
        setEntities(updatedEntities);
        
        toast({
          title: "Entity Updated",
          description: "The entity has been updated successfully."
        });
      } else {
        // Add new entity with a unique ID
        const newEntity = {
          ...data,
          id: Date.now(),
          isActive: true
        };
        setEntities([...entities, newEntity]);
        
        toast({
          title: "Entity Added",
          description: "The entity has been added successfully."
        });
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error processing entity:", error);
      toast({
        title: "Error",
        description: "Failed to process entity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (entities.length === 0) {
      toast({
        title: "Error",
        description: "You must add at least one entity to continue.",
        variant: "destructive"
      });
      return;
    }
    
    setEntitiesData(entities);
    onNext();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          Business Entities
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">Add all the business entities you want to manage in the system. You must add at least one entity to continue.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Add and manage the business entities you want to track. These can be legal entities, subsidiaries, or divisions of your business.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Your Entities ({entities.length})</h3>
            <p className="text-sm text-muted-foreground">At least one entity is required</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewEntityDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Entity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit Entity" : "Add New Entity"}</DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? "Update the information for this business entity." 
                    : "Enter the details for the new business entity."}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Subsidiary" {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of this business entity
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
                          <Input placeholder="ABC Subsidiary LLC" {...field} />
                        </FormControl>
                        <FormDescription>
                          The legally registered name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
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
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ENTITY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / EIN</FormLabel>
                        <FormControl>
                          <Input placeholder="XX-XXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
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
                            <Input type="email" placeholder="info@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : isEditMode ? "Update Entity" : "Add Entity"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {entities.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium mb-2">No Entities Added Yet</h3>
            <p className="text-muted-foreground mb-4">Add at least one business entity to continue.</p>
            <Button onClick={openNewEntityDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Entity
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>
                      {ENTITY_TYPES.find(t => t.value === entity.entityType)?.label || entity.entityType}
                    </TableCell>
                    <TableCell>
                      {INDUSTRY_OPTIONS.find(i => i.value === entity.industry)?.label || entity.industry}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entity.isActive ? "default" : "outline"}>
                        {entity.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditEntityDialog(entity)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
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
        
        {entities.length > 0 && (
          <Alert className="mt-6">
            <AlertTitle>Ready to Continue?</AlertTitle>
            <AlertDescription>
              You've added {entities.length} {entities.length === 1 ? "entity" : "entities"}. You can add more entities later if needed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => onNext()}>
          Skip for Now
        </Button>
        <Button onClick={handleContinue}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}