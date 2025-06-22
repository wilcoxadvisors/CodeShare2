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

  // Create entry mutation
  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries`, {
        method: "POST",
        data: data,
      });
    },
    onSuccess: (newEntry) => {
      // Update cache with new entry
      queryClient.setQueryData(
        ['journal-entries', effectiveClientId, entityId],
        (oldData: any[] | undefined) => (oldData ? [newEntry, ...oldData] : [newEntry])
      );
      
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
      
      // Upload pending files if any
      if (pendingAttachments.length > 0 && uploadPendingFilesRef.current) {
        uploadPendingFilesRef.current(newEntry.id).then(() => {
          toast({ title: "Success", description: "Journal entry created with attachments." });
          // Add small delay to ensure cache is updated before navigation
          setTimeout(() => onSubmit(), 100);
        }).catch(() => {
          toast({ title: "Warning", description: "Journal entry created but some files failed to upload." });
          // Add small delay to ensure cache is updated before navigation
          setTimeout(() => onSubmit(), 100);
        });
      } else {
        toast({ title: "Success", description: "Journal entry created." });
        // Add small delay to ensure cache is updated before navigation
        setTimeout(() => onSubmit(), 100);
      }
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
      const payload = { ...data, filesToDelete }; // Add the list of IDs to the payload
      return apiRequest(`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}`, {
        method: "PATCH",
        data: payload,
      });
    },
    onSuccess: (updatedEntry) => {
      setFilesToDelete([]); // IMPORTANT: Clear the queue on success
      
      // Update the journal entries cache with the new data
      queryClient.setQueryData(
        ['journal-entries', effectiveClientId, entityId],
        (oldData: any[] | undefined) => 
          oldData ? oldData.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry) : [updatedEntry]
      );
      
      // Targeted cache invalidation for immediate UI updates
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
      
      // Also invalidate specific entry
      if (updatedEntry.id) {
        queryClient.invalidateQueries({
          queryKey: ['journal-entry', effectiveClientId, entityId, updatedEntry.id]
        });
      }
      
      // Update journal data state with the response to maintain form consistency
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
      
      toast({ title: "Success", description: "Journal entry updated." });
      // Add small delay to ensure cache is updated before navigation
      setTimeout(() => onSubmit(), 100);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update journal entry",
        variant: "destructive",
      });
    },
  });

  // File upload mutation for immediate upload in edit mode
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
    onSuccess: (response) => {
      console.log("Upload response:", response);
      // Refresh the journal entry files query with correct key
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`]
      });
      // Also refresh the existing files query
      refetchExistingFiles();
      
      // Update main journal entry cache to reflect changes
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
      
      // Update local attachments state with uploaded files
      if (response && response.files && Array.isArray(response.files)) {
        console.log("DEBUG - Adding uploaded files to attachments:", response.files);
        setAttachments(prev => [...prev, ...response.files]);
      } else if (response && Array.isArray(response)) {
        setAttachments(prev => [...prev, ...response]);
      }
      
      toast({ title: "Success", description: "Files uploaded successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload files.", variant: "destructive" });
    }
  });

  // File deletion mutation for immediate deletion in edit mode
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
      return { fileId }; // Return the fileId so we can use it in onSuccess
    },
    onSuccess: (data) => {
      // Refresh the journal entry files query with correct key
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries/${existingEntry?.id}/files`]
      });
      // Also refresh the existing files query
      refetchExistingFiles();
      
      // Update main journal entry cache to reflect changes
      queryClient.invalidateQueries({
        queryKey: ['journal-entries', effectiveClientId, entityId]
      });
      
      // Remove the deleted file from local state immediately
      setAttachments(prev => prev.filter(file => file.id !== data.fileId));
      toast({ title: "Success", description: "File deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" });
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
      // Fixes Date bug #7 - proper timezone handling
      setJournalData({
        date: format(new Date(existingEntry.date.replace(/-/g, '/')), "yyyy-MM-dd"),
        referenceNumber: existingEntry.reference || existingEntry.referenceNumber || '',
        referenceUserSuffix: existingEntry.referenceUserSuffix || '',
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
  }, [existingEntry, entities]);

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
      console.log('Successfully uploaded pending files.');
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

  // Form submission handlers
  const handleSaveDraft = () => {
    if (!validateForm()) return;

    try {
      // Build complete reference including user suffix using consistent logic
      const referenceDate = journalData.date ? new Date(journalData.date) : new Date();
      const autoReferencePrefix = `JE-${effectiveClientId}-${entityId}-${format(referenceDate, 'MMddyy')}`;
      const completeReference = journalData.referenceUserSuffix 
        ? `${autoReferencePrefix}:${journalData.referenceUserSuffix}`
        : autoReferencePrefix;

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
        autoReferencePrefix,
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
      // Build complete reference including user suffix
      const completeReference = journalData.referenceUserSuffix 
        ? `${autoReferencePrefix}:${journalData.referenceUserSuffix}`
        : autoReferencePrefix;

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
        autoReferencePrefix,
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
      const formData = {
        date: journalData.date,
        reference: journalData.referenceNumber, // Ensures compatibility
        referenceNumber: journalData.referenceNumber, // The primary field
        referenceUserSuffix: journalData.referenceUserSuffix || "",
        description: journalData.description,
        status: "posted" as JournalEntryStatus,
        isAccrual: journalData.isAccrual,
        reversalDate: journalData.isAccrual && journalData.reversalDate ? journalData.reversalDate : undefined,
        lines: lines.map(transformLineForBackend),
      };

      console.log("DEBUG: handlePostEntry payload:", {
        referenceNumber: journalData.referenceNumber,
        referenceUserSuffix: journalData.referenceUserSuffix
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
          if (existingEntry?.id) {
            // For existing entries, upload immediately
            uploadFilesMutation.mutate(files);
          } else {
            // For new entries, add to pending files
            setPendingAttachments(prev => [...prev, ...files]);
          }
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