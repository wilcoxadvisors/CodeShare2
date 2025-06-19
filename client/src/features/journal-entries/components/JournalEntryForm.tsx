import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nanoid } from "nanoid";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Plus, X, Check, ChevronDown, Tag, Tags } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { apiRequest } from "@/lib/queryClient";
import { AccountType, JournalEntryStatus } from "@shared/schema";

// Import the new components
import { JournalEntryHeader } from "./JournalEntryHeader";
import { JournalEntryLinesTable } from "./JournalEntryLinesTable";
import { AttachmentSection } from "./AttachmentSection";

interface JournalEntryResponse {
  id?: number;
  entry?: { id: number };
  [key: string]: any;
}

interface Account {
  id: number;
  accountCode: string; // Use accountCode to match the server schema
  name: string;
  entityId: number;
  type: AccountType;
  description: string | null;
  active: boolean;
  createdAt?: Date;
  subtype?: string | null;
  isSubledger?: boolean;
  subledgerType?: string | null;
  parentId?: number | null;
  [key: string]: any;
}

/** Returns true when the proposed referenceNumber is already used
 *  in another journal entry that belongs to the same entity.
 *  Compares case-insensitively and ignores leading/trailing whitespace. */
function isReferenceDuplicate(
  referenceNumber: string,
  entityId: number,
  existingEntries: any[],
  currentEntryId?: number,
): boolean {
  if (!referenceNumber?.trim()) return false;

  const normalizedRef = referenceNumber.trim().toLowerCase();

  return existingEntries.some((entry) => {
    // Skip the current entry we're editing
    if (currentEntryId && entry.id === currentEntryId) return false;

    // Only check entries from the same entity
    if (entry.entityId !== entityId) return false;

    // Compare normalized reference numbers
    const entryRef = entry.reference || entry.referenceNumber;
    return entryRef?.trim().toLowerCase() === normalizedRef;
  });
}

interface Location {
  id: number;
  name: string;
  code?: string;
  description?: string | null;
  active: boolean;
}

interface Entity {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
}

interface EntityBalance {
  entityCode: string;
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
}

interface JournalEntryFile {
  id: number;
  journalEntryId: number;
  filename: string;
  originalname?: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: number;
  uploadedAt: string | Date;
}

interface ExpandedState {
  [accountId: number]: boolean;
}

interface JournalEntryFormProps {
  entityId: number;
  clientId?: number; // Added clientId support
  accounts: Account[];
  locations?: Location[]; // Kept for interface compatibility but not used
  onSubmit: () => void;
  onCancel: () => void;
  existingEntry?: any;
  entities?: Entity[];
}

interface JournalLine {
  id?: number;
  _key?: string;
  accountId: string;
  entityCode: string; // Added for intercompany support
  description: string;
  debit: string;
  credit: string;
  tags?: DimensionTag[];
}

interface DimensionTag {
  dimensionId: number;
  dimensionValueId: number;
  dimensionName?: string;
  dimensionValueName?: string;
}

function createFormSchema() {
  return z.object({
    date: z.string().min(1, "Date is required"),
    referenceNumber: z.string().min(1, "Reference number is required"),
    description: z.string().min(1, "Description is required"),
    lines: z
      .array(
        z.object({
          accountId: z.string().min(1, "Account is required"),
          entityCode: z.string().min(1, "Entity code is required"),
          description: z.string().min(1, "Line description is required"),
          debit: z.string(),
          credit: z.string(),
          tags: z.array(z.any()).optional(),
        }),
      )
      .min(1, "At least one line is required"),
    isAccrual: z.boolean().optional(),
    reversalDate: z.string().optional(),
  });
}



/**
 * JournalEntryForm Component
 * Renders a form for creating or editing journal entries
 * @param props - The component props
 */
function JournalEntryForm({
  entityId,
  clientId,
  accounts,
  onSubmit,
  onCancel,
  existingEntry,
  entities = [],
}: JournalEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const effectiveClientId = clientId || parseInt(params.clientId || "0");
  
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Create a ref to store the upload function
  const uploadPendingFilesRef = useRef<((entryId: number) => Promise<void>) | null>(null);

  // State for search and expansion
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<ExpandedState>({});
  const [tagPopoverOpen, setTagPopoverOpen] = useState<Record<string, boolean>>({});

  // Journal data with local storage fallback and proper default values
  const generateReference = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `JE-${year}${month}${day}-${nanoid(6).toUpperCase()}`;
  };

  // Create form with proper schema
  const form = useForm({
    resolver: zodResolver(createFormSchema()),
    defaultValues: {
      date: existingEntry?.date ? format(new Date(existingEntry.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      referenceNumber: existingEntry?.reference || existingEntry?.referenceNumber || "",
      description: existingEntry?.description || "",
      lines: [],
      isAccrual: existingEntry?.isAccrual || false,
      reversalDate: existingEntry?.reversalDate ? format(new Date(existingEntry.reversalDate), "yyyy-MM-dd") : "",
    },
  });

  // Watch form values for validation
  const watchedLines = form.watch("lines");
  const watchedDate = form.watch("date");
  const watchedReferenceNumber = form.watch("referenceNumber");

  // Initialize form data
  const [journalData, setJournalData] = useState(() => ({
    date: existingEntry?.date ? format(new Date(existingEntry.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    referenceNumber: existingEntry?.reference || existingEntry?.referenceNumber || generateReference(),
    referenceUserSuffix: existingEntry?.referenceUserSuffix || "",
    description: existingEntry?.description || "",
    isAccrual: existingEntry?.isAccrual || false,
    reversalDate: existingEntry?.reversalDate ? format(new Date(existingEntry.reversalDate), "yyyy-MM-dd") : "",
  }));

  // Query for existing journal entries to check for duplicate reference numbers
  const { data: existingJournalEntries = [] } = useQuery({
    queryKey: ["journal-entries", effectiveClientId, entityId],
    queryFn: () => apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries`),
    enabled: !!effectiveClientId && !!entityId,
  });

  // Query for dimensions with robust error handling
  const { data: dimensionsResponse } = useQuery({
    queryKey: ["dimensions", effectiveClientId],
    queryFn: () => apiRequest(`/api/clients/${effectiveClientId}/dimensions`),
    enabled: !!effectiveClientId,
  });

  const dimensions = (dimensionsResponse && Array.isArray(dimensionsResponse.data))
    ? dimensionsResponse.data
    : Array.isArray(dimensionsResponse)
      ? dimensionsResponse
      : []; // Always default to an empty array

  // Post journal entry mutation
  const postJournalEntry = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${entryId}/post`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["journal-entries", effectiveClientId, entityId],
      });
      toast({
        title: "Success",
        description: "Journal entry posted successfully",
      });
      onSubmit();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to post journal entry",
        variant: "destructive",
      });
    },
  });

  // Create entry mutation
  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries`, {
        method: "POST",
        data: data,
      });
    },
    onSuccess: async (result: JournalEntryResponse, variables: any) => {
      const entryId = result.id || result.entry?.id;
      
      // Upload pending files if any (handled by AttachmentSection)
      if (uploadPendingFilesRef.current) {
        try {
          await uploadPendingFilesRef.current(entryId!);
        } catch (error) {
          console.error("Error uploading files:", error);
          toast({
            title: "Warning",
            description: "Journal entry created but file upload failed",
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["journal-entries", effectiveClientId, entityId],
      });
      
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
      onSubmit();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create journal entry",
        variant: "destructive",
      });
    },
  });

  // Update entry mutation
  const updateEntry = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`, {
        method: "PATCH",
        data: data,
      });
    },
    onSuccess: async (response: JournalEntryResponse) => {
      // Upload pending files if any (handled by AttachmentSection)
      if (uploadPendingFilesRef.current) {
        try {
          await uploadPendingFilesRef.current(existingEntry?.id!);
        } catch (error) {
          console.error("Error uploading files:", error);
          toast({
            title: "Warning",
            description: "Journal entry updated but file upload failed",
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["journal-entries", effectiveClientId, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ["journal-entry", effectiveClientId, entityId, existingEntry?.id],
      });
      
      toast({
        title: "Success",
        description: "Journal entry updated successfully",
      });
      onSubmit();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update journal entry",
        variant: "destructive",
      });
    },
  });

  const initializeExpandedState = (): ExpandedState => {
    const state: ExpandedState = {};
    accounts.forEach((account) => {
      state[account.id] = false; // All accounts collapsed by default
    });
    return state;
  };

  // Initialize lines from existing entry
  useEffect(() => {
    if (existingEntry?.lines) {
      const processedLines = existingEntry.lines.map((line: any) => ({
        id: line.id,
        _key: line.id ? `existing_${line.id}` : nanoid(),
        accountId: line.accountId?.toString() || "",
        entityCode: line.entityCode || "",
        description: line.description || "",
        debit: line.debit?.toString() || "",
        credit: line.credit?.toString() || "",
        tags: line.tags || [],
      }));
      setLines(processedLines);
    } else {
      // Add initial two empty lines for new entries (standard accounting practice)
      const defaultEntityCode = entities.length > 0 ? entities[0].code : "";
      setLines([
        {
          _key: nanoid(),
          accountId: "",
          entityCode: defaultEntityCode,
          description: "",
          debit: "",
          credit: "",
          tags: [],
        },
        {
          _key: nanoid(),
          accountId: "",
          entityCode: defaultEntityCode,
          description: "",
          debit: "",
          credit: "",
          tags: [],
        },
      ]);
    }
  }, [existingEntry, entities]);

  // Line management functions
  const addLine = () => {
    const newLine: JournalLine = {
      _key: nanoid(),
      accountId: "",
      entityCode: entities.length > 0 ? entities[0].code : "",
      description: "",
      debit: "",
      credit: "",
      tags: [],
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: string) => {
    const updatedLines = [...lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setLines(updatedLines);
  };

  // Function to update line tags
  const updateLineTags = (lineIndex: number, tags: DimensionTag[]) => {
    const updatedLines = [...lines];
    updatedLines[lineIndex] = { ...updatedLines[lineIndex], tags };
    setLines(updatedLines);
  };

  // Calculate totals and balance
  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01; // Allow for small rounding differences

  // Calculate entity balances for intercompany validation
  const entityBalances = useMemo(() => {
    const balances: Record<string, EntityBalance> = {};

    lines.forEach((line) => {
      if (!line.entityCode) return;

      if (!balances[line.entityCode]) {
        balances[line.entityCode] = {
          entityCode: line.entityCode,
          debit: 0,
          credit: 0,
          difference: 0,
          balanced: false,
        };
      }

      balances[line.entityCode].debit += parseFloat(line.debit) || 0;
      balances[line.entityCode].credit += parseFloat(line.credit) || 0;
    });

    // Calculate difference and balanced status for each entity
    Object.values(balances).forEach((balance) => {
      balance.difference = Math.abs(balance.debit - balance.credit);
      balance.balanced = balance.difference < 0.01;
    });

    return Object.values(balances);
  }, [lines]);

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate basic fields
    if (!journalData.date) {
      errors.date = "Date is required";
    }

    if (!journalData.referenceNumber?.trim()) {
      errors.referenceNumber = "Reference number is required";
    } else if (isReferenceDuplicate(journalData.referenceNumber, entityId, existingJournalEntries, existingEntry?.id)) {
      errors.referenceNumber = "This reference number is already used";
    }

    if (!journalData.description?.trim()) {
      errors.description = "Description is required";
    }

    // Validate accrual reversal date
    if (journalData.isAccrual && !journalData.reversalDate) {
      errors.reversalDate = "Reversal date is required for accrual entries";
    }

    if (journalData.isAccrual && journalData.reversalDate) {
      const entryDate = new Date(journalData.date);
      const reversalDate = new Date(journalData.reversalDate);
      
      if (reversalDate <= entryDate) {
        errors.reversalDate = "Reversal date must be after the journal entry date";
      }
    }

    // Validate lines
    lines.forEach((line, index) => {
      if (!line.accountId) {
        errors[`line_${index}_accountId`] = "Account is required";
      }
      if (!line.entityCode) {
        errors[`line_${index}_entityCode`] = "Entity code is required";
      }
      
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      
      if (debit === 0 && credit === 0) {
        errors[`line_${index}_debit`] = "Either debit or credit must be greater than 0";
        errors[`line_${index}_credit`] = "Either debit or credit must be greater than 0";
      }
      
      if (debit > 0 && credit > 0) {
        errors[`line_${index}_debit`] = "A line cannot have both debit and credit amounts";
        errors[`line_${index}_credit`] = "A line cannot have both debit and credit amounts";
      }
      
      if (debit < 0 || credit < 0) {
        if (debit < 0) errors[`line_${index}_debit`] = "Amount cannot be negative";
        if (credit < 0) errors[`line_${index}_credit`] = "Amount cannot be negative";
      }
    });

    // Validate entry balance
    if (!isBalanced) {
      errors.balance = "Journal entry must be balanced (total debits = total credits)";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to transform lines from frontend format to backend format
  const transformLineForBackend = (line: JournalLine) => {
    const debitAmount = parseFloat(line.debit) || 0;
    const creditAmount = parseFloat(line.credit) || 0;
    
    // Validate that a line has either debit OR credit, not both
    if (debitAmount > 0 && creditAmount > 0) {
      throw new Error(`Line cannot have both debit (${debitAmount}) and credit (${creditAmount}) amounts`);
    }
    
    // Ensure at least one amount is provided
    if (debitAmount === 0 && creditAmount === 0) {
      throw new Error('Line must have either a debit or credit amount');
    }
    
    return {
      id: line.id,
      accountId: parseInt(line.accountId),
      entityCode: line.entityCode,
      description: line.description,
      type: debitAmount > 0 ? "debit" : "credit",
      amount: debitAmount > 0 ? debitAmount : creditAmount,
      tags: line.tags || [],
    };
  };

  // Form submission handlers
  const handleSaveDraft = () => {
    if (!validateForm()) return;

    try {
      const formData = {
        date: journalData.date,
        reference: journalData.referenceNumber,
        referenceNumber: journalData.referenceNumber,
        referenceUserSuffix: "",
        description: journalData.description,
        status: "draft" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual ? journalData.reversalDate : null,
        lines: lines.map(transformLineForBackend),
      };

      if (existingEntry && existingEntry.id) {
        updateEntry.mutate(formData);
      } else {
        createEntry.mutate(formData);
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid line data",
        variant: "destructive",
      });
    }
  };

  const handleSubmitForApproval = () => {
    if (!validateForm()) return;
    if (!isBalanced) {
      toast({
        title: "Error",
        description: "Journal entry must be balanced before submitting for approval",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = {
        date: journalData.date,
        reference: journalData.referenceNumber,
        referenceNumber: journalData.referenceNumber,
        referenceUserSuffix: "",
        description: journalData.description,
        status: "pending_approval" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual ? journalData.reversalDate : null,
        lines: lines.map(transformLineForBackend),
      };

      if (existingEntry && existingEntry.id) {
        updateEntry.mutate(formData);
      } else {
        createEntry.mutate(formData);
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid line data",
        variant: "destructive",
      });
    }
  };

  const handlePostEntry = () => {
    if (!validateForm()) return;
    if (!isBalanced) {
      toast({
        title: "Error",
        description: "Journal entry must be balanced before posting",
        variant: "destructive",
      });
      return;
    }

    // Pending files validation is now handled by AttachmentSection

    try {
      const formData = {
        date: journalData.date,
        reference: journalData.referenceNumber,
        referenceNumber: journalData.referenceNumber,
        referenceUserSuffix: "",
        description: journalData.description,
        status: "posted" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual ? journalData.reversalDate : null,
        lines: lines.map(transformLineForBackend),
      };

      if (existingEntry && existingEntry.id) {
        updateEntry.mutate(formData);
      } else {
        createEntry.mutate(formData);
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid line data",
        variant: "destructive",
      });
    }
  };

  const tempJournalEntryId = existingEntry?.id;
  const isUploading = false; // Add this state if needed for upload progress

  // Check if user has admin role
  const user = { role: 'admin' }; // This should come from your auth context

  return (
    <div className="space-y-6">
      {/* Journal Entry Header Section */}
      <JournalEntryHeader
        journalData={journalData}
        setJournalData={setJournalData}
        fieldErrors={fieldErrors}
        existingEntry={existingEntry}
        autoReferencePrefix={`JE-${effectiveClientId}-${entityId}-${format(new Date(), 'MMddyy')}`}
        displayId={existingEntry?.id ? `JE-${effectiveClientId}-${entityId}-${format(new Date(existingEntry.date), 'MMddyy')}-${existingEntry.id}` : "Will be assigned after creation"}
      />

      {/* Journal Entry Lines Table Section */}
      <JournalEntryLinesTable
        lines={lines}
        setLines={setLines}
        accounts={accounts}
        entities={entities}
        dimensions={dimensions}
        fieldErrors={fieldErrors}
        isBalanced={isBalanced}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
      />

      {/* Attachment Section */}
      <AttachmentSection
        entityId={entityId}
        clientId={effectiveClientId as number}
        journalEntryId={tempJournalEntryId}
        status={existingEntry?.status}
        isInEditMode={!existingEntry || existingEntry.status === 'draft'}
        onUploadToEntryRef={uploadPendingFilesRef}
      />

      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={createEntry.isPending || updateEntry.isPending}
        >
          Cancel
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {/* Save as Draft button - for all users */}
          <Button
            onClick={handleSaveDraft}
            disabled={createEntry.isPending || updateEntry.isPending || isUploading}
            variant="outline"
          >
            {createEntry.isPending || updateEntry.isPending || isUploading
              ? "Saving..."
              : "Save Draft"}
          </Button>

          {/* Submit for Approval button - for non-admin users */}
          {user.role !== 'admin' && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={!isBalanced || createEntry.isPending || updateEntry.isPending || isUploading}
              className={!isBalanced ? "bg-gray-400 cursor-not-allowed" : ""}
            >
              {createEntry.isPending || updateEntry.isPending || isUploading
                ? "Submitting..."
                : "Submit for Approval"}
            </Button>
          )}

          {/* Post button - for admin users only */}
          {user.role === 'admin' && (
            <Button
              onClick={handlePostEntry}
              disabled={!isBalanced || createEntry.isPending || updateEntry.isPending || isUploading}
              className={!isBalanced ? "bg-gray-400 cursor-not-allowed" : ""}
            >
              {createEntry.isPending || updateEntry.isPending || isUploading
                ? "Posting..."
                : "Post Entry"}
            </Button>
          )}
        </div>
      </div>

      {/* Balance validation message */}
      {!isBalanced && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Entry is not balanced</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Total debits ({totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) 
                  must equal total credits ({totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                  Difference: {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intercompany balance validation */}
      {entityBalances.some((balance) => !balance.balanced) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Intercompany entries not balanced</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Some entities in this intercompany transaction are not individually balanced:</p>
                <ul className="mt-1 list-disc list-inside">
                  {entityBalances
                    .filter((balance) => !balance.balanced)
                    .map((balance) => (
                      <li key={balance.entityCode}>
                        Entity {balance.entityCode}: Difference of {balance.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalEntryForm;