import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { JournalEntryStatus, AccountType } from '@shared/schema';
import { useJournalEntry } from '../hooks/useJournalEntry';
import { useJournalEntryFiles, useUploadJournalEntryFile, useDeleteJournalEntryFile } from '../hooks/attachmentQueries';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { toLocalYMD, formatDisplayDate } from '@/utils/dateUtils';
import { X, Plus, FileUp, AlertCircle, Loader2, CheckCircle2, Check, ChevronDown, ChevronRight, ChevronUp, 
  Upload, Trash2, Download, FileText, Paperclip, Info, FileImage, FileSpreadsheet, FileArchive, Lock, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { z } from 'zod';
import { validateForm } from '@/lib/validation';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

// Define API response interface types for better type safety
interface JournalEntryResponse {
  id?: number;
  entry?: { id: number };
  [key: string]: any;
}

// Define local Account interface compatible with the component needs
interface Account {
  id: number;
  accountCode: string;  // Use accountCode to match the server schema
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
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: number;
  uploadedAt: Date;
}

// Interface to track expanded/collapsed account states
interface ExpandedState {
  [accountId: number]: boolean;
}

interface JournalEntryFormProps {
  entityId: number;
  clientId?: number;  // Added clientId support
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
}

// Form validation schema
const FormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().min(3, "Reference must be at least 3 characters"),
  referenceNumber: z.string().optional(), // Additional reference field to match server schema
  description: z.string().min(1, "Description is required"),  // Make description required to match server validation
  journalType: z.enum(['JE', 'AJ', 'SJ', 'CL']).default('JE'),
  supDocId: z.string().optional(),
  reversalDate: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.string().min(1, "Account is required"),
    entityCode: z.string().min(1, "Entity code is required for intercompany support"),
    description: z.string().optional(),
    debit: z.string(),
    credit: z.string()
  }))
  .min(2, "Journal entry must have at least 2 lines")
  .refine(lines => {
    // Check if there's at least one debit and one credit line
    const hasDebit = lines.some(line => parseFloat(line.debit) > 0);
    const hasCredit = lines.some(line => parseFloat(line.credit) > 0);
    return hasDebit && hasCredit;
  }, {
    message: "Journal entry must have at least one debit and one credit line"
  })
  .refine(lines => {
    // Check if debits equal credits - only for submissions, not during editing
    // This makes the form more forgiving while the user is still editing
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    
    // If one of the sides is zero, then we're clearly still in the process of filling out the form
    if (totalDebit === 0 || totalCredit === 0) {
      return true; // Don't validate in mid-editing
    }
    
    return Math.abs(totalDebit - totalCredit) < 0.001;
  }, {
    message: "Total debits must equal total credits"
  })
  .refine(lines => {
    // Check if debits equal credits for each entity code (intercompany validation)
    // Make this more forgiving during editing
    const entityCodesArray = lines.map(line => line.entityCode);
    const uniqueEntityCodes = entityCodesArray.filter((code, index) => entityCodesArray.indexOf(code) === index);
    
    // If we only have one entity code, no need for intercompany validation
    if (uniqueEntityCodes.length <= 1) {
      return true;
    }
    
    // Check if any entity has both debits and credits with significant values
    const entitiesWithBalances = uniqueEntityCodes.map(entityCode => {
      const entityLines = lines.filter(line => line.entityCode === entityCode);
      const entityDebit = entityLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
      const entityCredit = entityLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
      
      return {
        entityCode,
        hasDebitAndCredit: entityDebit > 0 && entityCredit > 0,
        isBalanced: Math.abs(entityDebit - entityCredit) < 0.001
      };
    });
    
    // If any entity has both debits and credits, it should be balanced
    const entitiesRequiringBalance = entitiesWithBalances.filter(e => e.hasDebitAndCredit);
    
    if (entitiesRequiringBalance.length === 0) {
      return true; // Still in editing mode, no need to validate
    }
    
    return entitiesRequiringBalance.every(e => e.isBalanced);
  }, {
    message: "Debits must equal credits for each entity (intercompany balancing)"
  })
});

/**
 * AttachmentSection Component
 * Renders file upload, list, and management functionality for journal entries
 * @param props - The component props
 */
interface AttachmentSectionProps {
  journalEntryId: number | null | undefined;
  pendingFiles: File[];
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  pendingFilesMetadata: Array<{
    id: number;
    filename: string;
    size: number;
    mimeType: string;
    addedAt: Date;
  }>;
  setPendingFilesMetadata: React.Dispatch<React.SetStateAction<Array<{
    id: number;
    filename: string;
    size: number;
    mimeType: string;
    addedAt: Date;
  }>>>;
  // Reference to the function to upload files to a specific journal entry
  onUploadToEntryRef?: React.MutableRefObject<((entryId: number) => Promise<void>) | null>;
}

function AttachmentSection({ 
  journalEntryId, 
  pendingFiles, 
  setPendingFiles, 
  pendingFilesMetadata, 
  setPendingFilesMetadata,
  onUploadToEntryRef
}: AttachmentSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Determine if we have a numeric journal entry ID (real entry) or not
  const isExistingEntry = typeof journalEntryId === 'number';
  
  // Fetch the journal entry to check its status
  const { data: journalEntry } = useQuery({
    queryKey: isExistingEntry ? [`/api/journal-entries/${journalEntryId}`] : ['temp-entry'],
    enabled: isExistingEntry,
  });
  
  // Determine if attachments are disabled based on entry status
  const isAttachmentsDisabled = journalEntry && 
    journalEntry.status !== 'draft' && 
    journalEntry.status !== 'pending_approval';
  
  // Helper function to format bytes into readable format
  const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Helper function to get appropriate icon based on mimetype
  const getFileIcon = (mimeType: string): React.ReactNode => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      return <FileArchive className="h-4 w-4" />; 
    } else if (mimeType.includes('word') || mimeType.includes('doc')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    } else if (mimeType === 'message/rfc822' || mimeType.includes('outlook')) {
      // Handle email file formats (.eml, .msg)
      return <SendHorizontal className="h-4 w-4 text-blue-500" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };
  
  // Fetch attachments for this journal entry (only for existing entries)
  const { 
    data: attachments = [], 
    isLoading: isLoadingAttachments,
    isError: isAttachmentsError,
    error: attachmentsError
  } = useJournalEntryFiles(isExistingEntry ? journalEntryId as number : undefined);
  
  // Function to upload pending files to a specific journal entry ID
  // This function will be exposed to parent components via the ref
  const uploadPendingFilesToEntry = async (entryId: number) => {
    if (!pendingFiles || pendingFiles.length === 0) {
      console.log('DEBUG AttachmentSection: No pending files to upload');
      return; // No files to upload
    }
    
    try {
      // Create a FormData object for the upload
      const formData = new FormData();
      pendingFiles.forEach(file => {
        formData.append('files', file);
      });
      
      console.log(`DEBUG AttachmentSection: Uploading ${pendingFiles.length} pending files to journal entry ${entryId}`);
      
      // Use axios for the file upload with progress tracking
      const axios = (await import('axios')).default;
      
      // Make 3 attempts if needed
      let attempts = 0;
      let success = false;
      let lastError;
      let response;
      
      while (attempts < 3 && !success) {
        try {
          attempts++;
          console.log(`DEBUG AttachmentSection: Upload attempt ${attempts} for entry ${entryId}`);
          
          // Wait a bit before retrying (except first attempt)
          if (attempts > 1) {
            await new Promise(r => setTimeout(r, 500));
          }
          
          response = await axios.post(`/api/journal-entries/${entryId}/files`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent: any) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          });
          
          success = true;
          console.log('DEBUG AttachmentSection: Upload to entry successful:', response.data);
        } catch (error) {
          console.error(`DEBUG AttachmentSection: Upload attempt ${attempts} failed:`, error);
          lastError = error;
        }
      }
      
      if (!success) {
        throw lastError;
      }
      
      // Clear the pending files after successful upload
      setPendingFiles([]);
      setPendingFilesMetadata([]);
      
      // Reset the progress bar
      setUploadProgress(0);
      
      // Invalidate the files query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['journalEntryAttachments', entryId] });
      
      return response?.data;
    } catch (error) {
      console.error('Failed to upload pending files to entry:', error);
      throw error;
    } finally {
      setUploadProgress(0);
    }
  };
  
  // If a ref was provided, assign the upload function to it
  // This allows the parent component to call this function
  React.useEffect(() => {
    if (onUploadToEntryRef) {
      onUploadToEntryRef.current = uploadPendingFilesToEntry;
    }
    
    // Cleanup when component unmounts
    return () => {
      if (onUploadToEntryRef) {
        onUploadToEntryRef.current = null;
      }
    };
  }, [onUploadToEntryRef, pendingFiles, setPendingFiles, setPendingFilesMetadata]);
  
  // Upload file hook for direct uploads via the UI
  const uploadFileMutation = useUploadJournalEntryFile(isExistingEntry ? journalEntryId as number : undefined);
  
  // Handle local file uploads for new entries (not saved yet)
  const handleLocalFileUpload = (files: File[]) => {
    // For new entries, store files in state temporarily
    console.log('DEBUG AttachmentSection: Storing files temporarily:', files);
    
    // Create metadata for the pending files
    const newFilesMetadata = files.map((file, index) => ({
      id: Date.now() + index, // Generate a temporary ID
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      addedAt: new Date()
    }));
    
    // Add the files to our pending files state
    setPendingFiles(prevFiles => [...prevFiles, ...files]);
    setPendingFilesMetadata(prevMetadata => [...prevMetadata, ...newFilesMetadata]);
    
    // Simulate progress for better UX
    const intervalId = setInterval(() => {
      setUploadProgress(progress => {
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
        title: 'Files staged',
        description: 'Files will be attached when the journal entry is saved.',
      });
    }, 600);
  };
  
  // Delete pending file (for new entries)
  const deletePendingFile = (id: number) => {
    const fileIndex = pendingFilesMetadata.findIndex(file => file.id === id);
    if (fileIndex !== -1) {
      setPendingFilesMetadata(prev => prev.filter(file => file.id !== id));
      setPendingFiles(prev => prev.filter((_, index) => index !== fileIndex));
      
      toast({
        title: 'File removed',
        description: 'File was removed from pending uploads.',
      });
    }
  };
  
  // Delete file hook (for existing entries)
  const deleteFileMutation = useDeleteJournalEntryFile();
  
  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        // Check for duplicate files
        let duplicatesFound = false;
        const uniqueFiles = acceptedFiles.filter(newFile => {
          // Compare with existing attachments from server
          const isDuplicateWithExisting = Array.isArray(attachments) && attachments.length > 0 && 
            attachments.some(existingFile => 
              existingFile.filename === newFile.name && existingFile.size === newFile.size
            );
          
          // Compare with pending files
          const isDuplicateWithPending = Array.isArray(pendingFiles) && pendingFiles.length > 0 && 
            pendingFiles.some(pendingFile => 
            pendingFile.name === newFile.name && pendingFile.size === newFile.size
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
            description: "Some files were skipped as they appear to be duplicates of existing attachments.",
            variant: "destructive"
          });
        }
        
        // Only upload unique files if we have any
        if (uniqueFiles.length > 0) {
          if (isExistingEntry) {
            // For existing entries, use the upload hook
            uploadFileMutation.mutate({
              files: uniqueFiles,
              onProgress: setUploadProgress
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
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      // PDF
      'application/pdf': ['.pdf'],
      // Word documents
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      // Excel spreadsheets
      'application/vnd.ms-excel': ['.xls', '.csv'],  // Some browsers send Excel MIME for CSV
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      // Text files
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      // Email formats
      'message/rfc822': ['.eml'],  // RFC-822 email format
      'application/vnd.ms-outlook': ['.msg'],  // Outlook messages
      // Archives
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    disabled: uploadFileMutation.isPending || isAttachmentsDisabled
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
            uploadFileMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          
          {false ? ( /* We're now using tempJournalEntryId so this condition is always false */
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Save the journal entry as draft first to enable file uploads</p>
              <Button variant="outline" size="sm" disabled className="pointer-events-none">
                <FileUp className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
            </div>
          ) : uploadFileMutation.isPending ? (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Uploading files...</p>
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
              <p className="text-sm text-muted-foreground mb-2">Files can't be added once the entry is posted</p>
              <p className="text-xs text-muted-foreground">
                Create a reversal or new draft if you need to add files
              </p>
            </div>
          ) : (
            <div className="text-center">
              <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Drag and drop files here, or click to select files</p>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), CSV, Images, Email (.eml), etc. (Max 10MB per file)
              </p>
            </div>
          )}
        </div>
        
        {/* Attachments List */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Attached Files</h4>
          
          {isLoadingAttachments ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isAttachmentsError && isExistingEntry ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {(attachmentsError as Error)?.message || 'Failed to load attachments'}
              </AlertDescription>
            </Alert>
          ) : (!Array.isArray(attachments) || attachments.length === 0) && pendingFilesMetadata.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No files attached yet</p>
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
                  {/* Pending files (for new entries) */}
                  {pendingFilesMetadata.map((file) => (
                    <TableRow key={`pending-${file.id}`}>
                      <TableCell className="flex items-center">
                        {getFileIcon(file.mimeType)}
                        <span className="ml-2 truncate max-w-[150px]" title={file.filename}>
                          {file.filename}
                        </span>
                      </TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <span className="text-amber-500 bg-amber-50 text-xs px-2 py-1 rounded-full font-medium mr-2">Pending</span>
                            {new Date(file.addedAt).toLocaleTimeString()}
                          </div>
                          {uploadFileMutation.isPending && (
                            <div className="w-full">
                              <Progress value={uploadProgress} className="h-1" />
                              <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
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
                                  onClick={() => deletePendingFile(file.id)}
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
                  
                  {/* Existing files (for saved entries) */}
                  {Array.isArray(attachments) && attachments.map((file: JournalEntryFile) => (
                    <TableRow key={file.id}>
                      <TableCell className="flex items-center">
                        {getFileIcon(file.mimeType)}
                        <span className="ml-2 truncate max-w-[150px]" title={file.filename}>{file.filename}</span>
                      </TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-green-500 bg-green-50 text-xs px-2 py-1 rounded-full font-medium mr-2">Uploaded</span>
                          {new Date(file.uploadedAt).toLocaleDateString()}
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
                                  onClick={() => window.open(`/api/journal-entries/${journalEntryId}/files/${file.id}/download`, '_blank')}
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
                                  onClick={() => deleteFileMutation.mutate({
                                    journalEntryId: journalEntryId as number,
                                    fileId: file.id
                                  })}
                                  disabled={deleteFileMutation.isPending || isAttachmentsDisabled}
                                >
                                  {deleteFileMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isAttachmentsDisabled ? (
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
function JournalEntryForm({ entityId, clientId, accounts, locations = [], entities = [], onSubmit, onCancel, existingEntry }: JournalEntryFormProps) {
  // Properly initialize the hook at the component level, not in the event handler
  const { postJournalEntry } = useJournalEntry();
  
  // Generate a temporary UUID for new entries to use with attachments before saving
  const [tempJournalEntryId] = useState(uuidv4());
  // This ID is used for both existing entries and new entries with temporary IDs
  const effectiveJournalEntryId = existingEntry?.id ?? tempJournalEntryId;
  
  // State for pending file attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingFilesMetadata, setPendingFilesMetadata] = useState<{
    id: number;
    filename: string;
    size: number;
    mimeType: string;
    addedAt: Date;
  }[]>([]);
  
  // Ref to hold the function to upload pending files to a specific journal entry
  // This will be passed to and set by the AttachmentSection component
  const uploadPendingFilesRef = useRef<((entryId: number) => Promise<void>) | null>(null);
  
  // Helper function definitions - declaring before they're used
  // Function to unformat number (remove commas) for processing
  const unformatNumber = (value: string) => {
    return value?.replace(/,/g, '') || '';
  };
  
  // Function to format number with thousands separators
  const formatNumberWithSeparator = (value: string) => {
    // Remove all commas first
    const numWithoutCommas = value.replace(/,/g, '');
    
    // Check if it's a valid number format
    if (numWithoutCommas === '' || /^\d*\.?\d{0,2}$/.test(numWithoutCommas)) {
      // If it has a decimal part
      if (numWithoutCommas.includes('.')) {
        const [wholePart, decimalPart] = numWithoutCommas.split('.');
        // Format whole part with commas and add back decimal part
        return wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decimalPart;
      } else {
        // Format number without decimal part
        return numWithoutCommas.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
    }
    
    // If not a valid number format, return as is
    return value;
  };
  console.log('DEBUG JournalEntryForm - received accounts:', accounts);
  console.log('DEBUG JournalEntryForm - accounts length:', accounts?.length || 0);
  console.log('DEBUG JournalEntryForm - accounts first item:', accounts?.length > 0 ? accounts[0] : 'no accounts');
  console.log('DEBUG JournalEntryForm - clientId:', clientId);
  console.log('DEBUG JournalEntryForm - entityId:', entityId);
  
  // Debug logs for existingEntry
  console.log('DEBUG JournalEntryForm - existingEntry:', existingEntry ? 'YES' : 'NO');
  if (existingEntry) {
    console.log('DEBUG JournalEntryForm - existingEntry ID:', existingEntry.id);
    console.log('DEBUG JournalEntryForm - existingEntry status:', existingEntry.status);
    console.log('DEBUG JournalEntryForm - existingEntry lines count:', existingEntry.lines?.length || 0);
    console.log('DEBUG JournalEntryForm - existingEntry first line format:', 
      existingEntry.lines?.[0] ? JSON.stringify(existingEntry.lines[0], null, 2) : 'No lines');
  }
  
  // Log the structure of account items, which helps diagnose render issues
  if (accounts?.length > 0) {
    console.log('DEBUG JournalEntryForm - account item structure:', 
      Object.keys(accounts[0]).map(key => `${key}: ${typeof accounts[0][key]}`).join(', '));
  }
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing] = useState(!!existingEntry);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  const [journalData, setJournalData] = useState({
    reference: existingEntry?.reference || generateReference(),
    referenceNumber: existingEntry?.referenceNumber || '',  // Use referenceNumber to match server schema
    date: existingEntry?.date ? toLocalYMD(existingEntry.date) : toLocalYMD(new Date()),
    description: existingEntry?.description || '',
    status: existingEntry?.status || JournalEntryStatus.DRAFT,
    journalType: existingEntry?.journalType || 'JE',
    supDocId: existingEntry?.supDocId || '',
    reversalDate: existingEntry?.reversalDate ? toLocalYMD(existingEntry.reversalDate) : '',
  });
  
  // Get default entity code from entities list based on current entityId
  const defaultEntityCode = React.useMemo(() => {
    if (entities && entities.length > 0) {
      const currentEntity = entities.find(entity => entity.id === entityId);
      return currentEntity ? currentEntity.code : '';
    }
    return '';
  }, [entities, entityId]);

  const [lines, setLines] = useState<JournalLine[]>(
    existingEntry?.lines || [
      { accountId: '', entityCode: defaultEntityCode, description: '', debit: '', credit: '' },
      { accountId: '', entityCode: defaultEntityCode, description: '', debit: '', credit: '' }
    ]
  );
  
  // Removed supportingDoc state as we're using the AttachmentSection component now
  
  // Track expanded/collapsed state of parent accounts
  const initializeExpandedState = () => {
    const initialState: ExpandedState = {};
    accounts.forEach(account => {
      if (account.isSubledger === false && account.parentId === null) {
        initialState[account.id] = false; // Start with all parent accounts collapsed
      }
    });
    return initialState;
  };
  
  const [expandedAccounts, setExpandedAccounts] = useState<ExpandedState>(initializeExpandedState);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Calculate totals - memoized to avoid recalculation on every render
  const { totalDebit, totalCredit, difference, isBalanced } = useMemo(() => {
    // First remove commas from numeric values
    const totalDebit = lines.reduce((sum, line) => {
      const debitValue = parseFloat(unformatNumber(line.debit)) || 0;
      return sum + debitValue;
    }, 0);
    
    const totalCredit = lines.reduce((sum, line) => {
      const creditValue = parseFloat(unformatNumber(line.credit)) || 0;
      return sum + creditValue;
    }, 0);
    
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.001;
    
    return { totalDebit, totalCredit, difference, isBalanced };
  }, [lines]); // Only recalculate when lines change
  
  // Calculate entity balances for intercompany validation - memoized
  const getEntityBalances = useCallback(() => {
    // Get unique entity codes without using Set
    const entityCodesArray = lines.map(line => line.entityCode);
    const uniqueEntityCodes = entityCodesArray.filter((code, index) => entityCodesArray.indexOf(code) === index);
    
    return uniqueEntityCodes.map(code => {
      const entityLines = lines.filter(line => line.entityCode === code);
      const entityDebit = entityLines.reduce((sum, line) => {
        const debitValue = parseFloat(unformatNumber(line.debit)) || 0;
        return sum + debitValue;
      }, 0);
      const entityCredit = entityLines.reduce((sum, line) => {
        const creditValue = parseFloat(unformatNumber(line.credit)) || 0;
        return sum + creditValue;
      }, 0);
      const entityDifference = Math.abs(entityDebit - entityCredit);
      const entityBalanced = entityDifference < 0.001;
      
      return {
        entityCode: code,
        debit: entityDebit,
        credit: entityCredit,
        difference: entityDifference,
        balanced: entityBalanced
      };
    });
  }, [lines]); // Only recalculate when lines change
  
  // Memoize entity balances result
  const entityBalances = useMemo(() => getEntityBalances(), [getEntityBalances]);
  
  function generateReference() {
    const date = new Date();
    const year = date.getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
    return `JE-${year}-${randomNum}`;
  }
  
  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      console.log('Journal entry submission data:', JSON.stringify(data));
      // Ensure the status is properly set in the mutation data
      console.log('DEBUG: Creating entry with status:', data.status);
      
      // Validate required fields explicitly
      if (!data.date) {
        throw new Error('Date is required');
      }
      if (!data.description) {
        throw new Error('Description is required');
      }
      if (!data.reference) {
        throw new Error('Reference is required');
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
      
      return await apiRequest(
        `/api/journal-entries`,
        {
          method: "POST",
          data: apiPayload
        }
      );
    },
    onSuccess: async (result: JournalEntryResponse) => {
      // Get the newly created journal entry ID from the response
      // The result might be wrapped in an object or be the entry itself
      const newJournalEntryId = result?.id || (result?.entry && result.entry.id);
      
      console.log('DEBUG: New journal entry created with ID:', newJournalEntryId, 'Response:', JSON.stringify(result, null, 2));
      
      // EXPLICITLY ensure we have a valid journal entry ID before proceeding
      if (!newJournalEntryId) {
        console.error('ERROR: Failed to extract journal entry ID from API response');
        toast({
          title: "Warning",
          description: "Journal entry was created but there was an issue attaching files.",
          variant: "destructive"
        });
        
        // Even if there's an error, we should continue with the workflow
        queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
        queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/general-ledger`] });
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
      
      // Upload pending files if there are any and we have a valid journal entry ID
      // EXPLICITLY wait for file uploads to complete before proceeding
      if (hasAttachments && uploadPendingFilesRef.current) {
        try {
          console.log(`DEBUG: Attempting to upload ${pendingFiles.length} files to journal entry ${newJournalEntryId}`);
          
          // EXPLICITLY set loading state for file uploads
          setIsUploading(true);
          
          // EXPLICITLY use the function from the AttachmentSection via ref to upload files
          // EXPLICITLY await this to ensure files are uploaded before proceeding
          await uploadPendingFilesRef.current(newJournalEntryId);
          
          console.log('DEBUG: Uploaded pending files successfully to new journal entry');
          
          // EXPLICITLY invalidate the journal entry query to refresh attachments
          queryClient.invalidateQueries({ queryKey: [`/api/journal-entries/${newJournalEntryId}`] });
          
          toast({
            title: "Files attached",
            description: `${pendingFiles.length} file(s) were attached to the journal entry.`,
          });
        } catch (fileError) {
          console.error('Failed to upload pending files:', fileError);
          toast({
            title: "Note about files",
            description: "Journal entry created, but some files could not be attached. Please try uploading them again.",
            variant: "destructive"
          });
        } finally {
          // EXPLICITLY clear loading state
          setIsUploading(false);
        }
      }
      
      toast({
        title: "Journal entry created",
        description: "The journal entry has been created successfully.",
      });
      
      // Clear pending files after successful upload or if there were none
      setPendingFiles([]);
      setPendingFilesMetadata([]);
      
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/general-ledger`] });
      onSubmit();
    },
    onError: (error: any) => {
      // Handle structured API errors
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        
        // Format field errors from API
        const formattedErrors: Record<string, string> = {};
        
        apiErrors.forEach((err: any) => {
          const path = err.path.split('.');
          
          // Handle array paths like lines[0].accountId
          if (path[0] === 'lines' && path.length > 1) {
            const match = path[1].match(/\[(\d+)\]/);
            if (match) {
              const lineIndex = parseInt(match[1]);
              const fieldName = path[2] || 'field';
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
        setFormError(error.message || "An error occurred while creating the journal entry.");
      }
    }
  });
  
  const updateEntry = useMutation({
    mutationFn: async (data: any) => {
      console.log('DEBUG: Journal entry update - ID:', existingEntry?.id);
      console.log('DEBUG: Journal entry update - Status:', existingEntry?.status);
      console.log('DEBUG: Journal entry update data:', JSON.stringify(data, null, 2));
      
      // Validate required fields explicitly
      if (!data.date) {
        throw new Error('Date is required');
      }
      if (!data.description) {
        throw new Error('Description is required');
      }
      if (!data.reference) {
        throw new Error('Reference is required');
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
      
      // We explicitly use the entry ID for the update operation
      return await apiRequest(
        `/api/journal-entries/${existingEntry.id}`,
        {
          method: "PUT",
          data: apiPayload
        }
      );
    },
    onSuccess: async (response: JournalEntryResponse) => {
      console.log('DEBUG: Journal entry update success response:', JSON.stringify(response, null, 2));
      
      // Determine the entry ID from the response or use the existing entry ID
      const entryId = response?.id || (response?.entry && response.entry.id) || existingEntry?.id;
      
      // EXPLICITLY ensure we have a valid journal entry ID before proceeding
      if (!entryId) {
        console.error('ERROR: Failed to determine valid journal entry ID for file uploads');
        toast({
          title: "Warning",
          description: "Journal entry was updated but file attachment may not work properly.",
          variant: "destructive"
        });
        
        // Even if there's an error, we should continue with the workflow
        queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
        queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/general-ledger`] });
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
          console.log(`DEBUG: Attempting to upload ${pendingFiles.length} files to updated journal entry ${entryId}`);
          
          // EXPLICITLY set loading state for file uploads
          setIsUploading(true);
          
          // EXPLICITLY use the function from the AttachmentSection via ref to upload files
          // EXPLICITLY await this to ensure files are uploaded before proceeding
          await uploadPendingFilesRef.current(entryId);
          
          console.log('DEBUG: Uploaded pending files to existing entry successfully');
          
          // EXPLICITLY invalidate the journal entry query to refresh attachments
          queryClient.invalidateQueries({ queryKey: [`/api/journal-entries/${entryId}`] });
          
          toast({
            title: "Files attached",
            description: `${pendingFiles.length} file(s) were attached to the journal entry.`,
          });
        } catch (fileError) {
          console.error('Failed to upload pending files:', fileError);
          toast({
            title: "Note about files",
            description: "Journal entry updated, but some files could not be attached. Please try uploading them again.",
            variant: "destructive"
          });
        } finally {
          // EXPLICITLY clear loading state
          setIsUploading(false);
        }
      } else {
        console.log('DEBUG: No pending files to upload or missing ref/journalEntryId', {
          pendingFilesCount: pendingFiles?.length || 0,
          hasEntryId: !!entryId,
          existingEntryId: existingEntry?.id,
          hasUploadRef: !!uploadPendingFilesRef.current
        });
      }
      
      toast({
        title: "Journal entry updated",
        description: "The journal entry has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/general-ledger`] });
      onSubmit();
    },
    onError: (error: any) => {
      console.log('DEBUG: Journal entry update error:', error);
      console.log('DEBUG: Journal entry update error response:', error.response?.data);
      console.log('DEBUG: Journal entry update error status:', error.response?.status);
      
      // Similar error handling as in createEntry
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        console.log('DEBUG: Journal entry update API errors:', JSON.stringify(apiErrors, null, 2));
        
        const formattedErrors: Record<string, string> = {};
        
        apiErrors.forEach((err: any) => {
          const path = err.path.split('.');
          if (path[0] === 'lines' && path.length > 1) {
            const match = path[1].match(/\[(\d+)\]/);
            if (match) {
              const lineIndex = parseInt(match[1]);
              const fieldName = path[2] || 'field';
              formattedErrors[`line_${lineIndex}_${fieldName}`] = err.message;
            }
          } else {
            formattedErrors[path[0]] = err.message;
          }
        });
        
        setFieldErrors(formattedErrors);
        setFormError("Please correct the errors in the form.");
      } else if (error.response?.data?.message) {
        console.log('DEBUG: Journal entry update error message:', error.response.data.message);
        
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
        setFormError(error.message || "An error occurred while updating the journal entry.");
      }
    }
  });

  const handleSubmit = (saveAsDraft: boolean = true) => {
    console.log('DEBUG: handleSubmit called with saveAsDraft =', saveAsDraft);
    
    // Verify and log attachment status for debugging
    logAttachmentStatus();
    
    // Clear previous errors
    setFormError(null);
    setFieldErrors({});
    
    // Prepare data for validation - only keep lines with account or debit/credit values
    const validLines = lines.filter(line => 
      line.accountId || parseFloat(unformatNumber(line.debit)) > 0 || parseFloat(unformatNumber(line.credit)) > 0
    );
    
    // Check if we need special handling for file attachments
    const hasPendingAttachments = pendingFiles.length > 0;
    console.log('DEBUG: Pending attachments:', pendingFiles.length);
    
    // Determine the initial status - if we're posting with files, start as draft
    const initialStatus = (!saveAsDraft && hasPendingAttachments) 
      ? JournalEntryStatus.DRAFT // Create as draft initially if posting with attachments
      : (saveAsDraft ? JournalEntryStatus.DRAFT : JournalEntryStatus.POSTED);
    
    const formData = {
      ...journalData,
      lines: validLines,
      // Set the appropriate status based on our decision logic
      status: initialStatus
    };
    
    console.log('DEBUG: Form data with initial status:', formData.status);
    console.log('DEBUG: Will post after uploads complete:', !saveAsDraft && hasPendingAttachments);
    
    // Only validate fully if we're not saving as draft (final intended state)
    if (!saveAsDraft) {
      // Full validation for posting
      const validation = validateForm(formData, FormSchema);
      
      if (!validation.valid) {
        setFieldErrors(validation.errors || {});
        setFormError("Please correct the errors in the form before posting.");
        return;
      }
    } else {
      // Lighter validation for drafts - just check required fields
      if (!journalData.date || !journalData.description) {
        const errors: Record<string, string> = {};
        if (!journalData.date) errors['date'] = 'Date is required';
        if (!journalData.description) errors['description'] = 'Description is required';
        
        setFieldErrors(errors);
        setFormError("Please fill in the required basic information.");
        return;
      }
      
      // Ensure there's at least one line with an account
      if (validLines.length === 0 || !validLines.some(line => line.accountId)) {
        setFormError("Please add at least one valid line with an account.");
        return;
      }
    }
    
    // Format data for submission - convert debit/credit format to type/amount format
    const formattedLines = validLines.map(line => {
      // Calculate amount and determine type - first remove any commas
      const debitValueStr = unformatNumber(line.debit);
      const creditValueStr = unformatNumber(line.credit);
      
      // Parse as floats
      const debitValue = parseFloat(debitValueStr) || 0;
      const creditValue = parseFloat(creditValueStr) || 0;
      
      // Convert our UI format (debit/credit fields) to API format (type and amount)
      return {
        accountId: parseInt(line.accountId),
        entityCode: line.entityCode || defaultEntityCode,
        description: line.description,
        // Determine line type and amount based on which field has a value
        type: debitValue > 0 ? 'debit' : 'credit',
        amount: debitValue > 0 ? debitValue : creditValue,
        entityId
      };
    });
    
    // Use passed clientId or get from accounts as fallback
    const resolvedClientId = clientId || (accounts.length > 0 ? accounts[0].clientId : null);
    
    if (!resolvedClientId) {
      setFormError("Error: Unable to determine client ID. Please refresh the page and try again.");
      return;
    }
    
    const entryData = {
      ...journalData,
      clientId: resolvedClientId,
      entityId,
      status: initialStatus, // Use our determined initial status
      createdBy: user?.id,
      lines: formattedLines
    };
    
    // Debug logging for the API payload
    console.log('DEBUG: API Payload to be sent:', JSON.stringify(entryData, null, 2));
    
    if (isEditing) {
      // For existing entries, no need for special attachment handling
      updateEntry.mutate(entryData);
    } else {
      // For new entries
      // If we have pending attachments AND we want to post (not save as draft)
      if (hasPendingAttachments && !saveAsDraft) {
        // First create as draft
        setIsUploading(true);
        createEntry.mutate(entryData, {
          onSuccess: async (result) => {
            // Extract the new entry ID
            const newEntryId = result?.id || (result?.entry && result.entry.id);
            
            if (!newEntryId) {
              toast({
                title: "Error",
                description: "Failed to extract entry ID from server response",
                variant: "destructive"
              });
              onSubmit(); // Still call onSubmit to navigate away
              return;
            }
            
            console.log('DEBUG: Created draft entry, now uploading files to ID:', newEntryId);
            
            // Show a toast to inform user
            toast({
              title: "Uploading attachments",
              description: `Uploading ${pendingFiles.length} file(s) before posting...`,
            });
            
            try {
              // Upload the pending files
              if (uploadPendingFilesRef.current) {
                await uploadPendingFilesRef.current(newEntryId);
                console.log('DEBUG: File uploads complete, now updating status to POSTED');
                
                // Update the entry status to POSTED after successful upload
                updateEntry.mutate({
                  ...entryData,
                  id: newEntryId,
                  status: JournalEntryStatus.POSTED
                }, {
                  onSuccess: () => {
                    toast({
                      title: "Success",
                      description: "Journal entry posted with attachments",
                    });
                    onSubmit(); // Navigate away
                  },
                  onError: (error) => {
                    console.error('Failed to update entry status to POSTED:', error);
                    toast({
                      title: "Warning",
                      description: "Files uploaded but entry remained in draft state. You can post it manually.",
                      variant: "destructive"
                    });
                    onSubmit(); // Still navigate away
                  }
                });
              } else {
                console.error('uploadPendingFilesRef.current is not defined');
                toast({
                  title: "Warning",
                  description: "Entry created but could not upload files. You may need to attach them manually.",
                  variant: "destructive"
                });
                onSubmit(); // Still navigate away
              }
            } catch (error) {
              console.error('Failed to upload files:', error);
              toast({
                title: "Warning",
                description: "Entry created as draft but file upload failed. Please try posting it manually.",
                variant: "destructive"
              });
              onSubmit(); // Still navigate away
            } finally {
              setIsUploading(false);
            }
          },
          onError: (error) => {
            console.error('Failed to create journal entry:', error);
            setIsUploading(false);
            toast({
              title: "Error",
              description: "Failed to create journal entry",
              variant: "destructive"
            });
          }
        });
      } else {
        // Standard flow - no pending attachments or just saving as draft
        createEntry.mutate(entryData);
      }
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJournalData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user changes the value
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  // These functions are now defined at the top of the component

  // Regular handleLineChange for non-numeric fields
  const handleLineChange = (index: number, field: string, value: string) => {
    // For debit/credit fields, apply special handling
    if (field === 'debit' || field === 'credit') {
      // Remove commas for validation
      const numericValue = unformatNumber(value);
      
      // Only process valid numeric inputs or empty string
      if (numericValue === '' || /^\d*\.?\d{0,2}$/.test(numericValue)) {
        const updatedLines = [...lines];
        
        // Format the value with commas for display
        const formattedValue = numericValue === '' ? '' : formatNumberWithSeparator(numericValue);
        
        // Set the current field value
        updatedLines[index] = { ...updatedLines[index], [field]: formattedValue };
        
        // Clear the opposite field if this field has a value > 0
        if (parseFloat(numericValue) > 0) {
          const oppositeField = field === 'debit' ? 'credit' : 'debit';
          updatedLines[index][oppositeField] = '';
        }
        
        // Update lines state directly, no debounce
        setLines(updatedLines);
        
        // Clear field error when user changes the value
        const errorKey = `line_${index}_${field}`;
        if (fieldErrors[errorKey]) {
          setFieldErrors(prev => {
            const updated = { ...prev };
            delete updated[errorKey];
            return updated;
          });
        }
      }
    } else {
      // For non-numeric fields, update immediately
      const updatedLines = [...lines];
      updatedLines[index] = { ...updatedLines[index], [field]: value };
      setLines(updatedLines);
      
      // Clear field error when user changes the value
      const errorKey = `line_${index}_${field}`;
      if (fieldErrors[errorKey]) {
        setFieldErrors(prev => {
          const updated = { ...prev };
          delete updated[errorKey];
          return updated;
        });
      }
    }
  };
  
  // Create a debounced version of line change handler for numeric fields (debit/credit)
  const handleDebouncedLineChange = useDebouncedCallback((index: number, field: string, value: string) => {
    // Remove commas for processing
    const numericValue = unformatNumber(value);
    
    const updatedLines = [...lines];
    
    // Format the value with commas for display
    const formattedValue = numericValue === '' ? '' : formatNumberWithSeparator(numericValue);
    
    updatedLines[index] = { ...updatedLines[index], [field]: formattedValue };
    
    // If setting debit and it's positive, clear credit
    if (field === 'debit' && parseFloat(numericValue) > 0) {
      updatedLines[index].credit = '';
    }
    
    // If setting credit and it's positive, clear debit
    if (field === 'credit' && parseFloat(numericValue) > 0) {
      updatedLines[index].debit = '';
    }
    
    setLines(updatedLines);
    
    // Clear field error when user changes the value
    const errorKey = `line_${index}_${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[errorKey];
        return updated;
      });
    }
  }, 300); // 300ms debounce delay
  
  // Utility function for testing file attachments - logs state of pending files
  const logAttachmentStatus = () => {
    console.log('ATTACHMENT DEBUG: Current state of file attachments');
    console.log('- Pending files count:', pendingFiles?.length || 0);
    console.log('- Pending files metadata count:', pendingFilesMetadata?.length || 0);
    console.log('- Upload ref exists:', !!uploadPendingFilesRef.current);
    console.log('- Is editing entry:', isEditing);
    console.log('- Has existing entry ID:', !!existingEntry?.id);
    
    // Log each pending file if any
    if (pendingFiles?.length) {
      console.log('- Pending files:', pendingFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      })));
    }
    
    return true;
  };
  
  const addLine = () => {
    setLines([...lines, { accountId: '', entityCode: defaultEntityCode, description: '', debit: '', credit: '' }]);
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
    Object.keys(updatedErrors).forEach(key => {
      if (key.startsWith(`line_${index}_`)) {
        delete updatedErrors[key];
      }
      
      // Reindex higher indexed errors
      for (let i = index + 1; i < lines.length; i++) {
        const oldKey = `line_${i}_`;
        const newKey = `line_${i-1}_`;
        
        Object.keys(updatedErrors).forEach(errKey => {
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
          {isEditing ? 'Edit Journal Entry' : 'Manual Journal Entry'}
        </h3>
        
        {/* Balance status indicator */}
        <div className={`px-3 py-1 rounded-md inline-flex items-center text-sm
          ${isBalanced 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
          {isBalanced 
            ? <CheckCircle2 className="h-4 w-4 mr-1" /> 
            : <AlertCircle className="h-4 w-4 mr-1" />}
          {isBalanced 
            ? 'Balanced' 
            : `Unbalanced (${difference.toFixed(2)})`}
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
            {createEntry.isPending ? 'Creating journal entry...' : 'Updating journal entry...'}
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
              className={`mt-1 ${fieldErrors.reference ? 'border-red-500 pr-10' : ''}`}
              readOnly
            />
            {fieldErrors.reference && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1 pointer-events-none">
                <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
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
              className={`mt-1 ${fieldErrors.date ? 'border-red-500 pr-10' : ''}`}
            />
            {fieldErrors.date && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1 pointer-events-none">
                <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
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
          <Label htmlFor="reference-number">Reference</Label>
          <Input
            id="reference-number"
            name="referenceNumber"
            value={journalData.referenceNumber}
            onChange={handleChange}
            placeholder="Invoice #, Check #, etc."
            className="mt-1"
          />
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
            className={`mt-1 ${fieldErrors.description ? 'border-red-500 pr-10' : ''}`}
          />
          {fieldErrors.description && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity Code</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
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
                    <Popover onOpenChange={(open) => {
                        // Reset expanded state and search query when dropdown is closed
                        if (!open) {
                          setExpandedAccounts(initializeExpandedState());
                          setSearchQuery(""); // Clear search query
                        }
                      }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={`w-full justify-between ${fieldErrors[`line_${index}_accountId`] ? 'border-red-500' : ''}`}
                        >
                          {line.accountId && accounts.some(account => account.id.toString() === line.accountId)
                            ? `${accounts.find(account => account.id.toString() === line.accountId)?.accountCode} - ${accounts.find(account => account.id.toString() === line.accountId)?.name}`
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
                                const matchingAccounts = accounts.filter(account => 
                                  `${account.accountCode} ${account.name}`.toLowerCase().includes(lowerQuery)
                                );
                                
                                // Get IDs of parent accounts whose children match the query
                                const parentIdsToExpand = new Set<number>();
                                
                                // Find parents that need to be expanded
                                matchingAccounts.forEach(account => {
                                  if (account.parentId) {
                                    parentIdsToExpand.add(account.parentId);
                                    
                                    // Also try to find grandparents (for deep hierarchies)
                                    let currentParentId = account.parentId;
                                    while (currentParentId) {
                                      const parent = accounts.find(a => a.id === currentParentId);
                                      if (parent?.parentId) {
                                        parentIdsToExpand.add(parent.parentId);
                                        currentParentId = parent.parentId;
                                      } else {
                                        break;
                                      }
                                    }
                                  }
                                });
                                
                                // Expand these parents if they're not already expanded
                                if (parentIdsToExpand.size > 0) {
                                  setExpandedAccounts(prev => {
                                    const newState = { ...prev };
                                    parentIdsToExpand.forEach(id => {
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
                                const activeAccounts = accounts.filter(account => account.active);
                                
                                // Step 2: First organize accounts by type
                                const typeOrder: Record<string, number> = {
                                  'asset': 1,
                                  'assets': 1,
                                  'liability': 2,
                                  'liabilities': 2,
                                  'equity': 3,
                                  'revenue': 4,
                                  'expense': 5,
                                  'expenses': 5
                                };
                                
                                // Step 3: Create a tree structure to maintain the hierarchy
                                type AccountNode = {
                                  account: Account;
                                  children: AccountNode[];
                                };
                                
                                // Step 4: Group accounts by type
                                const accountsByType: Record<string, Account[]> = {};
                                
                                activeAccounts.forEach(account => {
                                  const type = account.type.toLowerCase();
                                  if (!accountsByType[type]) {
                                    accountsByType[type] = [];
                                  }
                                  accountsByType[type].push(account);
                                });
                                
                                // Step 5: For each type, build hierarchical trees
                                const forestByType: Record<string, AccountNode[]> = {};
                                
                                Object.keys(accountsByType).forEach(type => {
                                  const accountsOfType = accountsByType[type];
                                  
                                  // Create lookup maps
                                  const accountMap = new Map<number, Account>();
                                  const nodeMap = new Map<number, AccountNode>();
                                  
                                  // Fill the maps
                                  accountsOfType.forEach(account => {
                                    accountMap.set(account.id, account);
                                    nodeMap.set(account.id, { 
                                      account, 
                                      children: [] 
                                    });
                                  });
                                  
                                  // Build the forest (multiple trees)
                                  const forest: AccountNode[] = [];
                                  
                                  // Connect parents to children
                                  accountsOfType.forEach(account => {
                                    const node = nodeMap.get(account.id)!;
                                    
                                    if (account.parentId && nodeMap.has(account.parentId)) {
                                      // This is a child node, add it to its parent
                                      const parentNode = nodeMap.get(account.parentId)!;
                                      parentNode.children.push(node);
                                    } else {
                                      // This is a root node (no parent or parent not in this type)
                                      forest.push(node);
                                    }
                                  });
                                  
                                  // Sort each level by account code
                                  const sortByCode = (nodes: AccountNode[]) => {
                                    nodes.sort((a, b) => {
                                      const aCode = parseInt(a.account.accountCode.replace(/\D/g, '')) || 0;
                                      const bCode = parseInt(b.account.accountCode.replace(/\D/g, '')) || 0;
                                      return aCode - bCode;
                                    });
                                    
                                    // Sort children recursively
                                    nodes.forEach(node => {
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
                                  node.children.forEach(child => flattenTree(child));
                                };
                                
                                // Process each type in the correct order
                                Object.keys(typeOrder)
                                  .sort((a, b) => typeOrder[a] - typeOrder[b])
                                  .forEach(type => {
                                    if (forestByType[type]) {
                                      forestByType[type].forEach(rootNode => flattenTree(rootNode));
                                    }
                                  });
                                
                                // Handle any other types not in the predefined order
                                Object.keys(forestByType)
                                  .filter(type => !(type in typeOrder))
                                  .forEach(type => {
                                    forestByType[type].forEach(rootNode => flattenTree(rootNode));
                                  });
                                
                                return flattenedAccounts;
                              })()
                                .map((account) => {
                                  // Determine if this is a parent account (has children accounts)
                                  const isParent = accounts.some(childAccount => 
                                    childAccount.parentId === account.id
                                  );
                                  
                                  // Determine nesting level by checking if it has a parent
                                  const hasParent = account.parentId !== null && account.parentId !== undefined;
                                  
                                  return (
                                    <CommandItem
                                      key={account.id}
                                      value={`${account.accountCode} ${account.name}`}
                                      onSelect={() => {
                                        // For parent accounts, toggle expand/collapse
                                        if (isParent) {
                                          setExpandedAccounts(prev => {
                                            if (prev[account.id]) {
                                              // If collapsing, we need to recursively collapse all children
                                              const newState = { ...prev, [account.id]: false };
                                              
                                              // Find and collapse all child accounts
                                              const collapseChildren = (parentId: number) => {
                                                accounts.forEach(childAccount => {
                                                  if (childAccount.parentId === parentId) {
                                                    // Collapse this child
                                                    newState[childAccount.id] = false;
                                                    
                                                    // If this child is also a parent, collapse its children
                                                    if (accounts.some(acc => acc.parentId === childAccount.id)) {
                                                      collapseChildren(childAccount.id);
                                                    }
                                                  }
                                                });
                                              };
                                              
                                              collapseChildren(account.id);
                                              return newState;
                                            } else {
                                              // Simply expand this parent
                                              return {
                                                ...prev,
                                                [account.id]: true
                                              };
                                            }
                                          });
                                        } else {
                                          // For regular accounts, select them
                                          handleLineChange(index, 'accountId', account.id.toString());
                                        }
                                      }}
                                      className={cn(
                                        "cursor-pointer",
                                        isParent ? "font-semibold opacity-70" : "",
                                        // Hide child accounts when parent is collapsed, but not when searching
                                        hasParent && !expandedAccounts[account.parentId || 0] && !searchQuery ? "hidden" : "",
                                        // Add left padding for child accounts
                                        hasParent ? "pl-6" : "", 
                                        // Apply account type styling if available
                                        account.type ? `account-type-${account.type.toLowerCase().replace(/\s+/g, '-')}` : ""
                                      )}
                                    >
                                      {isParent ? (
                                        expandedAccounts[account.id] ? 
                                          <ChevronDown className="mr-2 h-4 w-4 text-muted-foreground" /> : 
                                          <ChevronRight className="mr-2 h-4 w-4 text-muted-foreground" />
                                      ) : hasParent ? (
                                        <span className="w-4 h-4 inline-block mr-2"></span>
                                      ) : (
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            line.accountId === account.id.toString() ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      )}
                                      <span className={cn(
                                        isParent ? "font-medium" : hasParent ? "" : "font-medium"
                                      )}>
                                        {account.accountCode}
                                      </span> - {account.name}
                                      {!hasParent && account.type && (
                                        <span className="ml-2 text-xs text-gray-500">{account.type}</span>
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
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_accountId`]}</p>
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
                          className={`w-full justify-between ${fieldErrors[`line_${index}_entityCode`] ? 'border-red-500' : ''}`}
                        >
                          {line.entityCode && entities.some(entity => entity.code === line.entityCode)
                            ? `${line.entityCode} - ${entities.find(entity => entity.code === line.entityCode)?.name}`
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
                                .filter(entity => entity.active)
                                .sort((a, b) => a.code.localeCompare(b.code))
                                .map(entity => (
                                  <CommandItem
                                    key={entity.id}
                                    value={`${entity.code} ${entity.name}`}
                                    onSelect={() => {
                                      handleLineChange(index, 'entityCode', entity.code);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        line.entityCode === entity.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">{entity.code}</span> - {entity.name}
                                  </CommandItem>
                                ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {fieldErrors[`line_${index}_entityCode`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_entityCode`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                    placeholder="Line description"
                    className={fieldErrors[`line_${index}_description`] ? 'border-red-500' : ''}
                  />
                  {fieldErrors[`line_${index}_description`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_description`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Using a text input with pattern validation for better formatting control */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(e) => {
                      // Only handle the value without commas
                      const rawValue = unformatNumber(e.target.value);
                      handleLineChange(index, 'debit', rawValue);
                    }}
                    onBlur={(e) => {
                      // Format to 2 decimal places with thousands separators on blur
                      if (e.target.value) {
                        const numValueStr = unformatNumber(e.target.value);
                        const numValue = parseFloat(numValueStr);
                        
                        if (!isNaN(numValue)) {
                          // Format with 2 decimal places and thousands separators
                          const formattedValue = formatNumberWithSeparator(numValue.toFixed(2));
                          handleLineChange(index, 'debit', formattedValue);
                        }
                      }
                    }}
                    placeholder="0.00"
                    className={fieldErrors[`line_${index}_debit`] ? 'border-red-500' : ''}
                  />
                  {fieldErrors[`line_${index}_debit`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_debit`]}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Using a text input with pattern validation for better formatting control */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(e) => {
                      // Only handle the value without commas
                      const rawValue = unformatNumber(e.target.value);
                      handleLineChange(index, 'credit', rawValue);
                    }}
                    onBlur={(e) => {
                      // Format to 2 decimal places with thousands separators on blur
                      if (e.target.value) {
                        const numValueStr = unformatNumber(e.target.value);
                        const numValue = parseFloat(numValueStr);
                        
                        if (!isNaN(numValue)) {
                          // Format with 2 decimal places and thousands separators
                          const formattedValue = formatNumberWithSeparator(numValue.toFixed(2));
                          handleLineChange(index, 'credit', formattedValue);
                        }
                      }
                    }}
                    placeholder="0.00"
                    className={fieldErrors[`line_${index}_credit`] ? 'border-red-500' : ''}
                  />
                  {fieldErrors[`line_${index}_credit`] && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors[`line_${index}_credit`]}</p>
                  )}
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
              <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Totals:</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
            
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Difference:</td>
              <td colSpan={2} className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
            
            {/* Entity Balance Summary Section - Intercompany Validation */}
            {entityBalances.length > 1 && (
              <>
                <tr className="bg-gray-100">
                  <td colSpan={6} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity Balance Summary (Intercompany)
                  </td>
                </tr>
                {entityBalances.map((balance: EntityBalance) => (
                  <tr key={balance.entityCode} className="bg-gray-50">
                    <td colSpan={2} className="px-6 py-2 text-right text-xs font-medium text-gray-900">
                      Entity {balance.entityCode}:
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      DR: {balance.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      CR: {balance.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className={`px-6 py-2 whitespace-nowrap text-xs font-medium ${balance.balanced ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.balanced ? 'Balanced' : `Difference: ${balance.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tfoot>
        </table>
      </div>


      
      {/* Attachment Section Conditional Rendering */}
      {(!isEditing || (isEditing && existingEntry?.id && existingEntry?.status !== 'posted' && existingEntry?.status !== 'voided')) ? (
        <AttachmentSection 
          journalEntryId={effectiveJournalEntryId}
          pendingFiles={pendingFiles}
          setPendingFiles={setPendingFiles}
          pendingFilesMetadata={pendingFilesMetadata}
          setPendingFilesMetadata={setPendingFilesMetadata}
          onUploadToEntryRef={uploadPendingFilesRef}
        />
      ) : null}
        
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
            onClick={() => handleSubmit(true)}
            disabled={createEntry.isPending || updateEntry.isPending || isUploading}
            className="relative"
          >
            {(createEntry.isPending || updateEntry.isPending || isUploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
            )}
            {!(createEntry.isPending || updateEntry.isPending || isUploading) && 'Save as Draft'}
            {(createEntry.isPending || updateEntry.isPending) && 'Saving...'}
            {isUploading && 'Uploading Files...'}
          </Button>
          
          {/* Post/Submit button based on role */}
          {user?.role === 'admin' ? (
            <Button
              variant="default"
              onClick={() => {
                console.log('DEBUG: Post button clicked, user is admin');
                console.log('DEBUG: existingEntry:', existingEntry);
                if (existingEntry && existingEntry.id) {
                  console.log('DEBUG: Posting existing entry with ID:', existingEntry.id);
                  // Use postJournalEntry from the properly imported hook at component level
                  postJournalEntry.mutate(existingEntry.id);
                } else {
                  console.log('DEBUG: Creating new entry using handleSubmit with saveAsDraft=false');
                  
                  // Call handleSubmit with saveAsDraft=false which will handle the two-phase workflow for pending files
                  handleSubmit(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700 relative"
              disabled={createEntry.isPending || updateEntry.isPending || !isBalanced || isUploading}
              title={!isBalanced ? "Journal entry must be balanced before posting" : isUploading ? "Please wait while files are uploading" : pendingFiles.length > 0 ? "Entry will be created as draft first to allow file uploads" : ""}
            >
              {(createEntry.isPending || updateEntry.isPending || isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              )}
              {!(createEntry.isPending || updateEntry.isPending || isUploading) && isBalanced && (
                <CheckCircle2 className="mr-2 h-4 w-4 inline" />
              )}
              {!(createEntry.isPending || updateEntry.isPending || isUploading) && 'Post Entry'}
              {(createEntry.isPending || updateEntry.isPending) && 'Posting...'}
              {isUploading && 'Uploading Files...'}
            </Button>
          ) : (
            /* Submit for Approval button - for non-admin users */
            <Button
              variant="default"
              onClick={() => {
                // For non-admin users, submit for approval (changes status to "pending_approval")
                const entryData = { 
                  ...journalData,
                  status: JournalEntryStatus.PENDING_APPROVAL 
                };
                if (existingEntry && existingEntry.id) {
                  updateEntry.mutate({ ...entryData, id: existingEntry.id });
                } else {
                  createEntry.mutate(entryData);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 relative"
              disabled={createEntry.isPending || updateEntry.isPending || !isBalanced || isUploading}
              title={!isBalanced ? "Journal entry must be balanced before submitting" : isUploading ? "Please wait while files are uploading" : ""}
            >
              {(createEntry.isPending || updateEntry.isPending || isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              )}
              {!(createEntry.isPending || updateEntry.isPending || isUploading) && isBalanced && (
                <CheckCircle2 className="mr-2 h-4 w-4 inline" />
              )}
              {!(createEntry.isPending || updateEntry.isPending || isUploading) && 'Submit for Approval'}
              {(createEntry.isPending || updateEntry.isPending) && 'Submitting...'}
              {isUploading && 'Uploading Files...'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default JournalEntryForm;
