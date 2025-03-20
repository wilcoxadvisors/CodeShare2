import React, { useState, useCallback, useMemo } from 'react';
import { useEntity } from '@/contexts/EntityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { importFromCSV, generateJournalEntryTemplate } from '@/lib/export-utils';
import { AlertCircle, DownloadCloud, UploadCloud } from 'lucide-react';
import { JournalEntryStatus, AccountType } from '../lib/types';
import PageHeader from '@/components/PageHeader';

interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  active: boolean;
}

interface JournalEntryLine {
  accountId: number;
  description: string;
  debit: string;
  credit: string;
}

interface JournalEntryImport {
  reference: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
}

interface ParsedRow {
  Reference: string;
  'Date (YYYY-MM-DD)': string;
  Description: string;
  'Account Code': string;
  'Account Name': string;
  'Debit Amount': string | number;
  'Credit Amount': string | number;
  'Line Description': string;
}

export default function BatchUpload() {
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{
    inProgress: boolean;
    progress: number;
    totalRows: number;
    processedRows: number;
    failedRows: number;
    validatedEntries: JournalEntryImport[];
    errors: string[];
  }>({
    inProgress: false,
    progress: 0,
    totalRows: 0,
    processedRows: 0,
    failedRows: 0,
    validatedEntries: [],
    errors: []
  });
  
  // Fetch accounts for validation and template generation
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : ['no-entity-selected'],
    enabled: !!currentEntity
  });
  
  // Create a lookup map for accounts by code (for faster validation)
  const accountsByCode = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach(account => {
      map.set(account.code, account);
    });
    return map;
  }, [accounts]);
  
  // Mutation for batch creating journal entries
  const batchCreateMutation = useMutation({
    mutationFn: async (entries: JournalEntryImport[]) => {
      return await apiRequest(
        `/api/entities/${currentEntity!.id}/journal-entries/batch`,
        {
          method: 'POST',
          data: { entries }
        }
      );
    },
    onSuccess: (response) => {
      setProcessingStatus(prev => ({
        ...prev,
        inProgress: false
      }));
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${processingStatus.validatedEntries.length} journal entries.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity!.id}/journal-entries`] });
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity!.id}/general-ledger`] });
    },
    onError: (error: any) => {
      setProcessingStatus(prev => ({
        ...prev,
        inProgress: false,
        errors: [...prev.errors, `API Error: ${error.message}`]
      }));
      
      toast({
        title: "Import Failed",
        description: `Failed to import journal entries: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Only CSV files are supported.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      
      // Reset processing status
      setProcessingStatus({
        inProgress: false,
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        failedRows: 0,
        validatedEntries: [],
        errors: []
      });
    }
  };
  
  // Process the CSV file
  const processFile = useCallback(async () => {
    if (!file || !currentEntity) return;
    
    try {
      setProcessingStatus(prev => ({
        ...prev,
        inProgress: true,
        progress: 0,
        errors: []
      }));
      
      // Parse CSV data with progress tracking
      const result = await importFromCSV<ParsedRow>(file, {
        header: true,
        worker: true,
        onProgress: ({ processed, total }) => {
          setProcessingStatus(prev => ({
            ...prev,
            progress: Math.min(Math.round((processed / (total || processed * 2)) * 100), 90),
            totalRows: total || prev.totalRows,
            processedRows: processed
          }));
        }
      });
      
      // Track errors and grouped entries
      const errors: string[] = [];
      const entriesByReference: Record<string, ParsedRow[]> = {};
      
      // Group rows by reference for batch processing
      result.data.forEach((row, index) => {
        // Basic validation
        if (!row.Reference || !row['Date (YYYY-MM-DD)']) {
          errors.push(`Row ${index + 2}: Missing reference or date`);
          return;
        }
        
        // Validate account code
        if (!row['Account Code'] || !accountsByCode.has(row['Account Code'])) {
          errors.push(`Row ${index + 2}: Invalid account code "${row['Account Code']}"`);
          return;
        }
        
        // Group by reference
        if (!entriesByReference[row.Reference]) {
          entriesByReference[row.Reference] = [];
        }
        entriesByReference[row.Reference].push(row);
      });
      
      // Process each reference group into a journal entry
      const validatedEntries: JournalEntryImport[] = [];
      
      Object.entries(entriesByReference).forEach(([reference, rows]) => {
        // Skip if no rows
        if (rows.length === 0) return;
        
        const firstRow = rows[0];
        const lines: JournalEntryLine[] = [];
        
        // Process lines
        rows.forEach((row, rowIndex) => {
          // Get account from code
          const account = accountsByCode.get(row['Account Code']);
          if (!account) {
            errors.push(`Entry ${reference}, Line ${rowIndex + 1}: Account not found`);
            return;
          }
          
          // Parse debit/credit values
          const debitValue = typeof row['Debit Amount'] === 'number' 
            ? row['Debit Amount'].toString() 
            : (row['Debit Amount'] || '').toString().trim();
            
          const creditValue = typeof row['Credit Amount'] === 'number' 
            ? row['Credit Amount'].toString() 
            : (row['Credit Amount'] || '').toString().trim();
          
          // Validate debit/credit values
          if (!debitValue && !creditValue) {
            errors.push(`Entry ${reference}, Line ${rowIndex + 1}: Missing debit or credit amount`);
            return;
          }
          
          // Create line
          lines.push({
            accountId: account.id,
            description: row['Line Description'] || '',
            debit: debitValue || '0',
            credit: creditValue || '0'
          });
        });
        
        // Check if entry is balanced
        const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
        const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
          errors.push(`Entry ${reference}: Debits (${totalDebit.toFixed(2)}) do not equal credits (${totalCredit.toFixed(2)})`);
          return;
        }
        
        // Valid entry, add to validated entries
        validatedEntries.push({
          reference,
          date: firstRow['Date (YYYY-MM-DD)'],
          description: firstRow.Description || '',
          lines
        });
      });
      
      // Update status
      setProcessingStatus(prev => ({
        ...prev,
        inProgress: false,
        progress: 100,
        validatedEntries,
        failedRows: errors.length,
        errors
      }));
      
      // Show success/error toast
      if (validatedEntries.length > 0) {
        toast({
          title: "Validation Complete",
          description: `Successfully validated ${validatedEntries.length} journal entries. Ready to import.`,
        });
      } else {
        toast({
          title: "Validation Failed",
          description: "No valid journal entries found in the file.",
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      setProcessingStatus(prev => ({
        ...prev,
        inProgress: false,
        errors: [...prev.errors, `Parse error: ${error.message}`]
      }));
      
      toast({
        title: "Processing Error",
        description: `Failed to process CSV file: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [file, currentEntity, accountsByCode, toast]);
  
  // Import validated entries
  const importEntries = useCallback(() => {
    if (processingStatus.validatedEntries.length === 0) {
      toast({
        title: "No Entries to Import",
        description: "Please upload and validate a CSV file first.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingStatus(prev => ({
      ...prev,
      inProgress: true,
      progress: 0
    }));
    
    // Call mutation to batch create entries
    batchCreateMutation.mutate(processingStatus.validatedEntries);
    
  }, [processingStatus.validatedEntries, batchCreateMutation, toast]);
  
  // Download template
  const downloadTemplate = useCallback(() => {
    if (!accounts || accounts.length === 0) {
      toast({
        title: "No Accounts Available",
        description: "Cannot generate template without accounts.",
        variant: "destructive",
      });
      return;
    }
    
    // Generate template CSV
    const csv = generateJournalEntryTemplate(accounts);
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `journal_entry_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Journal entry template has been downloaded.",
    });
  }, [accounts, toast]);
  
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
  
  return (
    <>
      <PageHeader 
        title="Batch Upload Journal Entries" 
        description="Upload multiple journal entries from a CSV file"
      >
        <Button 
          onClick={downloadTemplate}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <DownloadCloud className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
          Download Template
        </Button>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file containing journal entries to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">CSV File</Label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="csv-file" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                          <span>Upload a file</span>
                          <input 
                            id="csv-file" 
                            name="csv-file" 
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="sr-only" 
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        CSV files only
                      </p>
                    </div>
                  </div>
                </div>
                
                {file && (
                  <div className="text-sm text-gray-600">
                    <p><strong>Selected file:</strong> {file.name}</p>
                    <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
                
                <div className="pt-4">
                  <Button 
                    onClick={processFile}
                    disabled={!file || processingStatus.inProgress}
                    className="w-full"
                  >
                    {processingStatus.inProgress ? 'Processing...' : 'Validate File'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Results Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Import Status</CardTitle>
              <CardDescription>
                Validation results and import status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processingStatus.inProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{processingStatus.progress}%</span>
                    </div>
                    <Progress value={processingStatus.progress} className="h-2" />
                  </div>
                )}
                
                {processingStatus.processedRows > 0 && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total rows processed:</p>
                      <p className="font-medium">{processingStatus.processedRows}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Valid journal entries:</p>
                      <p className="font-medium">{processingStatus.validatedEntries.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Errors found:</p>
                      <p className="font-medium">{processingStatus.errors.length}</p>
                    </div>
                  </div>
                )}
                
                {processingStatus.errors.length > 0 && (
                  <Alert variant="destructive" className="my-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 max-h-40 overflow-y-auto text-sm">
                        {processingStatus.errors.map((error, index) => (
                          <div key={index} className="mb-1">• {error}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {processingStatus.validatedEntries.length > 0 && (
                  <div className="pt-4">
                    <Button 
                      onClick={importEntries}
                      disabled={processingStatus.inProgress || batchCreateMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {batchCreateMutation.isPending 
                        ? 'Importing...' 
                        : `Import ${processingStatus.validatedEntries.length} Journal Entries`
                      }
                    </Button>
                  </div>
                )}
                
                {processingStatus.validatedEntries.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Entries to be imported:</h4>
                    <div className="max-h-96 overflow-y-auto border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Lines
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {processingStatus.validatedEntries.map((entry, index) => {
                            const totalAmount = entry.lines.reduce(
                              (sum, line) => sum + parseFloat(line.debit || '0'), 
                              0
                            );
                            
                            return (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {entry.reference}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {entry.date}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {entry.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {entry.lines.length}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ${totalAmount.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}