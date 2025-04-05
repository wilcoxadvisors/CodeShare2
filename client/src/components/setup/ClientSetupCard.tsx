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
  open?: boolean; // Add open prop to track dialog state
}

export default function ClientSetupCard({ onNext, setClientData, initialData, open }: ClientSetupCardProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log("FORM INIT: ClientSetupCard rendering. Has initialData:", !!initialData, "Open:", open);
  
  // Utility function to ensure industry always has a value
  const ensureIndustryValue = (industryValue: string | undefined | null): string => {
    // Check if the industry value is valid
    return industryValue && INDUSTRY_OPTIONS.some(opt => opt.value === industryValue)
      ? industryValue
      : "other"; // Default to "other" if the value is invalid or missing
  };
  
  // Utility function to get default form values with optional overrides
  const getDefaultFormValues = (overrides: Partial<ClientSetupValues> = {}) => {
    return {
      name: "",
      legalName: "",
      taxId: "",
      industry: "other", // Default to "other" to ensure it always has a value
      address: "",
      phone: "",
      email: "",
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
      // Ensure industry has a valid value before submitting
      const processedData: ClientSetupValues = {
        ...data,
        industry: ensureIndustryValue(data.industry)
      };
      
      console.log("FORM SUBMIT: Processed form data with ensured industry value:", processedData);
      
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