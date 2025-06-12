import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BulkUploadResult {
  created: number;
  skipped: number;
  duplicates?: string[];
  message: string;
}

interface BulkDimensionValueUploadProps {
  dimensionId: number;
  dimensionName: string;
  onSuccess?: () => void;
}

export function BulkDimensionValueUpload({ 
  dimensionId, 
  dimensionName, 
  onSuccess 
}: BulkDimensionValueUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await apiRequest(`/api/dimensions/${dimensionId}/values/batch-upload`, {
        method: 'POST',
        data: formData,
        isFormData: true,
      });
      
      return response;
    },
    onSuccess: (result: BulkUploadResult) => {
      setUploadResult(result);
      toast({
        title: "Upload Complete",
        description: `Created ${result.created} new values${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}`,
      });
      
      // Invalidate dimension values query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dimensions', dimensionId, 'values'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dimensions'] 
      });
      
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      console.log(`Downloading template for dimension ${dimensionId}...`);
      
      const response = await fetch(`/api/dimensions/${dimensionId}/values/csv-template`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/csv',
        },
      });

      console.log(`Download response status: ${response.status}`);
      console.log(`Download response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Download failed with status ${response.status}:`, errorText);
        throw new Error(`Failed to download template (${response.status}): ${errorText}`);
      }

      const csvContent = await response.text();
      console.log(`CSV content length: ${csvContent.length}`);
      console.log(`CSV content preview:`, csvContent.substring(0, 200));
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${dimensionName.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      console.log(`Downloading file as: ${filename}`);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template Downloaded",
        description: "CSV template has been downloaded successfully",
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download CSV template. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Upload Values for {dimensionName}
        </CardTitle>
        <CardDescription>
          Upload multiple dimension values at once using a CSV file
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">CSV Template</h4>
              <p className="text-sm text-muted-foreground">
                Download a template with the required format: code, name, description
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <Label htmlFor="csv-upload">Select CSV File</Label>
          <div className="grid w-full items-center gap-1.5">
            <Input
              ref={fileInputRef}
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Maximum file size: 5MB. Required columns: code, name (description is optional)
            </p>
          </div>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFile}
                className="h-auto p-1"
              >
                Clear
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Progress */}
        {uploadMutation.isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading and processing...</span>
              <span>Please wait</span>
            </div>
            <Progress value={100} className="w-full animate-pulse" />
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert className={uploadResult.created > 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            {uploadResult.created > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{uploadResult.message}</p>
                <div className="text-sm space-y-1">
                  <p>✅ Created: {uploadResult.created} new values</p>
                  {uploadResult.skipped > 0 && (
                    <p>⏭️ Skipped: {uploadResult.skipped} duplicates</p>
                  )}
                  {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                    <div>
                      <p className="font-medium">Duplicate codes found:</p>
                      <p className="text-xs">{uploadResult.duplicates.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload CSV'}
          </Button>
          
          {selectedFile && (
            <Button 
              variant="outline" 
              onClick={handleClearFile}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Format Instructions */}
        <div className="border rounded-lg p-4 bg-muted/10">
          <h4 className="font-medium mb-2">CSV Format Requirements</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Header row must contain: <code className="bg-muted px-1 rounded">code</code>, <code className="bg-muted px-1 rounded">name</code></li>
            <li>• Optional column: <code className="bg-muted px-1 rounded">description</code></li>
            <li>• Each dimension value code must be unique</li>
            <li>• Duplicate codes will be skipped during import</li>
            <li>• Maximum file size: 5MB</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}