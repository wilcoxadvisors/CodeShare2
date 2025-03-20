import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  FileUp, 
  FilePlus, 
  File, 
  FileSpreadsheet, 
  FileText, 
  Trash2,
  Download,
  Sparkles 
} from 'lucide-react';

interface BudgetDocument {
  id: number;
  budgetId: number;
  filename: string;
  originalFilename: string;
  fileType: string;
  mimeType: string;
  size: number;
  processingStatus: string;
  extractedData: any;
  uploadedBy: number;
  uploadedAt: string;
  path: string;
}

interface DocumentUploadProps {
  entityId: number;
  hasXaiIntegration: boolean;
}

export default function DocumentUpload({ entityId, hasXaiIntegration }: DocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // Fetch budget documents
  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/entities', entityId, 'budget-documents'],
    queryFn: async () => {
      const response = await apiRequest(`/api/entities/${entityId}/budget-documents`);
      return response as BudgetDocument[];
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress for better user experience
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 5;
          return next > 90 ? 90 : next;
        });
      }, 300);
      
      try {
        const response = await apiRequest(`/api/entities/${entityId}/budget-documents`, {
          method: 'POST',
          body: formData,
          formData: true,
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        return response;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Document uploaded',
        description: 'Your document has been uploaded successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budget-documents'] });
      setCurrentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: () => {
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your document. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(`/api/entities/${entityId}/budget-documents/${documentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Document deleted',
        description: 'The document has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budget-documents'] });
      setSelectedDocId(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error deleting the document.',
        variant: 'destructive',
      });
    },
  });

  // Process document with AI mutation
  const processWithAiMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(`/api/entities/${entityId}/budget-documents/${documentId}/process`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Processing started',
        description: 'Your document is being processed with AI. This may take a moment.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/entities', entityId, 'budget-documents'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error processing your document. Please check XAI integration.',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setCurrentFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!currentFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!allowedTypes.includes(currentFile.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, Excel, or CSV file.',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', currentFile);
    
    uploadMutation.mutate(formData);
  };

  const handleDelete = (documentId: number) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleProcessWithAi = (documentId: number) => {
    if (!hasXaiIntegration) {
      toast({
        title: 'XAI Integration Required',
        description: 'To process documents with AI, you need to set up XAI integration first.',
        variant: 'destructive',
      });
      return;
    }
    processWithAiMutation.mutate(documentId);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      default:
        return <File className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Selected document details
  const selectedDocument = documents?.find(doc => doc.id === selectedDocId);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full md:w-auto grid-cols-2">
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Upload budget and forecast related documents for processing and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.xlsx,.xls,.csv"
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Accepted file types: PDF, Excel, CSV
                </p>
              </div>
              
              {currentFile && (
                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2">
                    {currentFile.type.includes('pdf') ? (
                      <FileText className="h-8 w-8 text-red-500" />
                    ) : currentFile.type.includes('sheet') || currentFile.type.includes('excel') || currentFile.type.includes('csv') ? (
                      <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    ) : (
                      <File className="h-8 w-8 text-blue-500" />
                    )}
                    <div>
                      <h4 className="text-sm font-medium">{currentFile.name}</h4>
                      <p className="text-xs text-muted-foreground">{formatFileSize(currentFile.size)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              {hasXaiIntegration && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>AI Processing Available</AlertTitle>
                  <AlertDescription>
                    Your documents will be processed with XAI to extract budget and forecast data.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={!currentFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="documents" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Document Library</CardTitle>
            <CardDescription>
              Manage your uploaded documents and process them with AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {documents && documents.length > 0 ? (
                  selectedDocId ? (
                    // Document details view
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => setSelectedDocId(null)}>
                          Back to Documents
                        </Button>
                        <div className="flex space-x-2">
                          {selectedDocument?.processingStatus !== 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleProcessWithAi(selectedDocument!.id)}
                              disabled={processWithAiMutation.isPending || !hasXaiIntegration}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Process with AI
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(selectedDocument!.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="rounded-md border p-4">
                        <div className="flex items-center gap-3 mb-4">
                          {getFileIcon(selectedDocument?.fileType || '')}
                          <div>
                            <h3 className="text-lg font-medium">{selectedDocument?.originalFilename}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{formatFileSize(selectedDocument?.size || 0)}</span>
                              <span>•</span>
                              <span>Uploaded on {format(new Date(selectedDocument?.uploadedAt || ''), 'MMM d, yyyy')}</span>
                              <span>•</span>
                              <span>Status: {getStatusBadge(selectedDocument?.processingStatus || 'pending')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        {selectedDocument?.processingStatus === 'completed' && selectedDocument?.extractedData ? (
                          <div className="space-y-4">
                            <h4 className="text-md font-medium">Extracted Data</h4>
                            <pre className="whitespace-pre-wrap bg-muted rounded-md p-4 text-sm overflow-auto max-h-96">
                              {JSON.stringify(selectedDocument.extractedData, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            {selectedDocument?.processingStatus === 'processing' ? (
                              <div className="space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">Processing document with AI...</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <FilePlus className="h-8 w-8 mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground">Document has not been processed yet</p>
                                {hasXaiIntegration ? (
                                  <Button onClick={() => handleProcessWithAi(selectedDocument!.id)}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Process with AI
                                  </Button>
                                ) : (
                                  <p className="text-sm text-destructive">XAI integration required for processing</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Document list view
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getFileIcon(doc.fileType)}
                                <span className="font-medium">{doc.originalFilename}</span>
                              </div>
                            </TableCell>
                            <TableCell>{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{formatFileSize(doc.size)}</TableCell>
                            <TableCell>{getStatusBadge(doc.processingStatus)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedDocId(doc.id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
                ) : (
                  <div className="text-center py-8">
                    <FilePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No documents found</h3>
                    <p className="text-muted-foreground mb-6">
                      Upload budget or forecast related documents to get started
                    </p>
                    <Button onClick={() => setActiveTab('upload')}>
                      <FileUp className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}