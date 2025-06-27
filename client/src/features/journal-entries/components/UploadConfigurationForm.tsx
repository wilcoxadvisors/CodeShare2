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
import { AttachmentSection } from './AttachmentSection';

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Header Fields - Always Visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., June 2025 Month-End Accruals" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for this batch
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="referenceSuffix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Suffix</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., ACCRUAL, IMPORT" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional suffix to append to journal entry references
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Import Mode Selection with Role-Based Restrictions */}
            <FormField
              control={form.control}
              name="importMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Import Mode</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <FormLabel htmlFor="standard" className="cursor-pointer">
                          Standard Batch Entry
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="historical" 
                          id="historical" 
                          disabled={!isAdmin}
                        />
                        <FormLabel 
                          htmlFor="historical" 
                          className={`cursor-pointer ${!isAdmin ? 'text-muted-foreground' : ''}`}
                        >
                          Historical GL Import 
                          {!isAdmin && (
                            <Lock className="inline ml-2 h-4 w-4" />
                          )}
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  {!isAdmin && (
                    <FormDescription className="text-amber-600">
                      Historical GL Import requires admin privileges
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Fields for Standard Mode Only */}
            {isStandardBatchMode && (
              <Card className="p-4 bg-gray-50">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Batch Settings</h3>
                  
                  <FormField
                    control={form.control}
                    name="batchDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isAccrual"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Auto-Reversing Accrual
                          </FormLabel>
                          <FormDescription>
                            Mark this entire batch as an auto-reversing accrual
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('isAccrual') && (
                    <FormField
                      control={form.control}
                      name="reversalDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reversal Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>
                            Date when the accrual should be automatically reversed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Template Download */}
            <Alert>
              <Download className="h-4 w-4" />
              <AlertTitle>Download Your Template</AlertTitle>
              <AlertDescription>
                Download the "Smart Template" to ensure your data is formatted correctly. The template includes reference tabs for your Chart of Accounts and Dimensions.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/clients/${clientId}/journal-entries/batch-template?mode=${importMode}`, {
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
                      a.download = `Wilcox_JE_Template_${importMode}.xlsx`;
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

            {/* File Upload */}
            <div className="space-y-2">
              <FormLabel>Upload Completed File</FormLabel>
              <div className="flex items-center space-x-2">
                <Input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="flex-1" 
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Supported formats: Excel (.xlsx, .xls) or CSV (.csv)
              </p>
            </div>

            {/* Conditional AttachmentSection for Standard Mode Only */}
            {isStandardBatchMode && (
              <AttachmentSection
                entityId={parseInt(params.entityId || '0')}
                clientId={parseInt(clientId || '0')}
                journalEntryId={0} // This is for a new batch import, no existing journal entry
                isInEditMode={true} // Always editable during configuration
                attachments={[]} // No existing attachments for new batch
                onRemoveAttachment={() => {}} // Placeholder - files will be managed by the batch process
                onAddAttachments={() => {}} // Placeholder - files will be managed by the batch process
              />
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={analysisMutation.isPending}
              >
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};