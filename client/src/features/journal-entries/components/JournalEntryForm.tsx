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
  // ARCHITECT'S SURGICAL FIX: Prevent runtime crash if existingEntries is not an array.
  if (!Array.isArray(existingEntries)) {
    console.error("isReferenceDuplicate received non-array:", existingEntries);
    return false; // Safely exit if data is not in the expected format.
  }

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

  // Add state for attachments - single source of truth
  const [attachments, setAttachments] = useState<any[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<number[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

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

  // Create form with proper schema - remove required line description validation
  const createFormSchemaFixed = () => {
    return z.object({
      date: z.string().min(1, "Date is required"),
      referenceNumber: z.string().min(1, "Reference number is required"),
      description: z.string().min(1, "Description is required"),
      lines: z
        .array(
          z.object({
            accountId: z.string().min(1, "Account is required"),
            entityCode: z.string().min(1, "Entity code is required"),
            description: z.string().optional(), // Make description optional for draft saves
            debit: z.string(),
            credit: z.string(),
            tags: z.array(z.any()).optional(),
          }),
        )
        .min(1, "At least one line is required"),
      isAccrual: z.boolean().optional(),
      reversalDate: z.string().optional(),
    });
  };

  const form = useForm({
    resolver: zodResolver(createFormSchemaFixed()),
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

  // Parse existing reference to extract user suffix
  const parseReferenceNumber = React.useCallback((refNumber: string) => {
    console.log("DEBUG: parseReferenceNumber called with:", refNumber);
    
    if (!refNumber || !refNumber.includes(':')) {
      console.log("DEBUG: No colon found, returning empty suffix");
      return "";
    }
    
    const parts = refNumber.split(':');
    const suffix = parts.length > 1 ? parts.slice(1).join(':') : "";
    console.log("DEBUG: Extracted suffix:", suffix, "from parts:", parts);
    return suffix;
  }, []);

  // Initialize form data with proper state management
  const [journalData, setJournalData] = useState(() => {
    const refNumber = existingEntry?.referenceNumber || "";
    const userSuffix = parseReferenceNumber(refNumber);
    
    console.log("DEBUG: useState initialization:", {
      existingEntryId: existingEntry?.id,
      referenceNumber: refNumber,
      extractedSuffix: userSuffix,
      existingEntry: existingEntry
    });
    
    return {
      date: existingEntry?.date ? format(new Date(existingEntry.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      referenceNumber: refNumber || generateReference(),
      referenceUserSuffix: userSuffix,
      description: existingEntry?.description || "",
      isAccrual: existingEntry?.isAccrual || false,
      reversalDate: existingEntry?.reversalDate ? format(new Date(existingEntry.reversalDate), "yyyy-MM-dd") : "",
    };
  });

  // Update journalData when existingEntry changes (for edit mode)
  React.useEffect(() => {
    if (existingEntry && existingEntry.id) {
      const refNumber = existingEntry.referenceNumber || "";
      const userSuffix = parseReferenceNumber(refNumber);
      
      console.log("DEBUG: useEffect triggered for entry:", existingEntry.id, {
        referenceNumber: refNumber,
        extractedSuffix: userSuffix,
        willUpdate: true
      });
      
      setJournalData(prev => ({
        ...prev,
        date: format(new Date(existingEntry.date), "yyyy-MM-dd"),
        referenceNumber: refNumber,
        referenceUserSuffix: userSuffix,
        description: existingEntry?.description || "",
        isAccrual: existingEntry?.isAccrual || false,
        reversalDate: existingEntry?.reversalDate ? format(new Date(existingEntry.reversalDate), "yyyy-MM-dd") : "",
      }));
    }
  }, [existingEntry?.id, existingEntry?.referenceNumber, parseReferenceNumber]);

  // Handle journal data changes with error clearing
  const handleJournalDataChange = (field: keyof typeof journalData, value: string | boolean) => {
    setJournalData((prev) => ({ ...prev, [field]: value }));
    
    // Clear field errors when user makes changes
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

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

  // Query for existing files when editing an entry
  const { data: existingFilesData, refetch: refetchExistingFiles } = useQuery({
    queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`],
    enabled: !!existingEntry?.id && !!effectiveClientId && !!entityId,
  });

  // Extract files from the response
  const existingFiles = React.useMemo(() => {
    if (!existingFilesData) return [];
    
    console.log("DEBUG - JournalEntryForm files response:", existingFilesData);
    
    // Backend returns { files: [...], count: ... } format
    if (typeof existingFilesData === 'object' && 'files' in existingFilesData && Array.isArray((existingFilesData as any).files)) {
      return (existingFilesData as any).files;
    }
    // Fallback for array format
    else if (Array.isArray(existingFilesData)) {
      return existingFilesData;
    }
    
    return [];
  }, [existingFilesData]);

  // Post journal entry mutation
  const postJournalEntry = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${entryId}/post`, {
        method: "PATCH",
      });
    },
    onSuccess: async (response: any) => {
      // ARCHITECT'S DEFINITIVE FIX: Force immediate query refresh without race conditions
      await queryClient.refetchQueries({ 
        queryKey: ["journal-entries", effectiveClientId, entityId],
        type: 'all'
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

  // Create entry mutation with optimistic UI pattern
  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries`, {
        method: "POST",
        data: data,
      });
    },
    onMutate: async (data: any) => {
      // 1. Cancel ongoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ 
        queryKey: ['journal-entries', effectiveClientId, entityId] 
      });

      // 2. Snapshot the previous state
      const previousJournalEntries = queryClient.getQueryData(['journal-entries', effectiveClientId, entityId]);

      // 3. Optimistically add new entry to cache
      const optimisticEntry = {
        id: -(Date.now()), // Temporary negative ID
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: data.status || 'draft',
        lines: lines.map(line => ({
          ...line,
          id: -(Date.now() + Math.random()),
          accountId: parseInt(line.accountId),
          type: line.debit ? 'debit' : 'credit',
          amount: line.debit || line.credit,
          description: line.description,
          entityCode: line.entityCode,
          tags: line.tags || []
        })),
        _optimistic: true, // Mark as optimistic
      };

      // Update cache optimistically
      queryClient.setQueryData(['journal-entries', effectiveClientId, entityId], (oldData: any[] | undefined) => 
        oldData ? [optimisticEntry, ...oldData] : [optimisticEntry]
      );

      // 4. Return context for rollback
      return { previousJournalEntries, optimisticEntry };
    },
    onError: (err, variables, context) => {
      // 5. Roll back optimistic updates on error
      if (context?.previousJournalEntries) {
        queryClient.setQueryData(['journal-entries', effectiveClientId, entityId], context.previousJournalEntries);
      }

      toast({
        title: "Error",
        description: `Failed to create journal entry: ${err.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (newEntry, variables, context) => {
      // Replace optimistic entry with real server response
      queryClient.setQueryData(['journal-entries', effectiveClientId, entityId], (oldData: any[] | undefined) => {
        if (!oldData) return [newEntry];
        return oldData.map(entry => entry._optimistic && entry.id < 0 ? newEntry : entry);
      });
      
      // Upload pending files if any
      if (pendingAttachments.length > 0 && uploadPendingFilesRef.current) {
        uploadPendingFilesRef.current(newEntry.id).then(() => {
          toast({ title: "Success", description: "Journal entry created with attachments." });
          setTimeout(() => onSubmit(), 200);
        }).catch(() => {
          toast({ title: "Warning", description: "Journal entry created but some files failed to upload." });
          setTimeout(() => onSubmit(), 100);
        });
      } else {
        toast({ title: "Success", description: "Journal entry created." });
        setTimeout(() => onSubmit(), 100);
      }
    },
    onSettled: () => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
    },
  });

  // Update entry mutation with optimistic UI pattern
  const updateEntry = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, filesToDelete }; // Add the list of IDs to the payload
      console.log("ARCHITECT_DEBUG_PAYLOAD: Sending filesToDelete:", filesToDelete);
      console.log("ARCHITECT_DEBUG_PAYLOAD: Full payload:", payload);
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`, {
        method: "PATCH",
        data: payload,
      });
    },
    onMutate: async (data: any) => {
      // 1. Cancel ongoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ 
        queryKey: ['journal-entries', effectiveClientId, entityId] 
      });
      await queryClient.cancelQueries({ 
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`] 
      });

      // 2. Snapshot the previous state
      const previousJournalEntries = queryClient.getQueryData(['journal-entries', effectiveClientId, entityId]);
      const previousJournalEntry = queryClient.getQueryData([`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`]);
      const previousAttachments = [...attachments];
      const previousFilesToDelete = [...filesToDelete];

      // 3. Optimistically update journal entry data
      const optimisticEntry = {
        ...existingEntry,
        ...data,
        lines: lines.map(line => ({
          ...line,
          accountId: parseInt(line.accountId),
          type: line.debit ? 'debit' : 'credit',
          amount: line.debit || line.credit,
          description: line.description,
          entityCode: line.entityCode,
          tags: line.tags || []
        }))
      };

      // Update journal entries list cache
      queryClient.setQueryData(['journal-entries', effectiveClientId, entityId], (oldData: any[] | undefined) => 
        oldData ? oldData.map(entry => entry.id === existingEntry?.id ? optimisticEntry : entry) : [optimisticEntry]
      );

      // Update specific journal entry cache
      queryClient.setQueryData(
        [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`],
        optimisticEntry
      );

      // Optimistically remove files marked for deletion
      if (filesToDelete.length > 0) {
        setAttachments(prev => prev.filter(file => !filesToDelete.includes(file.id)));
        
        // Update attachments cache
        queryClient.setQueryData(
          ['journalEntryAttachments', existingEntry?.id],
          (oldFiles: any[] | undefined) => oldFiles ? oldFiles.filter(file => !filesToDelete.includes(file.id)) : []
        );
      }

      // 4. Return context for rollback
      return { 
        previousJournalEntries, 
        previousJournalEntry, 
        previousAttachments, 
        previousFilesToDelete,
        optimisticEntry
      };
    },
    onError: (err, variables, context) => {
      // 5. Roll back optimistic updates on error
      if (context?.previousJournalEntries) {
        queryClient.setQueryData(['journal-entries', effectiveClientId, entityId], context.previousJournalEntries);
      }
      if (context?.previousJournalEntry) {
        queryClient.setQueryData([`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`], context.previousJournalEntry);
      }
      if (context?.previousAttachments) {
        setAttachments(context.previousAttachments);
      }
      if (context?.previousFilesToDelete) {
        setFilesToDelete(context.previousFilesToDelete);
      }

      console.log("DEBUG: Update entry failed:", err);
      toast({
        title: "Error",
        description: `Failed to update journal entry: ${err.message}`,
        variant: "destructive",
      });
    },
    onSuccess: async (updatedEntry, variables, context) => {
      console.log("DEBUG: Update entry success");
      
      // Clear file deletion queue after successful update
      setFilesToDelete([]);
      
      // Update form state with server response
      if (updatedEntry) {
        setJournalData(prev => ({
          ...prev,
          referenceNumber: updatedEntry.reference || updatedEntry.referenceNumber || prev.referenceNumber,
          referenceUserSuffix: updatedEntry.referenceUserSuffix || prev.referenceUserSuffix,
          description: updatedEntry.description || prev.description,
          isAccrual: updatedEntry.isAccrual !== undefined ? updatedEntry.isAccrual : prev.isAccrual,
          reversalDate: updatedEntry.reversalDate ? format(new Date(updatedEntry.reversalDate), "yyyy-MM-dd") : prev.reversalDate,
        }));
        
        // Update lines with fresh data from server
        if (updatedEntry.lines) {
          const processedLines = updatedEntry.lines.map((line: any) => ({
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
        }
      }
      
      // Upload pending files if any
      if (pendingAttachments.length > 0) {
        handleUploadPendingFiles(updatedEntry.id).then(() => {
          toast({ title: "Success", description: "Journal entry updated with attachments." });
          setTimeout(() => onSubmit(), 200);
        }).catch(() => {
          toast({ title: "Warning", description: "Journal entry updated but some files failed to upload." });
          setTimeout(() => onSubmit(), 100);
        });
      } else {
        toast({ title: "Success", description: "Journal entry updated." });
        setTimeout(() => onSubmit(), 200);
      }
    },
    onSettled: () => {
      // Always refetch to ensure data consistency after optimistic updates
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`]
      });
      queryClient.invalidateQueries({
        queryKey: ['journalEntryAttachments', existingEntry?.id]
      });
    },
  });

  // File upload mutation with optimistic UI pattern
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!existingEntry?.id) throw new Error('No journal entry ID for file upload');
      
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch(
        `/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry.id}/files`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) throw new Error('File upload failed');
      return response.json();
    },
    onMutate: async (files: File[]) => {
      // 1. Cancel ongoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ 
        queryKey: ['journalEntryAttachments', existingEntry?.id] 
      });
      await queryClient.cancelQueries({ 
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`] 
      });

      // 2. Snapshot the previous state
      const previousAttachments = queryClient.getQueryData(['journalEntryAttachments', existingEntry?.id]);
      const previousLocalAttachments = [...attachments];

      // 3. Optimistically add files to cache and local state
      const optimisticFiles = files.map((file, index) => ({
        id: -(Date.now() + index), // Temporary negative ID
        journalEntryId: existingEntry?.id || 0,
        filename: file.name,
        originalname: file.name,
        path: '',
        mimeType: file.type,
        size: file.size,
        uploadedBy: 1, // Temporary user ID
        uploadedAt: new Date().toISOString(),
        _optimistic: true, // Mark as optimistic
      }));

      // Update cache optimistically
      queryClient.setQueryData(['journalEntryAttachments', existingEntry?.id], (oldData: any) => {
        if (!oldData) return { files: optimisticFiles };
        return { ...oldData, files: [...(oldData.files || []), ...optimisticFiles] };
      });

      // Update local state optimistically
      setAttachments(prev => [...prev, ...optimisticFiles]);

      // 4. Return context for rollback
      return { previousAttachments, previousLocalAttachments, optimisticFiles };
    },
    onError: (err, variables, context) => {
      // 5. Roll back optimistic updates on error
      if (context?.previousAttachments) {
        queryClient.setQueryData(['journalEntryAttachments', existingEntry?.id], context.previousAttachments);
      }
      if (context?.previousLocalAttachments) {
        setAttachments(context.previousLocalAttachments);
      }
      
      toast({ 
        title: "Error", 
        description: `Failed to upload files: ${err.message}`, 
        variant: "destructive" 
      });
    },
    onSuccess: (response, variables, context) => {
      // Replace optimistic files with real server response
      if (response && response.files && Array.isArray(response.files)) {
        // Remove optimistic files and add real ones
        setAttachments(prev => {
          const nonOptimistic = prev.filter(file => !file._optimistic);
          return [...nonOptimistic, ...response.files];
        });
      }
      
      toast({ title: "Success", description: "Files uploaded successfully." });
    },
    onSettled: () => {
      // 6. Always refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ['journalEntryAttachments', existingEntry?.id]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`]
      });
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
    }
  });

  // File deletion mutation with optimistic UI pattern
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      if (!existingEntry?.id) throw new Error('No journal entry ID for file deletion');
      
      const response = await fetch(
        `/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry.id}/files/${fileId}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) throw new Error('File deletion failed');
      return { fileId };
    },
    onMutate: async (fileIdToDelete: number) => {
      // 1. Cancel ongoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ 
        queryKey: ['journalEntryAttachments', existingEntry?.id] 
      });
      await queryClient.cancelQueries({ 
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`] 
      });

      // 2. Snapshot the previous state
      const previousAttachments = queryClient.getQueryData(['journalEntryAttachments', existingEntry?.id]);
      const previousLocalAttachments = [...attachments];

      // 3. Optimistically remove the file from cache and local state
      queryClient.setQueryData(['journalEntryAttachments', existingEntry?.id], (oldData: any) => {
        if (!oldData || !oldData.files) return oldData;
        return {
          ...oldData,
          files: oldData.files.filter((file: any) => file.id !== fileIdToDelete)
        };
      });

      // Update local state optimistically
      setAttachments(prev => prev.filter(file => file.id !== fileIdToDelete));

      // 4. Return context for rollback
      return { previousAttachments, previousLocalAttachments, fileIdToDelete };
    },
    onError: (err, variables, context) => {
      // 5. Roll back optimistic updates on error
      if (context?.previousAttachments) {
        queryClient.setQueryData(['journalEntryAttachments', existingEntry?.id], context.previousAttachments);
      }
      if (context?.previousLocalAttachments) {
        setAttachments(context.previousLocalAttachments);
      }
      
      toast({ 
        title: "Error", 
        description: `Failed to delete file: ${err.message}`, 
        variant: "destructive" 
      });
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "File deleted successfully." });
    },
    onSettled: () => {
      // 6. Always refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ['journalEntryAttachments', existingEntry?.id]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`]
      });
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
    }
  });

  const initializeExpandedState = (): ExpandedState => {
    const state: ExpandedState = {};
    accounts.forEach((account) => {
      state[account.id] = false; // All accounts collapsed by default
    });
    return state;
  };

  // Fix Data Initialization - single place where all form state is correctly set
  useEffect(() => {
    if (existingEntry) {
      // Extract reference number and parse suffix properly
      const refNumber = existingEntry.reference || existingEntry.referenceNumber || '';
      const extractedSuffix = parseReferenceNumber(refNumber);
      
      console.log("DEBUG: useEffect data initialization:", {
        entryId: existingEntry.id,
        rawReference: refNumber,
        extractedSuffix: extractedSuffix,
        directSuffix: existingEntry.referenceUserSuffix
      });
      
      // Fixes Date bug #7 - proper timezone handling
      setJournalData({
        date: format(new Date(existingEntry.date.replace(/-/g, '/')), "yyyy-MM-dd"),
        referenceNumber: refNumber,
        referenceUserSuffix: extractedSuffix, // Use extracted suffix instead of direct field
        description: existingEntry.description || '',
        isAccrual: existingEntry.isAccrual || false,
        reversalDate: existingEntry.reversalDate ? format(new Date(existingEntry.reversalDate.replace(/-/g, '/')), "yyyy-MM-dd") : '',
      });
      
      // Initialize lines
      if (existingEntry.lines) {
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
      }
      
      // Correctly load existing files
      setAttachments(existingEntry.files || []);
      setPendingAttachments([]); // Clear pending files on new entry load
    } else {
      // Reset form for new entry
      setJournalData({
        date: format(new Date(), "yyyy-MM-dd"),
        referenceNumber: generateReference(),
        referenceUserSuffix: "",
        description: "",
        isAccrual: false,
        reversalDate: "",
      });
      
      // Add initial two empty lines for new entries (standard accounting practice)
      // Use the current entity's code based on entityId prop
      const currentEntity = entities.find(e => e.id === entityId);
      const defaultEntityCode = currentEntity?.code || (entities.length > 0 ? entities[0].code : "");
      
      console.log("DEBUG: Setting default entity code:", {
        entityId,
        currentEntityCode: currentEntity?.code,
        defaultEntityCode,
        entitiesLength: entities.length
      });
      
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
      
      setAttachments([]);
      setPendingAttachments([]);
    }
  }, [existingEntry, entities, parseReferenceNumber]);

  // Initialize attachments from existing files query
  React.useEffect(() => {
    if (existingFiles.length > 0) {
      console.log("DEBUG - Setting attachments from existing files:", existingFiles);
      setAttachments(existingFiles);
    }
  }, [existingFiles]);

  // Define the upload handler for pending files
  const handleUploadPendingFiles = async (entryId: number) => {
    if (pendingAttachments.length === 0) {
      return; // No files to upload
    }

    const formData = new FormData();
    pendingAttachments.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(
        `/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${entryId}/files`,
        {
          method: 'POST',
          body: formData,
          // Note: Do not set 'Content-Type' header, the browser does it for FormData
        }
      );

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      // On successful upload, clear the pending attachments
      setPendingAttachments([]);
      
      // CRITICAL: Comprehensive cache invalidation to refresh detail view immediately
      queryClient.invalidateQueries({
        queryKey: ['journalEntryAttachments', entryId]
      });
      
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${entryId}/files`]
      });
      
      // Invalidate the main journal entry detail view
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${entryId}`]
      });
      
      // Invalidate the journal entries list
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
      
      console.log('Successfully uploaded pending files and invalidated caches.');
    } catch (error) {
      console.error("Error uploading pending files:", error);
      // We throw the error so the calling .catch() block can handle the toast notification
      throw error;
    }
  };

  // Connect the handler to the ref
  useEffect(() => {
    uploadPendingFilesRef.current = handleUploadPendingFiles;
  }, [pendingAttachments, effectiveClientId, entityId]); // Dependencies ensure the function in the ref is not stale

  // Line management functions
  const addLine = () => {
    // Use the current entity's code based on entityId prop
    const currentEntity = entities.find(e => e.id === entityId);
    const defaultEntityCode = currentEntity?.code || (entities.length > 0 ? entities[0].code : "");
    
    const newLine: JournalLine = {
      _key: nanoid(),
      accountId: "",
      entityCode: defaultEntityCode,
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
    
    // Clear field errors when user makes changes
    if (fieldErrors[`line_${index}_${field}`]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[`line_${index}_${field}`];
      setFieldErrors(newErrors);
    }
  };

  // Function to update line tags
  const updateLineTags = (lineIndex: number, tags: DimensionTag[]) => {
    const updatedLines = [...lines];
    updatedLines[lineIndex] = { ...updatedLines[lineIndex], tags };
    setLines(updatedLines);
  };

  // Calculate totals and balance with real-time updates
  const totalDebit = useMemo(() => {
    return lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  }, [lines]);
  
  const totalCredit = useMemo(() => {
    return lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  }, [lines]);
  
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

  // Validation function with enhanced error handling
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

    // Enhanced reference field validation
    if (journalData.referenceUserSuffix && journalData.referenceUserSuffix.length > 30) {
      errors.referenceUserSuffix = "Reference suffix must be 30 characters or less";
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
    
    // Clear any existing success messages when validation fails
    if (Object.keys(errors).length > 0) {
      console.log("Validation errors:", errors);
    }
    
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
    
    // Transform dimension tags to ensure they have the correct structure
    const transformedTags = (line.tags || []).map(tag => ({
      dimensionId: tag.dimensionId,
      dimensionValueId: tag.dimensionValueId,
      // Preserve optional display names if present
      ...(tag.dimensionName && { dimensionName: tag.dimensionName }),
      ...(tag.dimensionValueName && { dimensionValueName: tag.dimensionValueName })
    }));
    
    // Debug logging for dimension tags
    if (transformedTags.length > 0) {
      console.log(`DEBUG: Line ${line.accountId} has ${transformedTags.length} dimension tags:`, transformedTags);
    }
    
    return {
      id: line.id,
      accountId: parseInt(line.accountId),
      entityCode: line.entityCode,
      description: line.description,
      type: debitAmount > 0 ? "debit" : "credit",
      amount: debitAmount > 0 ? debitAmount : creditAmount,
      tags: transformedTags,
    };
  };

  // Helper function to generate unique reference for new entries
  const generateUniqueReference = () => {
    // Generate a scalable unique ID (6 characters, alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let uniqueId = '';
    for (let i = 0; i < 6; i++) {
      uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `JE-${effectiveClientId}-${entityId}-${uniqueId}`;
  };

  // Form submission handlers
  const handleSaveDraft = () => {
    if (!validateForm()) return;

    try {
      // For new entries, generate unique reference. For existing entries, preserve the base reference
      let baseReference;
      if (existingEntry?.id) {
        // Extract base reference (everything before the colon)
        baseReference = existingEntry.referenceNumber?.split(':')[0] || existingEntry.referenceNumber;
      } else {
        // Generate new unique reference for new entries
        baseReference = generateUniqueReference();
      }
      
      const completeReference = journalData.referenceUserSuffix 
        ? `${baseReference}:${journalData.referenceUserSuffix}`
        : baseReference;

      const formData = {
        date: journalData.date,
        reference: completeReference, // Complete reference with suffix
        referenceNumber: completeReference, // The primary field with suffix
        referenceUserSuffix: journalData.referenceUserSuffix || "",
        description: journalData.description,
        status: "draft" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual && journalData.reversalDate ? journalData.reversalDate : undefined,
        lines: lines.map(transformLineForBackend),
      };

      console.log("DEBUG: handleSaveDraft payload:", {
        baseReference,
        referenceUserSuffix: journalData.referenceUserSuffix,
        completeReference
      });

      if (existingEntry && existingEntry.id) {
        const payload = { ...formData, filesToDelete };
        updateEntry.mutate(payload);
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
      // For new entries, generate unique reference. For existing entries, preserve the base reference
      let baseReference;
      if (existingEntry?.id) {
        // Extract base reference (everything before the colon)
        baseReference = existingEntry.referenceNumber?.split(':')[0] || existingEntry.referenceNumber;
      } else {
        // Generate new unique reference for new entries
        baseReference = generateUniqueReference();
      }
      
      const completeReference = journalData.referenceUserSuffix 
        ? `${baseReference}:${journalData.referenceUserSuffix}`
        : baseReference;

      const formData = {
        date: journalData.date,
        reference: completeReference, // Complete reference with suffix
        referenceNumber: completeReference, // The primary field with suffix
        referenceUserSuffix: journalData.referenceUserSuffix || "",
        description: journalData.description,
        status: "pending_approval" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual && journalData.reversalDate ? journalData.reversalDate : undefined,
        lines: lines.map(transformLineForBackend),
      };

      console.log("DEBUG: handleSubmitForApproval payload:", {
        baseReference,
        referenceUserSuffix: journalData.referenceUserSuffix,
        completeReference
      });

      if (existingEntry && existingEntry.id) {
        const payload = { ...formData, filesToDelete };
        updateEntry.mutate(payload);
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
      // For new entries, generate unique reference. For existing entries, preserve the base reference
      let baseReference;
      if (existingEntry?.id) {
        // Extract base reference (everything before the colon)
        baseReference = existingEntry.referenceNumber?.split(':')[0] || existingEntry.referenceNumber;
      } else {
        // Generate new unique reference for new entries
        baseReference = generateUniqueReference();
      }
      
      const completeReference = journalData.referenceUserSuffix 
        ? `${baseReference}:${journalData.referenceUserSuffix}`
        : baseReference;

      const formData = {
        date: journalData.date,
        reference: completeReference, // Complete reference with suffix
        referenceNumber: completeReference, // The primary field with suffix
        referenceUserSuffix: journalData.referenceUserSuffix || "",
        description: journalData.description,
        status: "posted" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual && journalData.reversalDate ? journalData.reversalDate : undefined,
        lines: lines.map(transformLineForBackend),
      };

      console.log("DEBUG: handlePostEntry payload:", {
        baseReference,
        referenceUserSuffix: journalData.referenceUserSuffix,
        completeReference
      });

      if (existingEntry && existingEntry.id) {
        const payload = { ...formData, filesToDelete };
        updateEntry.mutate(payload);
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
        autoReferencePrefix={existingEntry?.id ? existingEntry.referenceNumber?.split(':')[0] || existingEntry.referenceNumber : `JE-${effectiveClientId}-${entityId}-[UNIQUE_ID]`}
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

      {/* Attachment Section - Now controlled component */}
      <AttachmentSection
        entityId={entityId}
        clientId={effectiveClientId as number}
        journalEntryId={tempJournalEntryId}
        isInEditMode={!existingEntry || existingEntry.status === 'draft'}
        attachments={existingEntry?.id ? attachments : pendingAttachments.map((file, index) => ({
          id: -index - 1, // Temporary negative ID for pending files
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date(),
          journalEntryId: 0,
          uploadedBy: 1
        }))}
        onRemoveAttachment={(fileId: number) => {
          if (existingEntry?.id) {
            // For existing entries, use queue-based deletion
            if (fileId > 0) {
              setFilesToDelete(prev => [...prev, fileId]);
            }
            // Remove from visible list for immediate UI feedback
            setAttachments(prev => prev.filter(f => f.id !== fileId));
          } else {
            // For new entries, remove from pending files using the negative index
            const pendingIndex = Math.abs(fileId + 1);
            setPendingAttachments(prev => prev.filter((_, index) => index !== pendingIndex));
          }
        }}
        onAddAttachments={(files: File[]) => {
          // CRITICAL FIX: Always use pending system to prevent orphaned files
          // Files will only be uploaded when the entry is actually saved
          setPendingAttachments(prev => [...prev, ...files]);
          
          // Update attachments display for immediate UI feedback
          const newPendingFiles = files.map((file, index) => ({
            id: -(Date.now() + index), // Temporary negative ID for tracking
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date(),
            journalEntryId: 0,
            uploadedBy: 1
          }));
          setAttachments(prev => [...prev, ...newPendingFiles]);
          
          toast({ 
            title: "Files ready", 
            description: `${files.length} file(s) will be uploaded when you save the entry.` 
          });
        }}
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
            disabled={createEntry.isPending || updateEntry.isPending || isUploading || isProcessingFiles}
            variant="outline"
          >
            {createEntry.isPending || updateEntry.isPending || isUploading
              ? "Saving..."
              : isProcessingFiles
              ? "Processing files..."
              : "Save Draft"}
          </Button>

          {/* Submit for Approval button - for non-admin users */}
          {user.role !== 'admin' && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={!isBalanced || createEntry.isPending || updateEntry.isPending || isUploading || isProcessingFiles}
              className={!isBalanced ? "bg-gray-400 cursor-not-allowed" : ""}
            >
              {createEntry.isPending || updateEntry.isPending || isUploading
                ? "Submitting..."
                : isProcessingFiles
                ? "Processing files..."
                : "Submit for Approval"}
            </Button>
          )}

          {/* Post button - for admin users only */}
          {user.role === 'admin' && (
            <Button
              onClick={handlePostEntry}
              disabled={!isBalanced || createEntry.isPending || updateEntry.isPending || isUploading || isProcessingFiles}
              className={!isBalanced ? "bg-gray-400 cursor-not-allowed" : ""}
            >
              {createEntry.isPending || updateEntry.isPending || isUploading
                ? "Posting..."
                : isProcessingFiles
                ? "Processing files..."
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