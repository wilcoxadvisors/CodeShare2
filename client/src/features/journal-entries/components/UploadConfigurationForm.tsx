import React, { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, Loader2, Lock } from 'lucide-react';

interface UploadConfigurationFormProps {
  onAnalysisComplete: (result: any) => void;
}

// Form schema with comprehensive validation
const formSchema = z.object({
  importMode: z.enum(['standard', 'historical'], {
    required_error: "Please select an import mode",
  }),
  description: z.string().optional(),
  referenceSuffix: z.string().optional(),
  batchDate: z.string().min(1, "Batch date is required"),
  isAccrual: z.boolean().default(false),
  reversalDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export const UploadConfigurationForm: React.FC<UploadConfigurationFormProps> = ({ onAnalysisComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const clientId = params.clientId;

  // Role-based access control
  const isAdmin = user?.role === 'admin';

  // Initialize form with react-hook-form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      importMode: 'standard',
      description: '',
      referenceSuffix: '',
      batchDate: new Date().toISOString().split('T')[0],
      isAccrual: false,
      reversalDate: '',
    },
  });

  // Watch import mode for conditional rendering
  const importMode = form.watch('importMode');
  const isStandardBatchMode = importMode === 'standard';

  const analysisMutation = useMutation({
    mutationFn: ({ file, formData }: { file: File; formData: FormData }) => {
      const uploadData = new FormData();
      uploadData.append('file', file);
      // Include all form configuration data in the analysis
      uploadData.append('importMode', formData.importMode);
      uploadData.append('description', formData.description || '');
      uploadData.append('referenceSuffix', formData.referenceSuffix || '');
      uploadData.append('batchDate', formData.batchDate);
      uploadData.append('isAccrual', formData.isAccrual.toString());
      uploadData.append('reversalDate', formData.reversalDate || '');
      
      return apiRequest(`/api/clients/${clientId}/journal-entries/batch-analyze`, {
        method: 'POST',
        data: uploadData,
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
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const onSubmit = (data: FormData) => {
    const fileInput = fileInputRef.current;
    const selectedFile = fileInput?.files?.[0];
    
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a file to upload and analyze.", variant: "destructive" });
      return;
    }
    
    analysisMutation.mutate({ file: selectedFile, formData: data });
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