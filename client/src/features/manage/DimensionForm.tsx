// In client/src/features/manage/DimensionForm.tsx

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  code: z.string().min(2, { message: "Code must be at least 2 characters." }).max(20, { message: "Code cannot exceed 20 characters." }),
  description: z.string().optional(),
});

type DimensionFormValues = z.infer<typeof formSchema>;

interface DimensionFormProps {
  onSubmit: (values: DimensionFormValues) => void;
  isSubmitting: boolean;
}

export const DimensionForm: React.FC<DimensionFormProps> = ({ onSubmit, isSubmitting }) => {
  const form = useForm<DimensionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dimension Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dimension Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., PROJ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose of this dimension" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? 'Creating...' : 'Create Dimension'}
        </Button>
      </form>
    </Form>
  );
};