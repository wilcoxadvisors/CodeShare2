// src/components/BatchJournalUpload.tsx
import { useState } from 'react';
import { useEntity } from '../contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JournalEntryStatus } from '@shared/schema';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

export default function BatchJournalUpload() {
  const { currentEntity } = useEntity();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'uploading' | 'success' | 'error'>('idle');
  const [validationResults, setValidationResults] = useState<any>(null);
  const [submitStatus, setSubmitStatus] = useState<'draft' | 'pending_approval' | 'post_directly'>('draft');

  // Query accounts for validation
  const { data: accounts } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : ["no-entity-selected"],
    enabled: !!currentEntity
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setValidationResults(null);
    }
  };

  const validateFile = async () => {
    if (!file || !currentEntity) return;
    
    setUploadStatus('validating');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest(`/api/entities/${currentEntity.id}/journal-entries/validate-batch`, {
        method: 'POST',
        data: formData
      });
      
      setValidationResults(response);
      
      if (response.valid) {
        setUploadStatus('idle');
        toast({
          title: "Validation Successful",
          description: "The spreadsheet is valid and ready to be uploaded.",
          variant: "default"
        });
      } else {
        setUploadStatus('error');
        toast({
          title: "Validation Failed",
          description: "There are errors in the spreadsheet. Please review them and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error validating file:", error);
      setUploadStatus('error');
      toast({
        title: "Validation Error",
        description: "Failed to validate the spreadsheet. Please check the format and try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!file || !currentEntity) return;
    
    setIsUploading(true);
    setUploadStatus('uploading');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('status', submitStatus);
      
      await apiRequest(`/api/entities/${currentEntity.id}/journal-entries/batch`, {
        method: 'POST',
        data: formData
      });
      
      setUploadStatus('success');
      setFile(null);
      
      toast({
        title: "Upload Successful",
        description: "Journal entries have been created successfully.",
        variant: "default"
      });
      
      // Invalidate journal entries query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/entities/${currentEntity.id}/journal-entries`] });
      
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus('error');
      toast({
        title: "Upload Error",
        description: "Failed to upload journal entries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Check if the xlsx library is available or if we need to fall back to CSV
    try {
      // Create an Excel template with comprehensive examples
      import('xlsx').then(XLSX => {
        // Create a workbook with two sheets - Template and Example
        const wb = XLSX.utils.book_new();
        
        // Create the template sheet
        const templateHeaders = [
          "Date", "Reference", "Description", "Account Code", "Account Name", "Debit", "Credit", "Memo"
        ];
        
        const templateData = [
          templateHeaders,
          // Leave some empty rows for the user to fill in
          Array(8).fill(""),
          Array(8).fill(""),
          Array(8).fill(""),
          Array(8).fill(""),
          Array(8).fill("")
        ];
        
        const templateSheet = XLSX.utils.aoa_to_sheet(templateData);
        
        // Add some cell styling - make the header row bold and add column width
        templateSheet['!cols'] = [
          { width: 12 }, // Date
          { width: 15 }, // Reference
          { width: 30 }, // Description
          { width: 15 }, // Account Code
          { width: 25 }, // Account Name
          { width: 12 }, // Debit
          { width: 12 }, // Credit
          { width: 30 }  // Memo
        ];
        
        // Create the example sheet
        const exampleData = [
          templateHeaders,
          ["2025-03-18", "JE-001", "Office Supplies Purchase", "1000", "Cash", "", "500.00", "Payment for office supplies"],
          ["2025-03-18", "JE-001", "Office Supplies Purchase", "6000", "Office Supplies", "500.00", "", "Purchase of office supplies"],
          ["2025-03-19", "JE-002", "Client Invoice", "1100", "Accounts Receivable", "1200.00", "", "Invoice #INV-2025-001"],
          ["2025-03-19", "JE-002", "Client Invoice", "4000", "Service Revenue", "", "1200.00", "Consulting services"],
          ["2025-03-20", "JE-003", "Payroll Entry", "6500", "Salary Expense", "3000.00", "", "March payroll"],
          ["2025-03-20", "JE-003", "Payroll Entry", "2100", "Payroll Liabilities", "", "650.00", "Taxes withheld"],
          ["2025-03-20", "JE-003", "Payroll Entry", "1000", "Cash", "", "2350.00", "Net payroll paid"]
        ];
        
        const exampleSheet = XLSX.utils.aoa_to_sheet(exampleData);
        
        // Apply the same column widths to the example sheet
        exampleSheet['!cols'] = templateSheet['!cols'];
        
        // Add the sheets to the workbook
        XLSX.utils.book_append_sheet(wb, templateSheet, "Template");
        XLSX.utils.book_append_sheet(wb, exampleSheet, "Examples");
        
        // Add a Tips sheet with additional guidance
        const tipsData = [
          ["Journal Entry Upload Tips"],
          [""],
          ["1. Each journal entry (group of lines with the same Reference) must balance (total debits = total credits)"],
          ["2. Use the date format YYYY-MM-DD (e.g., 2025-03-18)"],
          ["3. All entries with the same Reference will be treated as a single journal entry"],
          ["4. Account Codes must exactly match existing accounts in the system"],
          ["5. Enter amounts without currency symbols or commas (e.g., 1250.00, not $1,250.00)"],
          ["6. Leave either Debit OR Credit blank for each line, not both"],
          ["7. Description is for the overall journal entry; Memo is for the specific line"],
          [""]
        ];
        
        const tipsSheet = XLSX.utils.aoa_to_sheet(tipsData);
        XLSX.utils.book_append_sheet(wb, tipsSheet, "Tips");
        
        // Generate the Excel file and trigger download
        XLSX.writeFile(wb, "journal_entries_template.xlsx");
      }).catch(err => {
        console.error("Error creating Excel template:", err);
        // Fall back to CSV if Excel creation fails
        createCSVTemplate();
      });
    } catch (err) {
      console.error("XLSX library not available:", err);
      // Fall back to CSV
      createCSVTemplate();
    }
  };
  
  // Fallback function to create a CSV template
  const createCSVTemplate = () => {
    const headers = "Date,Reference,Description,Account Code,Account Name,Debit,Credit,Memo\n";
    const exampleRow1 = "2025-03-18,JE-001,Office Supplies Purchase,1000,Cash,,500.00,Payment for office supplies\n";
    const exampleRow2 = "2025-03-18,JE-001,Office Supplies Purchase,6000,Office Supplies,500.00,,Purchase of office supplies\n";
    const exampleRow3 = "2025-03-19,JE-002,Client Invoice,1100,Accounts Receivable,1200.00,,Invoice #INV-2025-001\n";
    const exampleRow4 = "2025-03-19,JE-002,Client Invoice,4000,Service Revenue,,1200.00,Consulting services\n";
    
    const csvContent = headers + exampleRow1 + exampleRow2 + exampleRow3 + exampleRow4;
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_entries_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid gap-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="upload">Upload Entries</TabsTrigger>
            <TabsTrigger value="template">Download Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Journal Entries</CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file containing multiple journal entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="file">Select Spreadsheet</Label>
                    <Input 
                      id="file" 
                      type="file" 
                      accept=".csv,.xlsx,.xls" 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                    {file && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-1" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  
                  {file && (
                    <div className="grid gap-2">
                      <Label>Upload as</Label>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="draft"
                            name="uploadStatus"
                            value="draft"
                            checked={submitStatus === 'draft'}
                            onChange={() => setSubmitStatus('draft')}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor="draft" className="text-sm font-medium text-gray-700">
                            Save as Draft
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="pending_approval"
                            name="uploadStatus"
                            value="pending_approval"
                            checked={submitStatus === 'pending_approval'}
                            onChange={() => setSubmitStatus('pending_approval')}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor="pending_approval" className="text-sm font-medium text-gray-700">
                            Submit for Approval
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="post_directly"
                            name="uploadStatus"
                            value="post_directly"
                            checked={submitStatus === 'post_directly'}
                            onChange={() => setSubmitStatus('post_directly')}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor="post_directly" className="text-sm font-medium text-gray-700">
                            Post Directly
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {validationResults && !validationResults.valid && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                      <h3 className="text-sm font-medium text-red-800 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Validation Errors
                      </h3>
                      <ul className="mt-2 text-sm text-red-700 list-disc pl-5">
                        {validationResults.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {uploadStatus === 'success' && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                      <h3 className="text-sm font-medium text-green-800 flex items-center">
                        <Check className="w-4 h-4 mr-1" />
                        Upload Successful
                      </h3>
                      <p className="mt-1 text-sm text-green-700">
                        The journal entries have been created successfully.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={validateFile} 
                  disabled={!file || isUploading}
                >
                  Validate
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isUploading || (validationResults && !validationResults.valid)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading ? 'Uploading...' : 'Upload Journal Entries'}
                  <Upload className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="template" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Download Template</CardTitle>
                <CardDescription>
                  Download a template file to use for batch uploading journal entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-4">
                  <h3 className="text-sm font-medium mb-2">Template Format:</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    The template includes the following columns:
                  </p>
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    <li>Date (YYYY-MM-DD format)</li>
                    <li>Reference (unique reference code)</li>
                    <li>Description (general description of the entry)</li>
                    <li>Account Code (must match an existing account code)</li>
                    <li>Account Name (for reference only, account code is used for matching)</li>
                    <li>Debit (amount in debit column)</li>
                    <li>Credit (amount in credit column)</li>
                    <li>Memo (optional line-specific description)</li>
                  </ul>
                  
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Rules:</h3>
                    <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                      <li>Each journal entry must balance (total debits = total credits)</li>
                      <li>Multiple lines with the same reference will be treated as one journal entry</li>
                      <li>Account codes must exist in the system</li>
                      <li>Dates must be in YYYY-MM-DD format</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={downloadTemplate}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}