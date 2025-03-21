import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { enhancedUserSchema, enhancedEntitySchema } from '../../../shared/validation';
import { apiRequest } from '@/lib/queryClient';

// Define Industry Options
const INDUSTRY_OPTIONS = [
  { value: 'accounting', label: 'Accounting & Bookkeeping' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'construction', label: 'Construction' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality & Tourism' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'retail', label: 'Retail' },
  { value: 'technology', label: 'Technology & Software' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'other', label: 'Other' },
];

// Define Currency Options
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
];

// Define Timezone Options
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
];

// Define Business Type Options
const BUSINESS_TYPE_OPTIONS = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corporation', label: 'S Corporation' },
  { value: 'nonprofit', label: 'Non-profit Organization' },
];

// Extend the user schema for client onboarding
const clientOnboardingSchema = z.object({
  // Client details
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().optional(),
  industry: z.string().min(1, "Please select an industry"),
  subIndustry: z.string().optional(),
  preferredLanguage: z.string().default('en'),
  timezone: z.string().min(1, "Please select a timezone"),
  dataConsent: z.boolean().refine(val => val === true, {
    message: "You must provide consent to proceed"
  }),
  
  // Initial password
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  
  // Entities (at least one required)
  entities: z.array(z.object({
    name: z.string().min(2, "Entity name must be at least 2 characters"),
    code: z.string().min(2, "Entity code must be at least 2 characters"),
    fiscalYearStart: z.string().min(1, "Please select fiscal year start date"),
    fiscalYearEnd: z.string().min(1, "Please select fiscal year end date"),
    taxId: z.string().optional(),
    address: z.string().optional(),
    industry: z.string().min(1, "Please select an industry"),
    currency: z.string().min(1, "Please select a currency"),
    timezone: z.string().min(1, "Please select a timezone"),
    businessType: z.string().min(1, "Please select a business type"),
    publiclyTraded: z.boolean().default(false),
    stockSymbol: z.string().optional(),
  })).min(1, "At least one entity is required"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ClientOnboardingFormValues = z.infer<typeof clientOnboardingSchema>;

interface ClientOnboardingFormProps {
  onSuccess?: () => void;
}

export default function ClientOnboardingForm({ onSuccess }: ClientOnboardingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<ClientOnboardingFormValues>({
    resolver: zodResolver(clientOnboardingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      subIndustry: "",
      preferredLanguage: "en",
      timezone: "America/New_York",
      dataConsent: false,
      password: "",
      confirmPassword: "",
      entities: [
        {
          name: "",
          code: "",
          fiscalYearStart: "01-01",
          fiscalYearEnd: "12-31",
          taxId: "",
          address: "",
          industry: "",
          currency: "USD",
          timezone: "America/New_York",
          businessType: "",
          publiclyTraded: false,
          stockSymbol: "",
        }
      ],
    },
  });

  const addEntity = () => {
    const entities = form.getValues("entities");
    form.setValue("entities", [
      ...entities,
      {
        name: "",
        code: "",
        fiscalYearStart: "01-01",
        fiscalYearEnd: "12-31",
        taxId: "",
        address: "",
        industry: "",
        currency: "USD",
        timezone: "America/New_York",
        businessType: "",
        publiclyTraded: false,
        stockSymbol: "",
      }
    ]);
  };

  const removeEntity = (index: number) => {
    const entities = form.getValues("entities");
    if (entities.length > 1) {
      form.setValue("entities", entities.filter((_, i) => i !== index));
    } else {
      toast({
        title: "Cannot remove entity",
        description: "At least one entity is required",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: ClientOnboardingFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Client onboarded successfully",
          description: "The client and entities have been created",
          variant: "default",
        });
        queryClient.invalidateQueries();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Onboarding failed",
        description: "There was an error during the onboarding process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Client Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
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
                      <Input type="email" placeholder="Enter email address" {...field} />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
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
                      <Textarea placeholder="Enter address" {...field} />
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
              <FormField
                control={form.control}
                name="subIndustry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter sub-industry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
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
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">Account Setup</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="dataConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-6">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I consent to the collection and processing of my data
                    </FormLabel>
                    <FormDescription>
                      Your data will be processed in accordance with our privacy policy
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">Entities</h2>
        <div className="space-y-4">
          {form.watch("entities").map((entity, index) => (
            <Card key={index}>
              <Accordion type="single" collapsible defaultValue={`entity-${index}`}>
                <AccordionItem value={`entity-${index}`}>
                  <AccordionTrigger className="px-4">
                    <span className="font-medium">
                      {entity.name || `Entity ${index + 1}`}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="pt-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`entities.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entity Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter entity name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`entities.${index}.code`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entity Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter entity code" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`entities.${index}.fiscalYearStart`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fiscal Year Start</FormLabel>
                              <FormControl>
                                <Input placeholder="MM-DD" {...field} />
                              </FormControl>
                              <FormDescription>
                                Format: MM-DD (e.g., 01-01)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`entities.${index}.fiscalYearEnd`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fiscal Year End</FormLabel>
                              <FormControl>
                                <Input placeholder="MM-DD" {...field} />
                              </FormControl>
                              <FormDescription>
                                Format: MM-DD (e.g., 12-31)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`entities.${index}.taxId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax ID / EIN</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter tax ID" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`entities.${index}.address`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entity Address</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter entity address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`entities.${index}.industry`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
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
                        <FormField
                          control={form.control}
                          name={`entities.${index}.currency`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CURRENCY_OPTIONS.map((currency) => (
                                    <SelectItem key={currency.value} value={currency.value}>
                                      {currency.label}
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
                          name={`entities.${index}.timezone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timezone</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select timezone" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TIMEZONE_OPTIONS.map((timezone) => (
                                    <SelectItem key={timezone.value} value={timezone.value}>
                                      {timezone.label}
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
                          name={`entities.${index}.businessType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select business type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BUSINESS_TYPE_OPTIONS.map((type) => (
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
                          name={`entities.${index}.publiclyTraded`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-6">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Publicly Traded
                                </FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`entities.${index}.publiclyTraded`) && (
                          <FormField
                            control={form.control}
                            name={`entities.${index}.stockSymbol`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock Symbol</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter stock symbol" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={() => removeEntity(index)}
                          className="flex items-center"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Entity
                        </Button>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={addEntity}
          className="w-full flex items-center justify-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Entity
        </Button>
        
        <div className="flex justify-end space-x-4 mt-8">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Complete Onboarding"}
          </Button>
        </div>
      </form>
    </Form>
  );
}