import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText, FileSearch, AlertTriangle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeDocumentImage } from '@/lib/ai';

interface DocumentAnalysisProps {
  onAnalysisComplete?: (analysis: string) => void;
  title?: string;
  description?: string;
}

export function DocumentAnalysis({
  onAnalysisComplete,
  title = 'Receipt & Invoice Analysis',
  description = 'Upload a receipt or invoice image for AI analysis'
}: DocumentAnalysisProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setAnalysis(null);
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setFileName(file.name);

    // Create image preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      
      // Extract base64 data without the prefix
      const base64Data = result.split(',')[1];
      setImage(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please select an image to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeDocumentImage(image);
      setAnalysis(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document');
      toast({
        title: "Analysis Error",
        description: `Failed to analyze document: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setFileName('');
    setAnalysis(null);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSearch className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Image Preview Area */}
          {imagePreview ? (
            <div className="relative">
              <div className="aspect-w-16 aspect-h-9 rounded-md overflow-hidden border border-gray-200">
                <img 
                  src={imagePreview} 
                  alt="Document preview" 
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="mt-2 text-sm text-gray-500 flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                {fileName}
              </div>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center hover:border-gray-400 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-900">Click to upload an image</p>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            (() => {
              const isApiKeyError = error.includes('API key') || error.includes('AI integration not available');
              
              return (
                <div className={`p-4 rounded-md border ${isApiKeyError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex">
                    <AlertTriangle className={`h-5 w-5 mr-2 ${isApiKeyError ? 'text-yellow-500' : 'text-red-500'}`} />
                    <div className={`text-sm ${isApiKeyError ? 'text-yellow-700' : 'text-red-700'}`}>
                      <p>{error}</p>
                      {isApiKeyError && (
                        <p className="mt-2 font-medium">
                          Please contact your administrator to configure AI integration.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
          
          {/* Analysis Results */}
          {analysis && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
              <div className="flex items-start">
                <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 whitespace-pre-wrap">
                  {analysis}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {imagePreview && (
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isAnalyzing}
          >
            Reset
          </Button>
        )}
        
        <Button 
          className={imagePreview ? 'ml-auto' : 'w-full'}
          onClick={imagePreview ? handleAnalyze : () => fileInputRef.current?.click()}
          disabled={isAnalyzing || (!!imagePreview && !image)}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : imagePreview ? (
            <>Analyze Document</>
          ) : (
            <>Select Document</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}