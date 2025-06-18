import React from "react";
import { format } from "date-fns";
import { CheckCircle2, Check, CalendarIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { JournalEntryFormData } from "@shared/schema";

interface JournalEntryHeaderProps {
  form: UseFormReturn<JournalEntryFormData>;
  existingEntry?: any;
  entities?: any[];
  existingJournalEntries?: any[];
}

export function JournalEntryHeader({
  form,
  existingEntry,
  entities = [],
  existingJournalEntries = [],
}: JournalEntryHeaderProps) {

  const journalEntryDate = form.watch("date");
  const isAccrual = form.watch("isAccrual");

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Journal Entry Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Field */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  placeholder="Select date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reference Number Field */}
        <FormField
          control={form.control}
          name="referenceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="Auto-generated if empty"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Accrual Switch */}
        <FormField
          control={form.control}
          name="isAccrual"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-3">
              <FormLabel>Auto-reverse accrual</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Description Field */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter a description for this journal entry"
                rows={2}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Reversal Date - Show only if accrual is enabled */}
      {isAccrual && (
        <FormField
          control={form.control}
          name="reversalDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reversal Date</FormLabel>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !field.value && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(new Date(field.value.replace(/-/g, '/')), "PPP")
                      ) : (
                        <span>Pick a reversal date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ? (() => {
                        const [year, month, day] = field.value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      })() : undefined}
                      onSelect={(date) => {
                        field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                      }}
                      disabled={(date) => {
                        if (!journalEntryDate) return false;
                        const entryDate = new Date(`${journalEntryDate}T00:00:00`);
                        return date <= entryDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                This entry will be automatically reversed on the selected date
              </p>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}