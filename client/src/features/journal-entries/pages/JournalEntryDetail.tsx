import React, { useState, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import { useJournalEntry, JournalEntry } from '@/features/journal-entries/hooks/useJournalEntry';
import { 
  ClientFormatLine, 
  ServerFormatLine, 
  JournalEntryLine, 
  isClientFormatLine, 
  isServerFormatLine,
  getDebit,
  getCredit
} from '../utils/lineFormat';
import { ymdToDisplay } from '@/utils/dateUtils';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  getJournalEntryUrl,
  getJournalEntryFilesBaseUrl,
  getJournalEntryFileUrl,
  getJournalEntryFileDownloadUrl
} from '@/api/urlHelpers';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  CheckCheck,
  XCircle,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  FileText,
  Info,
  Upload,
  Download,
  File,
  FilePlus,
  Paperclip,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  SendHorizontal,
  Eye,
  Loader2,
  Lock
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

function JournalEntryDetail() {
  const { updateJournalEntry, deleteJournalEntry, postJournalEntry } = useJournalEntry();
  const [pathname, navigate] = useLocation();
  const [match, params] = useRoute('/journal-entries/:id');
  const isInEditMode = pathname.endsWith('/edit'); // Check if we're in edit mode
  const entryId = params?.id ? parseInt(params.id) : null;
  
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [voidReason, setVoidReason] = useState('');
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Global progress (legacy)
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({}); // Per-file progress
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]); // Currently uploading files
  const [rejectedFiles, setRejectedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelTokenSourceRef = useRef<any>(null);
  
  // Allowed file extensions and mime types
  const ALLOWED_FILE_TYPES = [
    'application/pdf', // PDF
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', // Images
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOC, DOCX
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLS, XLSX
    'text/plain', // TXT
    'text/csv', // CSV
    'message/rfc822', // EML
    'application/vnd.ms-outlook' // MSG
  ];
  
  const ALLOWED_FILE_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', 
    '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
    '.eml', '.msg'
  ];
  
  // Function to check if a file is valid
  const isValidFile = (file: File): boolean => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      // For files where the browser might not detect the correct MIME type,
      // also check the extension
      const fileName = file.name.toLowerCase();
      const extension = fileName.slice(fileName.lastIndexOf('.'));
      if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        return false;
      }
    }
    return true;
  };
  
  // Function to cancel ongoing uploads
  const cancelUpload = useCallback(() => {
    if (cancelTokenSourceRef.current) {
      cancelTokenSourceRef.current.cancel('Upload cancelled by user');
      setUploading(false);
      setUploadProgress(0);
      setUploadProgressMap({});
      setUploadingFiles([]);
      toast({
        title: 'Cancelled',
        description: 'File upload cancelled',
      });
    }
  }, []);

  // File upload mutation
  const uploadFile = useMutation({
    mutationFn: async (files: File[]) => {
      if (!entryId) throw new Error('Journal entry ID is required');
      
      // Create a new cancel token source
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      cancelTokenSourceRef.current = source;
      
      // Set up the uploading state with the files being uploaded
      setUploadingFiles(files);
      
      // Initialize progress for each file
      const initialProgress = files.reduce((acc, file) => {
        acc[file.name] = 0;
        return acc;
      }, {} as Record<string, number>);
      
      setUploadProgressMap(initialProgress);
      
      const formData = new FormData();
      
      // Add all files to the formData
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Ensure we have required client and entity IDs
      if (!clientId || !currentEntity?.id) {
        throw new Error('Client ID and Entity ID are required for file operations');
      }

      const response = await axios.post(
        getJournalEntryFilesBaseUrl(clientId, currentEntity.id, entryId),
        formData,
        {
          cancelToken: source.token,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              
              // Update the global progress state (legacy)
              setUploadProgress(percentCompleted);
              
              // Update the per-file progress assuming equal distribution
              const newProgressMap = { ...initialProgress };
              files.forEach(file => {
                newProgressMap[file.name] = percentCompleted;
              });
              setUploadProgressMap(newProgressMap);
            }
          }
        }
      );
      
      return response.data;
    },
    onSuccess: (response) => {
      setUploading(false);
      setUploadProgress(0);
      setUploadProgressMap({});
      setUploadingFiles([]);
      toast({
        title: 'Success',
        description: 'Files uploaded successfully',
      });
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Add the debug logging as required by the task
      console.log("DEBUG Attachment:", { 
        journalEntryId: entryId, 
        fileCount: response?.files?.length || 0 
      });
      
      // Refresh the journal entry to show the new files
      refetch();
    },
    onError: (error: any) => {
      if (axios.isCancel(error)) {
        console.log('Upload cancelled:', error.message);
      } else {
        toast({
          title: 'Error',
          description: `Failed to upload files: ${error.message}`,
          variant: 'destructive',
        });
      }
      
      setUploading(false);
      setUploadProgress(0);
      setUploadProgressMap({});
      setUploadingFiles([]);
    }
  });
  
  // File deletion mutation
  const deleteFile = useMutation({
    mutationFn: async (fileId: number) => {
      if (!entryId) throw new Error('Journal entry ID is required');
      if (!clientId || !currentEntity?.id) {
        throw new Error('Client ID and Entity ID are required for file operations');
      }
      
      // Use the hierarchical URL pattern for file operations
      return await apiRequest(getJournalEntryFileUrl(clientId, currentEntity.id, entryId, fileId), {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
      // Refresh the journal entry to update the file list
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete file: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle file input change from conventional file input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    
    // Convert FileList to Array for easier manipulation
    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(isValidFile);
    
    if (validFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid files selected. Please upload only PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX, TXT, CSV, EML, or MSG files.',
        variant: 'destructive',
      });
      return;
    }
    
    if (validFiles.length !== filesArray.length) {
      toast({
        title: 'Warning',
        description: 'Some files were skipped because they are not of supported types.',
        variant: 'default',
      });
    }
    
    setUploading(true);
    uploadFile.mutate(validFiles);
  };
  
  // Handle file drop using react-dropzone
  const onDrop = useCallback((acceptedFiles: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      setRejectedFiles(rejected);
      toast({
        title: 'Warning',
        description: 'Some files were rejected because they are not of supported types.',
        variant: 'default',
      });
    }
    
    if (acceptedFiles.length === 0) return;
    
    // Additional client-side validation
    const validFiles = acceptedFiles.filter(isValidFile);
    
    if (validFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid files selected. Please upload only PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX, TXT, CSV, EML, or MSG files.',
        variant: 'destructive',
      });
      return;
    }
    
    setUploading(true);
    uploadFile.mutate(validFiles);
  }, [uploadFile]);
  
  // Setup for react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      // Images
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
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
      'application/vnd.ms-outlook': ['.msg']  // Outlook messages
    },
    maxSize: 10485760, // 10MB
    multiple: true
  });
  
  // Handle file download
  const handleFileDownload = (fileId: number) => {
    if (!entryId) return;
    if (!clientId || !currentEntity?.id) {
      toast({
        title: 'Error',
        description: 'Client ID and Entity ID are required for file operations',
        variant: 'destructive',
      });
      return;
    }
    
    // Use the hierarchical URL pattern for file download
    window.open(getJournalEntryFileDownloadUrl(clientId, currentEntity.id, entryId, fileId), '_blank');
  };
  
  // Handle file deletion
  // Bug fix #2: Ensure file deletion only works for draft and pending_approval status
  const handleFileDelete = (fileId: number) => {
    if (!entryId) return;
    
    // Only allow deletion for draft and pending_approval status
    if (entry && (entry.status !== 'draft' && entry.status !== 'pending_approval')) {
      console.log("DEBUG: File deletion not allowed for status:", entry.status);
      toast({
        title: "Not Allowed",
        description: "Files can only be deleted when the journal entry is in draft or pending approval status.",
        variant: "destructive"
      });
      return;
    }
    
    // Confirm before deleting
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      deleteFile.mutate(fileId);
    }
  };
  
  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 mr-2 text-blue-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 mr-2 text-red-500" />;
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="h-5 w-5 mr-2 text-green-500" />;
    } else if (mimeType.includes('word') || mimeType.includes('doc')) {
      return <FileText className="h-5 w-5 mr-2 text-blue-700" />;
    } else if (mimeType.includes('text/plain') || mimeType.includes('txt')) {
      return <FileText className="h-5 w-5 mr-2 text-gray-700" />;
    } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
      return <FileArchive className="h-5 w-5 mr-2 text-yellow-600" />;
    } else if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('xml')) {
      return <FileCode className="h-5 w-5 mr-2 text-purple-600" />;
    } else if (mimeType === 'message/rfc822' || mimeType.includes('outlook')) {
      // Handle email file formats (.eml, .msg)
      return <SendHorizontal className="h-5 w-5 mr-2 text-blue-500" />;
    } else {
      return <File className="h-5 w-5 mr-2 text-gray-500" />;
    }
  };
  
  // Get client ID for accounts query - use entity's clientId
  const clientId = currentEntity?.clientId;
  
  // Fetch accounts for displaying account information
  const { 
    data: accountsData,
    isLoading: accountsLoading 
  } = useQuery({
    queryKey: clientId ? [`/api/clients/${clientId}/accounts`] : ['no-client-selected'],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Create a map of account IDs to account details for quick lookup
  const accountsMap = React.useMemo(() => {
    if (!accountsData) return {};
    
    // Check if accountsData has accounts property directly or as part of a nested object
    let accounts: any[] = [];
    if (Array.isArray(accountsData)) {
      accounts = accountsData;
    } else if (accountsData && typeof accountsData === 'object') {
      // Try to extract accounts from different possible structures
      if ('accounts' in accountsData && Array.isArray((accountsData as any).accounts)) {
        accounts = (accountsData as any).accounts;
      } else if ('data' in accountsData && (accountsData as any).data) {
        const data = (accountsData as any).data;
        if ('accounts' in data && Array.isArray(data.accounts)) {
          accounts = data.accounts;
        } else if (Array.isArray(data)) {
          accounts = data;
        }
      }
    }
    
    console.log("DEBUG - AccountsMap - Accounts array:", accounts);
    
    return accounts.reduce((acc: {[key: string]: any}, account: any) => {
      if (account && account.id) {
        acc[account.id] = account;
      }
      return acc;
    }, {});
  }, [accountsData]);
  
  // Function to get formatted account display
  const getAccountDisplay = (accountId: string | number) => {
    if (!accountsMap || !accountId) return accountId;
    
    const account = accountsMap[accountId];
    if (!account) return accountId;
    
    // Return formatted account code + name
    return `${account.accountCode} - ${account.name}`;
  };
  
  // Fetch journal entry by ID using hierarchical URL pattern
  const { 
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: entryId && clientId ? [getJournalEntryUrl(clientId, currentEntity?.id || 0, entryId)] : ['dummy-empty-key'],
    enabled: !!entryId && !!clientId && !!currentEntity?.id
  });
  
  // Define type for a journal entry
  // Interface for file attachments
  interface JournalEntryFile {
    id: number;
    journalEntryId: number;
    filename: string;
    originalname?: string;
    path: string;
    mimeType: string;
    size: number;
    uploadedBy?: number;
    uploadedAt?: string;
  }
  
  interface JournalEntry {
    id: number;
    date: string;
    description?: string;
    referenceNumber?: string; // Changed from reference to match database schema
    journalType?: string;
    status: string;
    entityId?: number;
    clientId?: number;
    createdBy?: number;
    createdAt?: string;
    updatedAt?: string;
    postedBy?: number;
    postedAt?: string;
    lines: JournalEntryLine[];
    files?: JournalEntryFile[];
    voidReason?: string;
  }
  
  // API might return the journal entry directly or wrapped in a journalEntry property
  // The explicit cast and nullish coalescing ensure we get a properly typed object or undefined
  const entry = data ? 
    (data && typeof data === 'object' && 'journalEntry' in data ? (data.journalEntry as JournalEntry) : (data as JournalEntry)) 
    : undefined;
  
  console.log("DEBUG - JournalEntryDetail - Data type:", typeof data);
  console.log("DEBUG - JournalEntryDetail - Data structure:", data);
  console.log("DEBUG - JournalEntryDetail - Using entry:", entry);
  
  // Log specific properties to help track format issues
  if (data && typeof data === 'object') {
    console.log("DEBUG - JournalEntryDetail - Data has journalEntry property:", 'journalEntry' in data);
    console.log("DEBUG - JournalEntryDetail - Data has id property:", 'id' in data);
    console.log("DEBUG - JournalEntryDetail - Data has lines property:", 'lines' in data);
  }
  
  // Log line format to help with client/server format detection
  if (entry && entry.lines && entry.lines.length > 0) {
    const firstLine = entry.lines[0];
    console.log("DEBUG - JournalEntryDetail - First line format:", 
      isClientFormatLine(firstLine) ? "Client format (debit/credit)" : 
      isServerFormatLine(firstLine) ? "Server format (type/amount)" : 
      "Unknown format");
    console.log("DEBUG - JournalEntryDetail - First line properties:", Object.keys(firstLine));
  }
  
  // Format date for display without timezone shifts
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return ymdToDisplay(dateString);
  };
  
  // Format currency values consistently with 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Draft
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'posted':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Posted
          </Badge>
        );
      case 'voided':
      case 'void': // Handle both 'voided' and 'void' for backward compatibility
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Voided
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            {status}
          </Badge>
        );
    }
  };
  
  // Function to handle the back button using hierarchical navigation
  const handleBack = () => {
    if (clientId && currentEntity?.id) {
      navigate(`/clients/${clientId}/entities/${currentEntity.id}/journal-entries`);
    } else {
      navigate('/journal-entries');
    }
  };
  
  // Function to void a journal entry
  const voidEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      if (!clientId || !currentEntity?.id) {
        throw new Error('Client ID and Entity ID are required for journal entry operations');
      }
      
      return await apiRequest(getJournalEntryUrl(clientId, currentEntity.id, entryId), {
        method: 'DELETE',
        data: {
          voidReason: voidReason
        }
      });
    },
    onSuccess: () => {
      setShowVoidDialog(false);
      toast({
        title: 'Success',
        description: 'Journal entry has been voided',
      });
      // Navigate back to list or refresh this entry
      refetch();
    },
    onError: (error: any) => {
      setShowVoidDialog(false);
      toast({
        title: 'Error',
        description: `Failed to void journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Function to reverse a journal entry
  const reverseEntry = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('Journal entry ID is required');
      if (!clientId || !currentEntity?.id) {
        throw new Error('Client ID and Entity ID are required for journal entry operations');
      }
      
      // Combine URL correctly for the reverse operation
      const reverseUrl = `${getJournalEntryUrl(clientId, currentEntity.id, entryId)}/reverse`;
      return await apiRequest(reverseUrl, {
        method: 'POST',
        data: {
          // Add any customization for the reversal entry
          description: `Reversal of Journal Entry #${entryId}`
        }
      });
    },
    onSuccess: (response) => {
      toast({
        title: 'Success',
        description: 'Journal entry has been reversed',
      });
      
      // Navigate to the new reversed entry if ID is provided in response
      if (response && response.id) {
        if (clientId && currentEntity?.id) {
          navigate(`/clients/${clientId}/entities/${currentEntity.id}/journal-entries/${response.id}`);
        } else {
          navigate(`/journal-entries/${response.id}`);
        }
      } else {
        // Otherwise, go back to list
        if (clientId && currentEntity?.id) {
          navigate(`/clients/${clientId}/entities/${currentEntity.id}/journal-entries`);
        } else {
          navigate('/journal-entries');
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to reverse journal entry: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle void button click
  const handleVoid = () => {
    voidEntry.mutate();
  };
  
  // Handle reverse button click
  const handleReverse = () => {
    if (window.confirm('Are you sure you want to reverse this journal entry? This will create a new entry with opposite debits and credits.')) {
      reverseEntry.mutate();
    }
  };
  
  // Handle post entry button click
  const handlePostEntry = () => {
    // Check if the entry is balanced before posting
    const { totalDebit, totalCredit } = calculateTotals();
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = Math.abs(difference) < 0.01; // Allow for tiny rounding errors
    
    if (!isBalanced) {
      toast({
        title: "Cannot Post Unbalanced Entry",
        description: "Journal entry debits and credits must be equal before posting.",
        variant: "destructive"
      });
      return;
    }
    
    // Confirm before posting
    if (window.confirm('Are you sure you want to post this journal entry? Once posted, it cannot be edited or deleted.')) {
      // Make sure we have journal entry data
      if (!entry || !entry.lines) {
        toast({
          title: "Error",
          description: "Journal entry data is missing. Please reload the page and try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Create an array to hold the formatted line data
      const formattedLines = [];
      
      // Process each line to ensure correct format
      for (const line of entry.lines) {
        if (isClientFormatLine(line)) {
          // Check if it's a debit or credit line
          if (parseFloat(line.debit) > 0) {
            formattedLines.push({
              type: 'debit',
              amount: line.debit,
              accountId: Number(line.accountId),
              entityCode: line.entityCode || null,
              description: line.description || null
            });
          } else if (parseFloat(line.credit) > 0) {
            formattedLines.push({
              type: 'credit',
              amount: line.credit,
              accountId: Number(line.accountId),
              entityCode: line.entityCode || null,
              description: line.description || null
            });
          }
        } else if (isServerFormatLine(line)) {
          // Already in server format, just ensure amount is a string
          formattedLines.push({
            type: line.type,
            amount: line.amount.toString(),
            accountId: Number(line.accountId),
            entityCode: line.entityCode || null,
            description: line.description || null
          });
        }
      }
      
      console.log('Posting journal entry with formatted lines:', formattedLines);
      
      // EXPLICITLY include all required fields from the original journal entry
      // to ensure they're preserved when posting
      const updatePayload = {
        id: entryId,
        status: 'posted',
        lines: formattedLines,
        // EXPLICITLY include these critical fields to avoid data loss
        date: entry.date,
        description: entry.description,
        referenceNumber: entry.referenceNumber,
        // Include other important fields
        journalType: entry.journalType || 'JE',
        entityId: entry.entityId,
        clientId: entry.clientId
      };
      
      // Log the complete payload for debugging
      console.log('DEBUG: Complete posting payload:', JSON.stringify(updatePayload, null, 2));
      
      // Update the status to posted with formatted lines and all required fields
      updateJournalEntry.mutate(updatePayload, {
        onSuccess: () => {
          toast({
            title: "Journal Entry Posted",
            description: "The journal entry has been posted successfully.",
          });
          
          // Refresh the entry to show its updated status
          refetch();
        },
        onError: (error: any) => {
          console.error('Error posting journal entry:', error);
          toast({
            title: "Error",
            description: `Failed to post journal entry: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    }
  };
  
  // Render action buttons based on status
  const renderActionButtons = () => {
    // If journal entry is not loaded or doesn't have a status, return empty div
    if (!entry) return <div></div>;
    
    const status = entry.status;
    const isAdmin = user?.role === 'admin';
    const isSupervisor = user?.role === 'supervisor';
    const isAccounting = user?.role === 'accounting';
    const hasApprovalRights = isAdmin || isSupervisor || isAccounting;
    
    // Check if the current user is the owner of the entry
    const isOwnEntry = user?.id === entry.createdBy;
    
    // Log for debugging permission matrix
    console.log('DEBUG: Permission matrix:', {
      entryId,
      status,
      isAdmin,
      isSupervisor,
      isAccounting,
      hasApprovalRights,
      isOwnEntry,
      userId: user?.id,
      createdBy: entry.createdBy
    });
    
    // Define basic buttons (not available for posted or voided entries)
    const basicButtons = (
      <Button variant="outline" onClick={() => {
        if (clientId && currentEntity?.id && entryId) {
          navigate(`/clients/${clientId}/entities/${currentEntity.id}/journal-entries/edit/${entryId}`);
        } else {
          navigate(`/journal-entries/edit/${entryId}`);
        }
      }}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
    );
    
    // Conditionally show buttons based on status
    const actionButtons = [];
    
    // For draft status
    if (status === 'draft') {
      // EXPLICITLY implement permission rules:
      // - Admin users can post any entry
      // - Non-admin users CANNOT post their own entries - they can only submit them
      // - Non-admin users with approval rights CAN post entries owned by others
      
      if (isAdmin || (!isOwnEntry && hasApprovalRights)) {
        // Admin OR (Non-owner AND has approval rights) - Show Post button
        actionButtons.push(
          <Button 
            key="post"
            variant="outline" 
            onClick={handlePostEntry}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 mr-2"
          >
            <Check className="mr-2 h-4 w-4" />
            Post Entry
          </Button>
        );
      } else if (isOwnEntry && !isAdmin) {
        // EXPLICITLY add Submit button for non-admin users for their own drafts
        // This submits the entry for approval
        actionButtons.push(
          <Button 
            key="submit"
            variant="outline" 
            onClick={() => {
              // Update status to pending_approval
              // Format lines to ensure proper data structure
              const formattedLines = [];
              if (entry.lines) {
                for (const line of entry.lines) {
                  if (isClientFormatLine(line)) {
                    // Check if it's a debit or credit line
                    if (parseFloat(line.debit) > 0) {
                      formattedLines.push({
                        type: 'debit',
                        amount: line.debit,
                        accountId: Number(line.accountId),
                        entityCode: line.entityCode || null,
                        description: line.description || null
                      });
                    } else if (parseFloat(line.credit) > 0) {
                      formattedLines.push({
                        type: 'credit',
                        amount: line.credit,
                        accountId: Number(line.accountId),
                        entityCode: line.entityCode || null,
                        description: line.description || null
                      });
                    }
                  } else if (isServerFormatLine(line)) {
                    // Already in server format, just ensure amount is a string
                    formattedLines.push({
                      type: line.type,
                      amount: line.amount.toString(),
                      accountId: Number(line.accountId),
                      entityCode: line.entityCode || null,
                      description: line.description || null
                    });
                  }
                }
              }
              
              console.log('DEBUG: Submitting journal entry with formatted lines:', formattedLines);
              
              updateJournalEntry.mutate({
                id: entryId,
                status: 'pending_approval',
                // EXPLICITLY include these critical fields to avoid data loss
                date: entry.date,
                description: entry.description,
                referenceNumber: entry.referenceNumber,
                journalType: entry.journalType || 'JE',
                entityId: entry.entityId,
                clientId: entry.clientId,
                // EXPLICITLY include lines to ensure complete data preservation
                lines: formattedLines
              }, {
                onSuccess: () => {
                  toast({
                    title: "Entry Submitted",
                    description: "Journal entry has been submitted for approval.",
                  });
                  refetch();
                },
                onError: (error) => {
                  toast({
                    title: "Error",
                    description: `Failed to submit journal entry: ${error.message}`,
                    variant: "destructive",
                  });
                }
              });
            }}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-2"
          >
            <SendHorizontal className="mr-2 h-4 w-4" />
            Submit for Approval
          </Button>
        );
      }
      
      // Add Delete button - available for all users for draft entries
      actionButtons.push(
        <Button 
          key="delete"
          variant="outline" 
          onClick={() => setShowDeleteDialog(true)}
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Entry
        </Button>
      );
    }
    
    // For pending_approval status
    if (status === 'pending_approval') {
      // EXPLICITLY implement permission rules:
      // - Only users with approval rights who are NOT the owner can approve
      if (hasApprovalRights && !isOwnEntry) {
        // Add Approve button
        actionButtons.push(
          <Button 
            key="approve"
            variant="outline" 
            onClick={() => {
              // Update status to approved
              // Format lines to ensure proper data structure
              const formattedLines = [];
              if (entry.lines) {
                for (const line of entry.lines) {
                  if (isClientFormatLine(line)) {
                    // Check if it's a debit or credit line
                    if (parseFloat(line.debit) > 0) {
                      formattedLines.push({
                        type: 'debit',
                        amount: line.debit,
                        accountId: Number(line.accountId),
                        entityCode: line.entityCode || null,
                        description: line.description || null
                      });
                    } else if (parseFloat(line.credit) > 0) {
                      formattedLines.push({
                        type: 'credit',
                        amount: line.credit,
                        accountId: Number(line.accountId),
                        entityCode: line.entityCode || null,
                        description: line.description || null
                      });
                    }
                  } else if (isServerFormatLine(line)) {
                    // Already in server format, just ensure amount is a string
                    formattedLines.push({
                      type: line.type,
                      amount: line.amount.toString(),
                      accountId: Number(line.accountId),
                      entityCode: line.entityCode || null,
                      description: line.description || null
                    });
                  }
                }
              }
              
              console.log('DEBUG: Approving journal entry with formatted lines:', formattedLines);
              
              updateJournalEntry.mutate({
                id: entryId,
                status: 'approved',
                // EXPLICITLY include these critical fields to avoid data loss
                date: entry.date,
                description: entry.description,
                referenceNumber: entry.referenceNumber,
                journalType: entry.journalType || 'JE',
                entityId: entry.entityId,
                clientId: entry.clientId,
                // EXPLICITLY include lines to ensure complete data preservation
                lines: formattedLines
              }, {
                onSuccess: () => {
                  toast({
                    title: "Entry Approved",
                    description: "Journal entry has been approved.",
                  });
                  refetch();
                },
                onError: (error) => {
                  toast({
                    title: "Error",
                    description: `Failed to approve journal entry: ${error.message}`,
                    variant: "destructive",
                  });
                }
              });
            }}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 mr-2"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Approve
          </Button>
        );
        
        // Add Reject button
        actionButtons.push(
          <Button 
            key="reject"
            variant="outline" 
            onClick={() => setShowRejectDialog(true)}
            className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        );
      }
    }
    
    // For approved status - users with approval rights can post
    if (status === 'approved' && hasApprovalRights) {
      actionButtons.push(
        <Button 
          key="post"
          variant="outline" 
          onClick={handlePostEntry}
          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 mr-2"
        >
          <Check className="mr-2 h-4 w-4" />
          Post Entry
        </Button>
      );
    }
    
    // For rejected status - the owner can resubmit
    if (status === 'rejected' && isOwnEntry) {
      actionButtons.push(
        <Button 
          key="resubmit"
          variant="outline" 
          onClick={() => {
            if (clientId && currentEntity?.id && entryId) {
              navigate(`/clients/${clientId}/entities/${currentEntity.id}/journal-entries/edit/${entryId}`);
            } else {
              navigate(`/journal-entries/edit/${entryId}`);
            }
          }}
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-2"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit and Resubmit
        </Button>
      );
    }
    
    // Only users with approval rights can reverse/void posted journals
    if (status === 'posted' && hasApprovalRights) {
      actionButtons.push(
        <Button 
          key="reverse"
          variant="outline" 
          onClick={handleReverse}
          className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 mr-2"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reverse
        </Button>
      );
      
      // Add void button
      actionButtons.push(
        <Button 
          key="void"
          variant="outline" 
          onClick={() => setShowVoidDialog(true)}
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        >
          <X className="mr-2 h-4 w-4" />
          Void
        </Button>
      );
    }
    
    return (
      <div className="flex space-x-2">
        {/* Show edit button only for appropriate statuses and if not voided */}
        {status !== 'posted' && status !== 'voided' && status !== 'void' && 
         status !== 'pending_approval' && status !== 'approved' ? basicButtons : null}
        {actionButtons}
      </div>
    );
  };
  
  // Accept data in both formats: with wrapper and without
  // This is a hot-fix to handle both the legacy {journalEntry: {...}} shape
  // and the new direct object format that hierarchical endpoints return
  if (!data) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;

  // Loading state
  if (isLoading) {
    return (
      <div className="py-6">
        <PageHeader
          title="Loading Journal Entry..."
          description="Please wait while we load the journal entry details."
        >
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="py-6">
        <PageHeader
          title="Error Loading Journal Entry"
          description="There was an error loading the journal entry details."
        >
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{(error as Error).message}</p>
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Using shared helper functions from utils/lineFormat.ts that were imported at the top of file
  
  // Calculate totals for the journal entry
  type Totals = {
    totalDebit: number;
    totalCredit: number;
  };
  
  const calculateTotals = (): Totals => {
    if (!entry || !entry.lines) {
      return { totalDebit: 0, totalCredit: 0 };
    }
    
    return entry.lines.reduce((acc: Totals, line: any) => {
      // Use our helper functions to handle both formats
      acc.totalDebit += getDebit(line);
      acc.totalCredit += getCredit(line);
      
      return acc;
    }, { totalDebit: 0, totalCredit: 0 });
  };
  
  // Calculate entity-specific balances
  type EntityBalance = {
    entityCode: string;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  
  const calculateEntityBalances = (): EntityBalance[] => {
    if (!entry || !entry.lines) {
      return [];
    }
    
    // Group lines by entity code
    const entities: {[key: string]: JournalEntryLine[]} = {};
    
    entry.lines.forEach((line: JournalEntryLine) => {
      const entityCode = line.entityCode || 'No Entity';
      
      if (!entities[entityCode]) {
        entities[entityCode] = [];
      }
      
      entities[entityCode].push(line);
    });
    
    // Calculate totals for each entity
    return Object.entries(entities).map(([entityCode, entityLines]) => {
      const { totalDebit, totalCredit } = entityLines.reduce((acc: Totals, line: any) => {
        // Use our helper functions to handle both formats consistently
        acc.totalDebit += getDebit(line);
        acc.totalCredit += getCredit(line);
        
        return acc;
      }, { totalDebit: 0, totalCredit: 0 });
      
      const difference = Math.abs(totalDebit - totalCredit);
      const isBalanced = Math.abs(difference) < 0.01; // Allow for tiny rounding errors
      
      return {
        entityCode,
        totalDebit,
        totalCredit,
        difference,
        isBalanced
      };
    });
  };
  
  // Make sure to use the entry variable instead of journalEntry
  const { totalDebit, totalCredit } = calculateTotals();
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = Math.abs(difference) < 0.01; // Allow for tiny rounding errors
  
  const entityBalances = calculateEntityBalances();
  
  return (
    <div className="py-6">
      <PageHeader
        title={`Journal Entry #${entry.id}`}
        description={entry.description || 'No description'}
      >
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {renderActionButtons()}
        </div>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Current state of the journal entry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {getStatusBadge(entry.status)}
                {!isBalanced && (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unbalanced
                  </Badge>
                )}
              </div>
              
              {/* Status timeline */}
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Progress</p>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${entry.status === 'draft' || entry.status === 'pending_approval' || entry.status === 'approved' || entry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <span className="text-xs mt-1">Draft</span>
                  </div>
                  <div className={`h-0.5 w-12 ${entry.status === 'pending_approval' || entry.status === 'approved' || entry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${entry.status === 'pending_approval' || entry.status === 'approved' || entry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <span className="text-xs mt-1">Approval</span>
                  </div>
                  <div className={`h-0.5 w-12 ${entry.status === 'approved' || entry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${entry.status === 'approved' || entry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <span className="text-xs mt-1">Approved</span>
                  </div>
                  <div className={`h-0.5 w-12 ${entry.status === 'posted' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${entry.status === 'posted' ? 'bg-blue-500' : entry.status === 'voided' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                    <span className="text-xs mt-1">Posted</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Basic information about this entry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">Date</Label>
                  <p className="font-medium">{formatDate(entry.date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Description</Label>
                  <p className="font-medium">{entry.description || 'None'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Reference</Label>
                  <p className="font-medium">{entry.referenceNumber || 'None'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Journal Type</Label>
                  <p className="font-medium">{entry.journalType || 'Manual'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
              <CardDescription>Summary of debits and credits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Debits</span>
                  <span className={`font-medium ${!isBalanced ? 'text-red-600' : ''}`}>
                    {formatCurrency(totalDebit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Credits</span>
                  <span className={`font-medium ${!isBalanced ? 'text-red-600' : ''}`}>
                    {formatCurrency(totalCredit)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Difference</span>
                  <span className={`font-semibold ${!isBalanced ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(difference)} {isBalanced ? '✓' : '!'}
                  </span>
                </div>
              </div>
              
              {/* Entity balances (for multi-entity journals) */}
              {entityBalances.length > 1 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Entity Balances</h4>
                  <div className="space-y-2 text-xs">
                    {entityBalances.map((balance: EntityBalance, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{balance.entityCode}</span>
                        <span className={!balance.isBalanced ? 'text-red-600' : 'text-green-600'}>
                          {balance.isBalanced ? 'Balanced' : `Unbalanced (${formatCurrency(balance.difference)})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Journal Entry Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entry Lines</CardTitle>
            <CardDescription>
              Debit and credit lines of the journal entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entry.lines as JournalEntryLine[]).map((line: JournalEntryLine, index: number) => {
                  // Use our helper functions to get debit and credit values consistently
                  const debitValue = getDebit(line);
                  const creditValue = getCredit(line);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{getAccountDisplay(line.accountId)}</TableCell>
                      <TableCell>{line.entityCode}</TableCell>
                      <TableCell>{line.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        {debitValue > 0 ? formatCurrency(debitValue) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {creditValue > 0 ? formatCurrency(creditValue) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Totals row */}
                <TableRow className="font-bold bg-gray-50">
                  <TableCell colSpan={3} className="text-right">
                    Totals
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalDebit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* File Attachments Section */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Paperclip className="h-5 w-5 mr-2" />
              Attachments
            </CardTitle>
            <CardDescription>
              Files attached to this journal entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* File Upload Area - only visible for draft or pending_approval entries */}
            {entry.status === 'draft' || entry.status === 'pending_approval' ? (
              <div className="mb-4">
                {!uploading && (
                  <div
                    {...getRootProps()}
                    className={`border border-dashed rounded-md p-6 cursor-pointer transition-colors mb-4 ${
                      isDragActive ? "border-primary bg-primary/5" : "border-gray-300"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm">Drop the files here...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">Drag and drop files here, or click to select files</p>
                        <p className="text-xs text-muted-foreground">
                          Supported formats: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), CSV, Images, Email (.eml), etc. (Max 10MB per file)
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {uploading && uploadingFiles.length > 0 && (
                  <div className="border rounded-md p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Uploading Files</h3>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={cancelUpload}
                        className="h-8 px-2 text-destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                    
                    {/* Per-file progress indicators */}
                    <div className="space-y-3">
                      {uploadingFiles.map((file, index) => (
                        <div key={file.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {getFileIcon(file.type || 'application/octet-stream')}
                              <span className="text-sm font-medium">{file.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{uploadProgressMap[file.name] || 0}%</span>
                          </div>
                          <Progress 
                            value={uploadProgressMap[file.name] || 0} 
                            className="w-full h-2 shadow-sm bg-primary/20" 
                            role="progressbar"
                            aria-valuenow={uploadProgressMap[file.name] || 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rejectedFiles.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-amber-700 mb-2">
                      <AlertCircle className="h-4 w-4 inline-block mr-1" />
                      Some files were rejected:
                    </p>
                    <ul className="text-xs text-amber-700 list-disc pl-5">
                      {rejectedFiles.map((file, index) => (
                        <li key={index}>
                          {file.file.name} - {file.errors.map((e: {message: string}) => e.message).join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Console log for debugging successful uploads as per requirements */}
                <div className="text-xs text-muted-foreground mt-1">
                  {uploading ? `Uploading ${entry.files?.length || 0} file(s)...` : ''}
                </div>
              </div>
            ) : entry.status === 'posted' || entry.status === 'voided' ? (
              <div className="bg-gray-50 border rounded-md p-4 mb-4 flex items-center">
                <span className="h-5 w-5 text-gray-400 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <p className="text-sm text-gray-500">
                  File uploads are disabled for {entry.status} journal entries
                </p>
              </div>
            ) : null}
            
            {/* File Listing */}
            {entry.files && entry.files.length > 0 ? (
              <div className="space-y-3">
                {entry.files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center">
                      {getFileIcon(file.mimeType)}
                      <div>
                        <p className="font-medium">{file.originalname || file.filename}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleFileDownload(file.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      
                      {/* Bug fix #2: Only show delete button in edit mode and only for draft or pending_approval entries */}
                      {isInEditMode && (entry.status === 'draft' || entry.status === 'pending_approval') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => handleFileDelete(file.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No files attached yet</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Journal Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this journal entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (entryId && clientId && currentEntity?.id) {
                  deleteJournalEntry.mutate({
                    id: entryId,
                    clientId,
                    entityId: currentEntity.id
                  });
                  setShowDeleteDialog(false);
                  navigate(`/clients/${clientId}/entities/${currentEntity.id}/journal-entries`);
                }
              }}
            >
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Journal Entry</DialogTitle>
            <DialogDescription>
              Voiding a journal entry will mark it as invalid but preserve the entry for audit purposes. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="voidReason" className="mb-2 block">Reason for voiding</Label>
            <Input
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding this entry"
              className="w-full"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleVoid}
              disabled={!voidReason}
            >
              Void Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JournalEntryDetail;