import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useEntity } from '../../../contexts/EntityContext';
import { useAuth } from '../../../contexts/AuthContext';
import PageHeader from '../../../components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, AlertCircle, Download, FileUp, Check, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

function BatchUpload() {
  const [, navigate] = useLocation();
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('upload');
  
  // Check if the entity ID is available
  const entityId = currentEntity?.id;
  const clientId = currentEntity?.clientId;
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!validateFileType(selectedFile)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV or Excel file.',
          variant: 'destructive',
        });
        event.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      loadFilePreview(selectedFile);
    }
  };
  
  // Validate file type
  const validateFileType = (file: File) => {
    const acceptedTypes = [
      'text/csv', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/wps-office.xlsx',
      'application/wps-office.xls',
      'application/octet-stream'
    ];
    return acceptedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  };
  
  // Load file preview
  const loadFilePreview = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Simple preview for CSV files - not perfect but good enough for display
      if (file.name.endsWith('.csv')) {
        const lines = content.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(',');
          const rows = lines.slice(1, 6).map(line => line.split(','));
          setFilePreview({ headers, rows });
        }
      } else {
        // For Excel files, we can't easily preview them on the client side
        // We'll show a placeholder
        setFilePreview(null);
      }
      
      setIsLoading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: 'File error',
        description: 'An error occurred while reading the file.',
        variant: 'destructive',
      });
      setIsLoading(false);
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };
  
  // Handle file upload for validation
  const validateFile = useMutation({
    mutationFn: async () => {
      if (!file || !entityId || !clientId) {
        throw new Error('Missing required data');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityId', entityId.toString());
      formData.append('clientId', clientId.toString());
      
      return await apiRequest(
        `/api/journal-entries/validate-batch`,
        {
          method: 'POST',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    },
    onSuccess: (data) => {
      setValidationResults(data);
      setActiveTab('validate');
      
      if (data.valid) {
        toast({
          title: 'Validation successful',
          description: `File validated successfully. ${data.journalEntries.length} entries are ready to be processed.`,
        });
      } else {
        toast({
          title: 'Validation failed',
          description: `${data.errors.length} errors found. Please fix the issues before processing.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Validation failed',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle file upload for processing (after validation)
  const processFile = useMutation({
    mutationFn: async () => {
      if (!file || !entityId || !clientId || !validationResults?.valid) {
        throw new Error('Missing required data or validation not complete');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityId', entityId.toString());
      formData.append('clientId', clientId.toString());
      
      return await apiRequest(
        `/api/journal-entries/process-batch`,
        {
          method: 'POST',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    },
    onSuccess: (data) => {
      setProcessingResults(data);
      setActiveTab('results');
      
      toast({
        title: 'Processing complete',
        description: `Successfully processed ${data.journalEntries.length} journal entries.`,
      });
      
      // Invalidate journal entries query to reflect the new entries
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${entityId}/journal-entries`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Processing failed',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle back button click
  const handleBack = () => {
    navigate('/journal-entries');
  };
  
  // Handle download template click
  const handleDownloadTemplate = () => {
    // Navigate to the template download endpoint
    window.location.href = '/api/journal-entries/download-template';
  };
  
  // Render "no entity selected" message
  if (!entityId) {
    return (
      <div className="py-6">
        <PageHeader 
          title="Batch Journal Entry Upload" 
          description="Upload multiple journal entries at once"
        >
          <Button 
            onClick={handleBack} 
            variant="outline" 
            className="inline-flex items-center px-4 py-2"
          >
            <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
            Back to Journal Entries
          </Button>
        </PageHeader>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="py-10 text-center">
                <p className="text-red-500">
                  Please select an entity before uploading journal entries.
                </p>
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
        title="Batch Journal Entry Upload" 
        description="Upload multiple journal entries at once"
      >
        <div className="flex space-x-2">
          <Button 
            onClick={handleBack} 
            variant="outline" 
            className="inline-flex items-center px-4 py-2"
          >
            <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
            Back
          </Button>
          
          <Button 
            onClick={handleDownloadTemplate} 
            variant="outline" 
            className="inline-flex items-center px-4 py-2"
          >
            <Download className="-ml-1 mr-2 h-5 w-5" />
            Download Template
          </Button>
        </div>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">1. Upload File</TabsTrigger>
            <TabsTrigger value="validate" disabled={!file}>2. Validate</TabsTrigger>
            <TabsTrigger value="results" disabled={!validationResults?.valid || !file}>3. Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Journal Entries</CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file containing journal entries to be processed.
                  Make sure your file follows the required format.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="mb-4 text-center">
                      <FileUp className="h-10 w-10 text-gray-400 mx-auto" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {file ? file.name : 'Upload a file'}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {file 
                          ? `${(file.size / 1024).toFixed(2)} KB, Last modified: ${new Date(file.lastModified).toLocaleString()}`
                          : 'CSV or Excel files only (.csv, .xlsx, .xls)'}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex text-sm">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="mr-2"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {file ? 'Change file' : 'Select file'}
                      </Button>
                      
                      {file && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setFile(null);
                            setFilePreview([]);
                            setValidationResults(null);
                            setProcessingResults(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {file && filePreview && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">File Preview</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {filePreview.headers?.map((header: string, index: number) => (
                                <TableHead key={index}>{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filePreview.rows?.map((row: string[], rowIndex: number) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Showing first 5 rows of the file.
                      </p>
                    </div>
                  )}
                  
                  {file && !filePreview && (
                    <Alert className="bg-blue-50 border-blue-100">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle>Excel File Selected</AlertTitle>
                      <AlertDescription>
                        Excel files cannot be previewed in the browser. Click Validate to process the file.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  disabled={!file || validateFile.isPending}
                  onClick={() => validateFile.mutate()}
                  className="ml-auto"
                >
                  {validateFile.isPending ? 'Validating...' : 'Validate File'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="validate">
            <Card>
              <CardHeader>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>
                  Review the validation results before processing journal entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationResults && (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <Progress 
                          value={validationResults.valid ? 100 : 0} 
                          className="h-3" 
                        />
                      </div>
                      <div className="flex items-center">
                        {validationResults.valid ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Valid</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Invalid</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-gray-500">Total Entries</p>
                        <p className="text-2xl font-bold mt-1">
                          {validationResults.journalEntries?.length || 0}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-green-600">Valid Entries</p>
                        <p className="text-2xl font-bold mt-1 text-green-700">
                          {validationResults.valid ? validationResults.journalEntries?.length : 0}
                        </p>
                      </div>
                      
                      <div className="bg-red-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-red-600">Errors</p>
                        <p className="text-2xl font-bold mt-1 text-red-700">
                          {validationResults.errors?.length || 0}
                        </p>
                      </div>
                    </div>
                    
                    {!validationResults.valid && validationResults.errors && validationResults.errors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Validation Errors</h3>
                        <div className="bg-red-50 p-4 rounded-md space-y-3">
                          {validationResults.errors.map((error: any, index: number) => (
                            <div key={index} className="flex">
                              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-red-800">
                                  {error.row ? `Row ${error.row}: ` : ''}{error.message}
                                </p>
                                {error.details && (
                                  <p className="text-xs text-red-700 mt-1">
                                    {error.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {validationResults.valid && validationResults.journalEntries && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Journal Entries Summary</h3>
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Reference</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Lines</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {validationResults.journalEntries.slice(0, 5).map((entry: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{entry.reference || entry.referenceNumber}</TableCell>
                                  <TableCell>
                                    {entry.date 
                                      ? new Date(entry.date).toLocaleDateString() 
                                      : 'N/A'}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {entry.description || 'No description'}
                                  </TableCell>
                                  <TableCell>{entry.journalType || 'JE'}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: 'USD'
                                    }).format(entry.totalDebit || entry.totalAmount || 0)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {entry.lines?.length || 0}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {validationResults.journalEntries.length > 5 && (
                          <p className="mt-1 text-xs text-gray-500">
                            Showing 5 of {validationResults.journalEntries.length} entries.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {!validationResults && (
                  <div className="py-10 text-center">
                    <p className="text-gray-500">
                      No validation results available. Please upload and validate a file.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('upload')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Upload
                </Button>
                
                {validationResults?.valid && (
                  <Button
                    onClick={() => processFile.mutate()}
                    disabled={processFile.isPending}
                  >
                    {processFile.isPending ? 'Processing...' : 'Process Entries'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  Journal entries have been processed and saved to the database.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processingResults ? (
                  <div className="space-y-6">
                    <Alert className="bg-green-50 border-green-100">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertTitle>Success!</AlertTitle>
                      <AlertDescription>
                        {`Successfully processed ${processingResults.journalEntries?.length || 0} journal entries.`}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-gray-500">Total Entries</p>
                        <p className="text-2xl font-bold mt-1">
                          {processingResults.journalEntries?.length || 0}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-md">
                        <p className="text-sm font-medium text-green-600">Status</p>
                        <p className="text-2xl font-bold mt-1 text-green-700">
                          Processed
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Processed Journal Entries</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {processingResults.journalEntries?.map((entry: any, index: number) => (
                              <TableRow 
                                key={index}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => navigate(`/journal-entries/${entry.id}`)}
                              >
                                <TableCell>#{entry.id}</TableCell>
                                <TableCell>{entry.reference || entry.referenceNumber}</TableCell>
                                <TableCell>
                                  {entry.date 
                                    ? new Date(entry.date).toLocaleDateString() 
                                    : 'N/A'}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {entry.description || 'No description'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                    {entry.status || 'Draft'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                  }).format(entry.totalDebit || entry.totalAmount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-gray-500">
                      No processing results available. Please validate and process a file.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('validate')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Validation
                </Button>
                
                <Button
                  onClick={handleBack}
                >
                  View All Journal Entries
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default BatchUpload;