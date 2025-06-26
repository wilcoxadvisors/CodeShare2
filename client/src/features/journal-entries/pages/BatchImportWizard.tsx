import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { UploadConfigurationForm } from '../components/UploadConfigurationForm';
import { IntelligentReviewScreen } from '../components/IntelligentReviewScreen';

// A placeholder type for the analysis data we will get from the backend
type BatchAnalysisResult = any;

const BatchImportWizard: React.FC = () => {
  // State to manage the current step of the wizard
  const [currentStep, setCurrentStep] = useState<'CONFIG' | 'REVIEW'>('CONFIG');

  // State to hold the analysis result from the backend, to be passed to the review screen
  const [analysisResult, setAnalysisResult] = useState<BatchAnalysisResult | null>(null);

  // Callback function for the configuration form to call when analysis is complete
  const handleAnalysisComplete = (result: BatchAnalysisResult) => {
    setAnalysisResult(result);
    setCurrentStep('REVIEW');
  };

  // Callback function for the review screen to call to go back to the start
  const handleReturnToConfig = () => {
    setAnalysisResult(null);
    setCurrentStep('CONFIG');
  };

  return (
    <div className="py-6">
      <PageHeader
        title="Batch Journal Entry Import"
        description="A guided workflow to upload and process multiple journal entries from a single file."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        {currentStep === 'CONFIG' && (
          <UploadConfigurationForm onAnalysisComplete={handleAnalysisComplete} />
        )}

        {currentStep === 'REVIEW' && analysisResult && (
          <IntelligentReviewScreen
            analysisResult={analysisResult}
            onReturnToConfig={handleReturnToConfig}
            onProcess={() => {
              // Placeholder for the final processing mutation
              console.log("Processing approved entries...");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BatchImportWizard;