import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "../components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useLocation } from "wouter";
import { JournalEntryStatus } from "@shared/schema";
import { Loader2, Check, X, Upload, FileText, Ban, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define TypeScript interfaces for the data
interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  description: string | null;
  debit: string;
  credit: string;
  lineNo?: number;
}

interface JournalEntryFile {
  id: number;
  journalEntryId: number;
  filename: string;
  contentType: string;
  fileUrl: string;
  createdAt: string;
  uploadedBy: number | null;
  size: number;
  uploadedAt: string;
}

interface JournalEntry {
  id: number;
  entityId: number;
  reference: string;
  date: string;
  description: string | null;
  status: JournalEntryStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string | null;
  requestedBy: number | null;
  requestedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  postedBy: number | null;
  postedAt: string | null;
  voidedBy: number | null;
  voidedAt: string | null;
  voidReason: string | null;
}

function JournalEntryDetail() {
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const journalEntryId = params?.id ? parseInt(params.id) : null;
  
  const [activeTab, setActiveTab] = useState("details");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Query entry details
  const { data: journalEntry, isLoading: isLoadingEntry } = useQuery<JournalEntry>({
    queryKey: journalEntryId ? [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}`] : ["no-journal-selected"],
    enabled: !!currentEntity && !!journalEntryId
  });

  // Query entry lines
  const { data: journalEntryLines, isLoading: isLoadingLines } = useQuery<JournalEntryLine[]>({
    queryKey: journalEntryId ? [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/lines`] : ["no-journal-selected"],
    enabled: !!currentEntity && !!journalEntryId
  });

  // Query entry files
  const { data: journalEntryFiles, isLoading: isLoadingFiles } = useQuery<JournalEntryFile[]>({
    queryKey: journalEntryId ? [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/files`] : ["no-journal-selected"],
    enabled: !!currentEntity && !!journalEntryId
  });

  // Action mutations
  const submitForApprovalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/request-approval`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}`] });
      toast({
        title: "Success",
        description: "Journal entry submitted for approval",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit journal entry for approval",
        variant: "destructive",
      });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/approve`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}`] });
      toast({
        title: "Success",
        description: "Journal entry approved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve journal entry",
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/reject`,
        { 
          method: "POST",
          data: { rejectionReason }
        }
      );
    },
    onSuccess: () => {
      setShowRejectDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}`] });
      toast({
        title: "Success",
        description: "Journal entry rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject journal entry",
        variant: "destructive",
      });
    }
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/post`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}`] });
      toast({
        title: "Success",
        description: "Journal entry posted to the general ledger",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post journal entry",
        variant: "destructive",
      });
    }
  });

  const voidMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/void`,
        { 
          method: "POST",
          data: { voidReason }
        }
      );
    },
    onSuccess: () => {
      setShowVoidDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}`] });
      toast({
        title: "Success",
        description: "Journal entry voided",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to void journal entry",
        variant: "destructive",
      });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/duplicate`,
        { method: "POST" }
      );
    },
    onSuccess: async (response) => {
      toast({
        title: "Success",
        description: "Journal entry duplicated successfully",
      });
      
      // Get JSON data from response
      const data = await response.json();
      
      // Navigate to the new entry
      if (data && data.id) {
        setLocation(`/journal-entries/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate journal entry",
        variant: "destructive",
      });
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      // Read file as base64 string
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === 'string') {
            resolve(e.target.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      
      // Send file to server
      return apiRequest(
        `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/files`,
        { 
          method: "POST",
          data: {
            filename: file.name,
            contentType: file.type,
            fileContent: fileContent
          }
        }
      );
    },
    onSuccess: () => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity?.id}/journal-entries/${journalEntryId}/files`] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await uploadFileMutation.mutateAsync(selectedFile);
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentEntity) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">
            <h1 className="text-xl font-semibold text-gray-900">Please select an entity to continue</h1>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingEntry || !journalEntry) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading journal entry...</span>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      [JournalEntryStatus.DRAFT]: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      [JournalEntryStatus.PENDING_APPROVAL]: { color: 'bg-blue-100 text-blue-800', label: 'Pending Approval' },
      [JournalEntryStatus.APPROVED]: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      [JournalEntryStatus.POSTED]: { color: 'bg-green-100 text-green-800', label: 'Posted' },
      [JournalEntryStatus.REJECTED]: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      [JournalEntryStatus.VOIDED]: { color: 'bg-red-100 text-red-800', label: 'Voided' },
    };

    const { color, label } = statusMap[status as JournalEntryStatus] || { color: 'bg-gray-100 text-gray-800', label: status };

    return (
      <Badge className={`${color} font-semibold`}>{label}</Badge>
    );
  };

  // Calculate totals
  const totalDebit = Array.isArray(journalEntryLines) 
    ? journalEntryLines.reduce((sum: number, line: JournalEntryLine) => sum + parseFloat(line.debit || '0'), 0) 
    : 0;
  const totalCredit = Array.isArray(journalEntryLines) 
    ? journalEntryLines.reduce((sum: number, line: JournalEntryLine) => sum + parseFloat(line.credit || '0'), 0) 
    : 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001; // Account for floating point precision

  // Check if user can perform specific actions
  const canRequestApproval = journalEntry.status === JournalEntryStatus.DRAFT && 
    isBalanced && 
    (journalEntry.createdBy === user?.id || user?.role === 'admin');

  const canApprove = journalEntry.status === JournalEntryStatus.PENDING_APPROVAL && 
    user?.role === 'admin';

  const canReject = journalEntry.status === JournalEntryStatus.PENDING_APPROVAL && 
    user?.role === 'admin';

  const canPost = journalEntry.status === JournalEntryStatus.APPROVED && 
    user?.role === 'admin';

  const canVoid = journalEntry.status === JournalEntryStatus.POSTED && 
    user?.role === 'admin';

  const canDuplicate = journalEntry.status !== JournalEntryStatus.VOIDED && 
    (journalEntry.createdBy === user?.id || user?.role === 'admin');

  const canUploadFiles = journalEntry.status !== JournalEntryStatus.POSTED && 
    journalEntry.status !== JournalEntryStatus.VOIDED &&
    (journalEntry.createdBy === user?.id || user?.role === 'admin');

  return (
    <>
      <PageHeader
        title={`Journal Entry: ${journalEntry.reference}`}
        description={journalEntry.description || 'No description provided'}
      >
        <div className="flex items-center space-x-3">
          {getStatusBadge(journalEntry.status)}
          <Button
            variant="outline"
            onClick={() => setLocation(`/journal-entries`)}
          >
            Back to Journal Entries
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="files">Files {journalEntryFiles?.length ? `(${journalEntryFiles.length})` : ''}</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Journal Entry Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reference</p>
                    <p className="mt-1">{journalEntry.reference}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="mt-1">{new Date(journalEntry.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="mt-1">{journalEntry.description || 'None'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Balance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Debits</p>
                    <p className="mt-1 text-lg font-semibold">${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Credits</p>
                    <p className="mt-1 text-lg font-semibold">${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Balance</p>
                    <p className={`mt-1 text-lg font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {isBalanced ? 'Balanced' : `$${Math.abs(totalDebit - totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${totalDebit > totalCredit ? 'DR' : 'CR'}`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Available actions for this journal entry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {canRequestApproval && (
                    <Button 
                      onClick={() => submitForApprovalMutation.mutate()}
                      disabled={submitForApprovalMutation.isPending} 
                      className="w-full">
                      {submitForApprovalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit for Approval
                    </Button>
                  )}
                  
                  {canApprove && (
                    <Button 
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending} 
                      className="w-full">
                      {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  )}
                  
                  {canReject && (
                    <Button 
                      onClick={() => setShowRejectDialog(true)}
                      variant="outline" 
                      className="w-full">
                      <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  )}
                  
                  {canPost && (
                    <Button 
                      onClick={() => postMutation.mutate()}
                      disabled={postMutation.isPending} 
                      className="w-full">
                      {postMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Post to General Ledger
                    </Button>
                  )}
                  
                  {/* Add Void button for posted entries */}
                  {canVoid && (
                    <Button 
                      onClick={() => setShowVoidDialog(true)}
                      variant="outline" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                      <Ban className="mr-2 h-4 w-4" /> Void Journal Entry
                    </Button>
                  )}

                  {/* Add Duplicate button */}
                  {canDuplicate && (
                    <Button 
                      onClick={() => duplicateMutation.mutate()}
                      disabled={duplicateMutation.isPending} 
                      variant="outline"
                      className="w-full">
                      {duplicateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </Button>
                  )}
                  
                  {journalEntry.status === JournalEntryStatus.REJECTED && journalEntry.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-2">
                      <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{journalEntry.rejectionReason}</p>
                    </div>
                  )}

                  {journalEntry.status === JournalEntryStatus.VOIDED && journalEntry.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-2">
                      <p className="text-sm font-medium text-red-800">Void Reason:</p>
                      <p className="text-sm text-red-700">{journalEntry.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Journal Entry Lines</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLines ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading journal entry lines...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Array.isArray(journalEntryLines) && journalEntryLines.map((line: JournalEntryLine) => (
                          <tr key={line.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {/* Ideally, we would show account name here. Would need to fetch account details or have them included in line data */}
                              {line.accountId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {line.description || 'No description'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {parseFloat(line.debit) > 0 ? 
                                `$${parseFloat(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                                ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {parseFloat(line.credit) > 0 ? 
                                `$${parseFloat(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                                ''}
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            Total
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                            ${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                            ${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Supporting Documents</CardTitle>
                <CardDescription>View and manage files attached to this journal entry</CardDescription>
              </CardHeader>
              <CardContent>
                {/* File Upload Section */}
                {canUploadFiles && (
                  <div className="mb-6 p-4 border border-dashed rounded-md">
                    <h3 className="text-sm font-medium mb-2">Upload New File</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="flex-1 text-sm"
                      />
                      <Button 
                        onClick={handleFileUpload}
                        disabled={!selectedFile || isUploading}
                        size="sm"
                      >
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload
                      </Button>
                    </div>
                  </div>
                )}

                {/* File List */}
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading files...</span>
                  </div>
                ) : journalEntryFiles && journalEntryFiles.length > 0 ? (
                  <div className="grid gap-3">
                    {Array.isArray(journalEntryFiles) && journalEntryFiles.map((file: JournalEntryFile) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-500 mr-2" />
                          <div>
                            <p className="font-medium text-sm">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(file.uploadedAt || file.createdAt).toLocaleDateString()} • {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                    <p>No files have been attached to this journal entry.</p>
                    {canUploadFiles && (
                      <p className="text-sm mt-1">Attach supporting documents using the upload section above.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>History of actions performed on this journal entry</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {journalEntry.createdAt && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs">👤</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created by {journalEntry.createdBy}</p>
                        <p className="text-xs text-gray-500">{new Date(journalEntry.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {journalEntry.requestedAt && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs">🔍</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Submitted for approval by {journalEntry.requestedBy}</p>
                        <p className="text-xs text-gray-500">{new Date(journalEntry.requestedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {journalEntry.approvedAt && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-xs">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Approved by {journalEntry.approvedBy}</p>
                        <p className="text-xs text-gray-500">{new Date(journalEntry.approvedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {journalEntry.rejectedAt && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-xs">✗</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Rejected by {journalEntry.rejectedBy}</p>
                        <p className="text-xs text-gray-500">{new Date(journalEntry.rejectedAt).toLocaleString()}</p>
                        {journalEntry.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">Reason: {journalEntry.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {journalEntry.postedAt && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-xs">📗</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Posted to General Ledger by {journalEntry.postedBy}</p>
                        <p className="text-xs text-gray-500">{new Date(journalEntry.postedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {!journalEntry.requestedAt && 
                   !journalEntry.approvedAt && 
                   !journalEntry.rejectedAt && 
                   !journalEntry.postedAt && (
                    <div className="text-center py-4 text-gray-500">
                      <p>No additional activity recorded for this journal entry.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Journal Entry</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this journal entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason
            </label>
            <Textarea
              id="rejectionReason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
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
              Voiding a posted journal entry cannot be undone. This action will permanently change the status of this entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="voidReason" className="block text-sm font-medium text-gray-700 mb-1">
              Void Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="voidReason"
              placeholder="Enter the reason for voiding this entry..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => voidMutation.mutate()}
              disabled={!voidReason.trim() || voidMutation.isPending}
              variant="destructive"
            >
              {voidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Void Journal Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default JournalEntryDetail;