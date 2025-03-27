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
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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

// Define schema for client setup form
const clientSetupSchema = z.object({
  name: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  legalName: z.string().min(2, { message: "Legal name must be at least 2 characters." }),
  taxId: z.string().optional(),
  industry: z.string().min(1, { message: "Please select an industry" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || val === "" || val.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    { message: "Please enter a valid email address if providing one" }
  ),
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
}

export default function ClientSetupCard({ onNext, setClientData, initialData }: ClientSetupCardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attempt to get data from session storage first (highest priority)
  const getSavedClientData = () => {
    try {
      const savedData = sessionStorage.getItem('setupData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed?.clientData) {
          console.log("FORM INIT: Using client data from sessionStorage");
          return parsed.clientData;
        }
      }
    } catch (error) {
      console.error("Failed to load from sessionStorage:", error);
    }
    
    // Fall back to props if session storage fails
    if (initialData) {
      console.log("FORM INIT: Using initialData from props");
      return initialData;
    }
    
    // Default empty values as last resort
    console.log("FORM INIT: Using default empty values");
    return {
      name: "",
      legalName: "",
      taxId: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      notes: ""
    };
  };
  
  // Get initial form values with fallback chain (session storage → props → defaults)
  const initialFormValues = getSavedClientData();
  
  // Initialize form with our best available data
  const form = useForm<ClientSetupValues>({
    resolver: zodResolver(clientSetupSchema),
    defaultValues: initialFormValues,
    mode: "onBlur", // Only validate when field loses focus, not during typing
  });
  
  // Debug log the form's current values for tracing
  useEffect(() => {
    console.log("FORM DEBUG: Form values:", form.getValues());
  }, [form]);
  
  // Add debugging on individual form fields to detect changes
  const formValues = form.watch();
  useEffect(() => {
    console.log("FORM WATCH: Fields changed, current values:", formValues);
  }, [formValues]);
  
  // CRITICAL FIX: The auto-save might be causing form reset issues
  // Only save on specific events instead of intervals to prevent race conditions
  
  // Track previous form values to detect actual changes
  const [lastSavedValues, setLastSavedValues] = useState<ClientSetupValues | null>(null);
  
  // Safety mechanism: Save on blur events instead of timer
  const handleSaveOnBlur = () => {
    console.log("FORM BLUR: Auto-saving current form values");
    const currentValues = form.getValues();
    
    // Only save if something has changed from last save
    const hasChanged = !lastSavedValues || 
      JSON.stringify(lastSavedValues) !== JSON.stringify(currentValues);
    
    // Only save if we have minimal data and changes detected
    if ((currentValues.name || currentValues.legalName) && hasChanged) {
      try {
        const savedData = sessionStorage.getItem('setupData') || '{}';
        const parsedData = JSON.parse(savedData);
        
        console.log("FORM BLUR: Saving form values to sessionStorage", currentValues);
        
        // Save to session storage
        sessionStorage.setItem('setupData', JSON.stringify({
          ...parsedData,
          clientData: currentValues
        }));
        
        // Update our last saved values reference
        setLastSavedValues(currentValues);
        
        console.log("FORM BLUR: Successfully saved form state");
      } catch (error) {
        console.error("FORM BLUR: Auto-save failed:", error);
      }
    } else {
      console.log("FORM BLUR: No meaningful changes to save");
    }
  };
  
  // Register blur handler on all form inputs using event delegation
  useEffect(() => {
    const formElement = document.querySelector('form');
    if (formElement) {
      formElement.addEventListener('blur', handleSaveOnBlur, true);
      return () => {
        formElement.removeEventListener('blur', handleSaveOnBlur, true);
      };
    }
  }, [form, lastSavedValues]);

  const onSubmit = async (data: ClientSetupValues) => {
    setIsSubmitting(true);
    try {
      console.log("FORM SUBMIT: Client form submit started");
      
      // CRITICAL FIX: Save to sessionStorage first for persistence
      try {
        // Get existing setup data if any
        const savedData = sessionStorage.getItem('setupData');
        const existingData = savedData ? JSON.parse(savedData) : {};
        
        // Update with new client data
        const newData = {
          ...existingData,
          clientData: data,
          currentStep: "entities" // Pre-set the next step
        };
        
        // Save to session storage
        sessionStorage.setItem('setupData', JSON.stringify(newData));
        console.log("FORM SUBMIT: Saved to sessionStorage for persistence");
      } catch (storageError) {
        console.error("Failed to save to sessionStorage:", storageError);
        // Continue anyway since we have other mechanisms
      }
      
      // CRITICAL FIX: Set client data in parent state
      console.log("FORM SUBMIT: Setting client data in parent state");
      if (setClientData) {
        setClientData(data);
      }
      
      // Show success message
      toast({
        title: "Success",
        description: "Client information saved successfully.",
      });
      
      // CRITICAL FIX: Wait to ensure parent state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // CRITICAL FIX: Navigate to next step via callback - pass data explicitly
      console.log("FORM SUBMIT: Now calling onNext to navigate to entities step");
      if (onNext) {
        onNext(data);
      } else {
        console.error("🔴 onNext function is not defined!");
      }
      
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
                      <FormDescription className="text-xs">
                        The primary industry your company operates in
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
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
              
              <FormField
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
                      Your company's primary address
                    </FormDescription>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save & Continue"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}