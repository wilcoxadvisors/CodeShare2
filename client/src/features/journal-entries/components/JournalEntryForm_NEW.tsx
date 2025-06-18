import React, { useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nanoid } from "nanoid";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";
import { AccountType, JournalEntryStatus, journalEntryFormSchema, type JournalEntryFormData } from "@shared/schema";

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
  accountCode: string;
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
  clientId?: number;
  accounts: Account[];
  locations?: Location[];
  onSubmit: () => void;
  onCancel: () => void;
  existingEntry?: any;
  entities?: Entity[];
}

interface DimensionTag {
  dimensionId: number;
  dimensionValueId: number;
  dimensionName?: string;
  dimensionValueName?: string;
}

// Helper function to get today's date in YYYY-MM-DD format
function getTodayYMD() {
  return format(new Date(), "yyyy-MM-dd");
}

// Returns true when the proposed referenceNumber is already used
function isReferenceDuplicate(
  referenceNumber: string,
  entityId: number,
  existingEntries: any[],
  excludeId?: number
): boolean {
  const trimmedRef = referenceNumber.trim().toLowerCase();
  return existingEntries.some(
    (entry) =>
      entry.entityId === entityId &&
      entry.id !== excludeId &&
      entry.reference?.trim().toLowerCase() === trimmedRef
  );
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
  
  // Create a ref to store the upload function
  const uploadPendingFilesRef = useRef<((entryId: number) => Promise<void>) | null>(null);

  // Default entity code for new lines
  const defaultEntityCode = entities.length > 0 ? entities[0].code : "";

  // Initialize react-hook-form with the shared schema
  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntryFormSchema),
    defaultValues: {
      date: existingEntry?.date ? format(new Date(existingEntry.date), "yyyy-MM-dd") : getTodayYMD(),
      referenceNumber: existingEntry?.reference || existingEntry?.referenceNumber || "",
      description: existingEntry?.description || "",
      isAccrual: existingEntry?.isAccrual || false,
      reversalDate: existingEntry?.reversalDate ? format(new Date(existingEntry.reversalDate), "yyyy-MM-dd") : "",
      lines: existingEntry?.lines || [
        { _key: nanoid(), accountId: "", entityCode: defaultEntityCode, description: "", debit: "", credit: "", tags: [] },
        { _key: nanoid(), accountId: "", entityCode: defaultEntityCode, description: "", debit: "", credit: "", tags: [] }
      ]
    },
  });

  // useFieldArray for dynamic lines management
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  });

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
    : [];

  // Safe dimensions for props
  const safeDimensions = Array.isArray(dimensions) ? dimensions : [];

  // Post entry mutation
  const postEntry = useMutation({
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

  // Watch form values for calculations
  const watchedLines = form.watch("lines");
  
  // Calculate totals from form data
  const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
    const totalDebit = watchedLines.reduce((sum, line) => sum + parseFloat(line?.debit || "0"), 0);
    const totalCredit = watchedLines.reduce((sum, line) => sum + parseFloat(line?.credit || "0"), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    return { totalDebit, totalCredit, isBalanced };
  }, [watchedLines]);

  // Initialize lines from existing entry using form setValue
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
      form.setValue("lines", processedLines);
    }
  }, [existingEntry, entities, form]);

  // New react-hook-form onSubmit function
  const onFormSubmit = async (values: JournalEntryFormData) => {
    try {
      // Prepare the data for submission
      const payload = {
        ...values,
        clientId: effectiveClientId,
        entityId: entityId,
        lines: values.lines.map(line => ({
          ...line,
          accountId: parseInt(line.accountId),
          debit: parseFloat(line.debit || "0"),
          credit: parseFloat(line.credit || "0")
        }))
      };

      if (existingEntry) {
        updateEntry.mutate(payload);
      } else {
        createEntry.mutate(payload);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit journal entry",
        variant: "destructive",
      });
    }
  };

  // useFieldArray-based line management functions
  const addLine = () => {
    const newLine = {
      _key: nanoid(),
      accountId: "",
      entityCode: entities.length > 0 ? entities[0].code : "",
      description: "",
      debit: "",
      credit: "",
      tags: [],
    };
    append(newLine);
  };

  const removeLine = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Function to update line tags using form setValue
  const updateLineTags = (lineIndex: number, tags: DimensionTag[]) => {
    form.setValue(`lines.${lineIndex}.tags`, tags);
  };

  // Calculate entity balances for intercompany validation
  const entityBalances = useMemo(() => {
    const balances: Record<string, EntityBalance> = {};

    watchedLines.forEach((line) => {
      if (!line?.entityCode) return;

      if (!balances[line.entityCode]) {
        balances[line.entityCode] = {
          entityCode: line.entityCode,
          debit: 0,
          credit: 0,
          difference: 0,
          balanced: false,
        };
      }

      balances[line.entityCode].debit += parseFloat(line.debit || "0");
      balances[line.entityCode].credit += parseFloat(line.credit || "0");
    });

    // Calculate difference and balanced status for each entity
    Object.values(balances).forEach((balance) => {
      balance.difference = Math.abs(balance.debit - balance.credit);
      balance.balanced = balance.difference < 0.01;
    });

    return Object.values(balances);
  }, [watchedLines]);

  // Handle post entry
  const handlePost = async () => {
    // Use form validation instead of manual validation
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the form errors before posting",
        variant: "destructive",
      });
      return;
    }

    const values = form.getValues();
    
    try {
      const payload = {
        ...values,
        clientId: effectiveClientId,
        entityId: entityId,
        lines: values.lines.map(line => ({
          ...line,
          accountId: parseInt(line.accountId),
          debit: parseFloat(line.debit || "0"),
          credit: parseFloat(line.credit || "0")
        }))
      };

      if (existingEntry) {
        await updateEntry.mutateAsync(payload);
        if (existingEntry.id) {
          postEntry.mutate(existingEntry.id);
        }
      } else {
        const result = await createEntry.mutateAsync(payload);
        const entryId = result.id || result.entry?.id;
        if (entryId) {
          postEntry.mutate(entryId);
        }
      }
    } catch (error) {
      console.error("Error posting entry:", error);
      toast({
        title: "Error",
        description: "Failed to post journal entry",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Journal Entry Header */}
          <JournalEntryHeader
            form={form}
            existingEntry={existingEntry}
            entities={entities}
            existingJournalEntries={existingJournalEntries}
            isReferenceDuplicate={isReferenceDuplicate}
            entityId={entityId}
          />

          {/* Journal Entry Lines Table */}
          <JournalEntryLinesTable
            form={form}
            fields={fields}
            accounts={accounts}
            entities={entities}
            dimensions={safeDimensions}
            addLine={addLine}
            removeLine={removeLine}
            updateLineTags={updateLineTags}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            isBalanced={isBalanced}
            entityBalances={entityBalances}
          />

          {/* File Attachments */}
          <AttachmentSection
            attachments={existingEntry?.files || []}
            status={existingEntry?.status || JournalEntryStatus.DRAFT}
            isInEditMode={!!existingEntry}
            uploadPendingFilesRef={uploadPendingFilesRef}
            clientId={effectiveClientId}
            entityId={entityId}
            journalEntryId={existingEntry?.id}
          />

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEntry.isPending || updateEntry.isPending}
            >
              {existingEntry ? "Update" : "Save"} Draft
            </Button>
            <Button
              type="button"
              onClick={handlePost}
              disabled={!isBalanced || postEntry.isPending}
            >
              {existingEntry ? "Update & Post" : "Save & Post"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export { JournalEntryForm };