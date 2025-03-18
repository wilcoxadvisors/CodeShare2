// src/components/journal/ActionButtons.tsx
import React, { useRef } from 'react';
import { PlusCircle, Upload, Save, Check, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

type ActionButtonsProps = {
  addEntryRow: () => void;
  supportingDocs: Array<{name: string, size: number, file: File}>;
  handleFileUpload: (file: File) => void;
  isSubmitting: boolean;
  submitStatus: 'draft' | 'pending_approval' | 'post_directly';
  setSubmitStatus: (status: 'draft' | 'pending_approval' | 'post_directly') => void;
};

export default function ActionButtons({
  addEntryRow,
  supportingDocs,
  handleFileUpload,
  isSubmitting,
  submitStatus,
  setSubmitStatus
}: ActionButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <>
      {/* Add Line Button and Supporting Documents */}
      <div className="flex justify-between items-start mt-4">
        <Button
          type="button"
          onClick={addEntryRow}
          variant="link"
          className="flex items-center text-blue-600 hover:text-blue-800 p-0"
        >
          <PlusCircle size={18} className="mr-1" /> Add Line
        </Button>
        
        {/* Supporting Documents */}
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-gray-700">Supporting Documents</h3>
          {supportingDocs.length > 0 ? (
            <ul className="mt-1 text-sm text-gray-600">
              {supportingDocs.map((doc, index) => (
                <li key={index} className="flex items-center mb-1">
                  <span className="mr-2">📎</span>
                  <span>{doc.name} ({(doc.size / 1024).toFixed(1)} KB)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No supporting documents attached</p>
          )}
        </div>
      </div>
      
      {/* Submit and Upload Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden"
            accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
          />
          <Button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex items-center justify-center"
          >
            <Upload className="mr-2 h-5 w-5" /> Upload Supporting Document
          </Button>
        </div>
        
        <div className="flex gap-2">
          {/* Status Selection Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-48"
              >
                {submitStatus === 'draft' && (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save as Draft
                  </>
                )}
                {submitStatus === 'pending_approval' && (
                  <>
                    <Clock className="mr-2 h-4 w-4" /> Submit for Approval
                  </>
                )}
                {submitStatus === 'post_directly' && (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Post Directly
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSubmitStatus('draft')}>
                <Save className="mr-2 h-4 w-4" /> Save as Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSubmitStatus('pending_approval')}>
                <Clock className="mr-2 h-4 w-4" /> Submit for Approval
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSubmitStatus('post_directly')}>
                <Check className="mr-2 h-4 w-4" /> Post Directly
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Submit Button */}
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-800 hover:bg-blue-900"
          >
            {isSubmitting ? 'Processing...' : 'Submit'} 
          </Button>
        </div>
      </div>
    </>
  );
}