import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { JournalEntryStatus, AccountType } from "@shared/schema";
import { useJournalEntry } from "../hooks/useJournalEntry";
import {
  useJournalEntryFiles,
  useUploadJournalEntryFile,
  useDeleteJournalEntryFile,
} from "../hooks/attachmentQueries";
import {
  ClientFormatLine,
  ServerFormatLine,
  JournalEntryLine,
  isClientFormatLine,
  isServerFormatLine,
  getDebit,
  getCredit,
  safeParseAmount
} from "../utils/lineFormat";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { toLocalYMD, formatDisplayDate, ymdToDisplay, getTodayYMD } from "@/utils/dateUtils";
import { generateUniqueReferencePrefix, buildFullReference } from "@/utils/journalIdUtils";
import { 
  getJournalEntriesBaseUrl, 
  getJournalEntryUrl, 
  getJournalEntryFilesBaseUrl,
  getJournalEntryFileUrl,
  getJournalEntryFileDownloadUrl
} from "@/api/urlHelpers";
import {
  X,
  Plus,
  FileUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Upload,
  Trash2,
  Download,
  FileText,
  Paperclip,
  Info,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Lock,
  SendHorizontal,
  Save,
  Send,
  Tag,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEntity } from "@/contexts/EntityContext";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { z } from "zod";
import { validateForm } from "@/lib/validation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

// Define API response interface types for better type safety
interface JournalEntryResponse {
  id?: number;
  entry?: { id: number };
  [key: string]: any;
}

// Define local Account interface compatible with the component needs
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
  allEntries: any[], // Existing journal entries 
  currentEntryId?: number // undefined when creating a new one
) {
  console.log("DEBUG isReferenceDuplicate: Checking duplicate reference number", {
    referenceNumber,
    entriesCount: allEntries?.length || 0,
    currentEntryId: currentEntryId || "new entry"
  });
  
  if (!referenceNumber || !allEntries || !Array.isArray(allEntries)) {
    console.log("DEBUG isReferenceDuplicate: No reference number or entries, skipping check");
    return false;
  }
  
  // Normalize input by removing all whitespace and converting to lowercase
  const normalized = referenceNumber.replace(/\s+/g, '').toLowerCase();
  if (normalized.length < 3) {
    console.log("DEBUG isReferenceDuplicate: Reference number too short, skipping check");
    return false; // Let the length validation handle this
  }
  
  const duplicate = allEntries.find(e =>
    e.id !== currentEntryId && // ignore "myself" when editing
    e.referenceNumber && 
    e.referenceNumber.replace(/\s+/g, '').toLowerCase() === normalized
  );
  
  console.log("DEBUG isReferenceDuplicate: Result", {
    isDuplicate: !!duplicate,
    duplicateId: duplicate?.id || null,
    normalizedInput: normalized
  });
  
  return !!duplicate;
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

// Interface for entity balance
interface EntityBalance {
  entityCode: string;
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
}

// Interface for journal entry file attachments
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

// Interface to track expanded/collapsed account states
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

// Form validation schema - dynamically created to include context-aware validation
// This will be adapted to handle duplicate reference number checking
function createFormSchema() {
  return z.object({
    date: z.string().min(1, "Date is required"),
    reference: z.string().min(3, "Reference must be at least 3 characters"),
    referenceUserSuffix: z.string().optional(), // Optional user suffix for reference
    description: z.string().min(1, "Description is required"), // Make description required to match server validation
    journalType: z.enum(["JE", "AJ", "SJ", "CL"]).default("JE"),
    supDocId: z.string().optional(),
    reversalDate: z.string().optional(),
  });
}

// Define base schema for initial renders
const FormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().min(3, "Reference must be at least 3 characters"),
  referenceUserSuffix: z.string().optional(), // Optional user suffix for reference
  description: z.string().min(1, "Description is required"),
  journalType: z.enum(["JE", "AJ", "SJ", "CL"]).default("JE"),
  supDocId: z.string().optional(),
  reversalDate: z.string().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1, "Account is required"),
        entityCode: z
          .string()
          .min(1, "Entity code is required for intercompany support"),
        description: z.string().optional(),
        debit: z.string(),
        credit: z.string(),
      }),
    )
    .min(2, "Journal entry must have at least 2 lines")
    .refine(
      (lines) => {
        // Check if there's at least one debit and one credit line
        const hasDebit = lines.some((line) => getDebit(line) > 0);
        const hasCredit = lines.some((line) => getCredit(line) > 0);
        return hasDebit && hasCredit;
      },
      {
        message:
          "Journal entry must have at least one debit and one credit line",
      },
    )
    .refine(
      (lines) => {
        // Check if debits equal credits - only for submissions, not during editing
        // This makes the form more forgiving while the user is still editing
        const totalDebit = lines.reduce(
          (sum, line) => sum + getDebit(line),
          0,
        );
        const totalCredit = lines.reduce(
          (sum, line) => sum + getCredit(line),
          0,
        );

        // If one of the sides is zero, then we're clearly still in the process of filling out the form
        if (totalDebit === 0 || totalCredit === 0) {
          return true; // Don't validate in mid-editing
        }

        return Math.abs(totalDebit - totalCredit) < 0.001;
      },
      {
        message: "Total debits must equal total credits",
      },
    )
    .refine(
      (lines) => {
        // Check if debits equal credits for each entity code (intercompany validation)
        // Make this more forgiving during editing
        const entityCodesArray = lines.map((line) => line.entityCode);
        const uniqueEntityCodes = entityCodesArray.filter(
          (code, index) => entityCodesArray.indexOf(code) === index,
        );

        // If we only have one entity code, no need for intercompany validation
        if (uniqueEntityCodes.length <= 1) {
          return true;
        }

        // Check if any entity has both debits and credits with significant values
        const entitiesWithBalances = uniqueEntityCodes.map((entityCode) => {
          const entityLines = lines.filter(
            (line) => line.entityCode === entityCode,
          );
          const entityDebit = entityLines.reduce(
            (sum, line) => sum + getDebit(line),
            0,
          );
          const entityCredit = entityLines.reduce(
            (sum, line) => sum + getCredit(line),
            0,
          );

          return {
            entityCode,
            hasDebitAndCredit: entityDebit > 0 && entityCredit > 0,
            isBalanced: Math.abs(entityDebit - entityCredit) < 0.001,
          };
        });

        // If any entity has both debits and credits, it should be balanced
        const entitiesRequiringBalance = entitiesWithBalances.filter(
          (e) => e.hasDebitAndCredit,
        );

        if (entitiesRequiringBalance.length === 0) {
          return true; // Still in editing mode, no need to validate
        }

        return entitiesRequiringBalance.every((e) => e.isBalanced);
      },
      {
        message:
          "Debits must equal credits for each entity (intercompany balancing)",
      },
    ),
});

/**
 * AttachmentSection Component
 * Renders file upload, list, and management functionality for journal entries
 * @param props - The component props
 */
interface AttachmentSectionProps {
  entityId: number;
  clientId: number;
  journalEntryId: number | null | undefined;
  pendingFiles: File[];
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  pendingFilesMetadata: Array<{
    id: number;
    filename: string;
    size: number;
    mimeType: string;
    addedAt: Date | number;
  }>;
  setPendingFilesMetadata: React.Dispatch<
    React.SetStateAction<
      Array<{
        id: number;
        filename: string;
        size: number;
        mimeType: string;
        addedAt: Date | number;
      }>
    >
  >;
  // Reference to the function to upload files to a specific journal entry
  onUploadToEntryRef?: React.MutableRefObject<
    ((entryId: number) => Promise<void>) | null
  >;
  attachments: JournalEntryFile[];
}

function AttachmentSection({
  entityId,
  clientId,
  journalEntryId,
  pendingFiles,
  setPendingFiles,
  pendingFilesMetadata,
  setPendingFilesMetadata,
  onUploadToEntryRef,
  attachments,
}: AttachmentSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Determine if we have a numeric journal entry ID (real entry) or not
  const isExistingEntry = typeof journalEntryId === "number";

  // Fetch the journal entry to check its status
  const { data: journalEntry } = useQuery({
    queryKey: isExistingEntry && clientId && entityId
      ? [getJournalEntryUrl(clientId, entityId, journalEntryId as number)]
      : ["temp-entry"],
    enabled: isExistingEntry && !!clientId && !!entityId,
  });

  // Determine if we can modify attachments based on entry status
  const isNewEntry = !isExistingEntry;
  
  // For existing entries, we need both the journal entry data AND it must be in draft/pending status
  // If we don't have journal entry data yet, we should disable attachments by default for safety
  const canModifyExistingEntry = isExistingEntry && journalEntry && 
    (journalEntry.status === 'draft' || journalEntry.status === 'pending_approval');
  
  const canModifyAttachments = isNewEntry || canModifyExistingEntry;
  
  // Set disable conditions correctly
  const isAttachmentsDisabled = !canModifyAttachments;
  const isFileDeletionDisabled = !canModifyAttachments;

  // DEBUG: Log attachment status for troubleshooting
  console.log("ARCHITECT_DEBUG_ATTACHMENT_PERMISSIONS:", {
    journalEntry: !!journalEntry,
    journalEntryStatus: journalEntry?.status,
    isExistingEntry,
    isNewEntry,
    canModifyExistingEntry,
    canModifyAttachments,
    isAttachmentsDisabled,
    isFileDeletionDisabled,
    clientId,
    entityId,
    journalEntryId: typeof journalEntryId === "number" ? journalEntryId : "temp-id",
    journalEntryIdType: typeof journalEntryId
  });



  // Helper function to format bytes into readable format
  const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Helper function to get appropriate icon based on mimetype
  const getFileIcon = (mimeType: string): React.ReactNode => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-4 w-4" />;
    } else if (mimeType === "application/pdf") {
      return <FileText className="h-4 w-4" />;
    } else if (
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("csv")
    ) {
      return <FileSpreadsheet className="h-4 w-4" />;
    } else if (mimeType.includes("zip") || mimeType.includes("compressed")) {
      return <FileArchive className="h-4 w-4" />;
    } else if (mimeType.includes("word") || mimeType.includes("doc")) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    } else if (mimeType === "message/rfc822" || mimeType.includes("outlook")) {
      // Handle email file formats (.eml, .msg)
      return <SendHorizontal className="h-4 w-4 text-blue-500" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  // Attachments are now passed as props directly from the parent component



  // Function to upload pending files to a specific journal entry ID
  // This function will be exposed to parent components via the ref
  const uploadPendingFilesToEntry = async (entryId: number) => {
    if (!pendingFiles || pendingFiles.length === 0) {
      console.log("DEBUG AttachmentSection: No pending files to upload");
      return; // No files to upload
    }

    try {
      // Create a FormData object for the upload
      const formData = new FormData();
      pendingFiles.forEach((file) => {
        // CRITICAL FIX: Explicitly pass filename to ensure proper FormData structure
        formData.append("files", file, file.name);
      });

      console.log(
        `DEBUG AttachmentSection: Uploading ${pendingFiles.length} pending files to journal entry ${entryId}`,
      );

      // Always use the hierarchical URL pattern for uploads
      if (!clientId) {
        throw new Error('Client ID is required for file uploads');
      }

      const url = getJournalEntryFilesBaseUrl(clientId, entityId, entryId);
      console.log("DEBUG AttachmentSection: Using hierarchical URL for upload:", url);
      
      console.log('ARCHITECT_DEBUG_UPLOAD_XHR_SENDING: Preparing upload request:', {
        url,
        clientId,
        entityId,
        entryId,
        filesCount: pendingFiles.length,
        fileDetails: pendingFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
      });
      
      // Create FormData and debug it
      console.log('ARCHITECT_DEBUG_UPLOAD_XHR_SENDING: FormData contents before sending:');
      console.log('ARCHITECT_DEBUG_UPLOAD_XHR_SENDING: Files count in FormData:', pendingFiles.length);
      pendingFiles.forEach((file, index) => {
        console.log(`  - File ${index}:`, file.name, file.size, file.type);
      });

      // Use XMLHttpRequest directly for better control over FormData uploads
      const responseData = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // CRITICAL: Enable credentials for session-based auth FIRST
        xhr.withCredentials = true;
        console.log('ARCHITECT_DEBUG_UPLOAD_XHR_SENDING: xhr.withCredentials SET to true for session auth');
        
        // Set up the request
        xhr.open('POST', url, true);
        
        // DO NOT set Authorization header - we're using session-based auth
        // DO NOT set Content-Type - let browser set it for FormData automatically
        
        // Add event listeners for progress tracking
        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            console.log("DEBUG AttachmentSection: Upload progress:", percentCompleted, "%");
          }
        };
        
        // Handle response
        xhr.onload = () => {
          console.log('ARCHITECT_DEBUG_UPLOAD_XHR_RESPONSE: Upload response received:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText?.substring(0, 500)
          });
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log('ARCHITECT_DEBUG_UPLOAD_XHR_RESPONSE: Upload successful, parsed data:', data);
              resolve(data);
            } catch (e) {
              console.log('ARCHITECT_DEBUG_UPLOAD_XHR_RESPONSE: Upload successful, non-JSON response');
              resolve({ success: true }); // If response isn't JSON
            }
          } else {
            // CRITICAL FIX: Properly reject the promise on error status
            console.error('ARCHITECT_DEBUG_UPLOAD_XHR_RESPONSE: Upload FAILED with HTTP status:', xhr.status);
            let errorMessage = `Upload failed with status ${xhr.status}: ${xhr.statusText}`;
            try {
              const errorData = JSON.parse(xhr.responseText);
              if (errorData.error) {
                errorMessage = `Upload failed: ${errorData.error}`;
              } else if (errorData.message) {
                errorMessage = `Upload failed: ${errorData.message}`;
              }
            } catch (e) {
              // Use the default error message if response isn't JSON
            }
            reject(new Error(errorMessage));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error during file upload'));
        };
        
        // Send the FormData
        xhr.send(formData);
      });

      console.log("DEBUG AttachmentSection: Upload successful:", responseData);

      // Clear the pending files after successful upload
      setPendingFiles([]);
      setPendingFilesMetadata([]);

      // Reset the progress bar
      setUploadProgress(0);

      // Invalidate the files query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["journalEntryAttachments", entryId],
      });

      return responseData;
    } catch (error) {
      console.error("Failed to upload pending files to entry:", error);
      throw error;
    } finally {
      setUploadProgress(0);
    }
  };

  // If a ref was provided, assign the upload function to it
  // This allows the parent component to call this function
  React.useEffect(() => {
    if (onUploadToEntryRef) {
      // Wrap the function to ensure it returns void
      onUploadToEntryRef.current = async (entryId: number) => {
        try {
          await uploadPendingFilesToEntry(entryId);
        } catch (err) {
          console.error("Error in upload function:", err);
        }
      };
    }

    // Cleanup when component unmounts
    return () => {
      if (onUploadToEntryRef) {
        onUploadToEntryRef.current = null;
      }
    };
  }, [
    onUploadToEntryRef,
    pendingFiles,
    setPendingFiles,
    setPendingFilesMetadata,
  ]);

  // Upload file hook for direct uploads via the UI
  const uploadFileMutation = useUploadJournalEntryFile(
    isExistingEntry ? (journalEntryId as number) : undefined,
    entityId,
    clientId as number // Cast to number since it's required by the hook
  );

  // Handle local file uploads for new entries (not saved yet)
  const handleLocalFileUpload = (files: File[]) => {
    // For new entries, store files in state temporarily
    console.log("DEBUG AttachmentSection: Storing files temporarily:", files);

    // Create metadata for the pending files
    const newFilesMetadata = files.map((file, index) => ({
      id: Date.now() + index, // Generate a temporary ID
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      addedAt: Date.now(), // Use timestamp instead of Date object to avoid timezone issues
    }));

    // Add the files to our pending files state
    setPendingFiles((prevFiles) => [...prevFiles, ...files]);
    setPendingFilesMetadata((prevMetadata) => [
      ...prevMetadata,
      ...newFilesMetadata,
    ]);

    // Simulate progress for better UX
    const intervalId = setInterval(() => {
      setUploadProgress((progress) => {
        if (progress >= 100) {
          clearInterval(intervalId);
          return 100;
        }
        return progress + 10;
      });
    }, 50);

    // Clear progress after "upload" is complete
    setTimeout(() => {
      clearInterval(intervalId);
      setUploadProgress(100);
      // Short delay to show 100% before resetting
      setTimeout(() => setUploadProgress(0), 300);

      // Show success toast
      toast({
        title: "Files staged",
        description: "Files will be attached when the journal entry is saved.",
      });
    }, 600);
  };

  // Delete pending file (for new entries)
  const deletePendingFile = (id: number) => {
    const fileIndex = pendingFilesMetadata.findIndex((file) => file.id === id);
    if (fileIndex !== -1) {
      setPendingFilesMetadata((prev) => prev.filter((file) => file.id !== id));
      setPendingFiles((prev) => prev.filter((_, index) => index !== fileIndex));

      toast({
        title: "File removed",
        description: "File was removed from pending uploads.",
      });
    }
  };



  // Delete file hook (for existing entries)
  // Pass clientId and entityId to the hook for hierarchical URL pattern support
  const deleteFileMutation = useDeleteJournalEntryFile();

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        // Check for duplicate files
        let duplicatesFound = false;
        const uniqueFiles = acceptedFiles.filter((newFile) => {
          // Compare with existing attachments from server
          const isDuplicateWithExisting =
            Array.isArray(attachments) &&
            attachments.length > 0 &&
            attachments.some(
              (existingFile) =>
                existingFile.filename === newFile.name &&
                existingFile.size === newFile.size,
            );

          // Compare with pending files
          const isDuplicateWithPending =
            Array.isArray(pendingFiles) &&
            pendingFiles.length > 0 &&
            pendingFiles.some(
              (pendingFile) =>
                pendingFile.name === newFile.name &&
                pendingFile.size === newFile.size,
            );

          // If duplicate found, mark it
          if (isDuplicateWithExisting || isDuplicateWithPending) {
            duplicatesFound = true;
            return false;
          }

          return true;
        });

        // Notify user about any duplicates
        if (duplicatesFound) {
          toast({
            title: "Duplicate files detected",
            description:
              "Some files were skipped as they appear to be duplicates of existing attachments.",
            variant: "destructive",
          });
        }

        // Only upload unique files if we have any
        if (uniqueFiles.length > 0) {
          if (isExistingEntry) {
            // For existing entries, use the upload hook
            uploadFileMutation.mutate({
              files: uniqueFiles,
              onProgress: setUploadProgress,
            });
          } else {
            // For new entries, use our local handler
            handleLocalFileUpload(uniqueFiles);
          }
        }
      }
    },
    accept: {
      // Images
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
      // PDF
      "application/pdf": [".pdf"],
      // Word documents
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      // Excel spreadsheets
      "application/vnd.ms-excel": [".xls", ".csv"], // Some browsers send Excel MIME for CSV
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      // Text files
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      // Email formats
      "message/rfc822": [".eml"], // RFC-822 email format
      "application/vnd.ms-outlook": [".msg"], // Outlook messages
      // Archives
      "application/zip": [".zip"],
      "application/x-rar-compressed": [".rar"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    disabled:
      Boolean(uploadFileMutation.isPending) || Boolean(isAttachmentsDisabled),
  });

  return (
    <Card className="mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Paperclip className="mr-2 h-4 w-4" />
          Attachments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={cn(
            "border border-dashed rounded-md p-6 cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-gray-300",
            uploadFileMutation.isPending && "opacity-50 cursor-not-allowed",
          )}
        >
          <input {...getInputProps()} />

          {false /* We're now using tempJournalEntryId so this condition is always false */ ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Save the journal entry as draft first to enable file uploads
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="pointer-events-none"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
            </div>
          ) : uploadFileMutation.isPending ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Uploading files...
              </p>
              <Progress value={uploadProgress} className="w-full mt-2" />
            </div>
          ) : isDragActive ? (
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm">Drop the files here...</p>
            </div>
          ) : isAttachmentsDisabled ? (
            <div className="text-center">
              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Files can't be added once the entry is posted
              </p>
              <p className="text-xs text-muted-foreground">
                Create a reversal or new draft if you need to add files
              </p>
            </div>
          ) : (
            <div className="text-center">
              <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to select files
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, Word (.doc/.docx), Excel (.xls/.xlsx),
                CSV, Images, Email (.eml), etc. (Max 10MB per file)
              </p>
            </div>
          )}
        </div>

        {/* Attachments List */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Attached Files</h4>

          {/* Show message when no files exist */}
          {(attachments?.length || 0) === 0 && (pendingFilesMetadata?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No files attached yet
            </p>
          ) : (
            <ScrollArea className="h-[200px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Filename</TableHead>
                    <TableHead className="w-[15%]">Size</TableHead>
                    <TableHead className="w-[25%]">Status</TableHead>
                    <TableHead className="w-[20%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Debug: Show table structure */}
                  {!Array.isArray(attachments) && !Array.isArray(pendingFilesMetadata) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No files attached yet
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Pending files (for new entries) */}
                  {pendingFilesMetadata.map((file) => (
                    <TableRow key={`pending-${file.id}`}>
                      <TableCell className="flex items-center">
                        {getFileIcon(file.mimeType)}
                        <span
                          className="ml-2 truncate max-w-[150px]"
                          title={file.filename}
                        >
                          {file.filename}
                        </span>
                      </TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <span className="text-amber-500 bg-amber-50 text-xs px-2 py-1 rounded-full font-medium mr-2">
                              Pending
                            </span>
                            {file.addedAt ? new Date(Number(file.addedAt)).toLocaleTimeString() : "Just now"}
                          </div>
                          {uploadFileMutation.isPending && (
                            <div className="w-full">
                              <Progress
                                value={uploadProgress}
                                className="h-1"
                              />
                              <span className="text-xs text-muted-foreground">
                                {uploadProgress}%
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    console.log('ARCHITECT_DEBUG_DELETE_PENDING_CLICK: localId=', file.id);
                                    deletePendingFile(file.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Existing files (for saved entries) - Force display if data exists */}
                  {(Array.isArray(attachments) ? attachments : []).map((file: JournalEntryFile) => (
                      <TableRow key={file.id}>
                        <TableCell className="flex items-center">
                          {getFileIcon(file.mimeType)}
                          <span
                            className="ml-2 truncate max-w-[150px]"
                            title={file.filename}
                          >
                            {file.filename}
                          </span>
                        </TableCell>
                        <TableCell>{formatBytes(file.size)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="text-green-500 bg-green-50 text-xs px-2 py-1 rounded-full font-medium mr-2">
                              Uploaded
                            </span>
                            {file.uploadedAt ? ymdToDisplay(file.uploadedAt.toString().substring(0, 10)) : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      // Always use the hierarchical URL pattern with the dedicated helper
                                      const downloadUrl = getJournalEntryFileDownloadUrl(
                                        clientId as number, 
                                        entityId as number, 
                                        journalEntryId as number, 
                                        file.id
                                      );
                                      window.open(downloadUrl, "_blank");
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      // Ensure all IDs are valid numbers before calling
                                      const cClientId = typeof clientId === 'number' ? clientId : undefined;
                                      const cEntityId = typeof entityId === 'number' ? entityId : undefined;
                                      const cJournalEntryId = typeof journalEntryId === 'number' ? journalEntryId : undefined;

                                      if (cClientId && cEntityId && cJournalEntryId && file.id) {
                                        console.log(`ARCHITECT_DEBUG_DELETE_EXISTING_CLICK: Calling deleteFileMutation for EXISTING file. FileID: ${file.id}, JE_ID: ${cJournalEntryId}`);
                                        deleteFileMutation.mutate({
                                          clientId: cClientId,
                                          entityId: cEntityId,
                                          journalEntryId: cJournalEntryId,
                                          fileId: file.id, // This is the server's file ID
                                        });
                                      } else {
                                        console.error("ARCHITECT_DEBUG_DELETE_EXISTING_CLICK: Cannot delete, one or more required IDs are missing.", {fileId: file.id, cjeId: cJournalEntryId, cClientId, cEntityId});
                                        toast({title: "Deletion Error", description: "Cannot delete file: required identifiers are missing.", variant: "destructive"});
                                      }
                                    }}
                                    disabled={
                                      Boolean(deleteFileMutation.isPending) ||
                                      Boolean(isFileDeletionDisabled)
                                    }
                                  >
                                    {deleteFileMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isFileDeletionDisabled ? (
                                    <p>Delete not allowed for posted entries</p>
                                  ) : (
                                    <p>Delete</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
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
  locations = [],
  entities = [],
  onSubmit,
  onCancel,
  existingEntry,
}: JournalEntryFormProps) {
  // Get context client ID as fallback
  const { selectedClientId } = useEntity();
  const effectiveClientId = clientId ?? (typeof selectedClientId === 'number' ? selectedClientId : undefined);
  
  // Fetch existing journal entries for reference number validation
  const { data: existingEntries = [] } = useQuery<any[]>({
    queryKey: effectiveClientId && entityId 
      ? [`/api/clients/${effectiveClientId}/entities/${entityId}/journal-entries`] 
      : ['no-journal-entries'],
    enabled: !!effectiveClientId && !!entityId,
    staleTime: 30000, // Keep cache for 30 seconds
  });

  // Fetch dimensions for tagging
  const { data: dimensionsData = [] } = useQuery<any[]>({
    queryKey: ['dimensions', effectiveClientId],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      return await apiRequest(`/api/clients/${effectiveClientId}/dimensions`);
    },
    enabled: !!effectiveClientId,
    staleTime: 60000, // Keep cache for 1 minute
  });

  // Ensure dimensions is always an array
  const dimensions = Array.isArray(dimensionsData) ? dimensionsData : [];
  
  // Helper function to invalidate journal entry and general ledger queries with proper hierarchical URL pattern
  const invalidateJournalEntryQueries = () => {
    if (effectiveClientId) {
      // Use hierarchical URL pattern when client ID is available
      queryClient.invalidateQueries({
        queryKey: [getJournalEntriesBaseUrl(effectiveClientId, entityId)],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${effectiveClientId}/entities/${entityId}/general-ledger`],
      });
      
      // Invalidate journal entry files queries if we have a valid journal entry ID
      if (existingEntry?.id && typeof existingEntry.id === 'number') {
        // Invalidate the attachments query
        queryClient.invalidateQueries({
          queryKey: ['journalEntryAttachments', existingEntry.id],
        });
        
        // Also invalidate using the URL pattern
        queryClient.invalidateQueries({
          queryKey: [getJournalEntryFilesBaseUrl(effectiveClientId, entityId, existingEntry.id)],
        });
      }
    } else {
      // Even without a client ID, we should use the hierarchical pattern by getting all possible keys
      // This ensures we invalidate all queries that might match
      
      // First try to get all entities for this entity ID, regardless of client
      queryClient.invalidateQueries({
        queryKey: [`/api/entities/${entityId}/journal-entries`],
        exact: false
      });
      
      // Also invalidate any client-specific paths that might exist
      queryClient.invalidateQueries({
        queryKey: [`/api/clients`],
        predicate: (query) => {
          const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : '';
          return typeof queryKey === 'string' && 
                 queryKey.includes(`/entities/${entityId}/journal-entries`);
        }
      });
      
      // Invalidate general ledger as well
      queryClient.invalidateQueries({
        queryKey: [`/api/entities/${entityId}/general-ledger`],
      });
    }
  };
  
  // Properly initialize the hook at the component level, not in the event handler
  const { postJournalEntry } = useJournalEntry();

  // Generate a temporary UUID for new entries to use with attachments before saving
  const [tempJournalEntryId] = useState(uuidv4());
  // This ID is used for both existing entries and new entries with temporary IDs
  const effectiveJournalEntryId = existingEntry?.id ?? tempJournalEntryId;

  // State for pending file attachments
  // CRITICAL FIX: pendingFiles should only contain newly added File objects in current session
  // Existing files are handled by the attachments prop from useJournalEntryFiles
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingFilesMetadata, setPendingFilesMetadata] = useState<
    {
      id: number;
      filename: string;
      size: number;
      mimeType: string;
      addedAt: Date | number;
    }[]
  >([]);

  // Flag to track if files have already been uploaded in the two-phase workflow
  const [filesAlreadyUploaded, setFilesAlreadyUploaded] = useState(false);

  // Ref to hold the function to upload pending files to a specific journal entry
  // This will be passed to and set by the AttachmentSection component
  const uploadPendingFilesRef = useRef<
    ((entryId: number) => Promise<void>) | null
  >(null);

  // Helper function definitions - declaring before they're used
  // Using safeParseAmount from the shared utils file

  // Function to format number with thousands separators
  const formatNumberWithSeparator = (value: string) => {
    // Remove all commas first
    const numWithoutCommas = value.replace(/,/g, "");

    // Check if it's a valid number format
    if (numWithoutCommas === "" || /^\d*\.?\d{0,2}$/.test(numWithoutCommas)) {
      // If it has a decimal part
      if (numWithoutCommas.includes(".")) {
        const [wholePart, decimalPart] = numWithoutCommas.split(".");
        // Format whole part with commas and add back decimal part
        return (
          wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + decimalPart
        );
      } else {
        // Format number without decimal part
        return numWithoutCommas.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    }

    // If not a valid number format, return as is
    return value;
  };
  console.log("DEBUG JournalEntryForm - received accounts:", accounts);
  console.log(
    "DEBUG JournalEntryForm - accounts length:",
    accounts?.length || 0,
  );
  console.log(
    "DEBUG JournalEntryForm - accounts first item:",
    accounts?.length > 0 ? accounts[0] : "no accounts",
  );
  console.log("DEBUG JournalEntryForm - clientId:", clientId);
  console.log("DEBUG JournalEntryForm - entityId:", entityId);

  // Debug logs for existingEntry
  console.log(
    "DEBUG JournalEntryForm - existingEntry:",
    existingEntry ? "YES" : "NO",
  );
  if (existingEntry) {
    console.log("DEBUG JournalEntryForm - existingEntry ID:", existingEntry.id);
    console.log(
      "DEBUG JournalEntryForm - existingEntry status:",
      existingEntry.status,
    );
    console.log(
      "DEBUG JournalEntryForm - existingEntry lines count:",
      existingEntry.lines?.length || 0,
    );
    console.log(
      "DEBUG JournalEntryForm - existingEntry first line format:",
      existingEntry.lines?.[0]
        ? JSON.stringify(existingEntry.lines[0], null, 2)
        : "No lines",
    );
  }

  // Log the structure of account items, which helps diagnose render issues
  if (accounts?.length > 0) {
    console.log(
      "DEBUG JournalEntryForm - account item structure:",
      Object.keys(accounts[0])
        .map((key) => `${key}: ${typeof accounts[0][key]}`)
        .join(", "),
    );
  }
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing] = useState(!!existingEntry);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Generate auto-reference prefix for new entries
  const autoReferencePrefix = useMemo(() => {
    if (existingEntry?.referenceNumber) {
      // For existing entries, parse the existing reference
      const parts = existingEntry.referenceNumber.split(':');
      return parts[0]; // Return the prefix part
    } else {
      // For new entries, generate a unique prefix
      return generateUniqueReferencePrefix(
        entityId ?? 0, 
        getTodayYMD().substring(0, 4)
      );
    }
  }, [existingEntry, entityId]);

  const [journalData, setJournalData] = useState({
    reference: existingEntry?.reference || generateReference(),
    referenceNumber: existingEntry?.referenceNumber || autoReferencePrefix, // Auto-generated prefix
    referenceUserSuffix: existingEntry?.referenceNumber ? 
      existingEntry.referenceNumber.split(':')[1] || "" : "", // Extract user suffix if exists
    date: existingEntry?.date ?? // already "YYYY-MM-DD" 
          getTodayYMD(), // Use our timezone-safe utility instead of Date()
    description: existingEntry?.description || "",
    status: existingEntry?.status || JournalEntryStatus.DRAFT,
    journalType: existingEntry?.journalType || "JE",
    supDocId: existingEntry?.supDocId || "",
    reversalDate: existingEntry?.reversalDate ?? "", // already "YYYY-MM-DD" or empty
  });

  // Get default entity code from entities list based on current entityId
  const defaultEntityCode = React.useMemo(() => {
    if (entities && entities.length > 0) {
      const currentEntity = entities.find((entity) => entity.id === entityId);
      return currentEntity ? currentEntity.code : "";
    }
    return "";
  }, [entities, entityId]);

  const [lines, setLines] = useState<JournalLine[]>(
    existingEntry?.lines || [
      {
        accountId: "",
        entityCode: defaultEntityCode,
        description: "",
        debit: "",
        credit: "",
      },
      {
        accountId: "",
        entityCode: defaultEntityCode,
        description: "",
        debit: "",
        credit: "",
      },
    ],
  );

  // Removed supportingDoc state as we're using the AttachmentSection component now

  // Track expanded/collapsed state of parent accounts
  const initializeExpandedState = () => {
    const initialState: ExpandedState = {};
    accounts.forEach((account) => {
      if (account.isSubledger === false && account.parentId === null) {
        initialState[account.id] = false; // Start with all parent accounts collapsed
      }
    });
    return initialState;
  };

  const [expandedAccounts, setExpandedAccounts] = useState<ExpandedState>(
    initializeExpandedState,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State for dimension tagging
  const [tagPopoverOpen, setTagPopoverOpen] = useState<{ [lineIndex: number]: boolean }>({});

  // Helper functions for dimension tagging
  const updateLineTags = (lineIndex: number, tags: DimensionTag[]) => {
    const updatedLines = [...lines];
    updatedLines[lineIndex] = { ...updatedLines[lineIndex], tags };
    setLines(updatedLines);
  };

  const toggleTagPopover = (lineIndex: number, open: boolean) => {
    setTagPopoverOpen(prev => ({ ...prev, [lineIndex]: open }));
  };

  const getLineTagsDisplay = (tags: DimensionTag[] = []) => {
    if (tags.length === 0) return "No tags";
    return tags.map(tag => `${tag.dimensionName}: ${tag.dimensionValueName}`).join(", ");
  };

  const hasLineTags = (tags: DimensionTag[] = []) => tags.length > 0;

  // Calculate totals - memoized to avoid recalculation on every render
  const { totalDebit, totalCredit, difference, isBalanced } = useMemo(() => {
    // Use our shared helper functions to handle different line formats
    const totalDebit = lines.reduce((sum, line) => {
      return sum + getDebit(line);
    }, 0);

    const totalCredit = lines.reduce((sum, line) => {
      return sum + getCredit(line);
    }, 0);

    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.001;

    return { totalDebit, totalCredit, difference, isBalanced };
  }, [lines]); // Only recalculate when lines change

  // Calculate entity balances for intercompany validation - memoized
  const getEntityBalances = useCallback(() => {
    // Get unique entity codes without using Set
    const entityCodesArray = lines.map((line) => line.entityCode);
    const uniqueEntityCodes = entityCodesArray.filter(
      (code, index) => entityCodesArray.indexOf(code) === index,
    );

    return uniqueEntityCodes.map((code) => {
      const entityLines = lines.filter((line) => line.entityCode === code);
      const entityDebit = entityLines.reduce((sum, line) => {
        return sum + getDebit(line);
      }, 0);
      const entityCredit = entityLines.reduce((sum, line) => {
        return sum + getCredit(line);
      }, 0);
      const entityDifference = Math.abs(entityDebit - entityCredit);
      const entityBalanced = entityDifference < 0.001;

      return {
        entityCode: code,
        debit: entityDebit,
        credit: entityCredit,
        difference: entityDifference,
        balanced: entityBalanced,
      };
    });
  }, [lines]); // Only recalculate when lines change

  // Memoize entity balances result
  const entityBalances = useMemo(
    () => getEntityBalances(),
    [getEntityBalances],
  );

  function generateReference() {
    // Use the current date in YYYY-MM-DD format
    const today = getTodayYMD();
    // Extract the year from the date string
    const year = today.substring(0, 4);
    // Generate a random number for uniqueness
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(4, "0");
    return `JE-${year}-${randomNum}`;
  }

  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      console.log("Journal entry submission data:", JSON.stringify(data));
      // Ensure the status is properly set in the mutation data
      console.log("DEBUG: Creating entry with status:", data.status);

      // Validate required fields explicitly
      if (!data.date) {
        throw new Error("Date is required");
      }
      if (!data.description) {
        throw new Error("Description is required");
      }
      if (!data.reference) {
        throw new Error("Reference is required");
      }

      // Keep the exact calendar date as selected
      if (typeof data.date === "string" && data.date.length) {
        // Keep the date exactly as selected - no conversion needed
        if (data.date.includes("T")) {
          // If it has a time component, just take the date part
          data.date = data.date.split("T")[0];
        }
      }

      console.log("DEBUG: Date preserved as selected:", data.date);
      // Ensure all required fields are explicitly included in the API call
      const apiPayload = {
        ...data,
        date: data.date, // Explicitly included date
        description: data.description, // Explicitly included description
        reference: data.reference, // Explicitly included reference
      };

      // Use the hierarchical URL pattern for creating journal entries
      return await apiRequest(getJournalEntriesBaseUrl(clientId as number, entityId), {
        method: "POST",
        data: apiPayload,
      });
    },
    onSuccess: async (result: JournalEntryResponse, variables: any) => {
      const newJournalEntryId = result?.id || (result?.entry && result.entry.id);

      // This logic should ONLY run when the user's intent was to "Save as Draft".
      // The more complex "Create and Post" workflow is handled by a separate onSuccess
      // callback passed directly to the mutate function in handleSubmit.
      if (variables.status === 'draft') {
        const hasAttachments = pendingFiles.length > 0;

        if (hasAttachments && newJournalEntryId && uploadPendingFilesRef.current) {
          try {
            setIsUploading(true);
            await uploadPendingFilesRef.current(newJournalEntryId);
            toast({
              title: "Files attached",
              description: `${pendingFiles.length} file(s) were attached to the journal entry.`,
            });
          } catch (fileError) {
            console.error("Failed to upload pending files:", fileError);
            toast({
              title: "Note about files",
              description: "Journal entry created, but some files could not be attached. Please try uploading them again.",
              variant: "destructive",
            });
          } finally {
            setIsUploading(false);
          }
        }

        toast({
          title: "Journal entry created",
          description: "The journal entry has been created successfully.",
        });

        setPendingFiles([]);
        setPendingFilesMetadata([]);
        invalidateJournalEntryQueries();
        onSubmit();
      }
    },
    onError: (error: any) => {
      // Handle structured API errors
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;

        // Format field errors from API
        const formattedErrors: Record<string, string> = {};

        apiErrors.forEach((err: any) => {
          const path = err.path.split(".");

          // Handle array paths like lines[0].accountId
          if (path[0] === "lines" && path.length > 1) {
            const match = path[1].match(/\[(\d+)\]/);
            if (match) {
              const lineIndex = parseInt(match[1]);
              const fieldName = path[2] || "field";
              formattedErrors[`line_${lineIndex}_${fieldName}`] = err.message;
            }
          } else {
            formattedErrors[path[0]] = err.message;
          }
        });

        setFieldErrors(formattedErrors);
        setFormError("Please correct the errors in the form.");
      } else {
        // Generic error
        toast({
          title: "Error",
          description: `Failed to create journal entry: ${error.message}`,
          variant: "destructive",
        });
        setFormError(
          error.message ||
            "An error occurred while creating the journal entry.",
        );
      }
    },
  });

  const updateEntry = useMutation({
    mutationFn: async (data: any) => {
      console.log("DEBUG: Journal entry update - ID:", existingEntry?.id);
      console.log(
        "DEBUG: Journal entry update - Status:",
        existingEntry?.status,
      );
      console.log(
        "DEBUG: Journal entry update data:",
        JSON.stringify(data, null, 2),
      );

      // Validate required fields explicitly
      if (!data.date) {
        throw new Error("Date is required");
      }
      if (!data.description) {
        throw new Error("Description is required");
      }
      if (!data.reference) {
        throw new Error("Reference is required");
      }
      // Keep the exact calendar date as selected
      if (typeof data.date === "string" && data.date.length) {
        // Keep the date exactly as selected - no conversion needed
        if (data.date.includes("T")) {
          // If it has a time component, just take the date part
          data.date = data.date.split("T")[0];
        }
      }

      console.log("DEBUG: Date preserved as selected:", data.date);

      // Ensure all required fields are explicitly included in the API call
      const apiPayload = {
        ...data,
        date: data.date, // Explicitly included date
        description: data.description, // Explicitly included description
        reference: data.reference, // Explicitly included reference
      };

      // We explicitly use the hierarchical URL pattern for the update operation
      return await apiRequest(getJournalEntryUrl(clientId as number, entityId, existingEntry.id), {
        method: "PUT",
        data: apiPayload,
      });
    },
    onSuccess: async (response: JournalEntryResponse) => {
      console.log(
        "DEBUG: Journal entry update success response:",
        JSON.stringify(response, null, 2),
      );

      // Determine the entry ID from the response or use the existing entry ID
      const entryId =
        response?.id ||
        (response?.entry && response.entry.id) ||
        existingEntry?.id;

      // EXPLICITLY ensure we have a valid journal entry ID before proceeding
      if (!entryId) {
        console.error(
          "ERROR: Failed to determine valid journal entry ID for file uploads",
        );
        toast({
          title: "Warning",
          description:
            "Journal entry was updated but file attachment may not work properly.",
          variant: "destructive",
        });

        // Even if there's an error, we should continue with the workflow
        invalidateJournalEntryQueries();
        onSubmit();
        return;
      }

      // EXPLICITLY show loading state for attachments uploads
      const hasAttachments = pendingFiles?.length > 0;
      if (hasAttachments) {
        toast({
          title: "Uploading attachments",
          description: `Uploading ${pendingFiles.length} file(s) to journal entry...`,
        });
      }

      // Upload pending files for existing entries if there are any
      // EXPLICITLY wait for file uploads to complete before proceeding
      if (hasAttachments && entryId && uploadPendingFilesRef.current) {
        try {
          console.log(
            `DEBUG: Attempting to upload ${pendingFiles.length} files to updated journal entry ${entryId}`,
          );

          // EXPLICITLY set loading state for file uploads
          setIsUploading(true);

          // EXPLICITLY use the function from the AttachmentSection via ref to upload files
          // EXPLICITLY await this to ensure files are uploaded before proceeding
          await uploadPendingFilesRef.current(entryId);

          console.log(
            "DEBUG: Uploaded pending files to existing entry successfully",
          );

          // EXPLICITLY invalidate the journal entry query to refresh attachments
          queryClient.invalidateQueries({
            queryKey: [getJournalEntryUrl(clientId as number, entityId, entryId)],
          });

          toast({
            title: "Files attached",
            description: `${pendingFiles.length} file(s) were attached to the journal entry.`,
          });
        } catch (fileError: any) {
          console.error("Failed to upload pending files:", fileError);
          toast({
            title: "File Upload Failed",
            description: `Journal entry updated, but file upload failed: ${fileError.message || 'Unknown error'}. Please try uploading them again.`,
            variant: "destructive",
          });
        } finally {
          // EXPLICITLY clear loading state
          setIsUploading(false);
        }
      } else {
        console.log(
          "DEBUG: No pending files to upload or missing ref/journalEntryId",
          {
            pendingFilesCount: pendingFiles?.length || 0,
            hasEntryId: !!entryId,
            existingEntryId: existingEntry?.id,
            hasUploadRef: !!uploadPendingFilesRef.current,
          },
        );
      }

      toast({
        title: "Journal entry updated",
        description: "The journal entry has been updated successfully.",
      });

      // Use our helper function to invalidate queries with hierarchical URL patterns
      invalidateJournalEntryQueries();
      onSubmit();
    },
    onError: (error: any) => {
      console.log("DEBUG: Journal entry update error:", error);
      console.log(
        "DEBUG: Journal entry update error response:",
        error.response?.data,
      );
      console.log(
        "DEBUG: Journal entry update error status:",
        error.response?.status,
      );

      // Similar error handling as in createEntry
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        console.log(
          "DEBUG: Journal entry update API errors:",
          JSON.stringify(apiErrors, null, 2),
        );

        const formattedErrors: Record<string, string> = {};

        apiErrors.forEach((err: any) => {
          const path = err.path.split(".");
          if (path[0] === "lines" && path.length > 1) {
            const match = path[1].match(/\[(\d+)\]/);
            if (match) {
              const lineIndex = parseInt(match[1]);
              const fieldName = path[2] || "field";
              formattedErrors[`line_${lineIndex}_${fieldName}`] = err.message;
            }
          } else {
            formattedErrors[path[0]] = err.message;
          }
        });

        setFieldErrors(formattedErrors);
        setFormError("Please correct the errors in the form.");
      } else if (error.response?.data?.message) {
        console.log(
          "DEBUG: Journal entry update error message:",
          error.response.data.message,
        );

        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
        setFormError(error.response.data.message);
      } else {
        toast({
          title: "Error",
          description: `Failed to update journal entry: ${error.message}`,
          variant: "destructive",
        });
        setFormError(
          error.message ||
            "An error occurred while updating the journal entry.",
        );
      }
    },
  });

  const handleSubmit = (saveAsDraft: boolean = true) => {
    console.log("DEBUG: handleSubmit called with saveAsDraft =", saveAsDraft);

    // Verify and log attachment status for debugging
    logAttachmentStatus();
    
    // Build the complete reference from auto-generated prefix and optional user suffix
    const fullReference = buildFullReference(autoReferencePrefix, journalData.referenceUserSuffix);
    
    // Clear previous errors
    setFormError(null);
    setFieldErrors({});

    // Prepare data for validation - only keep lines with account or debit/credit values
    const validLines = lines.filter(
      (line) =>
        line.accountId ||
        safeParseAmount(line.debit) > 0 ||
        safeParseAmount(line.credit) > 0,
    );

    // Check if we need special handling for file attachments
    const hasPendingAttachments = pendingFiles.length > 0;
    console.log("DEBUG: Pending attachments:", pendingFiles.length);

    // Determine the initial status - if we're posting with files, start as draft
    const initialStatus =
      !saveAsDraft && hasPendingAttachments
        ? JournalEntryStatus.DRAFT // Create as draft initially if posting with attachments
        : saveAsDraft
          ? JournalEntryStatus.DRAFT
          : JournalEntryStatus.POSTED;

    const formData = {
      ...journalData,
      lines: validLines,
      // Set the appropriate status based on our decision logic
      status: initialStatus,
    };

    console.log("DEBUG: Form data with initial status:", formData.status);
    console.log(
      "DEBUG: Will post after uploads complete:",
      !saveAsDraft && hasPendingAttachments,
    );

    // Only validate fully if we're not saving as draft (final intended state)
    if (!saveAsDraft) {
      // Create a dynamic schema for validation
      const contextAwareSchema = createFormSchema();
      
      // Full validation for posting using context-aware schema
      const validation = validateForm(formData, contextAwareSchema);

      if (!validation.valid) {
        setFieldErrors(validation.errors || {});
        
        setFormError("Please correct the errors in the form before posting.");
        return;
      }
    } else {
      // Lighter validation for drafts - just check required fields
      if (!journalData.date || !journalData.description) {
        const errors: Record<string, string> = {};
        if (!journalData.date) errors["date"] = "Date is required";
        if (!journalData.description)
          errors["description"] = "Description is required";

        setFieldErrors(errors);
        setFormError("Please fill in the required basic information.");
        return;
      }

      // Ensure there's at least one line with an account
      if (
        validLines.length === 0 ||
        !validLines.some((line) => line.accountId)
      ) {
        setFormError("Please add at least one valid line with an account.");
        return;
      }
    }

    // Format data for submission - convert debit/credit format to type/amount format
    const formattedLines = validLines
      .filter(line => {
        // Ensure line has an accountId and either a debit or credit value (not both)
        const debitValue = safeParseAmount(line.debit);
        const creditValue = safeParseAmount(line.credit);
        return line.accountId && (debitValue > 0 || creditValue > 0);
      })
      .map((line) => {
        // Calculate amount and determine type - use safeParseAmount to handle various formats
        const debitValue = safeParseAmount(line.debit);
        const creditValue = safeParseAmount(line.credit);

        // Convert our UI format (debit/credit fields) to API format (type and amount)
        return {
          accountId: Number(line.accountId), // Ensure accountId is a number
          entityCode: line.entityCode || defaultEntityCode,
          description: line.description,
          // Only include one of debit or credit based on which has a value
          type: debitValue > 0 ? "debit" : "credit",
          amount: debitValue > 0 ? debitValue : creditValue,
          // Include dimension tags if present
          tags: line.tags || [],
        };
      });

    // Use passed clientId or get from accounts as fallback
    const resolvedClientId =
      clientId || (accounts.length > 0 ? accounts[0].clientId : null);

    if (!resolvedClientId) {
      setFormError(
        "Error: Unable to determine client ID. Please refresh the page and try again.",
      );
      return;
    }

    // Use the date directly from the input - already in YYYY-MM-DD format
    // No need to create a Date object which would cause timezone issues
    
    const entryData = {
      ...journalData,
      referenceNumber: fullReference, // Use the complete reference with auto-generated prefix + optional suffix
      date: journalData.date, // Use direct date string from input - already in YYYY-MM-DD format
      clientId: resolvedClientId,
      entityId,
      status: initialStatus, // Use our determined initial status
      createdBy: user?.id,
      lines: formattedLines,
    };

    // Debug logging for the API payload
    console.log(
      "DEBUG: API Payload to be sent:",
      JSON.stringify(entryData, null, 2),
    );

    if (isEditing) {
      // For existing entries, no need for special attachment handling
      updateEntry.mutate(entryData);
    } else {
      // For new entries
      // IMPROVED IMPLEMENTATION: Always use a two-step process for creating and posting entries
      // Step 1: Always create as draft first for all new entries
      if (!saveAsDraft) {
        // Enhanced logging for the two-step process
        console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Starting two-step process for journal entry");
        console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Has attachments:", hasPendingAttachments);
        
        // Always create as draft first, regardless of attachment status
        const draftEntryData = {
          ...entryData,
          status: JournalEntryStatus.DRAFT // Always use draft status for initial creation
        };
        
        console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Step 1 - Creating entry as draft with payload:", 
          JSON.stringify(draftEntryData, null, 2));
        
        // Set uploading state if we have attachments
        if (hasPendingAttachments) {
          setIsUploading(true);
        }
        
        // Create as draft, then handle attachments and posting in the onSuccess callback
        createEntry.mutate(draftEntryData, {
          onSuccess: async (result) => {
            // Extract the new entry ID
            const newEntryId = result?.id || (result?.entry && result.entry.id);
            
            if (!newEntryId) {
              console.error("ARCHITECT_DEBUG_JE_CREATE_POST: Failed to extract entry ID from response:", result);
              toast({
                title: "Error",
                description: "Failed to extract entry ID from server response",
                variant: "destructive",
              });
              onSubmit(); // Still navigate away
              return;
            }
            
            console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Step 1 complete - Created draft entry with ID:", newEntryId);
            
            // Step 1.5: Handle file uploads if there are any
            if (hasPendingAttachments) {
              console.log(`ARCHITECT_DEBUG_JE_CREATE_POST: Uploading ${pendingFiles.length} attachments to entry ${newEntryId}`);
              
              toast({
                title: "Uploading attachments",
                description: `Uploading ${pendingFiles.length} file(s) before posting...`,
              });
              
              try {
                if (uploadPendingFilesRef.current) {
                  console.log(`ARCHITECT_DEBUG_UPLOAD_HANDLER: Attempting to upload ${pendingFiles.length} files to new journal entry ${newEntryId} via ref...`);
                  await uploadPendingFilesRef.current(newEntryId); // This will now throw on XHR error
                  console.log("ARCHITECT_DEBUG_UPLOAD_HANDLER: File uploads reported as successful for new entry:", newEntryId);
                  toast({
                    title: "Files Processed", 
                    description: `${pendingFiles.length} file(s) were submitted successfully.`
                  });
                  // CRITICAL: Clear pending files after successful upload to prevent duplication
                  setPendingFiles([]);
                  setPendingFilesMetadata([]);
                  setFilesAlreadyUploaded(true); // Mark files as uploaded to prevent duplicate uploads
                  // Invalidate queries to refresh attachments list
                  queryClient.invalidateQueries({ 
                    queryKey: [getJournalEntryUrl(resolvedClientId as number, entityId, newEntryId)] 
                  });
                } else {
                  console.error("ARCHITECT_DEBUG_JE_CREATE_POST: uploadPendingFilesRef.current is not defined");
                  toast({
                    title: "Warning",
                    description: "Entry created but could not upload files. You may need to attach them manually.",
                    variant: "destructive",
                  });
                }
              } catch (uploadError: any) {
                console.error("ARCHITECT_DEBUG_UPLOAD_HANDLER: File upload FAILED for new entry:", newEntryId, uploadError);
                toast({
                  title: "File Upload Error",
                  description: `Journal entry was saved as draft, but attached files failed to upload: ${uploadError.message}`,
                  variant: "destructive",
                });
                // Do NOT proceed with any logic that assumes attachments were successful
                setIsUploading(false);
                return; // Exit here to prevent posting
              } finally {
                setIsUploading(false);
              }
            }
            
            // Step 2: Post the journal entry after creation and optional file uploads
            console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Step 2 - Posting the draft entry");
            console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Post parameters:", {
              id: newEntryId,
              clientId: resolvedClientId,
              entityId: entityId
            });
            
            // Use the dedicated postJournalEntry mutation from useJournalEntry hook
            postJournalEntry.mutate(
              {
                id: newEntryId,
                clientId: resolvedClientId,
                entityId: entityId
              },
              {
                onSuccess: (postResult) => {
                  console.log("ARCHITECT_DEBUG_JE_CREATE_POST: Step 2 complete - Successfully posted journal entry:", postResult);
                  toast({
                    title: "Success",
                    description: hasPendingAttachments 
                      ? "Journal entry created and posted with attachments" 
                      : "Journal entry created and posted successfully",
                  });
                  onSubmit(); // Navigate away
                },
                onError: (error) => {
                  console.error("ARCHITECT_DEBUG_JE_CREATE_POST: Step 2 failed - Error posting journal entry:", error);
                  toast({
                    title: "Warning",
                    description: "Entry created as draft but could not be posted. You can post it manually later.",
                    variant: "destructive",
                  });
                  onSubmit(); // Still navigate away
                }
              }
            );
          },
          onError: (error) => {
            console.error("ARCHITECT_DEBUG_JE_CREATE_POST: Step 1 failed - Error creating draft entry:", error);
            setIsUploading(false);
            toast({
              title: "Error",
              description: `Failed to create journal entry: ${error.message || 'Unknown error'}`,
              variant: "destructive",
            });
          }
        });
      } else {
        // Standard flow - just saving as draft
        console.log("ARCHITECT_DEBUG_JE_CREATE: Creating entry as draft normally");
        createEntry.mutate(entryData);
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setJournalData((prev) => ({ ...prev, [name]: value }));

    // Special handling for reference number to provide real-time validation
    if (name === 'referenceNumber') {
      // Check if valid length
      if (value.trim().length < 3) {
        setFieldErrors(prev => ({
          ...prev,
          referenceNumber: "Reference number must be at least 3 characters"
        }));
      } 
      // Check for duplicate if length is valid
      else if (value.trim().length >= 3 && isReferenceDuplicate(value, existingEntries as any[], existingEntry?.id)) {
        setFieldErrors(prev => ({
          ...prev,
          referenceNumber: "This reference number is already used by another journal entry"
        }));
      } 
      // Clear error if reference is valid
      else {
        setFieldErrors(prev => {
          const updated = { ...prev };
          delete updated.referenceNumber;
          return updated;
        });
      }
    }
    // For other fields, just clear their errors when changed
    else if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  // These functions are now defined at the top of the component

  // Regular handleLineChange for non-numeric fields
  const handleLineChange = (index: number, field: string, value: string) => {
    // New, corrected logic for debit/credit fields
    if (field === "debit" || field === "credit") {
      // This new logic sanitizes the input to ensure it's a valid decimal format.
      // 1. Remove any character that is NOT a digit or a period.
      const sanitizedValue = value.replace(/[^0-9.]/g, '');
      const parts = sanitizedValue.split('.');

      // 2. Ensure only one decimal point is present and limit decimals to 2 places.
      let finalValue = sanitizedValue;
      if (parts.length > 1) {
        const wholePart = parts[0];
        const decimalPart = parts.slice(1).join('').substring(0, 2);
        finalValue = `${wholePart}.${decimalPart}`;
      }

      // 3. Apply thousands separators for display while preserving the clean decimal format.
      const formattedValue = finalValue === "" ? "" : formatNumberWithSeparator(finalValue);
      
      // 4. Update the state with the formatted value.
      const updatedLines = [...lines];
      updatedLines[index] = { ...updatedLines[index], [field]: formattedValue };

      // 5. Clear the opposite field if necessary.
      if (safeParseAmount(finalValue) > 0) {
        const oppositeField = field === "debit" ? "credit" : "debit";
        updatedLines[index][oppositeField] = "";
      }

      setLines(updatedLines);

      // 5. Clear any errors for this field.
      const errorKey = `line_${index}_${field}`;
      if (fieldErrors[errorKey]) {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated[errorKey];
          return updated;
        });
      }
    } else {
      // For non-numeric fields, update immediately
      const updatedLines = [...lines];
      updatedLines[index] = { ...updatedLines[index], [field]: value };
      setLines(updatedLines);

      // Clear field error when user changes the value
      const errorKey = `line_${index}_${field}`;
      if (fieldErrors[errorKey]) {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated[errorKey];
          return updated;
        });
      }
    }
  };

  // Create a debounced version of line change handler for numeric fields (debit/credit)
  const handleDebouncedLineChange = useDebouncedCallback(
    (index: number, field: string, value: string) => {
      // Handle various number formats with safeParseAmount
      const numericValue = safeParseAmount(value).toString();

      const updatedLines = [...lines];

      // Format the value with commas for display
      const formattedValue =
        numericValue === "" ? "" : formatNumberWithSeparator(numericValue);

      updatedLines[index] = { ...updatedLines[index], [field]: formattedValue };

      // If setting debit and it's positive, clear credit
      if (field === "debit" && parseFloat(numericValue) > 0) {
        updatedLines[index].credit = "";
      }

      // If setting credit and it's positive, clear debit
      if (field === "credit" && parseFloat(numericValue) > 0) {
        updatedLines[index].debit = "";
      }

      setLines(updatedLines);

      // Clear field error when user changes the value
      const errorKey = `line_${index}_${field}`;
      if (fieldErrors[errorKey]) {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated[errorKey];
          return updated;
        });
      }
    },
    300,
  ); // 300ms debounce delay

  // Utility function for testing file attachments - logs state of pending files
  const logAttachmentStatus = () => {
    console.log("ATTACHMENT DEBUG: Current state of file attachments");
    console.log("- Pending files count:", pendingFiles?.length || 0);
    console.log(
      "- Pending files metadata count:",
      pendingFilesMetadata?.length || 0,
    );
    console.log("- Upload ref exists:", !!uploadPendingFilesRef.current);
    console.log("- Is editing entry:", isEditing);
    console.log("- Has existing entry ID:", !!existingEntry?.id);

    // Log each pending file if any
    if (pendingFiles?.length) {
      console.log(
        "- Pending files:",
        pendingFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      );
    }

    return true;
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        accountId: "",
        entityCode: defaultEntityCode,
        description: "",
        debit: "",
        credit: "",
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast({
        title: "Cannot remove line",
        description: "Journal entries must have at least two lines.",
        variant: "destructive",
      });
      return;
    }

    const updatedLines = [...lines];
    updatedLines.splice(index, 1);
    setLines(updatedLines);

    // Remove any errors associated with this line
    const updatedErrors = { ...fieldErrors };
    Object.keys(updatedErrors).forEach((key) => {
      if (key.startsWith(`line_${index}_`)) {
        delete updatedErrors[key];
      }

      // Reindex higher indexed errors
      for (let i = index + 1; i < lines.length; i++) {
        const oldKey = `line_${i}_`;
        const newKey = `line_${i - 1}_`;

        Object.keys(updatedErrors).forEach((errKey) => {
          if (errKey.startsWith(oldKey)) {
            const field = errKey.substring(oldKey.length);
            updatedErrors[`${newKey}${field}`] = updatedErrors[errKey];
            delete updatedErrors[errKey];
          }
        });
      }
    });

    setFieldErrors(updatedErrors);
  };

  // Removed handleFileChange function as we're using the AttachmentSection component now

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {isEditing ? "Edit Journal Entry" : "Manual Journal Entry"}
        </h3>

        {/* Balance status indicator */}
        <div
          className={`px-3 py-1 rounded-md inline-flex items-center text-sm
          ${
            isBalanced
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}
        >
          {isBalanced ? (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-1" />
          )}
          {isBalanced ? "Balanced" : `Unbalanced (${difference.toFixed(2)})`}
        </div>
      </div>

      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* API Request status indicator */}
      {(createEntry.isPending || updateEntry.isPending) && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Processing</AlertTitle>
          <AlertDescription>
            {createEntry.isPending
              ? "Creating journal entry..."
              : "Updating journal entry..."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label htmlFor="reference">Journal ID</Label>
          <div className="relative">
            <Input
              id="reference"
              name="reference"
              value={journalData.reference}
              onChange={handleChange}
              className={`mt-1 ${fieldErrors.reference ? "border-red-500 pr-10" : ""}`}
              readOnly
            />
            {fieldErrors.reference && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1 pointer-events-none">
                <AlertCircle
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          {fieldErrors.reference && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" /> {fieldErrors.reference}
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

      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Account
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Entity Code
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Description
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Debit
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Credit
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tags
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {lines.map((line, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {/* Combobox for searchable account dropdown */}
                    <Popover
                      onOpenChange={(open) => {
                        // Reset expanded state and search query when dropdown is closed
                        if (!open) {
                          setExpandedAccounts(initializeExpandedState());
                          setSearchQuery(""); // Clear search query
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={`w-full justify-between ${fieldErrors[`line_${index}_accountId`] ? "border-red-500" : ""}`}
                        >
                          {line.accountId &&
                          accounts.some(
                            (account) =>
                              account.id.toString() === line.accountId,
                          )
                            ? `${accounts.find((account) => account.id.toString() === line.accountId)?.accountCode} - ${accounts.find((account) => account.id.toString() === line.accountId)?.name}`
                            : "Select account..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <div className="relative">
                            <CommandInput
                              placeholder="Search account..."
                              className="h-9 pr-8"
                              value={searchQuery}
                              onValueChange={(value) => {
                                // Update search query
                                setSearchQuery(value);

                                // When search is cleared, collapse all accounts except for default expanded ones
                                if (!value.trim()) {
                                  // Reset to initial expanded state (all collapsed)
                                  setExpandedAccounts({});
                                }
                                // When searching, automatically expand all parent accounts
                                // that have matching children
                                else {
                                  // Find all matching accounts (case insensitive search)
                                  const lowerQuery = value.toLowerCase();
                                  const matchingAccounts = accounts.filter(
                                    (account) =>
                                      `${account.accountCode} ${account.name}`
                                        .toLowerCase()
                                        .includes(lowerQuery),
                                  );

                                  // Get IDs of parent accounts whose children match the query
                                  const parentIdsToExpand = new Set<number>();

                                  // Find parents that need to be expanded
                                  matchingAccounts.forEach((account) => {
                                    if (account.parentId) {
                                      parentIdsToExpand.add(account.parentId);

                                      // Also try to find grandparents (for deep hierarchies)
                                      let currentParentId = account.parentId;
                                      while (currentParentId) {
                                        const parent = accounts.find(
                                          (a) => a.id === currentParentId,
                                        );
                                        if (parent?.parentId) {
                                          parentIdsToExpand.add(
                                            parent.parentId,
                                          );
                                          currentParentId = parent.parentId;
                                        } else {
                                          break;
                                        }
                                      }
                                    }
                                  });

                                  // Expand these parents if they're not already expanded
                                  if (parentIdsToExpand.size > 0) {
                                    setExpandedAccounts((prev) => {
                                      const newState = { ...prev };
                                      parentIdsToExpand.forEach((id) => {
                                        newState[id] = true;
                                      });
                                      return newState;
                                    });
                                  }
                                }
                              }}
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Clear search query
                                  setSearchQuery("");
                                  // Reset expanded accounts state to collapse everything
                                  setExpandedAccounts({});
                                }}
                                className="absolute right-2 top-2.5 h-4 w-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
                                aria-label="Clear search"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <CommandEmpty>No account found.</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[300px] overflow-auto">
                              {(() => {
                                // Step 1: Get active accounts
                                const activeAccounts = accounts.filter(
                                  (account) => account.active,
                                );

                                // Step 2: First organize accounts by type
                                const typeOrder: Record<string, number> = {
                                  asset: 1,
                                  assets: 1,
                                  liability: 2,
                                  liabilities: 2,
                                  equity: 3,
                                  revenue: 4,
                                  expense: 5,
                                  expenses: 5,
                                };

                                // Step 3: Create a tree structure to maintain the hierarchy
                                type AccountNode = {
                                  account: Account;
                                  children: AccountNode[];
                                };

                                // Step 4: Group accounts by type
                                const accountsByType: Record<
                                  string,
                                  Account[]
                                > = {};

                                activeAccounts.forEach((account) => {
                                  const type = account.type.toLowerCase();
                                  if (!accountsByType[type]) {
                                    accountsByType[type] = [];
                                  }
                                  accountsByType[type].push(account);
                                });

                                // Step 5: For each type, build hierarchical trees
                                const forestByType: Record<
                                  string,
                                  AccountNode[]
                                > = {};

                                Object.keys(accountsByType).forEach((type) => {
                                  const accountsOfType = accountsByType[type];

                                  // Create lookup maps
                                  const accountMap = new Map<number, Account>();
                                  const nodeMap = new Map<
                                    number,
                                    AccountNode
                                  >();

                                  // Fill the maps
                                  accountsOfType.forEach((account) => {
                                    accountMap.set(account.id, account);
                                    nodeMap.set(account.id, {
                                      account,
                                      children: [],
                                    });
                                  });

                                  // Build the forest (multiple trees)
                                  const forest: AccountNode[] = [];

                                  // Connect parents to children
                                  accountsOfType.forEach((account) => {
                                    const node = nodeMap.get(account.id)!;

                                    if (
                                      account.parentId &&
                                      nodeMap.has(account.parentId)
                                    ) {
                                      // This is a child node, add it to its parent
                                      const parentNode = nodeMap.get(
                                        account.parentId,
                                      )!;
                                      parentNode.children.push(node);
                                    } else {
                                      // This is a root node (no parent or parent not in this type)
                                      forest.push(node);
                                    }
                                  });

                                  // Sort each level by account code
                                  const sortByCode = (nodes: AccountNode[]) => {
                                    nodes.sort((a, b) => {
                                      const aCode =
                                        parseInt(
                                          a.account.accountCode.replace(
                                            /\D/g,
                                            "",
                                          ),
                                        ) || 0;
                                      const bCode =
                                        parseInt(
                                          b.account.accountCode.replace(
                                            /\D/g,
                                            "",
                                          ),
                                        ) || 0;
                                      return aCode - bCode;
                                    });

                                    // Sort children recursively
                                    nodes.forEach((node) => {
                                      sortByCode(node.children);
                                    });
                                  };

                                  // Sort the forest
                                  sortByCode(forest);
                                  forestByType[type] = forest;
                                });

                                // Step 6: Flatten the forest into a display list while maintaining hierarchy
                                const flattenedAccounts: Account[] = [];

                                // Helper to flatten a tree into the list
                                const flattenTree = (node: AccountNode) => {
                                  flattenedAccounts.push(node.account);
                                  node.children.forEach((child) =>
                                    flattenTree(child),
                                  );
                                };

                                // Process each type in the correct order
                                Object.keys(typeOrder)
                                  .sort((a, b) => typeOrder[a] - typeOrder[b])
                                  .forEach((type) => {
                                    if (forestByType[type]) {
                                      forestByType[type].forEach((rootNode) =>
                                        flattenTree(rootNode),
                                      );
                                    }
                                  });

                                // Handle any other types not in the predefined order
                                Object.keys(forestByType)
                                  .filter((type) => !(type in typeOrder))
                                  .forEach((type) => {
                                    forestByType[type].forEach((rootNode) =>
                                      flattenTree(rootNode),
                                    );
                                  });

                                return flattenedAccounts;
                              })().map((account) => {
                                // Determine if this is a parent account (has children accounts)
                                const isParent = accounts.some(
                                  (childAccount) =>
                                    childAccount.parentId === account.id,
                                );

                                // Determine nesting level by checking if it has a parent
                                const hasParent =
                                  account.parentId !== null &&
                                  account.parentId !== undefined;

                                return (
                                  <CommandItem
                                    key={account.id}
                                    value={`${account.accountCode} ${account.name}`}
                                    onSelect={() => {
                                      // For parent accounts, toggle expand/collapse
                                      if (isParent) {
                                        setExpandedAccounts((prev) => {
                                          if (prev[account.id]) {
                                            // If collapsing, we need to recursively collapse all children
                                            const newState = {
                                              ...prev,
                                              [account.id]: false,
                                            };

                                            // Find and collapse all child accounts
                                            const collapseChildren = (
                                              parentId: number,
                                            ) => {
                                              accounts.forEach(
                                                (childAccount) => {
                                                  if (
                                                    childAccount.parentId ===
                                                    parentId
                                                  ) {
                                                    // Collapse this child
                                                    newState[childAccount.id] =
                                                      false;

                                                    // If this child is also a parent, collapse its children
                                                    if (
                                                      accounts.some(
                                                        (acc) =>
                                                          acc.parentId ===
                                                          childAccount.id,
                                                      )
                                                    ) {
                                                      collapseChildren(
                                                        childAccount.id,
                                                      );
                                                    }
                                                  }
                                                },
                                              );
                                            };

                                            collapseChildren(account.id);
                                            return newState;
                                          } else {
                                            // Simply expand this parent
                                            return {
                                              ...prev,
                                              [account.id]: true,
                                            };
                                          }
                                        });
                                      } else {
                                        // For regular accounts, select them
                                        handleLineChange(
                                          index,
                                          "accountId",
                                          account.id.toString(),
                                        );
                                      }
                                    }}
                                    className={cn(
                                      "cursor-pointer",
                                      isParent
                                        ? "font-semibold opacity-70"
                                        : "",
                                      // Hide child accounts when parent is collapsed, but not when searching
                                      hasParent &&
                                        !expandedAccounts[
                                          account.parentId || 0
                                        ] &&
                                        !searchQuery
                                        ? "hidden"
                                        : "",
                                      // Add left padding for child accounts
                                      hasParent ? "pl-6" : "",
                                      // Apply account type styling if available
                                      account.type
                                        ? `account-type-${account.type.toLowerCase().replace(/\s+/g, "-")}`
                                        : "",
                                    )}
                                  >
                                    {isParent ? (
                                      expandedAccounts[account.id] ? (
                                        <ChevronDown className="mr-2 h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="mr-2 h-4 w-4 text-muted-foreground" />
                                      )
                                    ) : hasParent ? (
                                      <span className="w-4 h-4 inline-block mr-2"></span>
                                    ) : (
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          line.accountId ===
                                            account.id.toString()
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    )}
                                    <span
                                      className={cn(
                                        isParent
                                          ? "font-medium"
                                          : hasParent
                                            ? ""
                                            : "font-medium",
                                      )}
                                    >
                                      {account.accountCode}
                                    </span>{" "}
                                    - {account.name}
                                    {!hasParent && account.type && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        {account.type}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {fieldErrors[`line_${index}_accountId`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors[`line_${index}_accountId`]}
                    </p>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {/* Combobox for searchable entity dropdown */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={`w-full justify-between ${fieldErrors[`line_${index}_entityCode`] ? "border-red-500" : ""}`}
                        >
                          {line.entityCode &&
                          entities.some(
                            (entity) => entity.code === line.entityCode,
                          )
                            ? `${line.entityCode} - ${entities.find((entity) => entity.code === line.entityCode)?.name}`
                            : "Select entity..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search entity..."
                            className="h-9"
                            onValueChange={(value) => {
                              // Entity search doesn't need to save state since it's simpler than accounts
                            }}
                          />
                          <CommandEmpty>No entity found.</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[200px] overflow-auto">
                              {entities
                                .filter((entity) => entity.active)
                                .sort((a, b) => a.code.localeCompare(b.code))
                                .map((entity) => (
                                  <CommandItem
                                    key={entity.id}
                                    value={`${entity.code} ${entity.name}`}
                                    onSelect={() => {
                                      handleLineChange(
                                        index,
                                        "entityCode",
                                        entity.code,
                                      );
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        line.entityCode === entity.code
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <span className="font-medium">
                                      {entity.code}
                                    </span>{" "}
                                    - {entity.name}
                                  </CommandItem>
                                ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {fieldErrors[`line_${index}_entityCode`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors[`line_${index}_entityCode`]}
                    </p>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    value={line.description}
                    onChange={(e) =>
                      handleLineChange(index, "description", e.target.value)
                    }
                    placeholder="Line description"
                    className={
                      fieldErrors[`line_${index}_description`]
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {fieldErrors[`line_${index}_description`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors[`line_${index}_description`]}
                    </p>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Using a text input with pattern validation for better formatting control */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(e) => {
                      handleLineChange(index, "debit", e.target.value);
                    }}
                    onBlur={(e) => {
                      // Format to 2 decimal places with thousands separators on blur
                      if (e.target.value) {
                        const numValue = safeParseAmount(e.target.value);

                        if (!isNaN(numValue)) {
                          // Format with 2 decimal places and thousands separators
                          const formattedValue = formatNumberWithSeparator(
                            numValue.toFixed(2),
                          );
                          handleLineChange(index, "debit", formattedValue);
                        }
                      }
                    }}
                    placeholder="0.00"
                    className={
                      fieldErrors[`line_${index}_debit`] ? "border-red-500" : ""
                    }
                  />
                  {fieldErrors[`line_${index}_debit`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors[`line_${index}_debit`]}
                    </p>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Using a text input with pattern validation for better formatting control */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(e) => {
                      handleLineChange(index, "credit", e.target.value);
                    }}
                    onBlur={(e) => {
                      // Format to 2 decimal places with thousands separators on blur
                      if (e.target.value) {
                        const numValue = safeParseAmount(e.target.value);

                        if (!isNaN(numValue)) {
                          // Format with 2 decimal places and thousands separators
                          const formattedValue = formatNumberWithSeparator(
                            numValue.toFixed(2),
                          );
                          handleLineChange(index, "credit", formattedValue);
                        }
                      }
                    }}
                    placeholder="0.00"
                    className={
                      fieldErrors[`line_${index}_credit`]
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {fieldErrors[`line_${index}_credit`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors[`line_${index}_credit`]}
                    </p>
                  )}
                </td>

                {/* Tags Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Popover 
                      open={tagPopoverOpen[index] || false} 
                      onOpenChange={(open) => toggleTagPopover(index, open)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-1 ${hasLineTags(line.tags) ? 'border-blue-500 text-blue-600' : 'text-gray-500'}`}
                        >
                          <Tag className="h-4 w-4" />
                          {hasLineTags(line.tags) && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4">
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm">Dimension Tags</h4>
                          {dimensions.filter(dim => dim.isActive).map((dimension) => (
                            <div key={dimension.id} className="space-y-2">
                              <Label className="text-xs font-medium text-gray-700">
                                {dimension.name}
                              </Label>
                              <Select
                                value={line.tags?.find(tag => tag.dimensionId === dimension.id)?.dimensionValueId?.toString() || ""}
                                onValueChange={(valueId) => {
                                  const currentTags = line.tags || [];
                                  let newTags = [...currentTags];
                                  
                                  if (valueId) {
                                    const selectedValue = dimension.values?.find(v => v.id.toString() === valueId);
                                    if (selectedValue) {
                                      // Remove existing tag for this dimension if any
                                      newTags = newTags.filter(tag => tag.dimensionId !== dimension.id);
                                      // Add new tag
                                      newTags.push({
                                        dimensionId: dimension.id,
                                        dimensionValueId: selectedValue.id,
                                        dimensionName: dimension.name,
                                        dimensionValueName: selectedValue.name
                                      });
                                    }
                                  } else {
                                    // Remove tag for this dimension
                                    newTags = newTags.filter(tag => tag.dimensionId !== dimension.id);
                                  }
                                  
                                  updateLineTags(index, newTags);
                                }}
                              >
                                <SelectTrigger className="w-full h-8">
                                  <SelectValue placeholder="Select value..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {dimension.values?.filter(value => value.isActive).map((value) => (
                                    <SelectItem key={value.id} value={value.id.toString()}>
                                      {value.name} ({value.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                          {line.tags && line.tags.length > 0 && (
                            <div className="pt-2 border-t">
                              <div className="flex flex-wrap gap-1">
                                {line.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="secondary" className="text-xs">
                                    {tag.dimensionName}: {tag.dimensionValueName}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {hasLineTags(line.tags) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-blue-600 cursor-help">
                              {line.tags?.length} tag{line.tags?.length !== 1 ? 's' : ''}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">{getLineTagsDisplay(line.tags)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => removeLine(index)}
                    aria-label="Remove line"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={6} className="px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLine}
                  className="inline-flex items-center"
                >
                  <Plus className="-ml-0.5 mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </td>
            </tr>

            <tr className="bg-gray-50">
              <td
                colSpan={3}
                className="px-6 py-4 text-right text-sm font-medium text-gray-900"
              >
                Totals:
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalDebit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalCredit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>

            <tr className="bg-gray-50">
              <td
                colSpan={3}
                className="px-6 py-4 text-right text-sm font-medium text-gray-900"
              >
                Difference:
              </td>
              <td
                colSpan={2}
                className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isBalanced ? "text-green-600" : "text-red-600"}`}
              >
                {difference.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>

            {/* Entity Balance Summary Section - Intercompany Validation */}
            {entityBalances.length > 1 && (
              <>
                <tr className="bg-gray-100">
                  <td
                    colSpan={6}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Entity Balance Summary (Intercompany)
                  </td>
                </tr>
                {entityBalances.map((balance: EntityBalance) => (
                  <tr key={balance.entityCode} className="bg-gray-50">
                    <td
                      colSpan={2}
                      className="px-6 py-2 text-right text-xs font-medium text-gray-900"
                    >
                      Entity {balance.entityCode}:
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      DR:{" "}
                      {balance.debit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      CR:{" "}
                      {balance.credit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      colSpan={2}
                      className={`px-6 py-2 whitespace-nowrap text-xs font-medium ${balance.balanced ? "text-green-600" : "text-red-600"}`}
                    >
                      {balance.balanced
                        ? "Balanced"
                        : `Difference: ${balance.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tfoot>
        </table>
      </div>

      {/* Attachment Section */}
      <AttachmentSection
          entityId={entityId}
          clientId={effectiveClientId as number}
          journalEntryId={effectiveJournalEntryId}
          pendingFiles={pendingFiles}
          setPendingFiles={setPendingFiles}
          pendingFilesMetadata={pendingFilesMetadata}
          setPendingFilesMetadata={setPendingFilesMetadata}
          onUploadToEntryRef={uploadPendingFilesRef}
          attachments={existingEntry?.files || []}
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
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={
              createEntry.isPending || updateEntry.isPending || isUploading
            }
            className="relative border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {(createEntry.isPending ||
              updateEntry.isPending ||
              isUploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
            )}
            {!(createEntry.isPending || updateEntry.isPending || isUploading) && (
              <>
                <Save className="mr-2 h-4 w-4 inline" />
                Save as Draft
              </>
            )}
            {(createEntry.isPending || updateEntry.isPending) && "Saving Draft..."}
            {isUploading && "Uploading Files..."}
          </Button>

          {/* Post/Submit button based on role */}
          {user?.role === "admin" ? (
            <Button
              variant="default"
              onClick={() => {
                console.log("DEBUG: Post button clicked, user is admin");
                console.log("DEBUG: existingEntry:", existingEntry);
                if (existingEntry && existingEntry.id) {
                  console.log(
                    "DEBUG: Posting existing entry with ID:",
                    existingEntry.id,
                    "clientId:", 
                    effectiveClientId,
                    "entityId:", 
                    entityId
                  );
                  
                  // Pass all required parameters to postJournalEntry (id, clientId, entityId)
                  postJournalEntry.mutate({
                    id: existingEntry.id,
                    clientId: effectiveClientId,
                    entityId: entityId
                  }, {
                    onSuccess: () => {
                      toast({
                        title: "Journal Entry Posted",
                        description: "The journal entry was successfully posted.",
                      });
                      onSubmit(); // This triggers the navigation
                    },
                    onError: (error) => {
                      toast({
                        title: "Error Posting",
                        description: `There was an error posting the entry: ${error.message}`,
                        variant: "destructive",
                      });
                    }
                  });
                } else {
                  console.log(
                    "DEBUG: Creating new entry using handleSubmit with saveAsDraft=false",
                  );

                  // Call handleSubmit with saveAsDraft=false which will handle the two-phase workflow for pending files
                  handleSubmit(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white relative"
              disabled={
                createEntry.isPending ||
                updateEntry.isPending ||
                !isBalanced ||
                isUploading
              }
              title={
                !isBalanced
                  ? "Journal entry must be balanced before posting"
                  : isUploading
                    ? "Please wait while files are uploading"
                    : pendingFiles.length > 0
                      ? "Entry will be created as draft first to allow file uploads"
                      : ""
              }
            >
              {(createEntry.isPending ||
                updateEntry.isPending ||
                isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              )}
              {!(
                createEntry.isPending ||
                updateEntry.isPending ||
                isUploading
              ) &&
                isBalanced && <Send className="mr-2 h-4 w-4 inline" />}
              {!(
                createEntry.isPending ||
                updateEntry.isPending ||
                isUploading
              ) && "Post Entry"}
              {(createEntry.isPending || updateEntry.isPending) && "Posting..."}
              {isUploading && "Uploading Files..."}
            </Button>
          ) : (
            /* Submit for Approval button - for non-admin users */
            <Button
              variant="default"
              onClick={() => {
                // For non-admin users, submit for approval (changes status to "pending_approval")
                // Use date directly from the input - already in YYYY-MM-DD format
                // No need to create a Date object which would cause timezone issues
                
                const entryData = {
                  ...journalData,
                  date: journalData.date,
                  status: JournalEntryStatus.PENDING_APPROVAL,
                };
                if (existingEntry && existingEntry.id) {
                  updateEntry.mutate({ ...entryData, id: existingEntry.id });
                } else {
                  createEntry.mutate(entryData);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white relative"
              disabled={
                createEntry.isPending ||
                updateEntry.isPending ||
                !isBalanced ||
                isUploading
              }
              title={
                !isBalanced
                  ? "Journal entry must be balanced before submitting"
                  : isUploading
                    ? "Please wait while files are uploading"
                    : ""
              }
            >
              {(createEntry.isPending ||
                updateEntry.isPending ||
                isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              )}
              {!(
                createEntry.isPending ||
                updateEntry.isPending ||
                isUploading
              ) &&
                isBalanced && <SendHorizontal className="mr-2 h-4 w-4 inline" />}
              {!(
                createEntry.isPending ||
                updateEntry.isPending ||
                isUploading
              ) && "Submit for Approval"}
              {(createEntry.isPending || updateEntry.isPending) &&
                "Submitting..."}
              {isUploading && "Uploading Files..."}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default JournalEntryForm;
