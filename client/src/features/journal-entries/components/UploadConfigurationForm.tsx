import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, Loader2, Info } from 'lucide-react';

interface UploadConfigurationFormProps {
  onAnalysisComplete: (result: any) => void;
}

type ImportMode = 'standard' | 'historical';

export const UploadConfigurationForm: React.FC<UploadConfigurationFormProps> = ({ onAnalysisComplete }) => {
  const [mode, setMode] = useState<ImportMode>('standard');
  const [description, setDescription] = useState('');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAccrual, setIsAccrual] = useState(false);
  const [reversalDate, setReversalDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const params = useParams();
  const clientId = params.clientId;

  const analysisMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest(`/api/clients/${clientId}/journal-entries/batch-analyze`, {
        method: 'POST',
        data: formData,
        isFormData: true,
      });
    },
    onSuccess: (response) => {
      toast({ title: "Success", description: "File analysis complete. Please review the results." });
      onAnalysisComplete(response.data); // Pass results to parent wizard
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error?.error?.message || "An unknown error occurred during file analysis.",
        variant: "destructive",
      });
      setSelectedFile(null); // Clear the file on error
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAnalyzeClick = () => {
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a file to upload and analyze.", variant: "destructive" });
      return;
    }
    analysisMutation.mutate(selectedFile);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Step 1: Configure & Upload</CardTitle>
        <CardDescription>Select your import type, configure settings, and upload your data file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="import-mode">Import Mode</Label>
          <Select onValueChange={(value: ImportMode) => setMode(value)} defaultValue={mode}>
            <SelectTrigger id="import-mode">
              <SelectValue placeholder="Select an import mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Batch Entry</SelectItem>
              <SelectItem value="historical">Historical GL Import</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === 'standard' && (
          <Card className="p-4 bg-gray-50">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Batch Settings</h3>
              <div>
                <Label htmlFor="batch-date">Batch Date</Label>
                <Input id="batch-date" type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} />
              </div>
               <div>
                <Label htmlFor="description">Batch Description</Label>
                <Textarea id="description" placeholder="e.g., June 2025 Month-End Accruals" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                 <Switch id="is-accrual" checked={isAccrual} onCheckedChange={setIsAccrual} />
                 <Label htmlFor="is-accrual">Mark this entire batch as an Auto-Reversing Accrual</Label>
              </div>
              {isAccrual && (
                 <div>
                    <Label htmlFor="reversal-date">Reversal Date</Label>
                    <Input id="reversal-date" type="date" value={reversalDate} onChange={e => setReversalDate(e.target.value)} />
                 </div>
              )}
            </div>
          </Card>
        )}

        <Alert>
          <Download className="h-4 w-4" />
          <AlertTitle>Download Your Template</AlertTitle>
          <AlertDescription>
            Download the "Smart Template" to ensure your data is formatted correctly. The template includes reference tabs for your Chart of Accounts and Dimensions.
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/clients/${clientId}/journal-entries/batch-template?mode=${mode}`, {
                    method: 'GET',
                    credentials: 'include',
                  });

                  if (!response.ok) {
                    throw new Error('Failed to download template from server.');
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Wilcox_JE_Template_${mode}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);

                } catch (error) {
                  console.error("Download failed", error);
                  toast({ title: "Download Failed", description: "Could not generate the template.", variant: "destructive" });
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Upload Completed File</Label>
          <div className="flex items-center space-x-2">
            <Input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".xlsx, .xls, .csv" className="flex-1" />
          </div>
          {selectedFile && <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>}
        </div>

        <div className="flex justify-end">
            <Button onClick={handleAnalyzeClick} disabled={!selectedFile || analysisMutation.isPending}>
                {analysisMutation.isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Analyze File
                    </>
                )}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};