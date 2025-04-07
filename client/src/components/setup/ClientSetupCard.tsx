import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { INDUSTRY_OPTIONS, ensureIndustryValue } from "@/lib/industryUtils";

// Define schema for client setup form
const clientSetupSchema = z.object({
  // Basic company information
  name: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  legalName: z.string().min(2, { message: "Legal name must be at least 2 characters." }),
  taxId: z.string().optional(),
  industry: z.string().min(1, { message: "Please select an industry" }),
  
  // Contact information
  contactName: z.string().optional(),
  contactTitle: z.string().optional(),
  contactEmail: z.string().optional().refine(
    (val) => !val || val === "" || val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    { message: "Please enter a valid contact email address if providing one" }
  ),
  contactPhone: z.string().optional(),
  
  // Company contact information
  phone: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || val === "" || val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    { message: "Please enter a valid email address if providing one" }
  ),
  
  // Structured address
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  
  // Legacy address field (to ensure backward compatibility)
  address: z.string().optional(),
  
  // Additional information
  website: z.string().optional().refine(
    (val) => !val || val === "" || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("www."),
    { message: "Website should start with http://, https://, or www." }
  ),
  notes: z.string().optional()
});

type ClientSetupValues = z.infer<typeof clientSetupSchema>;

interface ClientSetupCardProps {
  onNext: (data: ClientSetupValues) => void;
  setClientData: (data: ClientSetupValues) => void;
  initialData?: ClientSetupValues;
  open?: boolean; // Add open prop to track dialog state
  isLoading?: boolean; // Add isLoading prop to show loading state during API calls
}

export default function ClientSetupCard({ onNext, setClientData, initialData, open, isLoading }: ClientSetupCardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log("FORM INIT: ClientSetupCard rendering. Has initialData:", !!initialData, "Open:", open);
  
  // Using ensureIndustryValue from industryUtils.ts for consistent industry validation
  
  // Utility function to get default form values with optional overrides
  const getDefaultFormValues = (overrides: Partial<ClientSetupValues> = {}) => {
    return {
      // Basic company information
      name: "",
      legalName: "",
      taxId: "",
      industry: "other", // Default to "other" to ensure it always has a value
      
      // Contact information
      contactName: "",
      contactTitle: "",
      contactEmail: "",
      contactPhone: "",
      
      // Company contact information
      phone: "",
      email: "",
      
      // Structured address
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      
      // Legacy address field
      address: "",
      
      // Additional information
      website: "",
      notes: "",
      
      ...overrides // Allow overriding specific fields
    };
  };
  
  // Initialize form with either the provided initialData or default values
  const form = useForm<ClientSetupValues>({
    resolver: zodResolver(clientSetupSchema),
    defaultValues: initialData ? {
      // Use initialData but ensure industry has a valid value
      ...initialData,
      industry: ensureIndustryValue(initialData.industry)
    } : getDefaultFormValues(),
    mode: "onBlur" // Only validate when field loses focus, not during typing
  });
  
  // Log the current values for debugging
  console.log("FORM DEBUG: Initial form values:", form.getValues());
  
  // Add effect to explicitly reset form when dialog closes
  useEffect(() => {
    if (open === false) {
      console.log("FORM RESET: Dialog closed, explicitly resetting form to default values");
      form.reset(getDefaultFormValues());
    }
  }, [open, form]);

  const onSubmit = async (data: ClientSetupValues) => {
    console.log("FORM SUBMIT: Client form submit started with data:", data);
    setIsSubmitting(true);
    
    try {
      // Process the form data
      // 1. Ensure industry has a valid value
      // 2. Generate full address from structured fields for backward compatibility
      // 3. Fill in missing fields with defaults
      
      // Combine structured address fields into legacy address field
      let fullAddress = "";
      
      // Check if any structured address fields are populated
      if (data.street || data.city || data.state || data.zipCode || data.country) {
        // Construct formatted address from structured fields
        const addressParts = [
          data.street,
          data.city ? (data.city + (data.state ? ", " + data.state : "")) : data.state,
          data.zipCode,
          data.country !== "United States" ? data.country : ""
        ].filter(Boolean); // Remove empty values
        
        fullAddress = addressParts.join("\n");
        console.log("FORM SUBMIT: Generated structured address:", fullAddress);
      } else if (data.address) {
        // Use existing address field if structured fields are empty
        fullAddress = data.address;
      }
      
      const processedData: ClientSetupValues = {
        ...data,
        // Ensure required fields have values
        industry: ensureIndustryValue(data.industry),
        // Always set address field for backward compatibility
        address: fullAddress || data.address || "",
        // Ensure country has a value
        country: data.country || "United States"
      };
      
      console.log("FORM SUBMIT: Processed form data:", processedData);
      
      // First update parent state
      console.log("FORM SUBMIT: Setting client data in parent state");
      setClientData(processedData);
      
      // Show success message
      toast({
        title: "Success",
        description: "Client information saved successfully.",
      });
      
      // Navigate to next step via callback
      console.log("FORM SUBMIT: Now calling onNext to navigate to entities step");
      onNext(processedData);
    } catch (error: any) {
      console.error("Error saving client information:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save client information.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          Client Information
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">Enter your company's basic information to get started with the platform.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Enter the basic information about your company. This will be used throughout the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 w-full max-w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The name your company does business as
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
                        <Input placeholder="Acme Corporation LLC" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The legally registered name of your company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / EIN</FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Your federal tax identification number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => {
                    console.log("CLIENT FORM DEBUG: Industry field rendering with value:", field.value);
                    // Ensure industry has a valid value
                    const safeValue = ensureIndustryValue(field.value);
                    if (safeValue !== field.value) {
                      console.log("CLIENT FORM DEBUG: Industry value corrected from", field.value, "to", safeValue);
                      field.onChange(safeValue);
                    }
                    
                    return (
                      <FormItem className="w-full">
                        <FormLabel>Industry*</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              console.log("CLIENT FORM DEBUG: Industry onChange with value:", value);
                              field.onChange(value);
                            }}
                            value={safeValue}
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
                        <FormDescription className="text-xs">
                          The primary industry your company operates in
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="info@example.com" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The main email address for your company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The main phone number for your company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Contact information section */}
              <div className="mt-6 mb-2">
                <h3 className="text-lg font-medium">Primary Contact Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter information about the primary contact person for this company
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The primary person to contact at this company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Title</FormLabel>
                      <FormControl>
                        <Input placeholder="CEO" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The position or title of the contact person
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@example.com" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The email address for the contact person
                      </FormDescription>
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
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The phone number for the contact person
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Address section */}
              <div className="mt-6 mb-2">
                <h3 className="text-lg font-medium">Address Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the address information for this company
                </p>
              </div>
              
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Suite 100" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Street address including unit/apartment number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP/Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="w-full sm:w-1/2">
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="United States" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Legacy address field for backward compatibility */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="w-full hidden">
                    <FormLabel className="sr-only">Legacy Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Full address (legacy field)"
                        className="min-h-[60px] resize-y w-full"
                        {...field}
                      />
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
                      <Input placeholder="https://www.example.com" {...field} />
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
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information about your company..."
                        className="min-h-[80px] resize-y w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <CardFooter className="px-0 pb-0 pt-4 flex justify-end">
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? "Saving..." : "Save & Continue"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}