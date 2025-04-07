import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, X } from "lucide-react";
import { INDUSTRY_OPTIONS, ensureIndustryValue } from "@/lib/industryUtils";

// Define our validation schema for the client with enhanced validation
const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  contactName: z.string().min(2, { message: "Contact name must be at least 2 characters." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  contactPhone: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

// Define validation schema for the entities
const entityFormSchema = z.object({
  name: z.string().min(2, { message: "Entity name must be at least 2 characters." }),
  legalName: z.string().min(2, { message: "Legal name must be at least 2 characters." }),
  taxId: z.string().optional(),
  entityType: z.string(),
  industry: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
});

interface ClientOnboardingFormProps {
  onSuccess: () => void;
}

export default function ClientOnboardingForm({ onSuccess }: ClientOnboardingFormProps) {
  const { toast } = useToast();
  const [entities, setEntities] = useState<Array<Record<string, any>>>([{ id: Date.now() }]);
  const [activeTab, setActiveTab] = useState("client-info");
  const [clientId, setClientId] = useState<number | null>(null);

  // Client form
  const clientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      industry: "",
      notes: "",
    },
  });

  // Entity forms state - each entity has its own form instance
  const entityForms = entities.map(entity => {
    return {
      id: entity.id,
      form: useForm<z.infer<typeof entityFormSchema>>({
        resolver: zodResolver(entityFormSchema),
        defaultValues: {
          name: "",
          legalName: "",
          taxId: "",
          entityType: "llc", // default value
          industry: "",
          fiscalYearEnd: "",
          address: "",
          phone: "",
          email: "",
          website: "",
        },
      }),
    };
  });

  // Add a new entity form
  const addEntity = () => {
    setEntities([...entities, { id: Date.now() }]);
  };

  // Remove an entity form
  const removeEntity = (id: number) => {
    if (entities.length <= 1) {
      toast({
        title: "Error",
        description: "You must have at least one entity.",
        variant: "destructive",
      });
      return;
    }
    setEntities(entities.filter(entity => entity.id !== id));
  };

  // Submit the client information
  const onClientSubmit = async (data: z.infer<typeof clientFormSchema>) => {
    try {
      // First, create the user for the client
      const userData = {
        username: data.contactEmail.split('@')[0] + Date.now(),
        name: data.contactName,
        email: data.contactEmail,
        password: Math.random().toString(36).slice(-8), // Generate random password
        role: "client",
      };

      const user = await apiRequest('/api/users', {
        method: 'POST',
        data: userData,
      });

      // Then create the client record
      const clientData = {
        ...data,
        userId: user.id,
      };

      const client = await apiRequest('/api/clients', {
        method: 'POST',
        data: clientData,
      });

      setClientId(client.id);
      toast({
        title: "Success",
        description: "Client information saved successfully.",
      });

      // Move to the next tab
      setActiveTab("entities");

      return client;
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save client information.",
        variant: "destructive",
      });
    }
  };

  // Submit the entire onboarding form
  const onSubmit = async () => {
    // If we're not on the entities tab, submit the client form
    if (activeTab === "client-info") {
      await clientForm.handleSubmit(onClientSubmit)();
      return;
    }

    // Check if client has been created
    if (!clientId) {
      toast({
        title: "Error",
        description: "Please create the client record first.",
        variant: "destructive",
      });
      setActiveTab("client-info");
      return;
    }

    // Validate all entity forms
    let isValid = true;
    const entityData = [];

    for (const entityForm of entityForms) {
      const formValid = await entityForm.form.trigger();
      if (!formValid) {
        isValid = false;
      } else {
        const data = entityForm.form.getValues();
        entityData.push(data);
      }
    }

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the entity forms.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create all entities
      const createdEntities = await Promise.all(
        entityData.map(data => 
          apiRequest('/api/entities', {
            method: 'POST',
            data: {
              ...data,
              clientId,
            },
          })
        )
      );

      // Invalidate any relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entities'] });

      toast({
        title: "Success",
        description: `Onboarding complete! Created ${createdEntities.length} entities.`,
      });

      // Call the success callback
      onSuccess();
    } catch (error: any) {
      console.error("Error creating entities:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create entities.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client-info">Client Information</TabsTrigger>
          <TabsTrigger value="entities" disabled={!clientId}>
            Business Entities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client-info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Enter the basic information about the client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...clientForm}>
                <form
                  onSubmit={clientForm.handleSubmit(onClientSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={clientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC Corporation" {...field} />
                          </FormControl>
                          <FormDescription>
                            The name of the client organization
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
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
                          <FormDescription>The client's primary industry</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />
                  <h3 className="text-lg font-medium">Primary Contact</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={clientForm.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormDescription>
                            The primary contact person for this client
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The primary contact email address
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormDescription>
                            The primary contact phone number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional information about the client..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Any additional notes or information about the client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit">
                      Continue to Business Entities
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-6 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Business Entities</h2>
            <Button onClick={addEntity} variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Entity
            </Button>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {entityForms.map((entityForm, index) => (
              <AccordionItem key={entityForm.id} value={entityForm.id.toString()}>
                <div className="flex items-center justify-between">
                  <AccordionTrigger>
                    Entity {index + 1}: {entityForm.form.watch("name") || "New Entity"}
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntity(entityForm.id)}
                    className="mr-4"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <AccordionContent>
                  <Card>
                    <CardContent className="pt-6">
                      <Form {...entityForm.form}>
                        <form className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={entityForm.form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="ABC Subsidiary" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    The operating name of the entity
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={entityForm.form.control}
                              name="legalName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Legal Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="ABC Subsidiary LLC" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    The legal registered name of the entity
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={entityForm.form.control}
                              name="taxId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tax ID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="XX-XXXXXXX" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Federal Tax ID or EIN
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={entityForm.form.control}
                              name="entityType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Type</FormLabel>
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
                                      <SelectItem value="llc">LLC</SelectItem>
                                      <SelectItem value="corporation">Corporation</SelectItem>
                                      <SelectItem value="s-corporation">S-Corporation</SelectItem>
                                      <SelectItem value="partnership">Partnership</SelectItem>
                                      <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                                      <SelectItem value="non-profit">Non-Profit</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    The legal structure of the entity
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={entityForm.form.control}
                              name="industry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Industry</FormLabel>
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
                                    The entity's primary industry
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={entityForm.form.control}
                              name="fiscalYearEnd"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fiscal Year End</FormLabel>
                                  <FormControl>
                                    <Input placeholder="MM/DD" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    The end date of the fiscal year (MM/DD)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Separator />
                          <h3 className="text-lg font-medium">Contact Information</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={entityForm.form.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="123 Business St, Suite 101, City, State, ZIP"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4">
                              <FormField
                                control={entityForm.form.control}
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
                                control={entityForm.form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder="info@entity.com"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={entityForm.form.control}
                              name="website"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Website</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="https://www.entity.com"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setActiveTab("client-info")}>
              Back to Client Information
            </Button>
            <Button onClick={onSubmit}>Complete Onboarding</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}