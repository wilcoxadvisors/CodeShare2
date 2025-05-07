import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  Upload,
  File,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { 
  getJournalEntriesBaseUrl, 
  getJournalEntriesBatchTemplateUrl 
} from '@/api/urlHelpers';

const ACCEPTED_FILE_TYPES = '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';

function BatchUpload() {
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [result, setResult] = useState<{
    success: boolean;
    journalEntries: any[];
    errors: any[];
  } | null>(null);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    // Reset states when a new file is selected
    setFile(selectedFile);
    setPreview([]);
    setValidationErrors([]);
    setStep('upload');
    setResult(null);
    
    if (selectedFile) {
      toast({
        title: 'File selected',
        description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`,
      });
    }
  };
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPreview([]);
      setValidationErrors([]);
      setStep('upload');
      setResult(null);
      
      toast({
        title: 'File dropped',
        description: `${droppedFile.name} (${(droppedFile.size / 1024).toFixed(2)} KB)`,
      });
    }
  }, [toast]);
  
  // Prevent default behavior for drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);
  
  // Handle validation - send file to backend for validation
  const validateFile = useMutation({
    mutationFn: async () => {
      if (!file || !currentEntity) return null;
      if (!currentEntity.clientId) {
        throw new Error('Client ID is required for validation');
      }
      
      setIsValidating(true);
      
      const formData = new FormData();
      // Include filename as third parameter to ensure proper field name and filename
      formData.append('file', file, file.name);
      formData.append('entityId', currentEntity.id.toString());
      
      // Use hierarchical URL pattern
      const validateUrl = `${getJournalEntriesBaseUrl(currentEntity.clientId, currentEntity.id)}/validate-batch`;
      const response = await apiRequest(validateUrl, {
        method: 'POST',
        data: formData,
      });
      
      setIsValidating(false);
      
      return response;
    },
    onSuccess: (data) => {
      if (!data) return;
      
      if (data.valid) {
        setPreview(data.journalEntries || []);
        setValidationErrors([]);
        setStep('preview');
        
        toast({
          title: 'Validation successful',
          description: `${data.journalEntries?.length || 0} journal entries are ready to be imported`,
        });
      } else {
        setValidationErrors(data.errors || ['Unknown validation error']);
        
        toast({
          title: 'Validation failed',
          description: 'Please fix the errors and try again',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setIsValidating(false);
      setValidationErrors([error.message || 'An error occurred during validation']);
      
      toast({
        title: 'Validation error',
        description: error.message || 'An error occurred during validation',
        variant: 'destructive',
      });
    }
  });
  
  // Handle import - send validated data to backend for import
  const importJournalEntries = useMutation({
    mutationFn: async () => {
      if (!file || !currentEntity) return null;
      if (!currentEntity.clientId) {
        throw new Error('Client ID is required for import');
      }
      
      const formData = new FormData();
      // Include filename as third parameter to ensure proper field name and filename
      formData.append('file', file, file.name);
      formData.append('entityId', currentEntity.id.toString());
      
      // Use hierarchical URL pattern
      const importUrl = `${getJournalEntriesBaseUrl(currentEntity.clientId, currentEntity.id)}/import-batch`;
      const response = await apiRequest(importUrl, {
        method: 'POST',
        data: formData,
      });
      
      return response;
    },
    onSuccess: (data) => {
      if (!data) return;
      
      setResult({
        success: true,
        journalEntries: data.journalEntries || [],
        errors: data.errors || []
      });
      
      setStep('result');
      
      toast({
        title: 'Import successful',
        description: `${data.journalEntries?.length || 0} journal entries have been imported`,
      });
    },
    onError: (error: any) => {
      setResult({
        success: false,
        journalEntries: [],
        errors: [error.message || 'An error occurred during import']
      });
      
      setStep('result');
      
      toast({
        title: 'Import error',
        description: error.message || 'An error occurred during import',
        variant: 'destructive',
      });
    }
  });
  
  // Handle download template
  const handleDownloadTemplate = () => {
    if (!currentEntity?.clientId || !currentEntity?.id) {
      toast({
        title: 'Error',
        description: 'Client ID and Entity ID are required for template download',
        variant: 'destructive',
      });
      return;
    }
    
    // Trigger download of CSV template using hierarchical URL
    window.location.href = getJournalEntriesBatchTemplateUrl(currentEntity.clientId, currentEntity.id);
  };
  
  // Handle back button click
  const handleBack = () => {
    if (!currentEntity?.clientId) {
      // If no current entity or client, fallback to home
      navigate('/');
      return;
    }
    // Navigate to journal entries list using hierarchical URL
    navigate(`/clients/${currentEntity.clientId}/entities/${currentEntity.id}/journal-entries`);
  };
  
  // Handle navigation between steps
  const handlePrevStep = () => {
    if (step === 'preview') {
      setStep('upload');
    } else if (step === 'result') {
      setStep('preview');
    }
  };
  
  const getFileIcon = () => {
    if (!file) return <Upload className="w-8 h-8 text-gray-400" />;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return <FileText className="w-8 h-8 text-blue-600" />;
    } else if (['xlsx', 'xls'].includes(extension || '')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    } else {
      return <File className="w-8 h-8 text-gray-600" />;
    }
  };
  
  if (!currentEntity) {
    return (
      <div className="py-6">
        <PageHeader
          title="Batch Upload Journal Entries"
          description="Import multiple journal entries at once from CSV or Excel"
        >
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500 mb-4">Please select an entity before uploading journal entries</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <PageHeader
        title="Batch Upload Journal Entries"
        description="Import multiple journal entries at once from CSV or Excel"
      >
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Batch Upload for {currentEntity.name}</CardTitle>
            <CardDescription>
              Upload a CSV or Excel file with multiple journal entries for bulk import
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Step 1: File Upload */}
            {step === 'upload' && (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 mb-6 ${
                    file ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    {getFileIcon()}
                    
                    <div className="text-center">
                      <p className="text-gray-700">
                        {file
                          ? `File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
                          : 'Drag and drop your file here, or click to browse'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Accepted file types: CSV, Excel (.xlsx, .xls)
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-md transition-colors"
                      >
                        Browse Files
                      </Label>
                      
                      {file && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => setFile(null)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <Input
                      id="file-upload"
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
                
                {validationErrors.length > 0 && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Failed</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-sm">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    onClick={() => validateFile.mutate()}
                    disabled={!file || isValidating || validateFile.isPending}
                  >
                    {isValidating || validateFile.isPending ? 'Validating...' : 'Validate'}
                  </Button>
                </div>
              </>
            )}
            
            {/* Step 2: Preview */}
            {step === 'preview' && (
              <>
                <div className="mb-6">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Validation Successful</AlertTitle>
                    <AlertDescription>
                      The file passed validation. Review the entries below before importing.
                    </AlertDescription>
                  </Alert>
                </div>
                
                <div className="border rounded-lg overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Lines</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{entry.date}</TableCell>
                            <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                            <TableCell>{entry.reference || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                {entry.status || 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              }).format(entry.totalAmount || 0)}
                            </TableCell>
                            <TableCell>{entry.lines?.length || 0} lines</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevStep}>
                    Back
                  </Button>
                  
                  <Button
                    onClick={() => importJournalEntries.mutate()}
                    disabled={importJournalEntries.isPending}
                  >
                    {importJournalEntries.isPending ? 'Importing...' : 'Import Journal Entries'}
                  </Button>
                </div>
              </>
            )}
            
            {/* Step 3: Result */}
            {step === 'result' && result && (
              <>
                <div className="mb-6">
                  <Alert variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {result.success ? 'Import Successful' : 'Import Failed'}
                    </AlertTitle>
                    <AlertDescription>
                      {result.success
                        ? `Successfully imported ${result.journalEntries.length} journal entries.`
                        : 'There were errors during the import process.'}
                    </AlertDescription>
                  </Alert>
                </div>
                
                {result.errors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-red-600 mb-2">Errors:</h3>
                    <ul className="list-disc pl-5 text-sm">
                      {result.errors.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.journalEntries.length > 0 && (
                  <div className="border rounded-lg overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.journalEntries.map((entry, index) => (
                            <TableRow
                              key={index}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => {
                                if (currentEntity?.clientId) {
                                  navigate(`/clients/${currentEntity.clientId}/entities/${currentEntity.id}/journal-entries/${entry.id}`);
                                }
                              }}
                            >
                              <TableCell className="font-medium">#{entry.id}</TableCell>
                              <TableCell>{entry.date}</TableCell>
                              <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                              <TableCell>{entry.reference || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  {entry.status || 'Draft'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD'
                                }).format(entry.totalAmount || 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Upload Another File
                  </Button>
                  
                  <Button onClick={() => {
                    if (currentEntity?.clientId) {
                      navigate(`/clients/${currentEntity.clientId}/entities/${currentEntity.id}/journal-entries`);
                    } else {
                      navigate('/');
                    }
                  }}>
                    Go to Journal Entries
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BatchUpload;