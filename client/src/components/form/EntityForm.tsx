import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { enhancedEntitySchema } from '../../../shared/validation';
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

// Create a schema for entity form
const entityFormSchema = enhancedEntitySchema.extend({
  fiscalYearStart: z.string().min(1, "Please enter fiscal year start date"),
  fiscalYearEnd: z.string().min(1, "Please enter fiscal year end date"),
  taxId: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().min(1, "Please select an industry"),
  currency: z.string().min(1, "Please select a currency"),
  timezone: z.string().min(1, "Please select a timezone"),
  businessType: z.string().min(1, "Please select a business type"),
  publiclyTraded: z.boolean().default(false),
  stockSymbol: z.string().optional(),
  active: z.boolean().default(true),
});

type EntityFormValues = z.infer<typeof entityFormSchema>;

interface Entity {
  id?: number;
  name: string;
  code: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  taxId?: string;
  address?: string;
  industry: string;
  currency: string;
  timezone: string;
  businessType: string;
  publiclyTraded: boolean;
  stockSymbol?: string;
  active: boolean;
  ownerId?: number;
  [key: string]: any;
}

interface EntityFormProps {
  entity?: Entity;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EntityForm({ entity, onSuccess, onCancel }: EntityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!entity?.id;

  // Initialize form with default values or existing entity data
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: entity?.name || "",
      code: entity?.code || "",
      fiscalYearStart: entity?.fiscalYearStart || "01-01",
      fiscalYearEnd: entity?.fiscalYearEnd || "12-31",
      taxId: entity?.taxId || "",
      address: entity?.address || "",
      industry: entity?.industry || "",
      currency: entity?.currency || "USD",
      timezone: entity?.timezone || "America/New_York",
      businessType: entity?.businessType || "",
      publiclyTraded: entity?.publiclyTraded || false,
      stockSymbol: entity?.stockSymbol || "",
      active: entity?.active !== undefined ? entity.active : true,
      ownerId: entity?.ownerId
    },
  });

  // Update form when entity changes
  useEffect(() => {
    if (entity) {
      form.reset({
        name: entity.name,
        code: entity.code,
        fiscalYearStart: entity.fiscalYearStart,
        fiscalYearEnd: entity.fiscalYearEnd,
        taxId: entity.taxId || "",
        address: entity.address || "",
        industry: entity.industry,
        currency: entity.currency,
        timezone: entity.timezone,
        businessType: entity.businessType,
        publiclyTraded: entity.publiclyTraded,
        stockSymbol: entity.stockSymbol || "",
        active: entity.active,
        ownerId: entity.ownerId
      });
    }
  }, [entity, form]);

  const onSubmit = async (data: EntityFormValues) => {
    try {
      const url = isEditMode 
        ? `/api/entities/${entity.id}` 
        : '/api/entities';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: isEditMode ? "Entity updated" : "Entity created",
          description: isEditMode 
            ? "The entity has been updated successfully" 
            : "The entity has been created successfully",
          variant: "default",
        });
        
        // Invalidate entities query
        queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Entity form error:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} entity. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entity Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter entity name" {...field} />
                </FormControl>
                <FormDescription>
                  Full legal name of the entity
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entity Code</FormLabel>
                <FormControl>
                  <Input placeholder="Enter entity code" {...field} />
                </FormControl>
                <FormDescription>
                  Short unique identifier for the entity
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fiscalYearStart"
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
            name="fiscalYearEnd"
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
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID / EIN</FormLabel>
                <FormControl>
                  <Input placeholder="Enter tax ID" {...field} />
                </FormControl>
                <FormDescription>
                  Federal tax identification number or employer ID
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
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
            name="currency"
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
                <FormDescription>
                  Primary currency for financial records
                </FormDescription>
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
            name="businessType"
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
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="publiclyTraded"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
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
                  <FormDescription>
                    Indicates if the company is listed on a stock exchange
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Active
                  </FormLabel>
                  <FormDescription>
                    Enable or disable this entity
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {form.watch("publiclyTraded") && (
          <FormField
            control={form.control}
            name="stockSymbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Symbol</FormLabel>
                <FormControl>
                  <Input placeholder="Enter stock symbol" {...field} />
                </FormControl>
                <FormDescription>
                  Trading symbol used on stock exchanges
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex justify-end space-x-4 mt-6">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit">
            {isEditMode ? "Update Entity" : "Create Entity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}