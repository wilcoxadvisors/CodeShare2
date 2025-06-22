import React from "react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Check, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { buildFullReference } from "@/utils/journalIdUtils";

interface JournalEntryHeaderProps {
  journalData: {
    date: string;
    description: string;
    referenceUserSuffix: string;
    isAccrual: boolean;
    reversalDate: string;
    [key: string]: any;
  };
  setJournalData: React.Dispatch<React.SetStateAction<any>>;
  fieldErrors: Record<string, string>;
  existingEntry?: any;
  autoReferencePrefix: string;
  displayId: string;
}

export function JournalEntryHeader({
  journalData,
  setJournalData,
  fieldErrors,
  existingEntry,
  autoReferencePrefix,
  displayId,
}: JournalEntryHeaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJournalData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAccrualChange = (checked: boolean) => {
    setJournalData((prev: any) => ({
      ...prev,
      isAccrual: checked,
      reversalDate: checked ? prev.reversalDate : '',
    }));
  };

  const handleDateSelect = (date: Date | undefined, field: string) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      setJournalData((prev: any) => ({
        ...prev,
        [field]: formattedDate,
      }));
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label htmlFor="journalIdDisplay">Journal Entry ID</Label>
          <div className="relative">
            <Input
              id="journalIdDisplay"
              name="journalIdDisplay"
              value={displayId}
              className="mt-1 bg-gray-50 font-mono"
              readOnly
            />
          </div>
          {!existingEntry?.id && (
            <p className="text-xs text-gray-500 mt-1">
              Preview ID - actual database ID will replace 999999 upon creation
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <div className="relative">
            <Input
              id="date"
              name="date"
              type="date"
              value={journalData.date}
              onChange={handleChange}
              className={`mt-1 ${fieldErrors.date ? "border-red-500 pr-10" : ""}`}
            />
            {fieldErrors.date && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1 pointer-events-none">
                <AlertCircle
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          {fieldErrors.date && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" /> {fieldErrors.date}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="reference-prefix">Reference</Label>
          <div className="space-y-2">
            {/* Auto-generated prefix (read-only) */}
            <div className="relative">
              <Input
                id="reference-prefix"
                value={autoReferencePrefix}
                readOnly
                className="mt-1 bg-gray-50 text-gray-700 font-mono text-sm"
                placeholder="Auto-generated unique prefix"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1 pointer-events-none">
                <Check className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-gray-600 flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
              Unique system-generated ID
            </p>
            
            {/* Optional user suffix */}
            <div className="relative">
              <Input
                id="reference-suffix"
                name="referenceUserSuffix"
                value={journalData.referenceUserSuffix}
                onChange={handleChange}
                placeholder="Add your own reference (optional)"
                className="mt-1"
                maxLength={30}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Examples: INV-001, ACCRUAL, PAYROLL, etc.
            </p>
            {journalData.referenceUserSuffix && (
              <div className="mt-2 p-2 bg-gray-50 rounded border">
                <p className="text-xs text-gray-600">Complete reference:</p>
                <p className="font-mono text-sm text-gray-800 break-all">
                  {buildFullReference(autoReferencePrefix, journalData.referenceUserSuffix)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="description">Description</Label>
        <div className="relative">
          <Textarea
            id="description"
            name="description"
            value={journalData.description}
            onChange={handleChange}
            rows={2}
            placeholder="Enter a description for this journal entry"
            className={`mt-1 ${fieldErrors.description ? "border-red-500 pr-10" : ""}`}
          />
          {fieldErrors.description && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <AlertCircle
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {fieldErrors.description && (
          <p className="text-red-500 text-sm mt-1 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" /> {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Auto-Reversing Accrual Settings */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-3 mb-3">
          <Switch
            id="isAccrual"
            checked={journalData.isAccrual || false}
            onCheckedChange={handleAccrualChange}
          />
          <Label htmlFor="isAccrual" className="font-medium">
            Auto-Reversing Accrual
          </Label>
        </div>
        
        {journalData.isAccrual && (
          <div className="mt-3">
            <Label htmlFor="reversalDate" className="text-sm">
              Reversal Date
            </Label>
            <div className="mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !journalData.reversalDate && "text-muted-foreground"
                    } ${fieldErrors.reversalDate ? "border-red-500" : ""}`}
                  >
                    {journalData.reversalDate && journalData.reversalDate.length > 0 ? (
                      format(new Date(journalData.reversalDate.replace(/-/g, '/')), "PPP")
                    ) : (
                      <span>Pick a reversal date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={journalData.reversalDate ? (() => {
                      const [year, month, day] = journalData.reversalDate.split('-');
                      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    })() : undefined}
                    onSelect={(date) => handleDateSelect(date, 'reversalDate')}
                    disabled={(date) => {
                      // If no journal entry date is set yet, don't disable anything.
                      if (!journalData.date) return false;

                      // Create a clean date object from the journal entry date string to avoid timezone issues.
                      // The journalData.date is 'YYYY-MM-DD'. Adding 'T00:00:00' makes the comparison reliable.
                      const entryDate = new Date(`${journalData.date}T00:00:00`);

                      // Disable all dates that are on or before the journal entry's date.
                      return date <= entryDate;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.reversalDate && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" /> {fieldErrors.reversalDate}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This entry will be automatically reversed on the selected date
            </p>
          </div>
        )}
      </div>
    </>
  );
}