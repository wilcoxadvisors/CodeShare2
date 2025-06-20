import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JournalEntryStatus } from "@shared/schema";

interface JournalEntryFile {
  id: number;
  journalEntryId: number;
  filename: string;
  originalname?: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: number;
  uploadedAt: string | Date;
}

interface AttachmentSectionProps {
  entityId: number;
  clientId: number;
  journalEntryId: number | null | undefined;
  isInEditMode: boolean;
  attachments: any[]; // This will be the single source of truth for all files
  onRemoveAttachment: (fileId: number) => void;
  onAddAttachments: (files: File[]) => void;
}

export function AttachmentSection({
  entityId,
  clientId,
  journalEntryId,
  isInEditMode,
  attachments,
  onRemoveAttachment,
  onAddAttachments,
}: AttachmentSectionProps) {
  const { toast } = useToast();



  // Upload function to be called externally
  const uploadPendingFiles = async (entryId: number) => {
    if (pendingFiles.length > 0) {
      console.log(`DEBUG: Uploading ${pendingFiles.length} pending files for entry ${entryId}`);
      await uploadMutation.mutateAsync({ files: pendingFiles, entryId });
      // Clear pending files after successful upload
      setPendingFiles([]);
      setPendingFilesMetadata([]);
      console.log("DEBUG: Pending files cleared after upload");
    } else {
      console.log("DEBUG: No pending files to upload");
    }
  };

  // Set the upload function reference for parent to use
  useEffect(() => {
    if (onUploadToEntryRef) {
      onUploadToEntryRef.current = uploadPendingFiles;
    }
  }, [pendingFiles, onUploadToEntryRef]);

  // Clear pending files when switching between journal entries
  useEffect(() => {
    if (journalEntryId) {
      console.log("DEBUG: Journal entry ID changed, clearing pending files");
      setPendingFiles([]);
      setPendingFilesMetadata([]);
    }
  }, [journalEntryId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    // Validate file types and sizes
    const invalidFiles = newFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/gif',
        'application/vnd.ms-outlook', // MSG files
        'message/rfc822', // EML files
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      return file.size > maxSize || !allowedTypes.includes(file.type);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Files",
        description: `Some files are too large (>10MB) or have unsupported formats`,
        variant: "destructive",
      });
      return;
    }

    console.log(`DEBUG: Adding ${newFiles.length} files to pending uploads`);
    const newMetadata = newFiles.map((file) => ({
      id: Date.now() + Math.random(),
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      addedAt: new Date(),
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
    setPendingFilesMetadata((prev) => [...prev, ...newMetadata]);

    // Clear the input
    event.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingFilesMetadata((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Expose pending files count for parent validation
  const hasPendingFiles = pendingFiles.length > 0;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>

      {/* File Upload Section */}
      {isInEditMode && (
        <div className="mb-4">
          <Label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Files
          </Label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.msg,.eml"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, GIF, MSG, EML
          </p>
        </div>
      )}

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Files</h4>
          <div className="space-y-2">
            {pendingFilesMetadata.map((file, index) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{file.filename}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                </div>
                {isInEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePendingFile(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Attachments List */}
      {journalEntryFiles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Files</h4>
          <div className="space-y-2">
            {journalEntryFiles.map((file: JournalEntryFile) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {file.originalname || file.filename}
                  </span>
                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  <Badge variant="outline" className="text-xs">Uploaded</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${file.id}/download`, '_blank')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Button>
                  {isInEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(file.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {journalEntryFiles.length === 0 && pendingFiles.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No files attached</p>
        </div>
      )}

      {/* Validation warning for pending files during post operations */}
      {hasPendingFiles && status !== 'draft' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            You have pending files that need to be uploaded before posting this entry.
          </p>
        </div>
      )}
    </div>
  );
}